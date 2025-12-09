import { useEffect, useState, useRef, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { MainLayout } from '@/components/layouts/MainLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger } from '@/components/ui/drawer';
import { MapPin, CheckCircle2, Check, ChevronsUpDown, SlidersHorizontal, List, Navigation2, Layers } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import { ListingWithDetails, ListingPolygon } from '@/types/database';
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
import 'ol/ol.css';

interface ListingWithPolygon extends ListingWithDetails {
  polygon?: ListingPolygon;
  owner?: {
    id: string;
    full_name: string;
    email: string;
  };
  region_id?: string | null;
  district_id?: string | null;
  ward_id?: string | null;
  street_village_id?: string | null;
}

export default function MapBrowse() {
  const [searchParams] = useSearchParams();
  const listingParam = searchParams.get('listing');
  
  const [listings, setListings] = useState<ListingWithPolygon[]>([]);
  const [loading, setLoading] = useState(true);
  const [listingTypeFilter, setListingTypeFilter] = useState<string>('all');
  const [propertyTypeFilter, setPropertyTypeFilter] = useState<string>('all');
  const [dealerFilter, setDealerFilter] = useState<string>('all');
  const [regionFilter, setRegionFilter] = useState<string>('all');
  const [districtFilter, setDistrictFilter] = useState<string>('all');
  const [wardFilter, setWardFilter] = useState<string>('all');
  const [streetFilter, setStreetFilter] = useState<string>('all');
  const [basemap, setBasemap] = useState<'osm' | 'satellite' | 'topo' | 'terrain'>('satellite');
  const [showBasemapSelector, setShowBasemapSelector] = useState(false);
  const [selectedListing, setSelectedListing] = useState<ListingWithPolygon | null>(null);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationPermissionAsked, setLocationPermissionAsked] = useState(false);
  const [dealerSearchOpen, setDealerSearchOpen] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [showPropertyList, setShowPropertyList] = useState(false);
  const [spatialFilterMode, setSpatialFilterMode] = useState<'boundary' | 'id'>('boundary');
  const [regions, setRegions] = useState<any[]>([]);
  const [districts, setDistricts] = useState<any[]>([]);
  const [wards, setWards] = useState<any[]>([]);
  const [streets, setStreets] = useState<any[]>([]);
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<Map | null>(null);
  const popupRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<Overlay | null>(null);
  const baseTileLayerRef = useRef<TileLayer<XYZ> | null>(null);
  const boundaryLayerRef = useRef<VectorLayer<VectorSource> | null>(null);
  const listingsLayerRef = useRef<VectorLayer<VectorSource> | null>(null);
  const isMobile = useIsMobile();

  useEffect(() => {
    fetchListingsWithPolygons();
    requestUserLocation();
    fetchLocations();
  }, []);

  const fetchLocations = async () => {
    const { data: regionsData } = await supabase.from('regions').select('*').order('name');
    setRegions(regionsData || []);
  };

  useEffect(() => {
    if (regionFilter !== 'all') {
      fetchDistricts(regionFilter);
      setDistrictFilter('all');
      setWardFilter('all');
      setStreetFilter('all');
      // Fetch ALL wards for this region to show boundaries
      fetchRegionWards(regionFilter);
    } else {
      setDistricts([]);
      setWards([]);
      setStreets([]);
      // Clear boundary layer when no region selected
      if (boundaryLayerRef.current && mapInstance.current) {
        mapInstance.current.removeLayer(boundaryLayerRef.current);
        boundaryLayerRef.current = null;
      }
    }
  }, [regionFilter]);

  // Fetch all wards for a region (across all its districts) to show on map
  const fetchRegionWards = async (regionId: string) => {
    // First get all districts in this region
    const { data: districtData } = await supabase
      .from('districts')
      .select('id')
      .eq('region_id', regionId);
    
    if (!districtData || districtData.length === 0) return;
    
    const districtIds = districtData.map(d => d.id);
    
    // Then get all wards for these districts
    const { data: wardData } = await supabase
      .from('wards')
      .select('id, name, code, district_id, geometry')
      .in('district_id', districtIds);
    
    if (wardData && wardData.length > 0) {
      renderBoundaries(wardData, 'district');
    }
  };

  useEffect(() => {
    if (districtFilter !== 'all') {
      fetchWards(districtFilter);
      setWardFilter('all');
      setStreetFilter('all');
    } else {
      setWards([]);
      setStreets([]);
      // When district is cleared, re-render region wards if region is selected
      if (regionFilter !== 'all') {
        fetchRegionWards(regionFilter);
      }
    }
  }, [districtFilter]);

  useEffect(() => {
    if (wardFilter !== 'all') {
      fetchStreets(wardFilter);
      setStreetFilter('all');
      // Zoom to the selected ward
      zoomToWard(wardFilter);
    } else {
      setStreets([]);
      // When ward is cleared, re-render district wards if district is selected
      if (districtFilter !== 'all') {
        fetchWards(districtFilter);
      } else if (regionFilter !== 'all') {
        fetchRegionWards(regionFilter);
      }
    }
  }, [wardFilter]);

  const fetchDistricts = async (regionId: string) => {
    const { data } = await supabase.from('districts').select('*').eq('region_id', regionId).order('name');
    setDistricts(data || []);
  };

  const fetchWards = async (districtId: string) => {
    const { data } = await supabase.from('wards').select('id, name, code, district_id, geometry').eq('district_id', districtId).order('name');
    setWards(data || []);
    // Render ward boundaries on map and zoom to their extent
    if (data && data.length > 0) {
      renderBoundaries(data, 'district');
    }
  };

  const fetchStreets = async (wardId: string) => {
    const { data } = await supabase.from('streets_villages').select('*').eq('ward_id', wardId).order('name');
    setStreets(data || []);
  };

  // Render administrative boundaries on the map
  const renderBoundaries = (boundaries: any[], level: 'region' | 'district' | 'ward') => {
    if (!mapInstance.current) return;

    // Remove existing boundary layer
    if (boundaryLayerRef.current) {
      mapInstance.current.removeLayer(boundaryLayerRef.current);
      boundaryLayerRef.current = null;
    }

    const features: Feature[] = [];
    const allCoordinates: number[][] = [];

    boundaries.forEach((boundary) => {
      if (!boundary.geometry) return;

      try {
        const geometry = typeof boundary.geometry === 'string' 
          ? JSON.parse(boundary.geometry) 
          : boundary.geometry;

        if (!geometry.coordinates) return;

        const coords = geometry.coordinates[0];
        const transformedCoords = coords.map((coord: [number, number]) => {
          const projected = fromLonLat([coord[0], coord[1]]);
          allCoordinates.push(projected as number[]);
          return projected;
        });

        const polygon = new Polygon([transformedCoords]);
        const feature = new Feature({
          geometry: polygon,
          boundary: boundary,
        });

        // Style based on level
        const strokeColor = level === 'ward' ? '#3b82f6' : '#8b5cf6';
        const fillOpacity = level === 'ward' ? '20' : '10';
        
        feature.setStyle(
          new Style({
            fill: new Fill({
              color: strokeColor + fillOpacity,
            }),
            stroke: new Stroke({
              color: strokeColor,
              width: level === 'ward' ? 3 : 2,
              lineDash: level === 'district' ? [8, 4] : undefined,
            }),
            text: new Text({
              text: boundary.name,
              font: 'bold 11px sans-serif',
              fill: new Fill({ color: '#ffffff' }),
              stroke: new Stroke({ color: strokeColor, width: 3 }),
              overflow: true,
            }),
          })
        );

        features.push(feature);
      } catch (error) {
        console.error('Error rendering boundary:', error);
      }
    });

    if (features.length > 0) {
      const vectorSource = new VectorSource({ features });
      const vectorLayer = new VectorLayer({ source: vectorSource });
      boundaryLayerRef.current = vectorLayer;
      mapInstance.current.addLayer(vectorLayer);

      // Zoom to fit all boundaries
      if (allCoordinates.length > 0) {
        const extent = vectorSource.getExtent();
        mapInstance.current.getView().fit(extent, {
          padding: [50, 50, 50, 50],
          duration: 800,
          maxZoom: 14,
        });
      }
    }
  };

  // Zoom to a specific ward
  const zoomToWard = (wardId: string) => {
    const ward = wards.find(w => w.id === wardId);
    if (!ward || !ward.geometry || !mapInstance.current) return;

    renderBoundaries([ward], 'ward');
  };

  const fetchListingsWithPolygons = async () => {
    try {
      const { data, error } = await (supabase as any)
        .from('listings')
        .select(`
          *,
          polygon:listing_polygons(*),
          owner:profiles!owner_id(id, full_name, email)
        `)
        .eq('status', 'published');

      if (error) throw error;
      
      const listingsWithPolygons = (data || []).filter((listing: any) => listing.polygon);
      setListings(listingsWithPolygons);
    } catch (error) {
      console.error('Error fetching listings:', error);
    } finally {
      setLoading(false);
    }
  };

  const requestUserLocation = () => {
    if (navigator.geolocation && !locationPermissionAsked) {
      setLocationPermissionAsked(true);
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        },
        (error) => {
          console.log('Location permission denied or unavailable:', error);
        }
      );
    }
  };

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371; // Radius of the Earth in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c; // Distance in km
  };

  // Point-in-polygon check using ray casting algorithm
  const isPointInPolygon = (point: [number, number], polygon: [number, number][]): boolean => {
    const [x, y] = point;
    let inside = false;
    
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const [xi, yi] = polygon[i];
      const [xj, yj] = polygon[j];
      
      if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) {
        inside = !inside;
      }
    }
    
    return inside;
  };

  // Check if a listing falls within any of the given ward geometries
  const isListingInWards = (listing: ListingWithPolygon, wardGeometries: any[]): boolean => {
    if (!listing.polygon?.centroid_lat || !listing.polygon?.centroid_lng) return false;
    
    const point: [number, number] = [listing.polygon.centroid_lng, listing.polygon.centroid_lat];
    
    for (const ward of wardGeometries) {
      if (!ward.geometry) continue;
      
      try {
        const geometry = typeof ward.geometry === 'string' 
          ? JSON.parse(ward.geometry) 
          : ward.geometry;
        
        if (geometry?.coordinates?.[0] && isPointInPolygon(point, geometry.coordinates[0])) {
          return true;
        }
      } catch (e) {
        console.error('Error parsing ward geometry:', e);
      }
    }
    
    return false;
  };

  const getSortedListings = (listings: ListingWithPolygon[]): ListingWithPolygon[] => {
    if (!userLocation) return listings;

    const listingsWithDistance = listings.map(listing => {
      const distance = listing.polygon?.centroid_lat && listing.polygon?.centroid_lng
        ? calculateDistance(
            userLocation.lat,
            userLocation.lng,
            listing.polygon.centroid_lat,
            listing.polygon.centroid_lng
          )
        : Infinity;
      return { ...listing, distance };
    });

    return listingsWithDistance.sort((a, b) => (a.distance || 0) - (b.distance || 0));
  };

  const uniqueDealers = useMemo(() => {
    const dealersMap: Record<string, { id: string; full_name: string; email: string }> = {};
    listings.forEach(listing => {
      if (listing.owner && !dealersMap[listing.owner.id]) {
        dealersMap[listing.owner.id] = listing.owner;
      }
    });
    return Object.values(dealersMap);
  }, [listings]);

  // Get current active ward geometries for spatial filtering
  const activeWardGeometries = useMemo(() => {
    if (wardFilter !== 'all') {
      return wards.filter(w => w.id === wardFilter);
    }
    if (districtFilter !== 'all') {
      return wards;
    }
    return [];
  }, [wardFilter, districtFilter, wards]);

  const filteredListings = useMemo(() => {
    const filtered = listings.filter((listing) => {
      const matchesListingType = listingTypeFilter === 'all' || listing.listing_type === listingTypeFilter;
      const matchesPropertyType = propertyTypeFilter === 'all' || listing.property_type === propertyTypeFilter;
      const matchesDealer = dealerFilter === 'all' || listing.owner_id === dealerFilter;
      
      // Location filtering logic based on spatial filter mode
      let matchesLocation = true;
      
      if (spatialFilterMode === 'boundary' && activeWardGeometries.length > 0) {
        // Spatial filtering: check if listing falls within selected ward boundaries
        if (wardFilter !== 'all') {
          const matchesByAssignedId = listing.ward_id === wardFilter;
          const matchesBySpatial = isListingInWards(listing, activeWardGeometries);
          matchesLocation = matchesByAssignedId || matchesBySpatial;
        } else if (districtFilter !== 'all') {
          const matchesByAssignedId = listing.district_id === districtFilter;
          const matchesBySpatial = isListingInWards(listing, activeWardGeometries);
          matchesLocation = matchesByAssignedId || matchesBySpatial;
        } else if (regionFilter !== 'all') {
          matchesLocation = listing.region_id === regionFilter;
        }
      } else {
        // ID-based filtering only
        if (wardFilter !== 'all') {
          matchesLocation = listing.ward_id === wardFilter;
        } else if (districtFilter !== 'all') {
          matchesLocation = listing.district_id === districtFilter;
        } else if (regionFilter !== 'all') {
          matchesLocation = listing.region_id === regionFilter;
        }
      }
      
      const matchesStreet = streetFilter === 'all' || listing.street_village_id === streetFilter;
      
      return matchesListingType && matchesPropertyType && matchesDealer && matchesLocation && matchesStreet;
    });
    return getSortedListings(filtered);
  }, [listings, listingTypeFilter, propertyTypeFilter, dealerFilter, regionFilter, districtFilter, wardFilter, streetFilter, userLocation, activeWardGeometries, spatialFilterMode]);

  const zoomToListing = (listing: ListingWithPolygon) => {
    if (!mapInstance.current || !listing.polygon) return;

    try {
      const geojson = typeof listing.polygon.geojson === 'string' 
        ? JSON.parse(listing.polygon.geojson) 
        : listing.polygon.geojson;

      // Get polygon coordinates and transform them
      const coordinates = geojson.coordinates[0].map((coord: [number, number]) => 
        fromLonLat([coord[0], coord[1]])
      );

      // Create polygon to get its extent
      const polygon = new Polygon([coordinates]);
      const extent = polygon.getExtent();

      // Fit the view to the polygon extent with padding
      mapInstance.current.getView().fit(extent, {
        padding: [100, 100, 100, 100],
        duration: 1000,
        maxZoom: 18,
      });

      setSelectedListing(listing);
      
      // Position popup at polygon center
      const center = getCenter(extent);
      overlayRef.current?.setPosition(center);
    } catch (error) {
      console.error('Error zooming to listing:', error);
      
      // Fallback to centroid zoom if polygon parsing fails
      const center = listing.polygon.centroid_lng && listing.polygon.centroid_lat
        ? fromLonLat([listing.polygon.centroid_lng, listing.polygon.centroid_lat])
        : fromLonLat([34.888822, -6.369028]);

      mapInstance.current.getView().animate({
        center: center,
        zoom: 16,
        duration: 1000,
      });

      setSelectedListing(listing);
      overlayRef.current?.setPosition(center);
    }
  };

  const getPolygonColor = (listing: ListingWithPolygon, isSelected: boolean) => {
    if (isSelected) return '#ef4444'; // Red for selected
    if (listing.verification_status === 'verified') return '#22c55e';
    if (listing.verification_status === 'pending') return '#eab308';
    return '#94a3b8';
  };

  useEffect(() => {
    if (!mapRef.current) return;

    // Default to OSM
    // Default to satellite basemap
    const satelliteLayer = new TileLayer({
      source: new XYZ({
        url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        attributions: 'Tiles © Esri',
      }),
    });
    
    baseTileLayerRef.current = satelliteLayer;

    const map = new Map({
      target: mapRef.current,
      layers: [satelliteLayer],
      view: new View({
        center: fromLonLat([34.888822, -6.369028]),
        zoom: 6,
      }),
    });

    mapInstance.current = map;

    if (popupRef.current) {
      const overlay = new Overlay({
        element: popupRef.current,
        autoPan: {
          animation: {
            duration: 250,
          },
        },
      });
      map.addOverlay(overlay);
      overlayRef.current = overlay;
    }

    return () => {
      map.setTarget(undefined);
    };
  }, []);

  useEffect(() => {
    if (!mapInstance.current || !baseTileLayerRef.current) return;

    let source: XYZ;
    switch (basemap) {
      case 'satellite':
        source = new XYZ({
          url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
          attributions: 'Tiles © Esri',
        });
        break;
      case 'topo':
        source = new XYZ({
          url: 'https://{a-c}.tile.opentopomap.org/{z}/{x}/{y}.png',
          attributions: '© OpenTopoMap contributors',
        });
        break;
      case 'terrain':
        source = new XYZ({
          url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Terrain_Base/MapServer/tile/{z}/{y}/{x}',
          attributions: 'Tiles © Esri',
        });
        break;
      case 'osm':
      default:
        source = new XYZ({
          url: 'https://{a-c}.tile.openstreetmap.org/{z}/{x}/{y}.png',
          attributions: '© OpenStreetMap contributors',
        });
        break;
    }

    baseTileLayerRef.current.setSource(source);
  }, [basemap]);

  useEffect(() => {
    if (!mapInstance.current) return;

    // Remove only the listings layer, preserve boundary layer
    if (listingsLayerRef.current) {
      mapInstance.current.removeLayer(listingsLayerRef.current);
      listingsLayerRef.current = null;
    }

    const features: Feature[] = [];
    
    filteredListings.forEach((listing) => {
      if (!listing.polygon?.geojson) return;

      try {
        const geojson = typeof listing.polygon.geojson === 'string' 
          ? JSON.parse(listing.polygon.geojson) 
          : listing.polygon.geojson;

        const coordinates = geojson.coordinates[0].map((coord: [number, number]) => 
          fromLonLat([coord[0], coord[1]])
        );

        const polygon = new Polygon([coordinates]);
        const feature = new Feature({
          geometry: polygon,
          listing: listing,
        });

        const isSelected = selectedListing?.id === listing.id;
        const color = getPolygonColor(listing, isSelected);
        const label = listing.title || (listing as any).plot_number || 'Plot';
        
        feature.setStyle(
          new Style({
            fill: new Fill({
              color: color + (isSelected ? '99' : '66'),
            }),
            stroke: new Stroke({
              color: color,
              width: isSelected ? 4 : 2,
            }),
            text: new Text({
              text: label,
              font: `bold ${isSelected ? '14px' : '12px'} sans-serif`,
              fill: new Fill({
                color: '#ffffff',
              }),
              stroke: new Stroke({
                color: color,
                width: 3,
              }),
              overflow: true,
              offsetY: 0,
            }),
          })
        );

        features.push(feature);
      } catch (error) {
        console.error('Error rendering polygon:', error);
      }
    });

    const vectorSource = new VectorSource({
      features: features,
    });

    const vectorLayer = new VectorLayer({
      source: vectorSource,
    });

    listingsLayerRef.current = vectorLayer;
    mapInstance.current.addLayer(vectorLayer);

    mapInstance.current.on('click', (evt) => {
      const feature = mapInstance.current?.forEachFeatureAtPixel(evt.pixel, (f) => f);
      if (feature && feature.get('listing')) {
        const listing = feature.get('listing') as ListingWithPolygon;
        setSelectedListing(listing);
        overlayRef.current?.setPosition(evt.coordinate);
      } else {
        setSelectedListing(null);
        overlayRef.current?.setPosition(undefined);
      }
    });

    mapInstance.current.on('pointermove', (evt) => {
      const hit = mapInstance.current?.hasFeatureAtPixel(evt.pixel);
      if (mapRef.current) {
        mapRef.current.style.cursor = hit ? 'pointer' : '';
      }
    });
  }, [filteredListings, selectedListing]);

  // Auto-zoom to selected listing from URL parameter
  useEffect(() => {
    if (!mapInstance.current || !listingParam || listings.length === 0) return;

    const targetListing = listings.find(l => l.id === listingParam);
    if (targetListing && targetListing.polygon) {
      // Small delay to ensure map is fully loaded
      setTimeout(() => {
        zoomToListing(targetListing);
      }, 500);
    }
  }, [listingParam, listings]);

  const FiltersContent = () => (
    <div className="space-y-4">
      <div>
        <label className="text-sm font-medium mb-2 block">Listing Type</label>
        <Select value={listingTypeFilter} onValueChange={setListingTypeFilter}>
          <SelectTrigger>
            <SelectValue placeholder="All Types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="sale">For Sale</SelectItem>
            <SelectItem value="rent">For Rent</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <label className="text-sm font-medium mb-2 block">Property Type</label>
        <Select value={propertyTypeFilter} onValueChange={setPropertyTypeFilter}>
          <SelectTrigger>
            <SelectValue placeholder="All Properties" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Properties</SelectItem>
            <SelectItem value="land">Land</SelectItem>
            <SelectItem value="house">House</SelectItem>
            <SelectItem value="apartment">Apartment</SelectItem>
            <SelectItem value="commercial">Commercial</SelectItem>
            <SelectItem value="other">Other</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <label className="text-sm font-medium mb-2 block">Dealer/Seller</label>
        <Popover open={dealerSearchOpen} onOpenChange={setDealerSearchOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={dealerSearchOpen}
              className="w-full justify-between"
            >
              {dealerFilter === 'all'
                ? 'All Dealers'
                : uniqueDealers.find((dealer) => dealer.id === dealerFilter)?.full_name || 'Select dealer...'}
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[280px] p-0">
            <Command>
              <CommandInput placeholder="Search dealer..." />
              <CommandList>
                <CommandEmpty>No dealer found.</CommandEmpty>
                <CommandGroup>
                  <CommandItem
                    value="all"
                    onSelect={() => {
                      setDealerFilter('all');
                      setDealerSearchOpen(false);
                    }}
                  >
                    <Check
                      className={cn(
                        'mr-2 h-4 w-4',
                        dealerFilter === 'all' ? 'opacity-100' : 'opacity-0'
                      )}
                    />
                    All Dealers
                  </CommandItem>
                  {uniqueDealers.map((dealer) => (
                    <CommandItem
                      key={dealer.id}
                      value={dealer.full_name}
                      onSelect={() => {
                        setDealerFilter(dealer.id);
                        setDealerSearchOpen(false);
                      }}
                    >
                      <Check
                        className={cn(
                          'mr-2 h-4 w-4',
                          dealerFilter === dealer.id ? 'opacity-100' : 'opacity-0'
                        )}
                      />
                      {dealer.full_name}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>

      <div className="pt-4 border-t border-border space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">Location Filters</h3>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Mode:</span>
            <Select 
              value={spatialFilterMode} 
              onValueChange={(value: 'boundary' | 'id') => setSpatialFilterMode(value)}
            >
              <SelectTrigger className="h-7 w-[100px] text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="boundary">
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    Spatial
                  </span>
                </SelectItem>
                <SelectItem value="id">
                  <span className="flex items-center gap-1">
                    <Check className="h-3 w-3" />
                    Assigned
                  </span>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        
        {spatialFilterMode === 'boundary' && (
          <p className="text-xs text-muted-foreground bg-muted/50 p-2 rounded">
            Spatial mode finds all properties within ward boundaries, even if not formally assigned.
          </p>
        )}
        
        <div>
          <label className="text-sm font-medium mb-2 block">Region</label>
          <Select value={regionFilter} onValueChange={setRegionFilter}>
            <SelectTrigger>
              <SelectValue placeholder="All Regions" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Regions</SelectItem>
              {regions.map((region) => (
                <SelectItem key={region.id} value={region.id}>
                  {region.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {regionFilter !== 'all' && districts.length > 0 && (
          <div>
            <label className="text-sm font-medium mb-2 block">District</label>
            <Select value={districtFilter} onValueChange={setDistrictFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All Districts" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Districts</SelectItem>
                {districts.map((district) => (
                  <SelectItem key={district.id} value={district.id}>
                    {district.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {districtFilter !== 'all' && wards.length > 0 && (
          <div>
            <label className="text-sm font-medium mb-2 block">Ward</label>
            <Select value={wardFilter} onValueChange={setWardFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All Wards" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Wards</SelectItem>
                {wards.map((ward) => (
                  <SelectItem key={ward.id} value={ward.id}>
                    {ward.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {wardFilter !== 'all' && streets.length > 0 && (
          <div>
            <label className="text-sm font-medium mb-2 block">Street/Village</label>
            <Select value={streetFilter} onValueChange={setStreetFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All Streets" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Streets</SelectItem>
                {streets.map((street) => (
                  <SelectItem key={street.id} value={street.id}>
                    {street.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      <div>
        <label className="text-sm font-medium mb-2 block">Basemap</label>
        <Select value={basemap} onValueChange={(value: 'osm' | 'satellite' | 'topo' | 'terrain') => setBasemap(value)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="osm">OpenStreetMap</SelectItem>
            <SelectItem value="satellite">Satellite</SelectItem>
            <SelectItem value="topo">Topographic</SelectItem>
            <SelectItem value="terrain">Terrain</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="pt-4 border-t border-border">
        <h3 className="text-sm font-semibold mb-2">Legend</h3>
        <div className="text-xs text-muted-foreground mb-3">
          {filteredListings.length} property polygon(s) on map
        </div>
        <div className="space-y-2 mb-4">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: '#22c55e' }} />
            <span className="text-sm">Verified Property</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: '#eab308' }} />
            <span className="text-sm">Pending Property</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: '#94a3b8' }} />
            <span className="text-sm">Unverified Property</span>
          </div>
        </div>
        {(regionFilter !== 'all' || districtFilter !== 'all' || wardFilter !== 'all') && (
          <div className="pt-2 border-t border-border/50">
            <h4 className="text-xs font-medium mb-2 text-muted-foreground">Administrative Boundaries</h4>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded border-2 border-dashed" style={{ borderColor: '#8b5cf6', backgroundColor: '#8b5cf610' }} />
                <span className="text-sm">Ward Boundaries (Region/District)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded border-2" style={{ borderColor: '#3b82f6', backgroundColor: '#3b82f620' }} />
                <span className="text-sm">Selected Ward</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  const PropertyListContent = () => (
    <div className="space-y-3">
      <div className="flex items-center justify-between pb-2">
        <h3 className="font-semibold">Properties ({filteredListings.length})</h3>
        {userLocation && (
          <span className="text-xs text-muted-foreground">Sorted by distance</span>
        )}
      </div>

      {loading ? (
        <div className="text-center py-8">
          <p className="text-sm text-muted-foreground">Loading properties...</p>
        </div>
      ) : filteredListings.length === 0 ? (
        <div className="text-center py-8">
          <MapPin className="h-12 w-12 mx-auto text-muted-foreground opacity-20 mb-2" />
          <p className="text-sm text-muted-foreground">No properties match your filters</p>
        </div>
      ) : (
        <div className="space-y-2 max-h-[calc(100vh-20rem)] md:max-h-[50vh] overflow-y-auto">
          {filteredListings.map((listing) => (
            <Card
              key={listing.id}
              className={cn(
                "cursor-pointer transition-all hover:shadow-md mobile-card",
                selectedListing?.id === listing.id && "ring-2 ring-primary"
              )}
              onClick={() => {
                zoomToListing(listing);
                if (isMobile) setShowPropertyList(false);
              }}
            >
              <CardContent className="p-3">
                <h4 className="font-semibold text-sm mb-1 line-clamp-1">{listing.title}</h4>
                <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {listing.location_label}
                </p>
                {listing.price && (
                  <p className="font-bold text-sm text-primary">
                    {listing.price.toLocaleString()} {listing.currency || 'TZS'}
                  </p>
                )}
                {userLocation && listing.polygon?.centroid_lat && listing.polygon?.centroid_lng && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {calculateDistance(
                      userLocation.lat,
                      userLocation.lng,
                      listing.polygon.centroid_lat,
                      listing.polygon.centroid_lng
                    ).toFixed(1)}km away
                  </p>
                )}
                <div className="flex items-center gap-2 mt-2">
                  {listing.verification_status === 'verified' && (
                    <Badge variant="default" className="text-xs bg-green-500">
                      <Check className="h-3 w-3 mr-1" />
                      Verified
                    </Badge>
                  )}
                  {listing.verification_status === 'pending' && (
                    <Badge variant="secondary" className="text-xs bg-orange-500 text-white">
                      Pending
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <MainLayout hideSidebar>
      <div className="relative h-[calc(100vh-4rem)] w-full">
        {/* Desktop Sidebar */}
        {!isMobile && (
          <div className="absolute left-0 top-0 bottom-0 w-80 border-r border-border bg-background z-10 shadow-lg overflow-hidden flex flex-col">
            <div className="p-4 border-b">
              <h2 className="text-lg font-bold">Map Filters</h2>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              <FiltersContent />
            </div>
            <div className="border-t p-4 overflow-y-auto max-h-[40vh]">
              <PropertyListContent />
            </div>
          </div>
        )}

        {/* Mobile Floating Controls */}
        {isMobile && (
          <>
            {/* Filters Button */}
            <Sheet open={showFilters} onOpenChange={setShowFilters}>
              <SheetTrigger asChild>
                <Button
                  size="lg"
                  className="fixed top-20 left-4 z-20 rounded-full shadow-xl touch-feedback"
                >
                  <SlidersHorizontal className="h-5 w-5 mr-2" />
                  Filters
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-full sm:w-96 p-0 flex flex-col">
                <SheetHeader className="p-4 border-b">
                  <SheetTitle>Map Filters</SheetTitle>
                </SheetHeader>
                <div className="flex-1 overflow-y-auto p-4">
                  <FiltersContent />
                </div>
              </SheetContent>
            </Sheet>

            {/* Properties List Button */}
            <Drawer open={showPropertyList} onOpenChange={setShowPropertyList}>
              <DrawerTrigger asChild>
                <Button
                  size="lg"
                  className="fixed bottom-24 left-1/2 -translate-x-1/2 z-20 rounded-full shadow-xl touch-feedback"
                >
                  <List className="h-5 w-5 mr-2" />
                  {filteredListings.length} Properties
                </Button>
              </DrawerTrigger>
              <DrawerContent className="max-h-[85vh]">
                <DrawerHeader className="border-b">
                  <DrawerTitle>Properties on Map</DrawerTitle>
                </DrawerHeader>
                <div className="p-4 overflow-y-auto">
                  <PropertyListContent />
                </div>
              </DrawerContent>
            </Drawer>

            {/* Location Button */}
            {!locationPermissionAsked && (
              <Button
                size="icon"
                onClick={requestUserLocation}
                className="fixed top-20 right-4 z-20 rounded-full shadow-xl touch-feedback"
              >
                <Navigation2 className="h-5 w-5" />
              </Button>
            )}

            {/* Basemap Switcher */}
            <Popover open={showBasemapSelector} onOpenChange={setShowBasemapSelector}>
              <PopoverTrigger asChild>
                <Button
                  size="icon"
                  variant="secondary"
                  className="fixed top-32 right-4 z-20 rounded-full shadow-xl touch-feedback"
                >
                  <Layers className="h-5 w-5" />
                </Button>
              </PopoverTrigger>
              <PopoverContent side="left" className="w-40 p-2">
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-muted-foreground px-2 pb-1">Basemap</p>
                  {[
                    { value: 'osm', label: 'OpenStreetMap' },
                    { value: 'satellite', label: 'Satellite' },
                    { value: 'topo', label: 'Topographic' },
                    { value: 'terrain', label: 'Terrain' },
                  ].map((option) => (
                    <button
                      key={option.value}
                      onClick={() => {
                        setBasemap(option.value as 'osm' | 'satellite' | 'topo' | 'terrain');
                        setShowBasemapSelector(false);
                      }}
                      className={cn(
                        "w-full text-left px-2 py-1.5 rounded-md text-sm transition-colors",
                        basemap === option.value
                          ? "bg-primary text-primary-foreground"
                          : "hover:bg-muted"
                      )}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
          </>
        )}

        {/* Map Container */}
        <div className={cn(
          "h-full w-full",
          !isMobile && "pl-80"
        )}>
          <div ref={mapRef} className="w-full h-full" />

          {/* Popup Overlay */}
          <div 
            ref={popupRef} 
            className="absolute z-50" 
            style={{ display: selectedListing ? 'block' : 'none' }}
          >
          {selectedListing && (
              <div className={cn(
                "bg-card/95 backdrop-blur-md border-2 border-red-500 rounded-2xl shadow-2xl overflow-hidden animate-scale-in",
                isMobile ? "min-w-[200px] max-w-[220px]" : "min-w-[280px] max-w-[320px]"
              )}>
                {/* Header with gradient */}
                <div className={cn(
                  "bg-gradient-to-r from-red-500 to-red-600",
                  isMobile ? "px-3 py-2" : "px-4 py-3"
                )}>
                  <h3 className={cn(
                    "font-bold text-white line-clamp-1",
                    isMobile ? "text-sm" : "text-lg"
                  )}>{selectedListing.title}</h3>
                  <div className={cn(
                    "flex items-center gap-1 text-white/90 mt-0.5",
                    isMobile ? "text-xs" : "text-sm"
                  )}>
                    <MapPin className={isMobile ? "h-3 w-3" : "h-4 w-4"} />
                    <span className="line-clamp-1">{selectedListing.location_label}</span>
                  </div>
                </div>
                
                {/* Content */}
                <div className={cn(
                  "space-y-2",
                  isMobile ? "p-2" : "p-4 space-y-3"
                )}>
                  {/* Price */}
                  <div className="flex items-center justify-between">
                    <span className={cn("text-muted-foreground", isMobile ? "text-xs" : "text-sm")}>Price</span>
                    <span className={cn("font-bold text-primary", isMobile ? "text-sm" : "text-xl")}>
                      {selectedListing.price 
                        ? `${selectedListing.currency} ${selectedListing.price.toLocaleString()}` 
                        : 'Contact'}
                    </span>
                  </div>
                  
                  {/* Area if available */}
                  {selectedListing.polygon?.area_m2 && (
                    <div className={cn("flex items-center justify-between", isMobile ? "text-xs" : "text-sm")}>
                      <span className="text-muted-foreground">Area</span>
                      <span className="font-medium">
                        {selectedListing.polygon.area_m2 < 10000 
                          ? `${selectedListing.polygon.area_m2.toLocaleString()} m²`
                          : `${(selectedListing.polygon.area_m2 / 10000).toFixed(2)} ha`}
                      </span>
                    </div>
                  )}
                  
                  {/* Action Button */}
                  <Link to={`/listings/${selectedListing.id}`} className="block pt-1">
                    <Button size={isMobile ? "sm" : "default"} className="w-full bg-red-500 hover:bg-red-600 text-white gap-1">
                      View Details
                      <svg className={isMobile ? "h-3 w-3" : "h-4 w-4"} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </Button>
                  </Link>
                </div>
              </div>
            )}
          </div>

          {/* Empty State */}
          {filteredListings.length === 0 && !loading && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <Card className="pointer-events-auto shadow-xl">
                <CardContent className="p-6 text-center">
                  <MapPin className="h-12 w-12 mx-auto text-muted-foreground opacity-20 mb-2" />
                  <p className="text-muted-foreground">No listings with polygons found matching your criteria</p>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  );
}
