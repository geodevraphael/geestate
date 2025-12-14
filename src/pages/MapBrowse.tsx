import { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { MainLayout } from '@/components/layouts/MainLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger } from '@/components/ui/drawer';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MapPin, SlidersHorizontal, List, Navigation2, Layers, X, Maximize2, CheckCircle2, ExternalLink, Sparkles, Locate, Radar } from 'lucide-react';
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
import { Polygon, Point, Circle as CircleGeom } from 'ol/geom';
import Feature from 'ol/Feature';
import { Style, Fill, Stroke, Text, Circle as CircleStyle } from 'ol/style';
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
  selected: { fill: '#3b82f6', stroke: '#2563eb', glow: '#3b82f660' },
  hovered: { fill: '#60a5fa', stroke: '#3b82f6', glow: '#60a5fa40' },
  discovered: { fill: '#06b6d4', stroke: '#0891b2', glow: '#06b6d480' }, // Cyan for discovered plots
};

export default function MapBrowse() {
  const [searchParams] = useSearchParams();
  const listingParam = searchParams.get('listing');
  const regionParam = searchParams.get('region');
  const districtParam = searchParams.get('district');
  const wardParam = searchParams.get('ward');
  const latParam = searchParams.get('lat');
  const lngParam = searchParams.get('lng');
  const zoomParam = searchParams.get('zoom');
  const locateParam = searchParams.get('locate');
  
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
  const [searchRadius, setSearchRadius] = useState<number>(1000); // Default 1km in meters
  const [showRadiusControl, setShowRadiusControl] = useState(false);
  const [customRadiusInput, setCustomRadiusInput] = useState<string>('');
  
  // Map refs
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<Map | null>(null);
  const popupRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<Overlay | null>(null);
  const baseTileLayerRef = useRef<TileLayer<XYZ> | null>(null);
  const boundaryLayerRef = useRef<VectorLayer<VectorSource> | null>(null);
  const listingsLayerRef = useRef<VectorLayer<VectorSource> | null>(null);
  const userLocationLayerRef = useRef<VectorLayer<VectorSource> | null>(null);
  const userLocationAnimationRef = useRef<number | null>(null);
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
                // Zoom to the selected ward immediately after setting filter and wards
                const targetWard = wardData.find(w => w.id === wardParam);
                if (targetWard?.geometry && mapInstance.current) {
                  setTimeout(() => {
                    renderBoundaries([targetWard], 'ward');
                  }, 500);
                }
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

  // Render administrative boundaries (completely transparent - only used for zoom behavior)
  const renderBoundaries = (boundaries: any[], level: 'region' | 'district' | 'ward') => {
    if (!mapInstance.current) return;

    // Remove any existing boundary layer
    if (boundaryLayerRef.current) {
      mapInstance.current.removeLayer(boundaryLayerRef.current);
      boundaryLayerRef.current = null;
    }

    const allCoordinates: number[][] = [];

    // Just calculate extent for zooming - no visible rendering
    boundaries.forEach(b => {
      if (!b.geometry) return;
      try {
        const geo = typeof b.geometry === 'string' ? JSON.parse(b.geometry) : b.geometry;
        
        const processCoords = (coords: [number, number][]) => {
          coords.forEach(c => {
            const proj = fromLonLat([c[0], c[1]]);
            allCoordinates.push(proj as number[]);
          });
        };
        
        if (geo.type === 'Polygon' && geo.coordinates?.[0]) {
          processCoords(geo.coordinates[0]);
        } else if (geo.type === 'MultiPolygon') {
          geo.coordinates.forEach((pc: any) => { 
            if (pc?.[0]) processCoords(pc[0]); 
          });
        }
      } catch (e) { console.error('Boundary processing error:', e); }
    });

    // Zoom to the area without showing any visible boundaries
    if (allCoordinates.length > 0 && mapInstance.current) {
      const minX = Math.min(...allCoordinates.map(c => c[0]));
      const maxX = Math.max(...allCoordinates.map(c => c[0]));
      const minY = Math.min(...allCoordinates.map(c => c[1]));
      const maxY = Math.max(...allCoordinates.map(c => c[1]));
      
      mapInstance.current.getView().fit([minX, minY, maxX, maxY], { 
        padding: [50, 50, 50, 50], 
        duration: 800, 
        maxZoom: 14 
      });
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

  // Create animated user location marker with dynamic buffer and glowing border
  const createUserLocationMarker = useCallback((lat: number, lng: number, radiusMeters: number = 1000) => {
    if (!mapInstance.current) return;

    // Remove existing user location layer
    if (userLocationLayerRef.current) {
      mapInstance.current.removeLayer(userLocationLayerRef.current);
      userLocationLayerRef.current = null;
    }

    // Cancel any existing animation
    if (userLocationAnimationRef.current) {
      cancelAnimationFrame(userLocationAnimationRef.current);
      userLocationAnimationRef.current = null;
    }

    const center = fromLonLat([lng, lat]);
    
    // Create buffer circle with dynamic radius
    const metersPerUnit = mapInstance.current.getView().getProjection().getMetersPerUnit() || 1;
    const bufferRadius = radiusMeters / metersPerUnit;
    
    // Main buffer fill (subtle blue)
    const bufferFeature = new Feature({
      geometry: new CircleGeom(center, bufferRadius),
      type: 'buffer',
    });
    
    // Animated glow ring for the buffer border
    const glowRingFeature = new Feature({
      geometry: new CircleGeom(center, bufferRadius),
      type: 'glowRing',
    });

    // Create center point marker
    const pointFeature = new Feature({
      geometry: new Point(center),
      type: 'userLocation',
    });

    // Animated pulse ring feature
    const pulseFeature = new Feature({
      geometry: new Point(center),
      type: 'pulse',
    });

    // Static user location style (blue dot with white border)
    pointFeature.setStyle(new Style({
      image: new CircleStyle({
        radius: 10,
        fill: new Fill({ color: '#3b82f6' }),
        stroke: new Stroke({ color: '#ffffff', width: 3 }),
      }),
    }));

    const source = new VectorSource({
      features: [bufferFeature, glowRingFeature, pulseFeature, pointFeature],
    });

    const layer = new VectorLayer({
      source,
      zIndex: 1000,
    });

    userLocationLayerRef.current = layer;
    mapInstance.current.addLayer(layer);

    // Animation variables
    let pulseRadius = 10;
    let growing = true;
    const maxRadius = 35;
    const minRadius = 10;
    
    // Glow animation variables
    let glowPhase = 0;
    let borderWidth = 2;
    let borderGrowing = true;
    
    const animatePulse = () => {
      if (!userLocationLayerRef.current) return;
      
      // Pulse animation for center point
      if (growing) {
        pulseRadius += 0.5;
        if (pulseRadius >= maxRadius) growing = false;
      } else {
        pulseRadius -= 0.5;
        if (pulseRadius <= minRadius) growing = true;
      }
      
      const opacity = 1 - ((pulseRadius - minRadius) / (maxRadius - minRadius)) * 0.8;
      
      pulseFeature.setStyle(new Style({
        image: new CircleStyle({
          radius: pulseRadius,
          fill: new Fill({ color: `rgba(59, 130, 246, ${opacity * 0.3})` }),
          stroke: new Stroke({ 
            color: `rgba(59, 130, 246, ${opacity})`, 
            width: 2 
          }),
        }),
      }));
      
      // Animated glowing border for the search radius
      glowPhase += 0.03;
      const glowIntensity = 0.5 + Math.sin(glowPhase) * 0.3;
      const glowOpacity = 0.6 + Math.sin(glowPhase * 1.5) * 0.4;
      
      // Animate border width
      if (borderGrowing) {
        borderWidth += 0.05;
        if (borderWidth >= 4) borderGrowing = false;
      } else {
        borderWidth -= 0.05;
        if (borderWidth <= 2) borderGrowing = true;
      }
      
      // Update buffer fill style
      bufferFeature.setStyle(new Style({
        fill: new Fill({ color: `rgba(59, 130, 246, ${0.08 + glowIntensity * 0.05})` }),
      }));
      
      // Animated glowing border - tech blue effect
      glowRingFeature.setStyle(new Style({
        stroke: new Stroke({ 
          color: `rgba(96, 165, 250, ${glowOpacity})`, // Lighter blue for glow
          width: borderWidth,
          lineDash: [12, 6],
          lineDashOffset: -glowPhase * 20, // Moving dash animation
        }),
      }));
      
      userLocationAnimationRef.current = requestAnimationFrame(animatePulse);
    };
    
    animatePulse();
  }, []);

  // Fly to user's current location with smooth animation and show marker
  const flyToUserLocation = useCallback(() => {
    if (!navigator.geolocation) return;
    
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setUserLocation({ lat: latitude, lng: longitude });
        setShowRadiusControl(true); // Show radius control when location is found
        
        // Create animated marker with current search radius
        createUserLocationMarker(latitude, longitude, searchRadius);
        
        if (mapInstance.current) {
          const targetCenter = fromLonLat([longitude, latitude]);
          const currentZoom = mapInstance.current.getView().getZoom() || 6;
          
          // Smooth fly-to animation
          mapInstance.current.getView().animate(
            { zoom: Math.min(currentZoom, 8), duration: 300 },
            { center: targetCenter, zoom: 19, duration: 1000, easing: (t) => 1 - Math.pow(1 - t, 3) }
          );
        }
      },
      (error) => {
        console.error('Location error:', error);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  }, [createUserLocationMarker, searchRadius]);

  // Update marker when search radius changes and zoom to fit radius extent
  const updateSearchRadius = useCallback((newRadius: number) => {
    setSearchRadius(newRadius);
    if (userLocation && mapInstance.current) {
      // Update the marker with new radius (keeps user location visible and animated)
      createUserLocationMarker(userLocation.lat, userLocation.lng, newRadius);
      
      // Zoom to fit the radius extent (not centered on user location point)
      const center = fromLonLat([userLocation.lng, userLocation.lat]);
      const metersPerUnit = mapInstance.current.getView().getProjection().getMetersPerUnit() || 1;
      const bufferRadius = newRadius / metersPerUnit;
      
      const bufferCircle = new CircleGeom(center, bufferRadius);
      const extent = bufferCircle.getExtent();
      
      // Fit view to the circle extent with padding
      mapInstance.current.getView().fit(extent, {
        padding: [80, 80, 80, 80],
        duration: 600,
      });
    }
  }, [userLocation, createUserLocationMarker]);

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

  // Calculate distance in meters between two lat/lng points using Haversine formula
  const calculateDistanceMeters = useCallback((lat1: number, lng1: number, lat2: number, lng2: number): number => {
    const R = 6371000; // Earth's radius in meters
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }, []);

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
      
      // RADIUS FILTER: If user location is active and radius control is shown, filter by distance
      if (showRadiusControl && userLocation && l.polygon?.centroid_lat && l.polygon?.centroid_lng) {
        const distance = calculateDistanceMeters(
          userLocation.lat, 
          userLocation.lng, 
          l.polygon.centroid_lat, 
          l.polygon.centroid_lng
        );
        if (distance > searchRadius) return false;
      }
      
      // Location (only apply if not using radius filter)
      if (!showRadiusControl) {
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
      }
      
      return true;
    });
  }, [listings, searchQuery, listingTypeFilter, propertyTypeFilter, dealerFilter, priceRange, areaRange, spatialFilterMode, activeWardGeometries, wardFilter, districtFilter, regionFilter, streetFilter, showRadiusControl, userLocation, searchRadius, calculateDistanceMeters]);

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

  // Get polygon style - labels only show at zoom >= 15, discovered plots get special styling
  const getPolygonStyle = useCallback((listing: ListingWithPolygon, isSelected: boolean, isHovered: boolean, currentZoom: number = 6, isDiscovered: boolean = false) => {
    let colors = POLYGON_COLORS.unverified;
    
    // Priority: selected > hovered > discovered > verification status
    if (isSelected) colors = POLYGON_COLORS.selected;
    else if (isHovered) colors = POLYGON_COLORS.hovered;
    else if (isDiscovered) colors = POLYGON_COLORS.discovered;
    else if (listing.verification_status === 'verified') colors = POLYGON_COLORS.verified;
    else if (listing.verification_status === 'pending') colors = POLYGON_COLORS.pending;

    const showLabels = currentZoom >= 15;
    
    // Enhanced styling for discovered plots
    const strokeWidth = isSelected ? 4 : isHovered ? 3 : isDiscovered ? 3 : 2;
    const fillOpacity = isSelected ? 'aa' : isHovered ? '88' : isDiscovered ? '99' : '55';

    return new Style({
      fill: new Fill({ color: colors.fill + fillOpacity }),
      stroke: new Stroke({ 
        color: colors.stroke, 
        width: strokeWidth,
        lineDash: isDiscovered && !isSelected && !isHovered ? [6, 3] : undefined, // Dashed for discovered
      }),
      text: showLabels ? new Text({
        text: listing.title || 'Plot',
        font: `bold ${isSelected ? '14px' : isDiscovered ? '13px' : '12px'} sans-serif`,
        fill: new Fill({ color: '#fff' }),
        stroke: new Stroke({ color: colors.stroke, width: 3 }),
        overflow: true,
      }) : undefined,
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

  // Fly to user location if lat/lng params are provided
  useEffect(() => {
    if (!mapInstance.current || !latParam || !lngParam) return;
    
    const lat = parseFloat(latParam);
    const lng = parseFloat(lngParam);
    const zoom = zoomParam ? parseInt(zoomParam) : 15;
    
    if (isNaN(lat) || isNaN(lng)) return;
    
    // Create animated marker with 1km buffer
    createUserLocationMarker(lat, lng);
    
    // Smooth fly-to animation with easing
    const targetCenter = fromLonLat([lng, lat]);
    
    // First zoom out slightly, then fly to location
    const currentZoom = mapInstance.current.getView().getZoom() || 6;
    
    mapInstance.current.getView().animate(
      { zoom: Math.min(currentZoom, 8), duration: 400 },
      { center: targetCenter, zoom, duration: 1200, easing: (t) => 1 - Math.pow(1 - t, 3) }
    );
    
    // Set user location for distance calculations
    setUserLocation({ lat, lng: lng });
  }, [latParam, lngParam, zoomParam, createUserLocationMarker]);

  // Handle locate=true parameter (from LocationAwareWelcome)
  useEffect(() => {
    if (locateParam === 'true' && mapInstance.current) {
      // Small delay to ensure map is ready
      const timer = setTimeout(() => {
        flyToUserLocation();
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [locateParam, flyToUserLocation]);

  // Cleanup animation on unmount
  useEffect(() => {
    return () => {
      if (userLocationAnimationRef.current) {
        cancelAnimationFrame(userLocationAnimationRef.current);
      }
    };
  }, []);

  // Basemap switcher - using label-free versions
  useEffect(() => {
    if (!baseTileLayerRef.current) return;
    const sources: Record<string, string> = {
      satellite: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      topo: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Shaded_Relief/MapServer/tile/{z}/{y}/{x}',
      terrain: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Terrain_Base/MapServer/tile/{z}/{y}/{x}',
      osm: 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}',
    };
    baseTileLayerRef.current.setSource(new XYZ({ url: sources[basemap] }));
  }, [basemap]);

  // Render listings layer - optimized for performance with discovered plot highlighting
  useEffect(() => {
    if (!mapInstance.current || loading) return;

    if (listingsLayerRef.current) {
      mapInstance.current.removeLayer(listingsLayerRef.current);
      listingsLayerRef.current = null;
    }

    const currentZoom = mapInstance.current.getView().getZoom() || 6;

    const features: Feature[] = [];
    sortedListings.forEach(listing => {
      if (!listing.polygon?.geojson) return;
      try {
        const geo = typeof listing.polygon.geojson === 'string' ? JSON.parse(listing.polygon.geojson) : listing.polygon.geojson;
        const coords = geo.coordinates[0].map((c: [number, number]) => fromLonLat([c[0], c[1]]));
        const feature = new Feature({ geometry: new Polygon([coords]), listing });
        
        // Check if this listing is "discovered" (within search radius when radius mode is active)
        const isDiscovered = !!(showRadiusControl && userLocation);
        
        feature.setStyle(getPolygonStyle(listing, selectedListing?.id === listing.id, hoveredListingId === listing.id, currentZoom, isDiscovered));
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

    // Update styles on zoom change to show/hide labels
    const updateStylesOnZoom = () => {
      if (!listingsLayerRef.current) return;
      const newZoom = mapInstance.current?.getView().getZoom() || 6;
      listingsLayerRef.current.getSource()?.getFeatures().forEach(feature => {
        const listing = feature.get('listing');
        if (listing) {
          const isDiscovered = !!(showRadiusControl && userLocation);
          feature.setStyle(getPolygonStyle(listing, selectedListing?.id === listing.id, hoveredListingId === listing.id, newZoom, isDiscovered));
        }
      });
    };

    mapInstance.current.getView().on('change:resolution', updateStylesOnZoom);

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
      mapInstance.current?.getView().un('change:resolution', updateStylesOnZoom);
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

            {/* Bottom Property Carousel - Shows properties in a swipeable horizontal list */}
            {sortedListings.length > 0 && !showRadiusControl && (
              <div className="fixed bottom-4 left-0 right-0 z-20">
                {/* Header bar */}
                <div className="mx-4 mb-2 flex items-center justify-between">
                  <div className="bg-card/95 backdrop-blur-md rounded-full px-3 py-1.5 shadow-lg border flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-primary" />
                    <span className="text-sm font-medium">{sortedListings.length} Properties</span>
                  </div>
                  <Button
                    size="sm"
                    variant="secondary"
                    className="rounded-full shadow-lg"
                    onClick={() => setShowPropertyList(true)}
                  >
                    View All
                  </Button>
                </div>
                
                {/* Horizontal scrollable cards */}
                <div 
                  className="flex gap-3 overflow-x-auto px-4 pb-2 snap-x snap-mandatory scrollbar-hide"
                  style={{ WebkitOverflowScrolling: 'touch', scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                >
                  {sortedListings.slice(0, 10).map((listing, index) => (
                    <div
                      key={listing.id}
                      className={cn(
                        "snap-start shrink-0 w-[280px] bg-card/95 backdrop-blur-md rounded-2xl border-2 shadow-xl overflow-hidden transition-all duration-300 active:scale-[0.98]",
                        selectedListing?.id === listing.id 
                          ? "border-primary ring-2 ring-primary/30" 
                          : "border-border/50"
                      )}
                      onClick={() => zoomToListing(listing)}
                    >
                      <div className="p-3">
                        {/* Title and badges */}
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <h3 className="font-semibold text-sm line-clamp-1 flex-1">{listing.title}</h3>
                          {listing.verification_status === 'verified' && (
                            <Badge className="shrink-0 bg-emerald-500/90 text-white text-[10px] px-1.5 py-0 gap-0.5">
                              <CheckCircle2 className="h-3 w-3" />
                            </Badge>
                          )}
                        </div>
                        
                        {/* Location */}
                        <div className="flex items-center gap-1 text-muted-foreground text-xs mb-2">
                          <MapPin className="h-3 w-3 shrink-0" />
                          <span className="line-clamp-1">{listing.location_label}</span>
                        </div>
                        
                        {/* Price and area row */}
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-primary text-sm">
                            {listing.price 
                              ? `${listing.currency || 'TZS'} ${(listing.price / 1000000).toFixed(1)}M`
                              : 'Contact'}
                          </span>
                          {listing.polygon?.area_m2 && (
                            <span className="text-xs text-muted-foreground">
                              {listing.polygon.area_m2 < 10000 
                                ? `${listing.polygon.area_m2.toLocaleString()} m²` 
                                : `${(listing.polygon.area_m2 / 10000).toFixed(1)} ha`}
                            </span>
                          )}
                        </div>
                        
                        {/* Distance badge if available */}
                        {userLocation && listing.polygon?.centroid_lat && (
                          <div className="mt-2 pt-2 border-t border-border/50">
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                              <Navigation2 className="h-2.5 w-2.5 mr-1" />
                              {(() => {
                                const dist = Math.sqrt(
                                  Math.pow((listing.polygon.centroid_lat - userLocation.lat) * 111000, 2) +
                                  Math.pow((listing.polygon.centroid_lng! - userLocation.lng) * 111000 * Math.cos(userLocation.lat * Math.PI / 180), 2)
                                );
                                return dist < 1000 ? `${Math.round(dist)}m away` : `${(dist / 1000).toFixed(1)}km away`;
                              })()}
                            </Badge>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                  
                  {/* "See More" card if there are more than 10 */}
                  {sortedListings.length > 10 && (
                    <div
                      className="snap-start shrink-0 w-[120px] bg-muted/50 backdrop-blur-md rounded-2xl border-2 border-dashed border-border flex flex-col items-center justify-center p-4 active:scale-[0.98]"
                      onClick={() => setShowPropertyList(true)}
                    >
                      <span className="text-2xl font-bold text-muted-foreground">+{sortedListings.length - 10}</span>
                      <span className="text-xs text-muted-foreground">more</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Full Property List Drawer */}
            <Drawer open={showPropertyList} onOpenChange={setShowPropertyList}>
              <DrawerContent className="max-h-[85vh] flex flex-col">
                <DrawerHeader className="border-b bg-gradient-to-r from-accent/5 to-transparent shrink-0">
                  <DrawerTitle className="flex items-center gap-2">
                    <MapPin className="h-5 w-5 text-accent" />
                    Available Properties ({sortedListings.length})
                  </DrawerTitle>
                </DrawerHeader>
                <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain" style={{ WebkitOverflowScrolling: 'touch' }}>
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
                </div>
              </DrawerContent>
            </Drawer>

            {/* Locate Me Button - Always visible */}
            <Button 
              size="icon" 
              onClick={flyToUserLocation} 
              className="fixed top-20 right-4 z-20 rounded-full shadow-xl h-12 w-12 bg-primary text-primary-foreground hover:bg-primary/90 border-2 border-primary-foreground/20"
              title="Locate me"
            >
              <Locate className="h-5 w-5" />
            </Button>

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

            {/* Search Radius Control - Mobile */}
            {showRadiusControl && userLocation && (
              <div className="fixed bottom-24 left-4 right-4 z-20 animate-fade-in">
                <div className="bg-card/95 backdrop-blur-md border-2 border-primary/30 rounded-2xl shadow-2xl p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Radar className="h-5 w-5 text-primary animate-pulse" />
                    <span className="font-semibold text-sm">Search Radius</span>
                    <Badge variant="secondary" className="ml-auto">
                      {searchRadius >= 1000 ? `${searchRadius / 1000} km` : `${searchRadius} m`}
                    </Badge>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-6 w-6"
                      onClick={() => setShowRadiusControl(false)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="flex gap-2 flex-wrap mb-3">
                    {[
                      { value: 500, label: '500m' },
                      { value: 1000, label: '1 km' },
                      { value: 2000, label: '2 km' },
                      { value: 5000, label: '5 km' },
                      { value: 10000, label: '10 km' },
                    ].map(opt => (
                      <Button
                        key={opt.value}
                        size="sm"
                        variant={searchRadius === opt.value ? 'default' : 'outline'}
                        onClick={() => updateSearchRadius(opt.value)}
                        className={cn(
                          "flex-1 min-w-[60px]",
                          searchRadius === opt.value && "bg-primary text-primary-foreground"
                        )}
                      >
                        {opt.label}
                      </Button>
                    ))}
                  </div>
                  {/* Custom radius input */}
                  <div className="flex gap-2 items-center">
                    <Input
                      type="number"
                      placeholder="Custom (meters)"
                      value={customRadiusInput}
                      onChange={(e) => setCustomRadiusInput(e.target.value)}
                      className="flex-1 h-9"
                      min={100}
                      max={50000}
                    />
                    <Button
                      size="sm"
                      onClick={() => {
                        const value = parseInt(customRadiusInput);
                        if (value >= 100 && value <= 50000) {
                          updateSearchRadius(value);
                        }
                      }}
                      disabled={!customRadiusInput || parseInt(customRadiusInput) < 100 || parseInt(customRadiusInput) > 50000}
                    >
                      Apply
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {/* Map Container */}
        <div className={cn("h-full w-full relative", !isMobile && "pl-0")}>
          <div ref={mapRef} className="w-full h-full" />

          {/* Desktop Map Controls */}
          {!isMobile && (
            <div className="absolute top-4 right-4 z-10 flex flex-col gap-2">
              {/* Locate Me Button */}
              <Button 
                size="icon" 
                onClick={flyToUserLocation}
                className="rounded-xl shadow-xl h-10 w-10 bg-primary text-primary-foreground hover:bg-primary/90"
                title="Locate me"
              >
                <Locate className="h-4 w-4" />
              </Button>
              
              {/* Basemap Switcher */}
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

              {showRadiusControl && userLocation && (
                <Popover>
                  <PopoverTrigger asChild>
                    <Button 
                      size="icon" 
                      variant="secondary" 
                      className="rounded-xl shadow-xl h-10 w-10 bg-blue-500 text-white hover:bg-blue-600 animate-pulse"
                      title="Search Radius"
                    >
                      <Radar className="h-4 w-4" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent side="left" className="w-56 p-3" align="start">
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <Radar className="h-4 w-4 text-primary" />
                        <span className="font-semibold text-sm">Search Radius</span>
                        <Badge variant="secondary" className="ml-auto text-xs">
                          {searchRadius >= 1000 ? `${searchRadius / 1000} km` : `${searchRadius} m`}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        {[
                          { value: 500, label: '500m' },
                          { value: 1000, label: '1 km' },
                          { value: 2000, label: '2 km' },
                          { value: 5000, label: '5 km' },
                          { value: 10000, label: '10 km' },
                        ].map(opt => (
                          <Button
                            key={opt.value}
                            size="sm"
                            variant={searchRadius === opt.value ? 'default' : 'outline'}
                            onClick={() => updateSearchRadius(opt.value)}
                            className="w-full"
                          >
                            {opt.label}
                          </Button>
                        ))}
                      </div>
                      {/* Custom radius input */}
                      <div className="pt-2 border-t">
                        <p className="text-xs text-muted-foreground mb-2">Custom (100m - 50km)</p>
                        <div className="flex gap-2">
                          <Input
                            type="number"
                            placeholder="Meters"
                            value={customRadiusInput}
                            onChange={(e) => setCustomRadiusInput(e.target.value)}
                            className="flex-1 h-8 text-sm"
                            min={100}
                            max={50000}
                          />
                          <Button
                            size="sm"
                            className="h-8"
                            onClick={() => {
                              const value = parseInt(customRadiusInput);
                              if (value >= 100 && value <= 50000) {
                                updateSearchRadius(value);
                              }
                            }}
                            disabled={!customRadiusInput || parseInt(customRadiusInput) < 100 || parseInt(customRadiusInput) > 50000}
                          >
                            Apply
                          </Button>
                        </div>
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
              )}
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
