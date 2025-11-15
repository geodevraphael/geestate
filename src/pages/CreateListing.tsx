import { useState, useRef, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { MainLayout } from '@/components/layouts/MainLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Upload, X, FileJson, Save, AlertCircle, Trash2, Map as MapIcon, Pencil, CheckCircle2 } from 'lucide-react';
import { validatePolygon } from '@/lib/polygonValidation';
import { PolygonValidationPanel } from '@/components/PolygonValidationPanel';
import { logAuditAction } from '@/lib/auditLog';
import Map from 'ol/Map';
import View from 'ol/View';
import TileLayer from 'ol/layer/Tile';
import XYZ from 'ol/source/XYZ';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import Draw from 'ol/interaction/Draw';
import { defaults as defaultControls, FullScreen, ScaleLine, ZoomToExtent } from 'ol/control';
import { Polygon } from 'ol/geom';
import Feature from 'ol/Feature';
import { Style, Fill, Stroke, Text } from 'ol/style';
import { fromLonLat, toLonLat } from 'ol/proj';
import * as turf from '@turf/turf';
import { z } from 'zod';
import * as topojson from 'topojson-client';
import 'ol/ol.css';

// GeoJSON Schema supporting both single features and feature collections
const geoJsonSchema = z.union([
  // Single Feature
  z.object({
    type: z.literal('Feature'),
    properties: z.record(z.any()).optional(),
    geometry: z.object({
      type: z.literal('Polygon'),
      coordinates: z.array(z.array(z.array(z.number()))),
    }),
  }),
  // FeatureCollection (multiple parcels)
  z.object({
    type: z.literal('FeatureCollection'),
    features: z.array(
      z.object({
        type: z.literal('Feature'),
        properties: z.record(z.any()).optional(),
        geometry: z.object({
          type: z.literal('Polygon'),
          coordinates: z.array(z.array(z.array(z.number()))),
        }),
      })
    ),
  }),
  // Direct Polygon
  z.object({
    type: z.literal('Polygon'),
    coordinates: z.array(z.array(z.array(z.number()))),
  }),
]);

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
  const [publishOnSave, setPublishOnSave] = useState(false);
  const [existingListing, setExistingListing] = useState<any>(null);
  const [polygons, setPolygons] = useState<any[]>([]);
  const [jsonFileName, setJsonFileName] = useState<string>('');
  const [isDrawingMode, setIsDrawingMode] = useState(false);
  
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

  const isLandProperty = formData.property_type === 'land';

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }

    if (mapRef.current && !mapInstance.current) {
      initializeMap();
    }

    if (id) {
      loadExistingListing();
    }
  }, [user, id]);

  // Update drawing mode based on property type
  useEffect(() => {
    if (!isLandProperty && !isDrawingMode) {
      enableDrawingMode();
    } else if (isLandProperty && isDrawingMode) {
      disableDrawingMode();
    }
  }, [formData.property_type]);

  const initializeMap = () => {
    vectorSource.current = new VectorSource();

    const vectorLayer = new VectorLayer({
      source: vectorSource.current,
      style: (feature) => {
        const isLand = feature.get('isLand');
        return new Style({
          fill: new Fill({
            color: isLand ? 'rgba(234, 179, 8, 0.3)' : 'rgba(59, 130, 246, 0.3)',
          }),
          stroke: new Stroke({
            color: isLand ? '#eab308' : '#3b82f6',
            width: 2,
          }),
          text: new Text({
            text: feature.get('label') || '',
            fill: new Fill({ color: '#000' }),
            stroke: new Stroke({ color: '#fff', width: 3 }),
            font: '12px sans-serif',
          }),
        });
      },
    });

    mapInstance.current = new Map({
      target: mapRef.current!,
      controls: defaultControls().extend([
        new FullScreen(),
        new ScaleLine(),
        new ZoomToExtent({
          extent: fromLonLat([29.0, -12.0]).concat(fromLonLat([41.0, -1.0]))
        }),
      ]),
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

    // Enable mouse wheel zoom
    mapInstance.current.getView().setConstrainResolution(false);
  };

  const enableDrawingMode = () => {
    if (!mapInstance.current || !vectorSource.current) return;

    // Remove existing draw interaction
    if (drawInteraction.current) {
      mapInstance.current.removeInteraction(drawInteraction.current);
    }

    drawInteraction.current = new Draw({
      source: vectorSource.current,
      type: 'Polygon',
    });

    drawInteraction.current.on('drawend', (event) => {
      const feature = event.feature;
      const geometry = feature.getGeometry() as Polygon;
      const coordinates = geometry.getCoordinates()[0].map(coord => toLonLat(coord));
      
      const geojson = {
        type: 'Polygon',
        coordinates: [coordinates],
      };

      feature.set('isLand', false);
      feature.set('label', `Parcel ${polygons.length + 1}`);

      setPolygons(prev => [...prev, geojson]);

      toast({
        title: 'Polygon drawn',
        description: 'Property boundary has been added',
      });
    });

    mapInstance.current.addInteraction(drawInteraction.current);
    setIsDrawingMode(true);
  };

  const disableDrawingMode = () => {
    if (mapInstance.current && drawInteraction.current) {
      mapInstance.current.removeInteraction(drawInteraction.current);
      drawInteraction.current = null;
    }
    setIsDrawingMode(false);
  };

  const clearAllPolygons = () => {
    if (vectorSource.current) {
      vectorSource.current.clear();
    }
    setPolygons([]);
    setJsonFileName('');
    toast({
      title: 'Cleared',
      description: 'All polygons have been removed',
    });
  };

  const displayPolygonsOnMap = (polygonArray: any[], isLand: boolean = false) => {
    if (!vectorSource.current || !mapInstance.current) return;

    vectorSource.current.clear();
    const features: Feature[] = [];

    polygonArray.forEach((geojson, index) => {
      const coordinates = geojson.coordinates[0].map((coord: [number, number]) => 
        fromLonLat([coord[0], coord[1]])
      );
      const polygonGeom = new Polygon([coordinates]);
      const feature = new Feature({ geometry: polygonGeom });
      feature.set('isLand', isLand);
      feature.set('label', isLand ? `Parcel ${index + 1}` : '');
      features.push(feature);
    });

    vectorSource.current.addFeatures(features);

    // Fit map to all features
    const extent = vectorSource.current.getExtent();
    mapInstance.current.getView().fit(extent, { 
      padding: [50, 50, 50, 50],
      duration: 1000
    });
  };

  const handleGeoJsonUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.match(/\.(json|geojson|topojson)$/i)) {
      toast({
        title: 'Invalid file',
        description: 'Please upload a GeoJSON or TopoJSON file',
        variant: 'destructive',
      });
      return;
    }

    try {
      const text = await file.text();
      let jsonData = JSON.parse(text);
      
      // Check if it's TopoJSON and convert to GeoJSON
      if (jsonData.type === 'Topology') {
        toast({
          title: 'Converting TopoJSON',
          description: 'Converting TopoJSON to GeoJSON...',
        });
        
        // Convert TopoJSON to GeoJSON FeatureCollection
        const objectKeys = Object.keys(jsonData.objects);
        if (objectKeys.length === 0) {
          throw new Error('TopoJSON has no objects to convert');
        }
        
        // Convert first object (or all objects if multiple)
        const features: any[] = [];
        for (const key of objectKeys) {
          const geojson = topojson.feature(jsonData, jsonData.objects[key]);
          if (geojson.type === 'FeatureCollection') {
            features.push(...geojson.features);
          } else if (geojson.type === 'Feature') {
            features.push(geojson);
          }
        }
        
        jsonData = {
          type: 'FeatureCollection',
          features: features,
        };
      }
      
      // Validate GeoJSON structure
      const validated = geoJsonSchema.parse(jsonData);
      
      let extractedPolygons: any[] = [];

      if (validated.type === 'FeatureCollection') {
        // Multiple parcels
        extractedPolygons = validated.features.map(f => f.geometry);
        toast({
          title: 'File loaded successfully',
          description: `${extractedPolygons.length} parcel(s) imported`,
        });
      } else if (validated.type === 'Feature') {
        // Single feature
        extractedPolygons = [validated.geometry];
        toast({
          title: 'File loaded successfully',
          description: '1 parcel imported',
        });
      } else if (validated.type === 'Polygon') {
        // Direct polygon
        extractedPolygons = [validated];
        toast({
          title: 'File loaded successfully',
          description: '1 parcel imported',
        });
      }

      setPolygons(extractedPolygons);
      displayPolygonsOnMap(extractedPolygons, true);
      setJsonFileName(file.name);
      
    } catch (error) {
      console.error('File parsing error:', error);
      let errorMessage = 'Failed to parse file';
      
      if (error instanceof z.ZodError) {
        errorMessage = 'Invalid format. Must contain Polygon geometries.';
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }
      
      toast({
        title: 'Invalid File',
        description: errorMessage,
        variant: 'destructive',
      });
    }
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
        setPolygons([geojson]);
        displayPolygonsOnMap([geojson], listingRes.data?.property_type === 'land');
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
      
      toast({
        title: 'Media removed',
        description: 'Media file has been deleted',
      });
    } catch (error) {
      console.error('Error removing media:', error);
      toast({
        title: 'Error',
        description: 'Failed to remove media',
        variant: 'destructive',
      });
    }
  };

  const uploadFiles = async (listingId: string) => {
    if (selectedFiles.length === 0) return;

    setUploading(true);
    try {
      const uploadPromises = selectedFiles.map(async (file) => {
        const fileExt = file.name.split('.').pop();
        const fileName = `${listingId}/${Math.random()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('listing-images')
          .upload(fileName, file);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('listing-images')
          .getPublicUrl(fileName);

        return {
          listing_id: listingId,
          file_url: publicUrl,
          media_type: 'image' as 'image',
        };
      });

      const mediaRecords = await Promise.all(uploadPromises);

      const { error: insertError } = await supabase
        .from('listing_media')
        .insert(mediaRecords);

      if (insertError) throw insertError;
    } catch (error) {
      console.error('Error uploading files:', error);
      throw error;
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation: Land must have JSON upload
    if (isLandProperty && jsonFileName === '') {
      toast({
        title: 'File Required',
        description: 'Land parcels must be uploaded via GeoJSON or TopoJSON file',
        variant: 'destructive',
      });
      return;
    }

    if (polygons.length === 0) {
      toast({
        title: 'Boundary Required',
        description: isLandProperty 
          ? 'Please upload a GeoJSON or TopoJSON file with parcel boundaries'
          : 'Please draw the property boundary on the map',
        variant: 'destructive',
      });
      return;
    }

    // Validate all polygons
    for (const polygon of polygons) {
      const validation = validatePolygon(polygon);
      if (!validation.isValid) {
        toast({
          title: 'Invalid Polygon',
          description: validation.errors.join(', '),
          variant: 'destructive',
        });
        return;
      }
    }

    setLoading(true);
    try {
      // Use first polygon for single polygon or create MultiPolygon
      const primaryPolygon = polygons[0];
      const turfPolygon = turf.polygon(primaryPolygon.coordinates);
      const area = turf.area(turfPolygon);
      const centroid = turf.centroid(turfPolygon);

      // Auto-detect administrative boundaries
      toast({
        title: 'Detecting Location',
        description: 'Determining region, district, and ward...',
      });

      let adminBoundaries = {
        region_id: null,
        district_id: null,
        ward_id: null,
        street_village_id: null,
      };

      try {
        const { data: boundariesData, error: boundariesError } = await supabase.functions.invoke(
          'detect-admin-boundaries',
          {
            body: { polygon: { type: 'Feature', geometry: primaryPolygon } },
          }
        );

        if (boundariesError) {
          console.error('Error detecting boundaries:', boundariesError);
          toast({
            title: 'Location Detection Warning',
            description: 'Could not auto-detect administrative boundaries. You can continue without them.',
            variant: 'default',
          });
        } else if (boundariesData?.success) {
          adminBoundaries = boundariesData.boundaries;
          
          const detectedAreas: string[] = [];
          if (adminBoundaries.region_id) detectedAreas.push('region');
          if (adminBoundaries.district_id) detectedAreas.push('district');
          if (adminBoundaries.ward_id) detectedAreas.push('ward');
          if (adminBoundaries.street_village_id) detectedAreas.push('street/village');
          
          if (detectedAreas.length > 0) {
            toast({
              title: 'Location Detected',
              description: `Auto-detected: ${detectedAreas.join(', ')}`,
            });
          }
        }
      } catch (detectionError) {
        console.error('Error in boundary detection:', detectionError);
        // Continue without boundaries - non-blocking
      }

      // Create or update listing
      const listingData = {
        title: formData.title,
        description: formData.description,
        listing_type: formData.listing_type,
        property_type: formData.property_type,
        price: formData.price ? parseFloat(formData.price) : null,
        currency: formData.currency,
        location_label: formData.location_label,
        region: formData.region,
        district: formData.district,
        ward: formData.ward,
        region_id: adminBoundaries.region_id,
        district_id: adminBoundaries.district_id,
        ward_id: adminBoundaries.ward_id,
        street_village_id: adminBoundaries.street_village_id,
        owner_id: user!.id,
        status: (publishOnSave ? 'published' : 'draft') as 'draft' | 'published',
        verification_status: 'unverified' as 'unverified',
      };

      let listingId = id;

      if (id) {
        const { error } = await supabase
          .from('listings')
          .update(listingData)
          .eq('id', id);

        if (error) throw error;

        const { error: polygonError } = await supabase
          .from('listing_polygons')
          .update({
            geojson: primaryPolygon,
            area_m2: area,
            centroid_lat: centroid.geometry.coordinates[1],
            centroid_lng: centroid.geometry.coordinates[0],
          })
          .eq('listing_id', id);

        if (polygonError) throw polygonError;

        await logAuditAction('UPDATE_LISTING', user!.id, id);
      } else {
        const { data, error } = await supabase
          .from('listings')
          .insert(listingData)
          .select()
          .single();

        if (error) throw error;
        listingId = data.id;

        const { error: polygonError } = await supabase
          .from('listing_polygons')
          .insert({
            listing_id: data.id,
            geojson: primaryPolygon,
            area_m2: area,
            centroid_lat: centroid.geometry.coordinates[1],
            centroid_lng: centroid.geometry.coordinates[0],
          });

        if (polygonError) throw polygonError;

        await logAuditAction('CREATE_LISTING', user!.id, data.id);
      }

      if (selectedFiles.length > 0) {
        await uploadFiles(listingId!);
      }

      toast({
        title: id ? 'Listing Updated' : 'Listing Created',
        description: publishOnSave 
          ? `Your listing has been ${id ? 'updated and published' : 'created and published'} successfully` 
          : `Your listing has been ${id ? 'updated' : 'created'} as a draft`,
      });

      navigate('/dashboard');
    } catch (error) {
      console.error('Error saving listing:', error);
      toast({
        title: 'Error',
        description: 'Failed to save listing',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <MainLayout>
      <div className="container mx-auto p-6 max-w-5xl">
        <Button
          variant="ghost"
          onClick={() => navigate('/dashboard')}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Dashboard
        </Button>

        <Card>
          <CardHeader>
            <CardTitle>{id ? 'Edit Listing' : 'Create New Listing'}</CardTitle>
            <CardDescription>
              {isLandProperty 
                ? 'Upload GeoJSON or TopoJSON file for land parcels (can contain multiple parcels)'
                : 'Draw property boundary on the map'
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Property Type Selection */}
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="property_type">Property Type *</Label>
                  <Select
                    value={formData.property_type}
                    onValueChange={(value) => {
                      setFormData({ ...formData, property_type: value as any });
                      clearAllPolygons();
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="land">Land / Parcel</SelectItem>
                      <SelectItem value="house">House</SelectItem>
                      <SelectItem value="apartment">Apartment</SelectItem>
                      <SelectItem value="commercial">Commercial</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="listing_type">Listing Type *</Label>
                  <Select
                    value={formData.listing_type}
                    onValueChange={(value) => setFormData({ ...formData, listing_type: value as any })}
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
              </div>

              {/* GeoJSON Upload or Drawing Instructions */}
              {isLandProperty ? (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Land parcels must be uploaded as GeoJSON or TopoJSON.</strong> These files can contain multiple parcels. Property boundaries are sensitive information in Tanzania.
                  </AlertDescription>
                </Alert>
              ) : (
                <Alert>
                  <MapIcon className="h-4 w-4" />
                  <AlertDescription>
                    Draw the property boundary by clicking points on the map. Double-click the last point to complete the polygon.
                  </AlertDescription>
                </Alert>
              )}

              {/* GeoJSON/TopoJSON Upload Section (Land Only) */}
              {isLandProperty && (
                <div className="space-y-2">
                  <Label htmlFor="geojson-upload">Upload GeoJSON or TopoJSON File *</Label>
                  <div className="flex items-center gap-4">
                    <Input
                      id="geojson-upload"
                      type="file"
                      accept=".json,.geojson,.topojson"
                      onChange={handleGeoJsonUpload}
                      className="flex-1"
                    />
                    {jsonFileName && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <FileJson className="h-4 w-4" />
                        <span>{jsonFileName}</span>
                      </div>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Supports GeoJSON or TopoJSON format with single or multiple parcels
                  </p>
                </div>
              )}

              {/* Map Visualization */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Property Boundary *</Label>
                  {polygons.length > 0 && (
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">
                        {polygons.length} polygon(s)
                      </span>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={clearAllPolygons}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Clear All
                      </Button>
                    </div>
                  )}
                </div>
                <div ref={mapRef} className="w-full h-[500px] rounded-lg border" />
                {isDrawingMode && !isLandProperty && (
                  <p className="text-sm text-primary flex items-center gap-2">
                    <Pencil className="h-4 w-4" />
                    Drawing mode active - Click on the map to draw boundary
                  </p>
                )}
                {polygons.length > 0 && (
                  <p className="text-sm text-success">
                    ✓ {polygons.length} polygon(s) loaded
                  </p>
                )}
              </div>

              {/* Polygon Validation */}
              {polygons.length > 0 && polygons.map((polygon, idx) => (
                <PolygonValidationPanel key={idx} geojson={polygon} />
              ))}

              {/* Property Details */}
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Title *</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="location">Location *</Label>
                  <Input
                    id="location"
                    value={formData.location_label}
                    onChange={(e) => setFormData({ ...formData, location_label: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="price">Price</Label>
                  <Input
                    id="price"
                    type="number"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="currency">Currency</Label>
                  <Input
                    id="currency"
                    value={formData.currency}
                    onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                  />
                </div>

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

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="ward">Ward</Label>
                  <Input
                    id="ward"
                    value={formData.ward}
                    onChange={(e) => setFormData({ ...formData, ward: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={4}
                />
              </div>

              {/* Image Upload */}
              <div className="space-y-2">
                <Label htmlFor="images">Property Images</Label>
                <Input
                  id="images"
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleFileSelect}
                />
                
                {selectedFiles.length > 0 && (
                  <div className="grid grid-cols-3 gap-2 mt-2">
                    {selectedFiles.map((file, index) => (
                      <div key={index} className="relative group">
                        <img
                          src={URL.createObjectURL(file)}
                          alt={`Preview ${index + 1}`}
                          className="w-full h-24 object-cover rounded"
                        />
                        <button
                          type="button"
                          onClick={() => removeFile(index)}
                          className="absolute top-1 right-1 bg-destructive text-destructive-foreground rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {existingMedia.length > 0 && (
                  <div className="grid grid-cols-3 gap-2 mt-2">
                    {existingMedia.map((media) => (
                      <div key={media.id} className="relative group">
                        <img
                          src={media.file_url}
                          alt="Listing media"
                          className="w-full h-24 object-cover rounded"
                        />
                        <button
                          type="button"
                          onClick={() => removeExistingMedia(media.id)}
                          className="absolute top-1 right-1 bg-destructive text-destructive-foreground rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Submit Buttons */}
              <div className="flex gap-4 justify-end pt-4 border-t">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate('/dashboard')}
                  disabled={loading || uploading}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  variant="outline"
                  disabled={loading || uploading || polygons.length === 0}
                  onClick={() => setPublishOnSave(false)}
                >
                  <Save className="h-4 w-4 mr-2" />
                  {loading && !publishOnSave ? 'Saving...' : 'Save as Draft'}
                </Button>
                <Button 
                  type="submit" 
                  disabled={loading || uploading || polygons.length === 0}
                  onClick={() => setPublishOnSave(true)}
                >
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  {loading && publishOnSave ? 'Publishing...' : existingListing?.status === 'published' ? 'Update & Keep Published' : 'Publish Listing'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
