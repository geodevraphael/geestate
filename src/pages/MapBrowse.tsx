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
import { MapPin, SlidersHorizontal, List, Navigation2, Layers, X } from 'lucide-react';
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

// Polygon color schemes
const POLYGON_COLORS = {
  verified: { fill: '#22c55e', stroke: '#16a34a' },
  pending: { fill: '#eab308', stroke: '#ca8a04' },
  unverified: { fill: '#64748b', stroke: '#475569' },
  selected: { fill: '#ef4444', stroke: '#dc2626' },
  hovered: { fill: '#3b82f6', stroke: '#2563eb' },
};

export default function MapBrowse() {
  const [searchParams] = useSearchParams();
  const listingParam = searchParams.get('listing');
  
  // Data states
  const [listings, setListings] = useState<ListingWithPolygon[]>([]);
  const [loading, setLoading] = useState(true);
  const [regions, setRegions] = useState<any[]>([]);
  const [districts, setDistricts] = useState<any[]>([]);
  const [wards, setWards] = useState<any[]>([]);
  const [streets, setStreets] = useState<any[]>([]);
  
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

  // Render listings layer
  useEffect(() => {
    if (!mapInstance.current) return;

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

    const layer = new VectorLayer({ source: new VectorSource({ features }) });
    listingsLayerRef.current = layer;
    mapInstance.current.addLayer(layer);

    // Click handler
    mapInstance.current.on('click', (evt) => {
      const feature = mapInstance.current?.forEachFeatureAtPixel(evt.pixel, f => f);
      if (feature?.get('listing')) {
        const l = feature.get('listing');
        setSelectedListing(l);
        overlayRef.current?.setPosition(evt.coordinate);
      } else {
        setSelectedListing(null);
        overlayRef.current?.setPosition(undefined);
      }
    });

    // Pointer move
    mapInstance.current.on('pointermove', (evt) => {
      const feature = mapInstance.current?.forEachFeatureAtPixel(evt.pixel, f => f);
      if (mapRef.current) mapRef.current.style.cursor = feature ? 'pointer' : '';
      
      const newHoveredId = feature?.get('listing')?.id || null;
      if (newHoveredId !== hoveredListingId) setHoveredListingId(newHoveredId);
    });
  }, [sortedListings, selectedListing, hoveredListingId, getPolygonStyle]);

  // Auto-zoom from URL
  useEffect(() => {
    if (!mapInstance.current || !listingParam || !listings.length) return;
    const target = listings.find(l => l.id === listingParam);
    if (target?.polygon) setTimeout(() => zoomToListing(target), 500);
  }, [listingParam, listings, zoomToListing]);

  return (
    <MainLayout>
      <div className="flex h-[calc(100vh-64px)] relative">
        {/* Desktop Sidebar */}
        {!isMobile && (
          <div className="w-80 border-r bg-background flex flex-col z-10">
            <div className="p-4 border-b">
              <h2 className="font-semibold text-lg">Map Browser</h2>
              <p className="text-sm text-muted-foreground">Find properties on the map</p>
            </div>
            
            <ScrollArea className="flex-1 p-4">
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

            {/* Property List */}
            <div className="border-t h-[40%]">
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
                <Button size="icon" className="fixed top-20 left-4 z-20 rounded-full shadow-xl">
                  <SlidersHorizontal className="h-5 w-5" />
                  {activeFiltersCount > 0 && (
                    <span className="absolute -top-1 -right-1 h-5 w-5 bg-primary text-primary-foreground text-xs rounded-full flex items-center justify-center">
                      {activeFiltersCount}
                    </span>
                  )}
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-80 p-0">
                <SheetHeader className="p-4 border-b">
                  <SheetTitle>Filters</SheetTitle>
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
                <Button size="lg" className="fixed bottom-24 left-1/2 -translate-x-1/2 z-20 rounded-full shadow-xl">
                  <List className="h-5 w-5 mr-2" />
                  {sortedListings.length} Properties
                </Button>
              </DrawerTrigger>
              <DrawerContent className="max-h-[85vh]">
                <DrawerHeader className="border-b">
                  <DrawerTitle>Properties</DrawerTitle>
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
                />
              </DrawerContent>
            </Drawer>

            {/* Location Button */}
            {!locationPermissionAsked && (
              <Button size="icon" onClick={requestUserLocation} className="fixed top-20 right-4 z-20 rounded-full shadow-xl">
                <Navigation2 className="h-5 w-5" />
              </Button>
            )}

            {/* Basemap Switcher */}
            <Popover open={showBasemapSelector} onOpenChange={setShowBasemapSelector}>
              <PopoverTrigger asChild>
                <Button size="icon" variant="secondary" className="fixed top-32 right-4 z-20 rounded-full shadow-xl">
                  <Layers className="h-5 w-5" />
                </Button>
              </PopoverTrigger>
              <PopoverContent side="left" className="w-40 p-2">
                {(['osm', 'satellite', 'topo', 'terrain'] as const).map(opt => (
                  <button
                    key={opt}
                    onClick={() => { setBasemap(opt); setShowBasemapSelector(false); }}
                    className={cn("w-full text-left px-2 py-1.5 rounded-md text-sm", basemap === opt ? "bg-primary text-primary-foreground" : "hover:bg-muted")}
                  >
                    {opt.charAt(0).toUpperCase() + opt.slice(1)}
                  </button>
                ))}
              </PopoverContent>
            </Popover>
          </>
        )}

        {/* Map Container */}
        <div className={cn("h-full w-full", !isMobile && "pl-0")}>
          <div ref={mapRef} className="w-full h-full" />

          {/* Popup */}
          <div ref={popupRef} className="absolute z-50" style={{ display: selectedListing ? 'block' : 'none' }}>
            {selectedListing && (
              <div className={cn("bg-card/95 backdrop-blur-md border-2 rounded-2xl shadow-2xl overflow-hidden", isMobile ? "min-w-[200px] max-w-[220px]" : "min-w-[280px] max-w-[320px]")}
                style={{ borderColor: POLYGON_COLORS.selected.stroke }}>
                <div className={cn("bg-gradient-to-r from-red-500 to-red-600", isMobile ? "px-3 py-2" : "px-4 py-3")}>
                  <div className="flex items-start justify-between">
                    <h3 className={cn("font-bold text-white line-clamp-1 flex-1", isMobile ? "text-sm" : "text-lg")}>{selectedListing.title}</h3>
                    <Button size="icon" variant="ghost" className="h-6 w-6 text-white/80 hover:text-white hover:bg-white/20 -mr-1" onClick={() => { setSelectedListing(null); overlayRef.current?.setPosition(undefined); }}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className={cn("flex items-center gap-1 text-white/90", isMobile ? "text-xs" : "text-sm")}>
                    <MapPin className={isMobile ? "h-3 w-3" : "h-4 w-4"} />
                    <span className="line-clamp-1">{selectedListing.location_label}</span>
                  </div>
                </div>
                <div className={cn("space-y-2", isMobile ? "p-2" : "p-4 space-y-3")}>
                  <div className="flex items-center justify-between">
                    <span className={cn("text-muted-foreground", isMobile ? "text-xs" : "text-sm")}>Price</span>
                    <span className={cn("font-bold text-primary", isMobile ? "text-sm" : "text-xl")}>
                      {selectedListing.price ? `${selectedListing.currency} ${selectedListing.price.toLocaleString()}` : 'Contact'}
                    </span>
                  </div>
                  {selectedListing.polygon?.area_m2 && (
                    <div className={cn("flex items-center justify-between", isMobile ? "text-xs" : "text-sm")}>
                      <span className="text-muted-foreground">Area</span>
                      <span className="font-medium">{selectedListing.polygon.area_m2 < 10000 ? `${selectedListing.polygon.area_m2.toLocaleString()} m²` : `${(selectedListing.polygon.area_m2 / 10000).toFixed(2)} ha`}</span>
                    </div>
                  )}
                  <Link to={`/listings/${selectedListing.id}`} className="block pt-1">
                    <Button size={isMobile ? "sm" : "default"} className="w-full bg-red-500 hover:bg-red-600">View Details</Button>
                  </Link>
                </div>
              </div>
            )}
          </div>

          {/* Empty state */}
          {sortedListings.length === 0 && !loading && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <Card className="pointer-events-auto shadow-xl">
                <CardContent className="p-6 text-center">
                  <MapPin className="h-12 w-12 mx-auto text-muted-foreground opacity-20 mb-2" />
                  <p className="text-muted-foreground">No properties match your filters</p>
                  <Button variant="link" onClick={resetFilters}>Reset filters</Button>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  );
}
