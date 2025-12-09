import { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { MainLayout } from '@/components/layouts/MainLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger } from '@/components/ui/drawer';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MapPin, SlidersHorizontal, List, Navigation2, Layers, X, Maximize2, CheckCircle2, ExternalLink, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import { ListingWithDetails, ListingPolygon } from '@/types/database';
import { MapFilters } from '@/components/map/MapFilters';
import { PropertyList } from '@/components/map/PropertyList';
import Map from 'ol/Map';
import View from 'ol/View';
import TileLayer from 'ol/layer/Tile';
import XYZ from 'ol/source/XYZ';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import { Polygon } from 'ol/geom';
import Feature from 'ol/Feature';
import { Style, Fill, Stroke, Text } from 'ol/style';
import { fromLonLat } from 'ol/proj';
import Overlay from 'ol/Overlay';
import { getCenter } from 'ol/extent';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import 'ol/ol.css';

interface ListingWithPolygon extends ListingWithDetails {
  polygon?: ListingPolygon;
  owner?: { id: string; full_name: string; email: string };
  region_id?: string | null;
  district_id?: string | null;
  ward_id?: string | null;
  street_village_id?: string | null;
}

// Enhanced polygon color schemes with better visibility
const POLYGON_COLORS = {
  verified: { fill: '#10b981', stroke: '#059669', glow: '#10b98140' },
  pending: { fill: '#f59e0b', stroke: '#d97706', glow: '#f59e0b40' },
  unverified: { fill: '#6b7280', stroke: '#4b5563', glow: '#6b728040' },
  selected: { fill: '#f97316', stroke: '#ea580c', glow: '#f9731660' },
  hovered: { fill: '#3b82f6', stroke: '#2563eb', glow: '#3b82f640' },
};

export default function MapBrowse() {
  const [searchParams] = useSearchParams();
  const listingParam = searchParams.get('listing');
  const regionParam = searchParams.get('region');
  const districtParam = searchParams.get('district');
  const wardParam = searchParams.get('ward');
  
  // Data states
  const [listings, setListings] = useState<ListingWithPolygon[]>([]);
  const [loading, setLoading] = useState(true);
  const [regions, setRegions] = useState<any[]>([]);
  const [districts, setDistricts] = useState<any[]>([]);
  const [wards, setWards] = useState<any[]>([]);
  const [streets, setStreets] = useState<any[]>([]);
  const [initialFiltersApplied, setInitialFiltersApplied] = useState(false);
  
  // Filter states
  const [listingTypeFilter, setListingTypeFilter] = useState<string>('all');
  const [propertyTypeFilter, setPropertyTypeFilter] = useState<string>('all');
  const [dealerFilter, setDealerFilter] = useState<string>('all');
  const [regionFilter, setRegionFilter] = useState<string>('all');
  const [districtFilter, setDistrictFilter] = useState<string>('all');
  const [wardFilter, setWardFilter] = useState<string>('all');
  const [streetFilter, setStreetFilter] = useState<string>('all');
  const [spatialFilterMode, setSpatialFilterMode] = useState<'boundary' | 'id'>('boundary');
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 1000000000]);
  const [areaRange, setAreaRange] = useState<[number, number]>([0, 100000]);
  const [searchQuery, setSearchQuery] = useState('');
  
  // UI states
  const [basemap, setBasemap] = useState<'osm' | 'satellite' | 'topo' | 'terrain'>('satellite');
  const [showBasemapSelector, setShowBasemapSelector] = useState(false);
  const [selectedListing, setSelectedListing] = useState<ListingWithPolygon | null>(null);
  const [hoveredListingId, setHoveredListingId] = useState<string | null>(null);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationPermissionAsked, setLocationPermissionAsked] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [showPropertyList, setShowPropertyList] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [sortBy, setSortBy] = useState('distance');
  
  // Map refs
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<Map | null>(null);
  const popupRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<Overlay | null>(null);
  const baseTileLayerRef = useRef<TileLayer<XYZ> | null>(null);
  const boundaryLayerRef = useRef<VectorLayer<VectorSource> | null>(null);
  const listingsLayerRef = useRef<VectorLayer<VectorSource> | null>(null);
  const isMobile = useIsMobile();

  // Calculate max values for sliders
  const maxPrice = useMemo(() => {
    const prices = listings.filter(l => l.price).map(l => l.price!);
    return prices.length > 0 ? Math.max(...prices) : 1000000000;
  }, [listings]);

  const maxArea = useMemo(() => {
    const areas = listings.filter(l => l.polygon?.area_m2).map(l => l.polygon!.area_m2!);
    return areas.length > 0 ? Math.max(...areas) : 100000;
  }, [listings]);

  // Initialize price/area ranges when data loads
  useEffect(() => {
    if (listings.length > 0) {
      setPriceRange([0, maxPrice]);
      setAreaRange([0, maxArea]);
    }
  }, [maxPrice, maxArea]);

  // Unique dealers
  const uniqueDealers = useMemo(() => {
    const dealersMap: Record<string, { id: string; full_name: string }> = {};
    listings.forEach(listing => {
      if (listing.owner && !dealersMap[listing.owner.id]) {
        dealersMap[listing.owner.id] = { id: listing.owner.id, full_name: listing.owner.full_name };
      }
    });
    return Object.values(dealersMap);
  }, [listings]);

  // Active filters count
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (listingTypeFilter !== 'all') count++;
    if (propertyTypeFilter !== 'all') count++;
    if (dealerFilter !== 'all') count++;
    if (regionFilter !== 'all') count++;
    if (searchQuery) count++;
    if (priceRange[0] > 0 || priceRange[1] < maxPrice) count++;
    if (areaRange[0] > 0 || areaRange[1] < maxArea) count++;
    return count;
  }, [listingTypeFilter, propertyTypeFilter, dealerFilter, regionFilter, searchQuery, priceRange, areaRange, maxPrice, maxArea]);

  // Reset filters
  const resetFilters = useCallback(() => {
    setListingTypeFilter('all');
    setPropertyTypeFilter('all');
    setDealerFilter('all');
    setRegionFilter('all');
    setDistrictFilter('all');
    setWardFilter('all');
    setStreetFilter('all');
    setSearchQuery('');
    setPriceRange([0, maxPrice]);
    setAreaRange([0, maxArea]);
  }, [maxPrice, maxArea]);

  // Fetch data
  useEffect(() => {
    fetchListingsWithPolygons();
    requestUserLocation();
    fetchLocations();
  }, []);

  // Apply URL location filters on initial load
  useEffect(() => {
    if (initialFiltersApplied || regions.length === 0) return;
    
    const applyUrlFilters = async () => {
      if (regionParam) {
        setRegionFilter(regionParam);
        
        // Fetch districts for this region
        const { data: districtData } = await supabase
          .from('districts')
          .select('*')
          .eq('region_id', regionParam)
          .order('name');
        
        if (districtData) {
          setDistricts(districtData);
          
          if (districtParam) {
            setDistrictFilter(districtParam);
            
            // Fetch wards for this district
            const { data: wardData } = await supabase
              .from('wards')
              .select('id, name, code, district_id, geometry')
              .eq('district_id', districtParam)
              .order('name');
            
            if (wardData) {
              setWards(wardData);
              
              if (wardParam) {
                setWardFilter(wardParam);
              }
            }
          }
        }
      }
      
      setInitialFiltersApplied(true);
    };
    
    applyUrlFilters();
  }, [regions, regionParam, districtParam, wardParam, initialFiltersApplied]);

  const fetchLocations = async () => {
    const { data } = await supabase.from('regions').select('*').order('name');
    setRegions(data || []);
  };

  // Region filter effect
  useEffect(() => {
    if (regionFilter !== 'all') {
      fetchDistricts(regionFilter);
      setDistrictFilter('all');
      setWardFilter('all');
      setStreetFilter('all');
      fetchRegionWards(regionFilter);
    } else {
      setDistricts([]);
      setWards([]);
      setStreets([]);
      if (boundaryLayerRef.current && mapInstance.current) {
        mapInstance.current.removeLayer(boundaryLayerRef.current);
        boundaryLayerRef.current = null;
      }
    }
  }, [regionFilter]);

  const fetchRegionWards = async (regionId: string) => {
    const { data: districtData } = await supabase.from('districts').select('id').eq('region_id', regionId);
    if (!districtData?.length) return;
    
    const { data: wardData } = await supabase
      .from('wards')
      .select('id, name, code, district_id, geometry')
      .in('district_id', districtData.map(d => d.id));
    
    if (wardData?.length) {
      setWards(wardData);
      renderBoundaries(wardData, 'district');
    }
  };

  // District filter effect
  useEffect(() => {
    if (districtFilter !== 'all') {
      fetchWards(districtFilter);
      setWardFilter('all');
      setStreetFilter('all');
    } else {
      if (regionFilter !== 'all') fetchRegionWards(regionFilter);
      else setWards([]);
      setStreets([]);
    }
  }, [districtFilter]);

  // Ward filter effect
  useEffect(() => {
    if (wardFilter !== 'all') {
      fetchStreets(wardFilter);
      setStreetFilter('all');
      zoomToWard(wardFilter);
    } else {
      setStreets([]);
      if (districtFilter !== 'all') fetchWards(districtFilter);
      else if (regionFilter !== 'all') fetchRegionWards(regionFilter);
    }
  }, [wardFilter]);

  const fetchDistricts = async (regionId: string) => {
    const { data } = await supabase.from('districts').select('*').eq('region_id', regionId).order('name');
    setDistricts(data || []);
  };

  const fetchWards = async (districtId: string) => {
    const { data } = await supabase.from('wards').select('id, name, code, district_id, geometry').eq('district_id', districtId).order('name');
    setWards(data || []);
    if (data?.length) renderBoundaries(data, 'district');
  };

  const fetchStreets = async (wardId: string) => {
    const { data } = await supabase.from('streets_villages').select('*').eq('ward_id', wardId).order('name');
    setStreets(data || []);
  };

  // Render administrative boundaries
  const renderBoundaries = (boundaries: any[], level: 'region' | 'district' | 'ward') => {
    if (!mapInstance.current) return;

    if (boundaryLayerRef.current) {
      mapInstance.current.removeLayer(boundaryLayerRef.current);
      boundaryLayerRef.current = null;
    }

    const features: Feature[] = [];
    const allCoordinates: number[][] = [];

    const createFeature = (coords: [number, number][], boundary: any, strokeColor: string, fillOpacity: string) => {
      const transformed = coords.map(c => {
        const proj = fromLonLat([c[0], c[1]]);
        allCoordinates.push(proj as number[]);
        return proj;
      });
      const polygon = new Polygon([transformed]);
      const feature = new Feature({ geometry: polygon, boundary });
      feature.setStyle(new Style({
        fill: new Fill({ color: strokeColor + fillOpacity }),
        stroke: new Stroke({ color: strokeColor, width: level === 'ward' ? 3 : 2, lineDash: level === 'district' ? [8, 4] : undefined }),
        text: new Text({ text: boundary.name, font: 'bold 11px sans-serif', fill: new Fill({ color: '#fff' }), stroke: new Stroke({ color: strokeColor, width: 3 }), overflow: true }),
      }));
      return feature;
    };

    boundaries.forEach(b => {
      if (!b.geometry) return;
      try {
        const geo = typeof b.geometry === 'string' ? JSON.parse(b.geometry) : b.geometry;
        const color = level === 'ward' ? '#3b82f6' : '#8b5cf6';
        const opacity = level === 'ward' ? '20' : '10';
        
        if (geo.type === 'Polygon') features.push(createFeature(geo.coordinates[0], b, color, opacity));
        else if (geo.type === 'MultiPolygon') {
          geo.coordinates.forEach((pc: any) => { if (pc?.[0]) features.push(createFeature(pc[0], b, color, opacity)); });
        }
      } catch (e) { console.error('Boundary render error:', e); }
    });

    if (features.length > 0) {
      const source = new VectorSource({ features });
      const layer = new VectorLayer({ source });
      boundaryLayerRef.current = layer;
      mapInstance.current.addLayer(layer);
      
      if (allCoordinates.length > 0) {
        mapInstance.current.getView().fit(source.getExtent(), { padding: [50, 50, 50, 50], duration: 800, maxZoom: 14 });
      }
    }
  };

  const zoomToWard = (wardId: string) => {
    const ward = wards.find(w => w.id === wardId);
    if (ward?.geometry) renderBoundaries([ward], 'ward');
  };

  const fetchListingsWithPolygons = async () => {
    try {
      const { data, error } = await (supabase as any)
        .from('listings')
        .select(`*, polygon:listing_polygons(*), owner:profiles!owner_id(id, full_name, email)`)
        .eq('status', 'published');

      if (error) throw error;
      setListings((data || []).filter((l: any) => l.polygon));
    } catch (e) { console.error('Fetch listings error:', e); }
    finally { setLoading(false); }
  };

  const requestUserLocation = () => {
    if (navigator.geolocation && !locationPermissionAsked) {
      setLocationPermissionAsked(true);
      navigator.geolocation.getCurrentPosition(
        (pos) => setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => {}
      );
    }
  };

  // Point in polygon check
  const isPointInPolygon = (point: [number, number], polygon: [number, number][]) => {
    const [x, y] = point;
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const [xi, yi] = polygon[i], [xj, yj] = polygon[j];
      if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) inside = !inside;
    }
    return inside;
  };

  const isListingInWards = (listing: ListingWithPolygon, wardGeometries: any[]) => {
    if (!listing.polygon?.centroid_lat || !listing.polygon?.centroid_lng) return false;
    const point: [number, number] = [listing.polygon.centroid_lng, listing.polygon.centroid_lat];
    
    for (const ward of wardGeometries) {
      if (!ward.geometry) continue;
      try {
        const geo = typeof ward.geometry === 'string' ? JSON.parse(ward.geometry) : ward.geometry;
        if (geo?.type === 'Polygon' && geo.coordinates?.[0] && isPointInPolygon(point, geo.coordinates[0])) return true;
        if (geo?.type === 'MultiPolygon') {
          for (const pc of geo.coordinates) { if (pc?.[0] && isPointInPolygon(point, pc[0])) return true; }
        }
      } catch {}
    }
    return false;
  };

  // Active ward geometries for filtering
  const activeWardGeometries = useMemo(() => {
    if (wardFilter !== 'all') return wards.filter(w => w.id === wardFilter);
    if (districtFilter !== 'all' || regionFilter !== 'all') return wards;
    return [];
  }, [wardFilter, districtFilter, regionFilter, wards]);

  // Filtered listings
  const filteredListings = useMemo(() => {
    return listings.filter(l => {
      // Search
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        if (!l.title?.toLowerCase().includes(q) && !l.location_label?.toLowerCase().includes(q)) return false;
      }
      
      // Basic filters
      if (listingTypeFilter !== 'all' && l.listing_type !== listingTypeFilter) return false;
      if (propertyTypeFilter !== 'all' && l.property_type !== propertyTypeFilter) return false;
      if (dealerFilter !== 'all' && l.owner_id !== dealerFilter) return false;
      
      // Price
      if (l.price && (l.price < priceRange[0] || l.price > priceRange[1])) return false;
      
      // Area
      if (l.polygon?.area_m2 && (l.polygon.area_m2 < areaRange[0] || l.polygon.area_m2 > areaRange[1])) return false;
      
      // Location
      if (spatialFilterMode === 'boundary' && activeWardGeometries.length > 0) {
        if (wardFilter !== 'all') {
          if (l.ward_id !== wardFilter && !isListingInWards(l, activeWardGeometries)) return false;
        } else if (districtFilter !== 'all') {
          if (l.district_id !== districtFilter && !isListingInWards(l, activeWardGeometries)) return false;
        } else if (regionFilter !== 'all') {
          if (l.region_id !== regionFilter && !isListingInWards(l, activeWardGeometries)) return false;
        }
      } else {
        if (wardFilter !== 'all' && l.ward_id !== wardFilter) return false;
        if (districtFilter !== 'all' && l.district_id !== districtFilter) return false;
        if (regionFilter !== 'all' && l.region_id !== regionFilter) return false;
      }
      
      if (streetFilter !== 'all' && l.street_village_id !== streetFilter) return false;
      return true;
    });
  }, [listings, searchQuery, listingTypeFilter, propertyTypeFilter, dealerFilter, priceRange, areaRange, spatialFilterMode, activeWardGeometries, wardFilter, districtFilter, regionFilter, streetFilter]);

  // Sorted listings
  const sortedListings = useMemo(() => {
    const sorted = [...filteredListings];
    switch (sortBy) {
      case 'price-asc': return sorted.sort((a, b) => (a.price || 0) - (b.price || 0));
      case 'price-desc': return sorted.sort((a, b) => (b.price || 0) - (a.price || 0));
      case 'area-asc': return sorted.sort((a, b) => (a.polygon?.area_m2 || 0) - (b.polygon?.area_m2 || 0));
      case 'area-desc': return sorted.sort((a, b) => (b.polygon?.area_m2 || 0) - (a.polygon?.area_m2 || 0));
      case 'newest': return sorted.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      case 'distance':
      default:
        if (!userLocation) return sorted;
        return sorted.sort((a, b) => {
          const distA = a.polygon?.centroid_lat ? Math.hypot(a.polygon.centroid_lat - userLocation.lat, (a.polygon.centroid_lng || 0) - userLocation.lng) : Infinity;
          const distB = b.polygon?.centroid_lat ? Math.hypot(b.polygon.centroid_lat - userLocation.lat, (b.polygon.centroid_lng || 0) - userLocation.lng) : Infinity;
          return distA - distB;
        });
    }
  }, [filteredListings, sortBy, userLocation]);

  // Get polygon style
  const getPolygonStyle = useCallback((listing: ListingWithPolygon, isSelected: boolean, isHovered: boolean) => {
    let colors = POLYGON_COLORS.unverified;
    if (isSelected) colors = POLYGON_COLORS.selected;
    else if (isHovered) colors = POLYGON_COLORS.hovered;
    else if (listing.verification_status === 'verified') colors = POLYGON_COLORS.verified;
    else if (listing.verification_status === 'pending') colors = POLYGON_COLORS.pending;

    return new Style({
      fill: new Fill({ color: colors.fill + (isSelected ? 'aa' : isHovered ? '88' : '55') }),
      stroke: new Stroke({ color: colors.stroke, width: isSelected ? 4 : isHovered ? 3 : 2 }),
      text: new Text({
        text: listing.title || 'Plot',
        font: `bold ${isSelected ? '14px' : '12px'} sans-serif`,
        fill: new Fill({ color: '#fff' }),
        stroke: new Stroke({ color: colors.stroke, width: 3 }),
        overflow: true,
      }),
    });
  }, []);

  // Zoom to listing
  const zoomToListing = useCallback((listing: ListingWithPolygon) => {
    if (!mapInstance.current || !listing.polygon) return;
    try {
      const geo = typeof listing.polygon.geojson === 'string' ? JSON.parse(listing.polygon.geojson) : listing.polygon.geojson;
      const coords = geo.coordinates[0].map((c: [number, number]) => fromLonLat([c[0], c[1]]));
      const polygon = new Polygon([coords]);
      mapInstance.current.getView().fit(polygon.getExtent(), { padding: [100, 100, 100, 100], duration: 800, maxZoom: 18 });
      setSelectedListing(listing);
      overlayRef.current?.setPosition(getCenter(polygon.getExtent()));
    } catch (e) {
      const center = listing.polygon.centroid_lng && listing.polygon.centroid_lat
        ? fromLonLat([listing.polygon.centroid_lng, listing.polygon.centroid_lat])
        : fromLonLat([34.888822, -6.369028]);
      mapInstance.current.getView().animate({ center, zoom: 16, duration: 800 });
      setSelectedListing(listing);
      overlayRef.current?.setPosition(center);
    }
  }, []);

  // Initialize map
  useEffect(() => {
    if (!mapRef.current) return;

    const satellite = new TileLayer({
      source: new XYZ({ url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', attributions: 'Tiles © Esri' }),
    });
    baseTileLayerRef.current = satellite;

    const map = new Map({
      target: mapRef.current,
      layers: [satellite],
      view: new View({ center: fromLonLat([34.888822, -6.369028]), zoom: 6 }),
    });
    mapInstance.current = map;

    if (popupRef.current) {
      const overlay = new Overlay({ element: popupRef.current, autoPan: { animation: { duration: 250 } } });
      map.addOverlay(overlay);
      overlayRef.current = overlay;
    }

    return () => map.setTarget(undefined);
  }, []);

  // Basemap switcher
  useEffect(() => {
    if (!baseTileLayerRef.current) return;
    const sources: Record<string, string> = {
      satellite: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      topo: 'https://{a-c}.tile.opentopomap.org/{z}/{x}/{y}.png',
      terrain: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Terrain_Base/MapServer/tile/{z}/{y}/{x}',
      osm: 'https://{a-c}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    };
    baseTileLayerRef.current.setSource(new XYZ({ url: sources[basemap] }));
  }, [basemap]);

  // Render listings layer - optimized for performance
  useEffect(() => {
    if (!mapInstance.current || loading) return;

    if (listingsLayerRef.current) {
      mapInstance.current.removeLayer(listingsLayerRef.current);
      listingsLayerRef.current = null;
    }

    const features: Feature[] = [];
    sortedListings.forEach(listing => {
      if (!listing.polygon?.geojson) return;
      try {
        const geo = typeof listing.polygon.geojson === 'string' ? JSON.parse(listing.polygon.geojson) : listing.polygon.geojson;
        const coords = geo.coordinates[0].map((c: [number, number]) => fromLonLat([c[0], c[1]]));
        const feature = new Feature({ geometry: new Polygon([coords]), listing });
        feature.setStyle(getPolygonStyle(listing, selectedListing?.id === listing.id, hoveredListingId === listing.id));
        features.push(feature);
      } catch {}
    });

    const layer = new VectorLayer({ 
      source: new VectorSource({ features }),
      updateWhileAnimating: true,
      updateWhileInteracting: true,
    });
    listingsLayerRef.current = layer;
    mapInstance.current.addLayer(layer);

    // Click handler - only register once
    const clickHandler = (evt: any) => {
      const feature = mapInstance.current?.forEachFeatureAtPixel(evt.pixel, f => f);
      if (feature?.get('listing')) {
        const l = feature.get('listing');
        setSelectedListing(l);
        overlayRef.current?.setPosition(evt.coordinate);
      } else {
        setSelectedListing(null);
        overlayRef.current?.setPosition(undefined);
      }
    };

    // Pointer move - throttled for performance
    let lastHoveredId: string | null = null;
    const pointerMoveHandler = (evt: any) => {
      const feature = mapInstance.current?.forEachFeatureAtPixel(evt.pixel, f => f);
      if (mapRef.current) mapRef.current.style.cursor = feature ? 'pointer' : '';
      
      const newHoveredId = feature?.get('listing')?.id || null;
      if (newHoveredId !== lastHoveredId) {
        lastHoveredId = newHoveredId;
        setHoveredListingId(newHoveredId);
      }
    };

    mapInstance.current.on('click', clickHandler);
    mapInstance.current.on('pointermove', pointerMoveHandler);

    return () => {
      mapInstance.current?.un('click', clickHandler);
      mapInstance.current?.un('pointermove', pointerMoveHandler);
    };
  }, [sortedListings, selectedListing, hoveredListingId, getPolygonStyle, loading]);

  // Auto-zoom from URL
  useEffect(() => {
    if (!mapInstance.current || !listingParam || !listings.length) return;
    const target = listings.find(l => l.id === listingParam);
    if (target?.polygon) setTimeout(() => zoomToListing(target), 500);
  }, [listingParam, listings, zoomToListing]);

  return (
    <MainLayout>
      <div className="flex h-[calc(100vh-64px)] relative overflow-hidden">
        {/* Desktop Sidebar */}
        {!isMobile && (
          <div className="w-96 border-r bg-background flex flex-col z-10 shadow-lg">
            {/* Header */}
            <div className="p-4 border-b bg-gradient-to-br from-accent/10 via-accent/5 to-transparent">
              <div className="flex items-center gap-3">
                <div className="h-11 w-11 rounded-xl bg-accent flex items-center justify-center shadow-md">
                  <MapPin className="h-5 w-5 text-accent-foreground" />
                </div>
                <div>
                  <h2 className="font-bold text-lg tracking-tight">Map Browser</h2>
                  <p className="text-xs text-muted-foreground">Explore {sortedListings.length} properties</p>
                </div>
              </div>
            </div>
            
            {/* Filters Section */}
            <div className="flex-1 min-h-0 flex flex-col">
              <ScrollArea className="flex-1">
                <div className="p-4 space-y-4">
                  <MapFilters
                    listingTypeFilter={listingTypeFilter}
                    setListingTypeFilter={setListingTypeFilter}
                    propertyTypeFilter={propertyTypeFilter}
                    setPropertyTypeFilter={setPropertyTypeFilter}
                    dealerFilter={dealerFilter}
                    setDealerFilter={setDealerFilter}
                    uniqueDealers={uniqueDealers}
                    spatialFilterMode={spatialFilterMode}
                    setSpatialFilterMode={setSpatialFilterMode}
                    regionFilter={regionFilter}
                    setRegionFilter={setRegionFilter}
                    districtFilter={districtFilter}
                    setDistrictFilter={setDistrictFilter}
                    wardFilter={wardFilter}
                    setWardFilter={setWardFilter}
                    streetFilter={streetFilter}
                    setStreetFilter={setStreetFilter}
                    regions={regions}
                    districts={districts}
                    wards={wards}
                    streets={streets}
                    priceRange={priceRange}
                    setPriceRange={setPriceRange}
                    maxPrice={maxPrice}
                    areaRange={areaRange}
                    setAreaRange={setAreaRange}
                    maxArea={maxArea}
                    searchQuery={searchQuery}
                    setSearchQuery={setSearchQuery}
                    onReset={resetFilters}
                    activeFiltersCount={activeFiltersCount}
                  />
                </div>
              </ScrollArea>
            </div>

            {/* Property List Section */}
            <div className="border-t h-[45%] min-h-[280px] bg-muted/10">
              <PropertyList
                listings={sortedListings}
                viewMode={viewMode}
                setViewMode={setViewMode}
                sortBy={sortBy}
                setSortBy={setSortBy}
                hoveredListingId={hoveredListingId}
                onHoverListing={setHoveredListingId}
                onSelectListing={zoomToListing}
                userLocation={userLocation}
                loading={loading}
              />
            </div>
          </div>
        )}

        {/* Mobile Controls */}
        {isMobile && (
          <>
            {/* Filters Sheet */}
            <Sheet open={showFilters} onOpenChange={setShowFilters}>
              <SheetTrigger asChild>
                <Button 
                  size="icon" 
                  className="fixed top-20 left-4 z-20 rounded-full shadow-xl h-12 w-12 bg-background border-2 hover:bg-muted"
                  variant="outline"
                >
                  <SlidersHorizontal className="h-5 w-5" />
                  {activeFiltersCount > 0 && (
                    <span className="absolute -top-1 -right-1 h-5 w-5 bg-accent text-accent-foreground text-xs rounded-full flex items-center justify-center font-bold animate-scale-in">
                      {activeFiltersCount}
                    </span>
                  )}
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-[85vw] max-w-sm p-0">
                <SheetHeader className="p-4 border-b bg-gradient-to-r from-accent/5 to-transparent">
                  <SheetTitle className="flex items-center gap-2">
                    <SlidersHorizontal className="h-5 w-5 text-accent" />
                    Filters
                  </SheetTitle>
                </SheetHeader>
                <ScrollArea className="h-[calc(100vh-80px)] p-4">
                  <MapFilters
                    listingTypeFilter={listingTypeFilter}
                    setListingTypeFilter={setListingTypeFilter}
                    propertyTypeFilter={propertyTypeFilter}
                    setPropertyTypeFilter={setPropertyTypeFilter}
                    dealerFilter={dealerFilter}
                    setDealerFilter={setDealerFilter}
                    uniqueDealers={uniqueDealers}
                    spatialFilterMode={spatialFilterMode}
                    setSpatialFilterMode={setSpatialFilterMode}
                    regionFilter={regionFilter}
                    setRegionFilter={setRegionFilter}
                    districtFilter={districtFilter}
                    setDistrictFilter={setDistrictFilter}
                    wardFilter={wardFilter}
                    setWardFilter={setWardFilter}
                    streetFilter={streetFilter}
                    setStreetFilter={setStreetFilter}
                    regions={regions}
                    districts={districts}
                    wards={wards}
                    streets={streets}
                    priceRange={priceRange}
                    setPriceRange={setPriceRange}
                    maxPrice={maxPrice}
                    areaRange={areaRange}
                    setAreaRange={setAreaRange}
                    maxArea={maxArea}
                    searchQuery={searchQuery}
                    setSearchQuery={setSearchQuery}
                    onReset={resetFilters}
                    activeFiltersCount={activeFiltersCount}
                  />
                </ScrollArea>
              </SheetContent>
            </Sheet>

            {/* Properties Drawer */}
            <Drawer open={showPropertyList} onOpenChange={setShowPropertyList}>
              <DrawerTrigger asChild>
                <Button 
                  size="lg" 
                  className="fixed bottom-24 left-1/2 -translate-x-1/2 z-20 rounded-full shadow-xl gap-2 px-6 bg-foreground text-background hover:bg-foreground/90"
                >
                  <Sparkles className="h-4 w-4" />
                  {sortedListings.length} Properties
                </Button>
              </DrawerTrigger>
              <DrawerContent className="max-h-[85vh]">
                <DrawerHeader className="border-b bg-gradient-to-r from-accent/5 to-transparent">
                  <DrawerTitle className="flex items-center gap-2">
                    <MapPin className="h-5 w-5 text-accent" />
                    Available Properties
                  </DrawerTitle>
                </DrawerHeader>
                <PropertyList
                  listings={sortedListings}
                  viewMode={viewMode}
                  setViewMode={setViewMode}
                  sortBy={sortBy}
                  setSortBy={setSortBy}
                  hoveredListingId={hoveredListingId}
                  onHoverListing={setHoveredListingId}
                  onSelectListing={(l) => { zoomToListing(l); setShowPropertyList(false); }}
                  userLocation={userLocation}
                  loading={loading}
                />
              </DrawerContent>
            </Drawer>

            {/* Location Button */}
            {!locationPermissionAsked && (
              <Button 
                size="icon" 
                onClick={requestUserLocation} 
                className="fixed top-20 right-4 z-20 rounded-full shadow-xl h-12 w-12 bg-background border-2 hover:bg-muted"
                variant="outline"
              >
                <Navigation2 className="h-5 w-5" />
              </Button>
            )}

            {/* Basemap Switcher */}
            <Popover open={showBasemapSelector} onOpenChange={setShowBasemapSelector}>
              <PopoverTrigger asChild>
                <Button 
                  size="icon" 
                  variant="outline" 
                  className="fixed top-36 right-4 z-20 rounded-full shadow-xl h-12 w-12 bg-background border-2 hover:bg-muted"
                >
                  <Layers className="h-5 w-5" />
                </Button>
              </PopoverTrigger>
              <PopoverContent side="left" className="w-44 p-2" align="start">
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground px-2 pb-1">Map Style</p>
                  {([
                    { key: 'satellite', label: '🛰️ Satellite', desc: 'Aerial imagery' },
                    { key: 'osm', label: '🗺️ Street', desc: 'OpenStreetMap' },
                    { key: 'topo', label: '⛰️ Topo', desc: 'Terrain details' },
                    { key: 'terrain', label: '🏔️ Terrain', desc: 'Natural features' },
                  ] as const).map(opt => (
                    <button
                      key={opt.key}
                      onClick={() => { setBasemap(opt.key); setShowBasemapSelector(false); }}
                      className={cn(
                        "w-full text-left px-3 py-2 rounded-lg text-sm transition-all duration-200",
                        basemap === opt.key 
                          ? "bg-accent text-accent-foreground" 
                          : "hover:bg-muted"
                      )}
                    >
                      <div className="font-medium">{opt.label}</div>
                      <div className="text-xs opacity-70">{opt.desc}</div>
                    </button>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
          </>
        )}

        {/* Map Container */}
        <div className={cn("h-full w-full relative", !isMobile && "pl-0")}>
          <div ref={mapRef} className="w-full h-full" />

          {/* Desktop Basemap Control */}
          {!isMobile && (
            <div className="absolute top-4 right-4 z-10">
              <Popover open={showBasemapSelector} onOpenChange={setShowBasemapSelector}>
                <PopoverTrigger asChild>
                  <Button 
                    size="icon" 
                    variant="secondary" 
                    className="rounded-xl shadow-xl h-10 w-10 bg-background/90 backdrop-blur-sm border"
                  >
                    <Layers className="h-4 w-4" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent side="left" className="w-44 p-2" align="start">
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground px-2 pb-1">Map Style</p>
                    {([
                      { key: 'satellite', label: '🛰️ Satellite' },
                      { key: 'osm', label: '🗺️ Street' },
                      { key: 'topo', label: '⛰️ Topo' },
                      { key: 'terrain', label: '🏔️ Terrain' },
                    ] as const).map(opt => (
                      <button
                        key={opt.key}
                        onClick={() => { setBasemap(opt.key); setShowBasemapSelector(false); }}
                        className={cn(
                          "w-full text-left px-3 py-2 rounded-lg text-sm transition-all",
                          basemap === opt.key 
                            ? "bg-accent text-accent-foreground" 
                            : "hover:bg-muted"
                        )}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          )}

          {/* Enhanced Popup */}
          <div ref={popupRef} className="absolute z-50" style={{ display: selectedListing ? 'block' : 'none' }}>
            {selectedListing && (
              <div 
                className={cn(
                  "bg-card/95 backdrop-blur-md border-2 rounded-2xl shadow-2xl overflow-hidden animate-scale-in",
                  isMobile ? "min-w-[220px] max-w-[260px]" : "min-w-[300px] max-w-[340px]"
                )}
                style={{ 
                  borderColor: POLYGON_COLORS.selected.stroke,
                  boxShadow: `0 20px 50px -12px ${POLYGON_COLORS.selected.glow}`
                }}
              >
                {/* Header with gradient */}
                <div 
                  className="px-4 py-3"
                  style={{ 
                    background: `linear-gradient(135deg, ${POLYGON_COLORS.selected.fill}, ${POLYGON_COLORS.selected.stroke})`
                  }}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-white line-clamp-1 text-base">
                        {selectedListing.title}
                      </h3>
                      <div className="flex items-center gap-1 text-white/90 text-xs mt-0.5">
                        <MapPin className="h-3 w-3 shrink-0" />
                        <span className="line-clamp-1">{selectedListing.location_label}</span>
                      </div>
                    </div>
                    <Button 
                      size="icon" 
                      variant="ghost" 
                      className="h-7 w-7 text-white/80 hover:text-white hover:bg-white/20 shrink-0 rounded-full" 
                      onClick={() => { setSelectedListing(null); overlayRef.current?.setPosition(undefined); }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  
                  {/* Badges */}
                  <div className="flex items-center gap-2 mt-2">
                    <Badge className={cn(
                      "text-[10px] px-2 py-0 border-0",
                      selectedListing.listing_type === 'sale' 
                        ? "bg-white/20 text-white" 
                        : "bg-white/20 text-white"
                    )}>
                      {selectedListing.listing_type === 'sale' ? 'For Sale' : 'For Rent'}
                    </Badge>
                    {selectedListing.verification_status === 'verified' && (
                      <Badge className="bg-emerald-500/80 text-white text-[10px] px-2 py-0 border-0 gap-0.5">
                        <CheckCircle2 className="h-3 w-3" />
                        Verified
                      </Badge>
                    )}
                  </div>
                </div>
                
                {/* Content */}
                <div className="p-4 space-y-3">
                  {/* Price */}
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Price</span>
                    <span className="font-bold text-lg text-foreground">
                      {selectedListing.price 
                        ? `${selectedListing.currency || 'TZS'} ${selectedListing.price.toLocaleString()}`
                        : 'Contact for price'}
                    </span>
                  </div>
                  
                  {/* Area */}
                  {selectedListing.polygon?.area_m2 && (
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Maximize2 className="h-3 w-3" />
                        Land Area
                      </span>
                      <span className="font-medium text-sm">
                        {selectedListing.polygon.area_m2 < 10000 
                          ? `${selectedListing.polygon.area_m2.toLocaleString()} m²` 
                          : `${(selectedListing.polygon.area_m2 / 10000).toFixed(2)} hectares`}
                      </span>
                    </div>
                  )}
                  
                  {/* CTA Button */}
                  <Link to={`/listings/${selectedListing.id}`} className="block pt-1">
                    <Button 
                      className="w-full gap-2 rounded-xl font-semibold"
                      style={{ 
                        backgroundColor: POLYGON_COLORS.selected.fill,
                      }}
                    >
                      View Full Details
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  </Link>
                </div>
              </div>
            )}
          </div>

          {/* Empty state - only show if filters are active and no results */}
          {sortedListings.length === 0 && !loading && activeFiltersCount > 0 && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 pointer-events-none">
              <div className="pointer-events-auto bg-card/95 backdrop-blur-md border border-border rounded-full px-4 py-2 shadow-lg flex items-center gap-3 animate-fade-in">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">No properties in this area</span>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={resetFilters}
                  className="h-7 text-xs text-primary hover:text-primary"
                >
                  Show all
                </Button>
              </div>
            </div>
          )}

          {/* Loading overlay */}
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/50 backdrop-blur-sm">
              <div className="flex flex-col items-center gap-3">
                <div className="h-12 w-12 rounded-full border-4 border-accent border-t-transparent animate-spin" />
                <p className="text-sm font-medium">Loading properties...</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  );
}
