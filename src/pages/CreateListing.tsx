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
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Upload, X, FileJson, Save, AlertCircle, Trash2, Map as MapIcon, Pencil, CheckCircle2, Search, List } from 'lucide-react';
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
  z.object({
    type: z.literal('Feature'),
    properties: z.record(z.any()).optional(),
    geometry: z.object({
      type: z.literal('Polygon'),
      coordinates: z.array(z.array(z.array(z.number()))),
    }),
  }),
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
  
  // Batch upload states
  const [multipleFeatures, setMultipleFeatures] = useState<any[]>([]);
  const [availableProperties, setAvailableProperties] = useState<string[]>([]);
  const [showBatchUpload, setShowBatchUpload] = useState(false);
  const [batchUploadStep, setBatchUploadStep] = useState<'preview' | 'mapping' | 'confirm'>('preview');
  const [validationSummary, setValidationSummary] = useState<{
    total: number;
    valid: number;
    invalid: number;
    warnings: string[];
  }>({ total: 0, valid: 0, invalid: 0, warnings: [] });
  const [fieldMapping, setFieldMapping] = useState<{
    blockNumber: string;
    plotNumber: string;
    streetName: string;
    plannedUse: string;
    hasTitle: string;
  }>({
    blockNumber: '',
    plotNumber: '',
    streetName: '',
    plannedUse: '',
    hasTitle: ''
  });
  
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
  });

  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [existingMedia, setExistingMedia] = useState<any[]>([]);
  const [addressSearch, setAddressSearch] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);

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

    mapInstance.current.getView().setConstrainResolution(false);
  };

  const enableDrawingMode = () => {
    if (!mapInstance.current || !vectorSource.current) return;

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
    setMultipleFeatures([]);
    setShowBatchUpload(false);
    toast({
      title: 'Cleared',
      description: 'All polygons have been removed',
    });
  };

  const searchAddress = async () => {
    if (!addressSearch.trim()) return;

    setIsSearching(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(addressSearch)}&countrycodes=tz&limit=5`
      );
      const data = await response.json();
      setSearchResults(data);
      
      if (data.length === 0) {
        toast({
          title: 'No results',
          description: 'No locations found for this search',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Search error:', error);
      toast({
        title: 'Search failed',
        description: 'Failed to search for address',
        variant: 'destructive',
      });
    } finally {
      setIsSearching(false);
    }
  };

  const selectSearchResult = (result: any) => {
    if (!mapInstance.current) return;

    const lat = parseFloat(result.lat);
    const lon = parseFloat(result.lon);
    const coordinates = fromLonLat([lon, lat]);

    mapInstance.current.getView().animate({
      center: coordinates,
      zoom: 16,
      duration: 1000,
    });

    setSearchResults([]);
    setAddressSearch(result.display_name);

    toast({
      title: 'Location found',
      description: 'Map centered on the selected location',
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
      
      // Handle TopoJSON
      if (jsonData.type === 'Topology') {
        toast({
          title: 'Converting TopoJSON',
          description: 'Converting TopoJSON to GeoJSON...',
        });
        
        const objectKeys = Object.keys(jsonData.objects);
        if (objectKeys.length === 0) {
          throw new Error('TopoJSON has no objects to convert');
        }
        
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
      let extractedFeatures: any[] = [];

      if (validated.type === 'FeatureCollection') {
        extractedFeatures = validated.features;
        extractedPolygons = validated.features.map(f => f.geometry);
        
        // Check for multiple features - trigger batch upload
        if (extractedFeatures.length > 1) {
          setMultipleFeatures(extractedFeatures);
          
          // Extract available property names from first feature
          const firstFeature = extractedFeatures[0];
          if (firstFeature.properties) {
            const props = Object.keys(firstFeature.properties);
            setAvailableProperties(props);
            
            // Auto-detect field mappings
            autoDetectFieldMapping(props);
          }
          
          setShowBatchUpload(true);
          setBatchUploadStep('preview');
          setPolygons(extractedPolygons);
          displayPolygonsOnMap(extractedPolygons, true);
          toast({
            title: 'Multiple plots detected',
            description: `Found ${extractedFeatures.length} plots. Review and map the fields.`,
          });
          setJsonFileName(file.name);
          return;
        }
        
        toast({
          title: 'File loaded successfully',
          description: `${extractedPolygons.length} parcel(s) imported`,
        });
      } else if (validated.type === 'Feature') {
        extractedPolygons = [validated.geometry];
        toast({
          title: 'File loaded successfully',
          description: '1 parcel imported',
        });
      } else if (validated.type === 'Polygon') {
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

  const autoDetectFieldMapping = (properties: string[]) => {
    const mapping = {
      blockNumber: '',
      plotNumber: '',
      streetName: '',
      plannedUse: '',
      hasTitle: ''
    };

    // Common field name patterns
    const patterns = {
      blockNumber: ['block', 'block_number', 'block_no', 'blk', 'block_num'],
      plotNumber: ['plot', 'plot_number', 'plot_no', 'parcel', 'parcel_number', 'plot_num'],
      streetName: ['street', 'street_name', 'road', 'locality', 'address', 'location'],
      plannedUse: ['use', 'planned_use', 'land_use', 'usage', 'purpose', 'zoning'],
      hasTitle: ['title', 'has_title', 'titled', 'deed', 'ownership', 'title_status']
    };

    properties.forEach(prop => {
      const lowerProp = prop.toLowerCase();
      
      Object.entries(patterns).forEach(([field, keywords]) => {
        if (keywords.some(keyword => lowerProp.includes(keyword))) {
          mapping[field as keyof typeof mapping] = prop;
        }
      });
    });

    setFieldMapping(mapping);
    
    // Show toast if auto-detection found matches
    const detected = Object.values(mapping).filter(v => v).length;
    if (detected > 0) {
      toast({
        title: 'Fields auto-detected',
        description: `Automatically mapped ${detected} field(s). Please review and adjust if needed.`,
      });
    }
  };

  const validateBatchData = () => {
    let valid = 0;
    let invalid = 0;
    const warnings: string[] = [];

    multipleFeatures.forEach((feature, index) => {
      const props = feature.properties || {};
      const blockNum = props[fieldMapping.blockNumber];
      const plotNum = props[fieldMapping.plotNumber];

      if (!blockNum || !plotNum) {
        invalid++;
        warnings.push(`Row ${index + 1}: Missing block or plot number`);
      } else {
        valid++;
      }
    });

    setValidationSummary({
      total: multipleFeatures.length,
      valid,
      invalid,
      warnings: warnings.slice(0, 5) // Show first 5 warnings
    });

    return invalid === 0;
  };

  const handleBatchSubmit = async () => {
    if (!user) {
      toast({
        title: 'Authentication required',
        description: 'You must be logged in to create listings',
        variant: 'destructive',
      });
      navigate("/auth");
      return;
    }

    if (multipleFeatures.length === 0) {
      toast({
        title: 'No plots to upload',
        description: 'Please upload a file with plots',
        variant: 'destructive',
      });
      return;
    }

    // Validate field mapping
    if (!fieldMapping.blockNumber || !fieldMapping.plotNumber) {
      toast({
        title: 'Missing required fields',
        description: 'Please map at least Block Number and Plot Number fields',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);

    try {
      let successCount = 0;
      let errorCount = 0;

      for (const feature of multipleFeatures) {
        try {
          const props = feature.properties || {};
          
          // Extract mapped values
          const blockNumber = props[fieldMapping.blockNumber]?.toString() || '';
          const plotNumber = props[fieldMapping.plotNumber]?.toString() || '';
          const streetName = fieldMapping.streetName ? props[fieldMapping.streetName]?.toString() || '' : '';
          const plannedUse = fieldMapping.plannedUse ? props[fieldMapping.plannedUse]?.toString() || '' : '';
          const hasTitleValue = fieldMapping.hasTitle ? props[fieldMapping.hasTitle] : 0;
          const hasTitle = hasTitleValue === 1 || hasTitleValue === '1' || hasTitleValue === true;

          // Create GeoJSON for this plot
          const plotGeoJSON = {
            type: 'Polygon',
            coordinates: feature.geometry.coordinates
          };

          // Calculate area and centroid
          const turfPolygon = turf.polygon(plotGeoJSON.coordinates);
          const area = turf.area(turfPolygon);
          const centroid = turf.centroid(turfPolygon);
          const [lng, lat] = centroid.geometry.coordinates;

          // Insert listing
          const { data: listing, error: listingError } = await supabase
            .from('listings')
            .insert({
              title: `Plot ${plotNumber}, Block ${blockNumber}`,
              location_label: streetName || `Block ${blockNumber}`,
              listing_type: 'sale',
              property_type: 'land',
              owner_id: user.id,
              status: 'draft',
              block_number: blockNumber,
              plot_number: plotNumber,
              street_name: streetName,
              planned_use: plannedUse,
              has_title: hasTitle,
              verification_status: 'unverified'
            })
            .select()
            .single();

          if (listingError) throw listingError;

          // Insert polygon
          const { error: polygonError } = await supabase
            .from('listing_polygons')
            .insert({
              listing_id: listing.id,
              geojson: plotGeoJSON,
              area_m2: area,
              centroid_lat: lat,
              centroid_lng: lng
            });

          if (polygonError) throw polygonError;

          await logAuditAction('CREATE_LISTING', user.id, listing.id);

          successCount++;
        } catch (error) {
          console.error('Error creating listing:', error);
          errorCount++;
        }
      }

      toast({
        title: 'Batch upload complete',
        description: `Successfully created ${successCount} listings${errorCount > 0 ? ` (${errorCount} failed)` : ''}`,
      });
      navigate('/dashboard');
    } catch (error) {
      console.error('Batch upload error:', error);
      toast({
        title: 'Upload failed',
        description: 'Failed to upload plots',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
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
          block_number: listingRes.data.block_number || '',
          plot_number: listingRes.data.plot_number || '',
          street_name: listingRes.data.street_name || '',
          planned_use: listingRes.data.planned_use || '',
          has_title: listingRes.data.has_title || false,
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
      const primaryPolygon = polygons[0];
      const turfPolygon = turf.polygon(primaryPolygon.coordinates);
      const area = turf.area(turfPolygon);
      const centroid = turf.centroid(turfPolygon);

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
      }

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
        block_number: formData.block_number,
        plot_number: formData.plot_number,
        street_name: formData.street_name,
        planned_use: formData.planned_use,
        has_title: formData.has_title,
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

        {/* Batch Upload Modal */}
        {showBatchUpload && (
          <Card className="mb-6 border-primary shadow-lg">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <List className="h-5 w-5" />
                    Batch Upload - {multipleFeatures.length} Plots Detected
                  </CardTitle>
                  <CardDescription>
                    Map the properties from your file to Tanzania land parcel standards
                  </CardDescription>
                </div>
                <div className="flex gap-1">
                  {['preview', 'mapping', 'confirm'].map((step, idx) => (
                    <div
                      key={step}
                      className={`h-2 w-16 rounded-full transition-colors ${
                        batchUploadStep === step ? 'bg-primary' : 'bg-muted'
                      }`}
                    />
                  ))}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Step 1: Data Preview */}
              {batchUploadStep === 'preview' && (
                <div className="space-y-4">
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      <strong>Step 1: Preview Your Data</strong> - Review the plots from your file before mapping fields.
                    </AlertDescription>
                  </Alert>

                  <div className="border rounded-lg overflow-hidden">
                    <div className="bg-muted px-4 py-3 border-b">
                      <h3 className="font-medium">Data Preview (First 5 plots)</h3>
                      <p className="text-sm text-muted-foreground">
                        Total plots in file: {multipleFeatures.length}
                      </p>
                    </div>
                    <div className="overflow-x-auto max-h-96">
                      <table className="w-full text-sm">
                        <thead className="bg-muted/50 sticky top-0">
                          <tr>
                            <th className="px-4 py-2 text-left font-medium">#</th>
                            {availableProperties.slice(0, 6).map(prop => (
                              <th key={prop} className="px-4 py-2 text-left font-medium">
                                {prop}
                              </th>
                            ))}
                            {availableProperties.length > 6 && (
                              <th className="px-4 py-2 text-left font-medium">
                                +{availableProperties.length - 6} more
                              </th>
                            )}
                          </tr>
                        </thead>
                        <tbody>
                          {multipleFeatures.slice(0, 5).map((feature, idx) => (
                            <tr key={idx} className="border-b hover:bg-muted/30">
                              <td className="px-4 py-2 font-medium">{idx + 1}</td>
                              {availableProperties.slice(0, 6).map(prop => (
                                <td key={prop} className="px-4 py-2 max-w-[200px] truncate">
                                  {String(feature.properties?.[prop] || '-')}
                                </td>
                              ))}
                              {availableProperties.length > 6 && (
                                <td className="px-4 py-2 text-muted-foreground">...</td>
                              )}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="flex justify-end gap-3">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setShowBatchUpload(false);
                        setMultipleFeatures([]);
                        clearAllPolygons();
                      }}
                    >
                      Cancel
                    </Button>
                    <Button onClick={() => setBatchUploadStep('mapping')}>
                      Next: Map Fields
                    </Button>
                  </div>
                </div>
              )}

              {/* Step 2: Field Mapping */}
              {batchUploadStep === 'mapping' && (
                <div className="space-y-4">
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      <strong>Step 2: Map Fields</strong> - Match your file's columns to Tanzania land parcel standards. Fields marked with auto-detection were suggested based on column names.
                    </AlertDescription>
                  </Alert>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="blockNumberField" className="text-sm font-medium flex items-center gap-2">
                        Block Number <span className="text-destructive">*</span>
                        {fieldMapping.blockNumber && (
                          <span className="text-xs text-primary font-normal">✓ Auto-detected</span>
                        )}
                      </Label>
                      <Select
                        value={fieldMapping.blockNumber}
                        onValueChange={(value) => setFieldMapping({...fieldMapping, blockNumber: value})}
                      >
                        <SelectTrigger id="blockNumberField">
                          <SelectValue placeholder="Select field for Block Number" />
                        </SelectTrigger>
                        <SelectContent>
                          {availableProperties.map(prop => (
                            <SelectItem key={prop} value={prop}>
                              {prop}
                              {fieldMapping.blockNumber === prop && ' (selected)'}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">
                        Example: A, B, C1, Block-5
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="plotNumberField" className="text-sm font-medium flex items-center gap-2">
                        Plot Number <span className="text-destructive">*</span>
                        {fieldMapping.plotNumber && (
                          <span className="text-xs text-primary font-normal">✓ Auto-detected</span>
                        )}
                      </Label>
                      <Select
                        value={fieldMapping.plotNumber}
                        onValueChange={(value) => setFieldMapping({...fieldMapping, plotNumber: value})}
                      >
                        <SelectTrigger id="plotNumberField">
                          <SelectValue placeholder="Select field for Plot Number" />
                        </SelectTrigger>
                        <SelectContent>
                          {availableProperties.map(prop => (
                            <SelectItem key={prop} value={prop}>
                              {prop}
                              {fieldMapping.plotNumber === prop && ' (selected)'}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">
                        Example: 123, 456, P-789
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="streetNameField" className="text-sm font-medium flex items-center gap-2">
                        Street Name/Locality
                        {fieldMapping.streetName && (
                          <span className="text-xs text-primary font-normal">✓ Auto-detected</span>
                        )}
                      </Label>
                      <Select
                        value={fieldMapping.streetName}
                        onValueChange={(value) => setFieldMapping({...fieldMapping, streetName: value})}
                      >
                        <SelectTrigger id="streetNameField">
                          <SelectValue placeholder="Optional - Select field" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">None</SelectItem>
                          {availableProperties.map(prop => (
                            <SelectItem key={prop} value={prop}>
                              {prop}
                              {fieldMapping.streetName === prop && ' (selected)'}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">
                        Optional: Masaki Street, Kinondoni Road
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="plannedUseField" className="text-sm font-medium flex items-center gap-2">
                        Planned Use
                        {fieldMapping.plannedUse && (
                          <span className="text-xs text-primary font-normal">✓ Auto-detected</span>
                        )}
                      </Label>
                      <Select
                        value={fieldMapping.plannedUse}
                        onValueChange={(value) => setFieldMapping({...fieldMapping, plannedUse: value})}
                      >
                        <SelectTrigger id="plannedUseField">
                          <SelectValue placeholder="Optional - Select field" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">None</SelectItem>
                          {availableProperties.map(prop => (
                            <SelectItem key={prop} value={prop}>
                              {prop}
                              {fieldMapping.plannedUse === prop && ' (selected)'}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">
                        Optional: Residential, Commercial, Mixed-Use
                      </p>
                    </div>

                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="hasTitleField" className="text-sm font-medium flex items-center gap-2">
                        Has Title Status (0 = No, 1 = Yes)
                        {fieldMapping.hasTitle && (
                          <span className="text-xs text-primary font-normal">✓ Auto-detected</span>
                        )}
                      </Label>
                      <Select
                        value={fieldMapping.hasTitle}
                        onValueChange={(value) => setFieldMapping({...fieldMapping, hasTitle: value})}
                      >
                        <SelectTrigger id="hasTitleField">
                          <SelectValue placeholder="Optional - Select field" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">None (all plots default to: No Title)</SelectItem>
                          {availableProperties.map(prop => (
                            <SelectItem key={prop} value={prop}>
                              {prop}
                              {fieldMapping.hasTitle === prop && ' (selected)'}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">
                        Optional: Field with 1 (has title) or 0 (no title). If not mapped, all plots default to "No Title".
                      </p>
                    </div>
                  </div>

                  <div className="flex justify-between gap-3 pt-4 border-t">
                    <Button
                      variant="outline"
                      onClick={() => setBatchUploadStep('preview')}
                    >
                      Back
                    </Button>
                    <Button
                      onClick={() => {
                        if (validateBatchData()) {
                          setBatchUploadStep('confirm');
                        }
                      }}
                      disabled={!fieldMapping.blockNumber || !fieldMapping.plotNumber}
                    >
                      Next: Confirm Upload
                    </Button>
                  </div>
                </div>
              )}

              {/* Step 3: Confirmation */}
              {batchUploadStep === 'confirm' && (
                <div className="space-y-4">
                  <Alert>
                    <CheckCircle2 className="h-4 w-4" />
                    <AlertDescription>
                      <strong>Step 3: Confirm & Upload</strong> - Review the summary before creating {multipleFeatures.length} listings.
                    </AlertDescription>
                  </Alert>

                  {/* Validation Summary */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card>
                      <CardContent className="pt-6">
                        <div className="text-center">
                          <p className="text-3xl font-bold text-primary">{validationSummary.total}</p>
                          <p className="text-sm text-muted-foreground">Total Plots</p>
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-6">
                        <div className="text-center">
                          <p className="text-3xl font-bold text-green-600">{validationSummary.valid}</p>
                          <p className="text-sm text-muted-foreground">Valid</p>
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-6">
                        <div className="text-center">
                          <p className="text-3xl font-bold text-destructive">{validationSummary.invalid}</p>
                          <p className="text-sm text-muted-foreground">Issues</p>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Warnings */}
                  {validationSummary.warnings.length > 0 && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        <p className="font-medium mb-2">Issues found:</p>
                        <ul className="list-disc list-inside space-y-1 text-sm">
                          {validationSummary.warnings.map((warning, idx) => (
                            <li key={idx}>{warning}</li>
                          ))}
                        </ul>
                        {validationSummary.invalid > 5 && (
                          <p className="text-sm mt-2">
                            ...and {validationSummary.invalid - 5} more issues
                          </p>
                        )}
                      </AlertDescription>
                    </Alert>
                  )}

                  {/* Field Mapping Summary */}
                  <div className="border rounded-lg p-4 bg-muted/30">
                    <h3 className="font-medium mb-3">Field Mapping Summary</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Block Number:</span>
                        <span className="font-medium">{fieldMapping.blockNumber || 'Not mapped'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Plot Number:</span>
                        <span className="font-medium">{fieldMapping.plotNumber || 'Not mapped'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Street Name:</span>
                        <span className="font-medium">{fieldMapping.streetName || 'Not mapped'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Planned Use:</span>
                        <span className="font-medium">{fieldMapping.plannedUse || 'Not mapped'}</span>
                      </div>
                      <div className="flex justify-between md:col-span-2">
                        <span className="text-muted-foreground">Title Status:</span>
                        <span className="font-medium">{fieldMapping.hasTitle || 'Not mapped (defaults to No Title)'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Sample Preview */}
                  <div className="border rounded-lg overflow-hidden">
                    <div className="bg-muted px-4 py-3 border-b">
                      <h3 className="font-medium">Preview: First 3 Listings</h3>
                    </div>
                    <div className="divide-y">
                      {multipleFeatures.slice(0, 3).map((feature, idx) => {
                        const props = feature.properties || {};
                        const blockNum = props[fieldMapping.blockNumber] || 'N/A';
                        const plotNum = props[fieldMapping.plotNumber] || 'N/A';
                        const street = props[fieldMapping.streetName] || 'N/A';
                        
                        return (
                          <div key={idx} className="p-4">
                            <p className="font-medium">
                              Plot {plotNum}, Block {blockNum}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              Location: {street}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="flex justify-between gap-3 pt-4 border-t">
                    <Button
                      variant="outline"
                      onClick={() => setBatchUploadStep('mapping')}
                      disabled={loading}
                    >
                      Back
                    </Button>
                    <div className="flex gap-3">
                      <Button
                        variant="outline"
                        onClick={() => {
                          setShowBatchUpload(false);
                          setMultipleFeatures([]);
                          setBatchUploadStep('preview');
                          setFieldMapping({
                            blockNumber: '',
                            plotNumber: '',
                            streetName: '',
                            plannedUse: '',
                            hasTitle: ''
                          });
                          clearAllPolygons();
                        }}
                        disabled={loading}
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={handleBatchSubmit}
                        disabled={loading || validationSummary.invalid > 0}
                        size="lg"
                      >
                        {loading ? (
                          <>
                            <span className="animate-pulse">Processing...</span>
                          </>
                        ) : (
                          <>
                            <Upload className="h-4 w-4 mr-2" />
                            Create {validationSummary.valid} Listings
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {!showBatchUpload && (
          <Card>
            <CardHeader>
              <CardTitle>{id ? 'Edit Listing' : 'Create New Listing'}</CardTitle>
              <CardDescription>
                {isLandProperty 
                  ? 'Upload GeoJSON or TopoJSON file for land parcels (supports batch upload)'
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

                {/* Alerts */}
                {isLandProperty ? (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      <strong>Land parcels must be uploaded as GeoJSON or TopoJSON.</strong> Files can contain multiple plots for batch processing.
                    </AlertDescription>
                  </Alert>
                ) : (
                  <Alert>
                    <MapIcon className="h-4 w-4" />
                    <AlertDescription>
                      Draw the property boundary by clicking points on the map. Double-click to complete.
                    </AlertDescription>
                  </Alert>
                )}

                {/* GeoJSON/TopoJSON Upload (Land Only) */}
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
                      Supports single or multiple parcels. Multiple plots will trigger batch upload.
                    </p>
                  </div>
                )}

                {/* Map */}
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

                  {/* Address Search */}
                  <div className="relative">
                    <div className="flex gap-2">
                      <Input
                        placeholder="Search for a location (e.g., Dar es Salaam, Tanzania)"
                        value={addressSearch}
                        onChange={(e) => setAddressSearch(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            searchAddress();
                          }
                        }}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={searchAddress}
                        disabled={isSearching || !addressSearch.trim()}
                      >
                        {isSearching ? 'Searching...' : 'Search'}
                      </Button>
                    </div>
                    
                    {searchResults.length > 0 && (
                      <div className="absolute z-10 w-full mt-1 bg-background border rounded-md shadow-lg max-h-60 overflow-y-auto">
                        {searchResults.map((result, idx) => (
                          <button
                            key={idx}
                            type="button"
                            className="w-full px-4 py-2 text-left hover:bg-muted transition-colors text-sm"
                            onClick={() => selectSearchResult(result)}
                          >
                            {result.display_name}
                          </button>
                        ))}
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

                  {/* Tanzania Land Parcel Fields (Land Only) */}
                  {isLandProperty && (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="block_number">Block Number</Label>
                        <Input
                          id="block_number"
                          value={formData.block_number}
                          onChange={(e) => setFormData({ ...formData, block_number: e.target.value })}
                          placeholder="e.g., A, B, C1"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="plot_number">Plot Number</Label>
                        <Input
                          id="plot_number"
                          value={formData.plot_number}
                          onChange={(e) => setFormData({ ...formData, plot_number: e.target.value })}
                          placeholder="e.g., 123, 456"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="street_name">Street Name / Locality</Label>
                        <Input
                          id="street_name"
                          value={formData.street_name}
                          onChange={(e) => setFormData({ ...formData, street_name: e.target.value })}
                          placeholder="e.g., Masaki Street"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="planned_use">Planned Use</Label>
                        <Input
                          id="planned_use"
                          value={formData.planned_use}
                          onChange={(e) => setFormData({ ...formData, planned_use: e.target.value })}
                          placeholder="e.g., Residential, Commercial"
                        />
                      </div>

                      <div className="space-y-2 md:col-span-2">
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="has_title"
                            checked={formData.has_title}
                            onCheckedChange={(checked) => setFormData({ ...formData, has_title: checked as boolean })}
                          />
                          <Label htmlFor="has_title" className="text-sm font-normal cursor-pointer">
                            This plot has legal title documentation
                          </Label>
                        </div>
                        <p className="text-xs text-muted-foreground ml-6">
                          Check this box if the plot has official title deed/certificate
                        </p>
                      </div>
                    </>
                  )}

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

                {/* Description */}
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={4}
                  />
                </div>

                {/* Images */}
                <div className="space-y-2">
                  <Label htmlFor="images">Images</Label>
                  <Input
                    id="images"
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handleFileSelect}
                  />
                  {selectedFiles.length > 0 && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                      {selectedFiles.map((file, idx) => (
                        <div key={idx} className="relative">
                          <img
                            src={URL.createObjectURL(file)}
                            alt={`Preview ${idx}`}
                            className="w-full h-32 object-cover rounded-lg"
                          />
                          <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            className="absolute top-2 right-2"
                            onClick={() => removeFile(idx)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                  {existingMedia.length > 0 && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                      {existingMedia.map((media) => (
                        <div key={media.id} className="relative">
                          <img
                            src={media.file_url}
                            alt="Existing media"
                            className="w-full h-32 object-cover rounded-lg"
                          />
                          <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            className="absolute top-2 right-2"
                            onClick={() => removeExistingMedia(media.id)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Publish Option */}
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="publish"
                    checked={publishOnSave}
                    onCheckedChange={(checked) => setPublishOnSave(checked as boolean)}
                  />
                  <Label htmlFor="publish" className="text-sm font-normal cursor-pointer">
                    Publish immediately (otherwise save as draft)
                  </Label>
                </div>

                {/* Submit Buttons */}
                <div className="flex gap-4">
                  <Button
                    type="submit"
                    disabled={loading || uploading}
                    className="flex-1"
                  >
                    {loading ? 'Saving...' : (
                      <>
                        <Save className="h-4 w-4 mr-2" />
                        {id ? 'Update' : 'Create'} Listing
                      </>
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => navigate('/dashboard')}
                    disabled={loading || uploading}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}
      </div>
    </MainLayout>
  );
}