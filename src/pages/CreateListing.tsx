import { useState, useRef, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Navbar } from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Upload, X, MapPin, Save } from 'lucide-react';
import { validatePolygon } from '@/lib/polygonValidation';
import { PolygonValidationPanel } from '@/components/PolygonValidationPanel';
import { logAuditAction } from '@/lib/auditLog';
import Map from 'ol/Map';
import View from 'ol/View';
import TileLayer from 'ol/layer/Tile';
import OSM from 'ol/source/OSM';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import Draw from 'ol/interaction/Draw';
import { Polygon } from 'ol/geom';
import Feature from 'ol/Feature';
import { Style, Fill, Stroke } from 'ol/style';
import { fromLonLat, toLonLat } from 'ol/proj';
import * as turf from '@turf/turf';
import 'ol/ol.css';

export default function CreateListing() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<Map | null>(null);
  const drawInteraction = useRef<Draw | null>(null);
  const vectorSource = useRef<VectorSource | null>(null);

  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [existingListing, setExistingListing] = useState<any>(null);
  const [drawnPolygon, setDrawnPolygon] = useState<any>(null);
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    listing_type: 'sale' as 'sale' | 'rent',
    property_type: 'land' as 'land' | 'house' | 'apartment' | 'commercial' | 'other',
    price: '',
    currency: 'TZS',
    location_label: '',
    region: '',
    district: '',
    ward: '',
  });

  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [existingMedia, setExistingMedia] = useState<any[]>([]);

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }

    // Initialize map
    if (mapRef.current && !mapInstance.current) {
      initializeMap();
    }

    // Load existing listing if editing
    if (id) {
      loadExistingListing();
    }
  }, [user, id]);

  const initializeMap = () => {
    vectorSource.current = new VectorSource();

    const vectorLayer = new VectorLayer({
      source: vectorSource.current,
      style: new Style({
        fill: new Fill({
          color: 'rgba(234, 179, 8, 0.4)',
        }),
        stroke: new Stroke({
          color: '#eab308',
          width: 3,
        }),
      }),
    });

    mapInstance.current = new Map({
      target: mapRef.current!,
      layers: [
        new TileLayer({
          source: new OSM(),
        }),
        vectorLayer,
      ],
      view: new View({
        center: fromLonLat([34.888822, -6.369028]), // Tanzania center
        zoom: 6,
      }),
    });

    // Add draw interaction
    drawInteraction.current = new Draw({
      source: vectorSource.current,
      type: 'Polygon',
    });

    drawInteraction.current.on('drawend', (event) => {
      const feature = event.feature;
      const geometry = feature.getGeometry() as Polygon;
      const coordinates = geometry.getCoordinates()[0].map(coord => toLonLat(coord));
      
      // Create GeoJSON
      const geojson = {
        type: 'Polygon',
        coordinates: [coordinates],
      };

      setDrawnPolygon(geojson);

      // Remove old polygons
      vectorSource.current?.clear();
      vectorSource.current?.addFeature(feature);

      // Remove draw interaction after drawing
      if (mapInstance.current && drawInteraction.current) {
        mapInstance.current.removeInteraction(drawInteraction.current);
      }
    });

    mapInstance.current.addInteraction(drawInteraction.current);
  };

  const loadExistingListing = async () => {
    try {
      const [listingRes, polygonRes, mediaRes] = await Promise.all([
        supabase.from('listings').select('*').eq('id', id).single(),
        supabase.from('listing_polygons').select('*').eq('listing_id', id).maybeSingle(),
        supabase.from('listing_media').select('*').eq('listing_id', id),
      ]);

      if (listingRes.data) {
        setExistingListing(listingRes.data);
        setFormData({
          title: listingRes.data.title,
          description: listingRes.data.description || '',
          listing_type: listingRes.data.listing_type,
          property_type: listingRes.data.property_type,
          price: listingRes.data.price?.toString() || '',
          currency: listingRes.data.currency,
          location_label: listingRes.data.location_label,
          region: listingRes.data.region || '',
          district: listingRes.data.district || '',
          ward: listingRes.data.ward || '',
        });
      }

      if (polygonRes.data) {
        const geojson = typeof polygonRes.data.geojson === 'string' 
          ? JSON.parse(polygonRes.data.geojson) 
          : polygonRes.data.geojson;
        setDrawnPolygon(geojson);
        
        // Draw existing polygon on map
        if (vectorSource.current) {
          const coordinates = geojson.coordinates[0].map((coord: [number, number]) => 
            fromLonLat([coord[0], coord[1]])
          );
          const polygonGeom = new Polygon([coordinates]);
          const feature = new Feature({ geometry: polygonGeom });
          vectorSource.current.addFeature(feature);

          // Center map on polygon
          if (mapInstance.current) {
            mapInstance.current.getView().fit(polygonGeom.getExtent(), { padding: [50, 50, 50, 50] });
          }
        }
      }

      if (mediaRes.data) {
        setExistingMedia(mediaRes.data);
      }
    } catch (error) {
      console.error('Error loading listing:', error);
      toast({
        title: 'Error',
        description: 'Failed to load listing data',
        variant: 'destructive',
      });
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    setSelectedFiles(prev => [...prev, ...files]);
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const removeExistingMedia = async (mediaId: string) => {
    try {
      const { error } = await supabase
        .from('listing_media')
        .delete()
        .eq('id', mediaId);

      if (error) throw error;

      setExistingMedia(prev => prev.filter(m => m.id !== mediaId));
      toast({ title: 'Success', description: 'Image removed' });
    } catch (error) {
      console.error('Error removing media:', error);
      toast({ title: 'Error', description: 'Failed to remove image', variant: 'destructive' });
    }
  };

  const enablePolygonDrawing = () => {
    if (mapInstance.current && drawInteraction.current) {
      mapInstance.current.addInteraction(drawInteraction.current);
      vectorSource.current?.clear();
      setDrawnPolygon(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!drawnPolygon) {
      toast({
        title: 'Missing Polygon',
        description: 'Please draw a polygon on the map to define the property boundaries',
        variant: 'destructive',
      });
      return;
    }

    // Validate polygon
    const validation = validatePolygon(drawnPolygon);
    if (!validation.isValid) {
      toast({
        title: 'Invalid Polygon',
        description: validation.errors.join(', '),
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);

    try {
      let listingId = id;

      // Create or update listing
      const listingData = {
        title: formData.title,
        description: formData.description || null,
        listing_type: formData.listing_type,
        property_type: formData.property_type,
        price: formData.price ? parseFloat(formData.price) : null,
        currency: formData.currency,
        location_label: formData.location_label,
        region: formData.region || null,
        district: formData.district || null,
        ward: formData.ward || null,
        owner_id: user!.id,
        status: 'draft' as const,
        verification_status: 'unverified' as const,
      };

      if (id) {
        // Update existing listing
        const { error } = await supabase
          .from('listings')
          .update(listingData)
          .eq('id', id);

        if (error) throw error;

        await logAuditAction('UPDATE_LISTING', user!.id, id, { title: formData.title });
      } else {
        // Create new listing
        const { data, error } = await supabase
          .from('listings')
          .insert(listingData)
          .select()
          .single();

        if (error) throw error;
        listingId = data.id;

        await logAuditAction('CREATE_LISTING', user!.id, listingId, { title: formData.title });
      }

      // Save polygon
      const polygon = turf.polygon(drawnPolygon.coordinates);
      const area_m2 = turf.area(polygon);
      const centroid = turf.centroid(polygon);

      const polygonData = {
        listing_id: listingId,
        geojson: drawnPolygon,
        area_m2,
        centroid_lat: centroid.geometry.coordinates[1],
        centroid_lng: centroid.geometry.coordinates[0],
      };

      const { error: polygonError } = await supabase
        .from('listing_polygons')
        .upsert(polygonData);

      if (polygonError) throw polygonError;

      // Upload images
      if (selectedFiles.length > 0) {
        setUploading(true);
        for (const file of selectedFiles) {
          const fileExt = file.name.split('.').pop();
          const fileName = `${listingId}/${Date.now()}.${fileExt}`;

          const { error: uploadError } = await supabase.storage
            .from('listing-media')
            .upload(fileName, file);

          if (uploadError) throw uploadError;

          const { data: { publicUrl } } = supabase.storage
            .from('listing-media')
            .getPublicUrl(fileName);

          await supabase.from('listing_media').insert({
            listing_id: listingId,
            file_url: publicUrl,
            media_type: 'image' as const,
          });
        }
      }

      toast({
        title: 'Success',
        description: id ? 'Listing updated successfully' : 'Listing created successfully',
      });

      navigate(`/listings/${listingId}`);
    } catch (error: any) {
      console.error('Error saving listing:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to save listing',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
      setUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <div className="container mx-auto px-4 py-8">
        <Button
          variant="ghost"
          onClick={() => navigate(-1)}
          className="mb-6 flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>

        <h1 className="text-3xl font-bold mb-6">
          {id ? 'Edit Listing' : 'Create New Listing'}
        </h1>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid lg:grid-cols-2 gap-6">
            {/* Left Column - Form */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Basic Information</CardTitle>
                  <CardDescription>Enter the property details</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="title">Title *</Label>
                    <Input
                      id="title"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      placeholder="e.g., 5 Acre Plot in Dar es Salaam"
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Describe the property..."
                      rows={4}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="listing_type">Listing Type *</Label>
                      <Select
                        value={formData.listing_type}
                        onValueChange={(value: 'sale' | 'rent') =>
                          setFormData({ ...formData, listing_type: value })
                        }
                      >
                        <SelectTrigger id="listing_type">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="sale">For Sale</SelectItem>
                          <SelectItem value="rent">For Rent</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="property_type">Property Type *</Label>
                      <Select
                        value={formData.property_type}
                        onValueChange={(value: any) =>
                          setFormData({ ...formData, property_type: value })
                        }
                      >
                        <SelectTrigger id="property_type">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="land">Land</SelectItem>
                          <SelectItem value="house">House</SelectItem>
                          <SelectItem value="apartment">Apartment</SelectItem>
                          <SelectItem value="commercial">Commercial</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div className="col-span-2">
                      <Label htmlFor="price">Price</Label>
                      <Input
                        id="price"
                        type="number"
                        value={formData.price}
                        onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                        placeholder="0"
                      />
                    </div>
                    <div>
                      <Label htmlFor="currency">Currency</Label>
                      <Select
                        value={formData.currency}
                        onValueChange={(value) => setFormData({ ...formData, currency: value })}
                      >
                        <SelectTrigger id="currency">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="TZS">TZS</SelectItem>
                          <SelectItem value="USD">USD</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Location</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="location_label">Location Label *</Label>
                    <Input
                      id="location_label"
                      value={formData.location_label}
                      onChange={(e) => setFormData({ ...formData, location_label: e.target.value })}
                      placeholder="e.g., Masaki, Dar es Salaam"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="region">Region</Label>
                      <Input
                        id="region"
                        value={formData.region}
                        onChange={(e) => setFormData({ ...formData, region: e.target.value })}
                        placeholder="e.g., Dar es Salaam"
                      />
                    </div>
                    <div>
                      <Label htmlFor="district">District</Label>
                      <Input
                        id="district"
                        value={formData.district}
                        onChange={(e) => setFormData({ ...formData, district: e.target.value })}
                        placeholder="e.g., Kinondoni"
                      />
                    </div>
                    <div>
                      <Label htmlFor="ward">Ward</Label>
                      <Input
                        id="ward"
                        value={formData.ward}
                        onChange={(e) => setFormData({ ...formData, ward: e.target.value })}
                        placeholder="e.g., Masaki"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Upload className="h-5 w-5" />
                    Images
                  </CardTitle>
                  <CardDescription>Upload property photos</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Existing Media */}
                  {existingMedia.length > 0 && (
                    <div className="grid grid-cols-3 gap-4">
                      {existingMedia.map((media) => (
                        <div key={media.id} className="relative">
                          <img
                            src={media.file_url}
                            alt="Property"
                            className="w-full h-24 object-cover rounded-lg"
                          />
                          <Button
                            type="button"
                            variant="destructive"
                            size="icon"
                            className="absolute -top-2 -right-2 h-6 w-6"
                            onClick={() => removeExistingMedia(media.id)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* New Files */}
                  {selectedFiles.length > 0 && (
                    <div className="grid grid-cols-3 gap-4">
                      {selectedFiles.map((file, index) => (
                        <div key={index} className="relative">
                          <img
                            src={URL.createObjectURL(file)}
                            alt={file.name}
                            className="w-full h-24 object-cover rounded-lg"
                          />
                          <Button
                            type="button"
                            variant="destructive"
                            size="icon"
                            className="absolute -top-2 -right-2 h-6 w-6"
                            onClick={() => removeFile(index)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}

                  <div>
                    <Input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleFileSelect}
                      className="cursor-pointer"
                    />
                    <p className="text-sm text-muted-foreground mt-2">
                      Upload JPG, PNG, or WebP images (max 5MB each)
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Right Column - Map & Polygon */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <MapPin className="h-5 w-5" />
                        Property Boundaries
                      </CardTitle>
                      <CardDescription>Draw the property polygon on the map</CardDescription>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={enablePolygonDrawing}
                    >
                      {drawnPolygon ? 'Redraw' : 'Draw Polygon'}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div ref={mapRef} className="h-96 rounded-lg border" />
                  <p className="text-sm text-muted-foreground mt-2">
                    Click on the map to start drawing. Double-click to finish.
                  </p>
                </CardContent>
              </Card>

              {drawnPolygon && (
                <PolygonValidationPanel geojson={drawnPolygon} />
              )}
            </div>
          </div>

          <div className="flex gap-4 justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate(-1)}
              disabled={loading || uploading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading || uploading}>
              <Save className="h-4 w-4 mr-2" />
              {loading || uploading ? 'Saving...' : id ? 'Update Listing' : 'Create Listing'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

