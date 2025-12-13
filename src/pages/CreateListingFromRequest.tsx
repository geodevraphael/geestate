import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { MainLayout } from '@/components/layouts/MainLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { 
  ArrowLeft, 
  FileJson, 
  Loader2, 
  Check, 
  MapPin, 
  Phone, 
  FileText, 
  Building2,
  X,
  AlertCircle,
  Upload,
  Eye
} from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import * as turf from '@turf/turf';
import Map from 'ol/Map';
import View from 'ol/View';
import TileLayer from 'ol/layer/Tile';
import XYZ from 'ol/source/XYZ';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import { Polygon } from 'ol/geom';
import Feature from 'ol/Feature';
import { Style, Fill, Stroke } from 'ol/style';
import { fromLonLat } from 'ol/proj';
import 'ol/ol.css';

interface ListingRequest {
  id: string;
  user_id: string;
  survey_plan_url: string;
  location_description: string | null;
  contact_phone: string | null;
  notes: string | null;
  status: string;
  admin_notes: string | null;
  created_at: string;
  applicant?: {
    full_name: string;
    email: string;
  };
}

export default function CreateListingFromRequest() {
  const { requestId } = useParams<{ requestId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<Map | null>(null);
  const vectorSource = useRef<VectorSource | null>(null);
  
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [request, setRequest] = useState<ListingRequest | null>(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [polygonData, setPolygonData] = useState<any>(null);
  const [polygonFileName, setPolygonFileName] = useState('');
  const [polygonArea, setPolygonArea] = useState<number | null>(null);
  const [showSurveyPlan, setShowSurveyPlan] = useState(false);

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
    block_number: '',
    plot_number: '',
    street_name: '',
    planned_use: '',
    has_title: false,
    has_electricity: false,
    has_water: false,
  });

  // Fetch request data
  useEffect(() => {
    if (!requestId) {
      navigate('/admin/listing-requests');
      return;
    }
    fetchRequest();
  }, [requestId]);

  // Initialize map
  useEffect(() => {
    if (mapRef.current && !mapInstance.current) {
      initializeMap();
    }
  }, []);

  const fetchRequest = async () => {
    setLoading(true);
    try {
      const { data, error } = await (supabase as any)
        .from('listing_requests')
        .select('*')
        .eq('id', requestId)
        .single();

      if (error) throw error;

      // Fetch applicant profile
      if (data) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name, email')
          .eq('id', data.user_id)
          .single();

        const requestWithProfile = {
          ...data,
          applicant: profile,
        };

        setRequest(requestWithProfile);
        
        // Pre-fill form
        setFormData(prev => ({
          ...prev,
          location_label: data.location_description || '',
          description: data.notes || '',
          title: `Property in ${data.location_description?.split(',')[0] || 'Tanzania'}`,
        }));
      }
    } catch (error: any) {
      console.error('Error fetching request:', error);
      toast({
        title: 'Error',
        description: 'Failed to load the listing request.',
        variant: 'destructive',
      });
      navigate('/admin/listing-requests');
    } finally {
      setLoading(false);
    }
  };

  const initializeMap = () => {
    vectorSource.current = new VectorSource();

    const vectorLayer = new VectorLayer({
      source: vectorSource.current,
      style: new Style({
        fill: new Fill({
          color: 'rgba(234, 179, 8, 0.3)',
        }),
        stroke: new Stroke({
          color: '#eab308',
          width: 2,
        }),
      }),
    });

    mapInstance.current = new Map({
      target: mapRef.current!,
      layers: [
        new TileLayer({
          source: new XYZ({
            url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
            attributions: '© Esri',
          }),
        }),
        new TileLayer({
          source: new XYZ({
            url: 'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}',
            attributions: '© Esri',
          }),
        }),
        vectorLayer,
      ],
      view: new View({
        center: fromLonLat([34.888822, -6.369028]),
        zoom: 6,
        minZoom: 5,
        maxZoom: 20,
      }),
    });
  };

  const displayPolygonOnMap = (geometry: any) => {
    if (!vectorSource.current || !mapInstance.current) return;

    vectorSource.current.clear();
    
    const coordinates = geometry.coordinates[0].map((coord: [number, number]) => 
      fromLonLat([coord[0], coord[1]])
    );
    const polygonGeom = new Polygon([coordinates]);
    const feature = new Feature({ geometry: polygonGeom });
    
    vectorSource.current.addFeature(feature);

    const extent = vectorSource.current.getExtent();
    mapInstance.current.getView().fit(extent, { 
      padding: [50, 50, 50, 50],
      duration: 1000
    });
  };

  const handlePolygonUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.match(/\.(json|geojson)$/i)) {
      toast({
        title: 'Invalid file',
        description: 'Please upload a GeoJSON file (.json or .geojson)',
        variant: 'destructive',
      });
      return;
    }

    try {
      const text = await file.text();
      const jsonData = JSON.parse(text);

      let geometry: any = null;

      if (jsonData.type === 'FeatureCollection' && jsonData.features?.length > 0) {
        geometry = jsonData.features[0].geometry;
      } else if (jsonData.type === 'Feature') {
        geometry = jsonData.geometry;
      } else if (jsonData.type === 'Polygon') {
        geometry = jsonData;
      }

      if (!geometry || geometry.type !== 'Polygon') {
        toast({
          title: 'Invalid polygon',
          description: 'File must contain a Polygon geometry',
          variant: 'destructive',
        });
        return;
      }

      const areaM2 = turf.area(geometry);
      const centroid = turf.centroid(geometry);
      const [lng, lat] = centroid.geometry.coordinates;

      setPolygonData({
        geojson: geometry,
        area_m2: areaM2,
        centroid_lat: lat,
        centroid_lng: lng,
      });
      setPolygonFileName(file.name);
      setPolygonArea(areaM2);

      displayPolygonOnMap(geometry);

      toast({
        title: 'Polygon loaded',
        description: `Area: ${(areaM2 / 10000).toFixed(2)} hectares (${areaM2.toFixed(0)} m²)`,
      });
    } catch (error) {
      console.error('Polygon parse error:', error);
      toast({
        title: 'Invalid file',
        description: 'Failed to parse GeoJSON file',
        variant: 'destructive',
      });
    }
  };

  const clearPolygon = () => {
    setPolygonData(null);
    setPolygonFileName('');
    setPolygonArea(null);
    if (vectorSource.current) {
      vectorSource.current.clear();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!request || !user) return;

    if (!formData.title.trim()) {
      toast({ title: 'Title required', variant: 'destructive' });
      return;
    }
    if (!formData.location_label.trim()) {
      toast({ title: 'Location required', variant: 'destructive' });
      return;
    }
    if (!polygonData) {
      toast({ title: 'Polygon required', description: 'Please upload a GeoJSON polygon file', variant: 'destructive' });
      return;
    }

    setProcessing(true);
    try {
      // 1. Create the listing
      const { data: listing, error: listingError } = await supabase
        .from('listings')
        .insert({
          owner_id: request.user_id,
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
          block_number: formData.block_number || null,
          plot_number: formData.plot_number || null,
          street_name: formData.street_name || null,
          planned_use: formData.planned_use || null,
          has_title: formData.has_title,
          has_electricity: formData.has_electricity,
          has_water: formData.has_water,
          status: 'draft',
          verification_status: 'pending',
        })
        .select()
        .single();

      if (listingError) throw listingError;

      // 2. Save the polygon
      if (listing && polygonData) {
        await supabase
          .from('listing_polygons')
          .insert({
            listing_id: listing.id,
            geojson: polygonData.geojson,
            area_m2: polygonData.area_m2,
            centroid_lat: polygonData.centroid_lat,
            centroid_lng: polygonData.centroid_lng,
          });
      }

      // 3. Add the survey plan as listing media
      if (listing) {
        await supabase.from('listing_media').insert({
          listing_id: listing.id,
          file_url: request.survey_plan_url,
          media_type: 'document',
          caption: 'Survey Plan',
        });
      }

      // 4. Update the request status
      if (request.status === 'pending') {
        await (supabase as any)
          .from('listing_requests')
          .update({
            status: 'approved',
            admin_notes: adminNotes,
            reviewed_by: user.id,
            reviewed_at: new Date().toISOString(),
          })
          .eq('id', request.id);
      }

      // 5. Notify the user
      await supabase.from('notifications').insert([{
        user_id: request.user_id,
        type: 'listing_verified' as const,
        title: 'Listing Created!',
        message: `Your listing request has been approved and a draft listing "${formData.title}" has been created. You can now edit and publish it.`,
        link_url: `/listings/${listing?.id}`,
      }]);

      toast({
        title: 'Listing Created',
        description: 'The listing has been created and the user has been notified.',
      });

      navigate('/admin/listing-requests');
    } catch (error: any) {
      console.error('Error creating listing:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to create listing',
        variant: 'destructive',
      });
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </MainLayout>
    );
  }

  if (!request) {
    return (
      <MainLayout>
        <div className="container py-6">
          <p>Request not found</p>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="container py-6 max-w-7xl">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" size="icon" onClick={() => navigate('/admin/listing-requests')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Building2 className="h-6 w-6" />
              Create Listing from Request
            </h1>
            <p className="text-muted-foreground">
              Creating listing for {request.applicant?.full_name}
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Column - Map & Polygon */}
            <div className="space-y-6">
              {/* Map */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">Property Boundary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div 
                    ref={mapRef} 
                    className="w-full h-[400px] rounded-lg overflow-hidden border"
                  />
                  
                  {/* Polygon Upload */}
                  {!polygonData ? (
                    <div className="border-2 border-dashed border-border rounded-lg p-6">
                      <input
                        id="polygon-upload"
                        type="file"
                        accept=".json,.geojson"
                        onChange={handlePolygonUpload}
                        className="hidden"
                      />
                      <label htmlFor="polygon-upload" className="cursor-pointer block text-center">
                        <Upload className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
                        <p className="text-sm font-medium">Upload GeoJSON Polygon *</p>
                        <p className="text-xs text-muted-foreground mt-1">.json or .geojson file</p>
                      </label>
                    </div>
                  ) : (
                    <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Check className="h-5 w-5 text-green-600" />
                          <div>
                            <p className="text-sm font-medium text-green-800 dark:text-green-200">{polygonFileName}</p>
                            <p className="text-xs text-green-600 dark:text-green-400">
                              Area: {polygonArea ? `${(polygonArea / 10000).toFixed(2)} ha (${polygonArea.toFixed(0)} m²)` : 'Calculating...'}
                            </p>
                          </div>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={clearPolygon}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                  
                  {!polygonData && (
                    <Alert variant="destructive" className="bg-destructive/10">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        A polygon boundary is required to create the listing
                      </AlertDescription>
                    </Alert>
                  )}
                </CardContent>
              </Card>

              {/* Request Info */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center justify-between">
                    Request Details
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setShowSurveyPlan(!showSurveyPlan)}
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      {showSurveyPlan ? 'Hide' : 'View'} Survey Plan
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <span>{request.applicant?.full_name}</span>
                    </div>
                    {request.contact_phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <span>{request.contact_phone}</span>
                      </div>
                    )}
                    {request.location_description && (
                      <div className="flex items-center gap-2 col-span-2">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <span>{request.location_description}</span>
                      </div>
                    )}
                  </div>
                  
                  {showSurveyPlan && (
                    <div className="mt-4 border rounded-lg overflow-hidden">
                      <img
                        src={request.survey_plan_url}
                        alt="Survey Plan"
                        className="w-full max-h-[400px] object-contain bg-muted"
                      />
                    </div>
                  )}
                  
                  {request.notes && (
                    <div className="mt-4 p-3 bg-muted rounded-lg">
                      <p className="text-sm text-muted-foreground">{request.notes}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Right Column - Form */}
            <div className="space-y-6">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">Listing Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Title */}
                  <div className="space-y-2">
                    <Label htmlFor="title">Title *</Label>
                    <Input
                      id="title"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      placeholder="e.g., Prime Plot in Kinondoni"
                      required
                    />
                  </div>

                  {/* Type selectors */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Listing Type</Label>
                      <Select
                        value={formData.listing_type}
                        onValueChange={(v) => setFormData({ ...formData, listing_type: v as any })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="sale">For Sale</SelectItem>
                          <SelectItem value="rent">For Rent</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Property Type</Label>
                      <Select
                        value={formData.property_type}
                        onValueChange={(v) => setFormData({ ...formData, property_type: v as any })}
                      >
                        <SelectTrigger>
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

                  {/* Price */}
                  <div className="grid grid-cols-3 gap-4">
                    <div className="col-span-2 space-y-2">
                      <Label htmlFor="price">Price</Label>
                      <Input
                        id="price"
                        type="number"
                        value={formData.price}
                        onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                        placeholder="e.g., 50000000"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Currency</Label>
                      <Select
                        value={formData.currency}
                        onValueChange={(v) => setFormData({ ...formData, currency: v })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="TZS">TZS</SelectItem>
                          <SelectItem value="USD">USD</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Location */}
                  <div className="space-y-2">
                    <Label htmlFor="location">Location *</Label>
                    <Input
                      id="location"
                      value={formData.location_label}
                      onChange={(e) => setFormData({ ...formData, location_label: e.target.value })}
                      placeholder="e.g., Kinondoni, Dar es Salaam"
                      required
                    />
                  </div>

                  {/* Region/District/Ward */}
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="region">Region</Label>
                      <Input
                        id="region"
                        value={formData.region}
                        onChange={(e) => setFormData({ ...formData, region: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="district">District</Label>
                      <Input
                        id="district"
                        value={formData.district}
                        onChange={(e) => setFormData({ ...formData, district: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="ward">Ward</Label>
                      <Input
                        id="ward"
                        value={formData.ward}
                        onChange={(e) => setFormData({ ...formData, ward: e.target.value })}
                      />
                    </div>
                  </div>

                  {/* Block/Plot/Street */}
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="block">Block Number</Label>
                      <Input
                        id="block"
                        value={formData.block_number}
                        onChange={(e) => setFormData({ ...formData, block_number: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="plot">Plot Number</Label>
                      <Input
                        id="plot"
                        value={formData.plot_number}
                        onChange={(e) => setFormData({ ...formData, plot_number: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="street">Street Name</Label>
                      <Input
                        id="street"
                        value={formData.street_name}
                        onChange={(e) => setFormData({ ...formData, street_name: e.target.value })}
                      />
                    </div>
                  </div>

                  {/* Description */}
                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Property description..."
                      rows={3}
                    />
                  </div>

                  {/* Amenities */}
                  <div className="flex flex-wrap gap-6">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="hasTitle"
                        checked={formData.has_title}
                        onCheckedChange={(c) => setFormData({ ...formData, has_title: !!c })}
                      />
                      <Label htmlFor="hasTitle" className="cursor-pointer">Has Title Deed</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="hasElectricity"
                        checked={formData.has_electricity}
                        onCheckedChange={(c) => setFormData({ ...formData, has_electricity: !!c })}
                      />
                      <Label htmlFor="hasElectricity" className="cursor-pointer">Has Electricity</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="hasWater"
                        checked={formData.has_water}
                        onCheckedChange={(c) => setFormData({ ...formData, has_water: !!c })}
                      />
                      <Label htmlFor="hasWater" className="cursor-pointer">Has Water</Label>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Admin Notes */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">Admin Notes</CardTitle>
                </CardHeader>
                <CardContent>
                  <Textarea
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                    placeholder="Internal notes (not visible to user)..."
                    rows={2}
                  />
                </CardContent>
              </Card>

              {/* Actions */}
              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => navigate('/admin/listing-requests')}
                  disabled={processing}
                >
                  Cancel
                </Button>
                <Button type="submit" className="flex-1" disabled={processing || !polygonData}>
                  {processing ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Check className="h-4 w-4 mr-2" />
                      Create Listing
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </form>
      </div>
    </MainLayout>
  );
}
