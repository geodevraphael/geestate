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
import { MapPin, CheckCircle2, Check, ChevronsUpDown, SlidersHorizontal, List, Navigation2, X } from 'lucide-react';
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
import { Style, Fill, Stroke } from 'ol/style';
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
  distance?: number;
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
  const [basemap, setBasemap] = useState<'street' | 'satellite'>('satellite');
  const [selectedListing, setSelectedListing] = useState<ListingWithPolygon | null>(null);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationPermissionAsked, setLocationPermissionAsked] = useState(false);
  const [dealerSearchOpen, setDealerSearchOpen] = useState(false);
  const [regionSearchOpen, setRegionSearchOpen] = useState(false);
  const [districtSearchOpen, setDistrictSearchOpen] = useState(false);
  const [wardSearchOpen, setWardSearchOpen] = useState(false);
  const [streetSearchOpen, setStreetSearchOpen] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [showPropertyList, setShowPropertyList] = useState(false);
  const [regions, setRegions] = useState<any[]>([]);
  const [districts, setDistricts] = useState<any[]>([]);
  const [wards, setWards] = useState<any[]>([]);
  const [streets, setStreets] = useState<any[]>([]);
  const [addressSearch, setAddressSearch] = useState('');
  const [addressSearchResults, setAddressSearchResults] = useState<any[]>([]);
  const [isSearchingAddress, setIsSearchingAddress] = useState(false);
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<Map | null>(null);
  const popupRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<Overlay | null>(null);
  const baseTileLayerRef = useRef<TileLayer<XYZ> | null>(null);
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

  const searchAddress = async (query: string) => {
    if (query.length < 3) {
      setAddressSearchResults([]);
      return;
    }

    setIsSearchingAddress(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&countrycodes=tz&limit=5&addressdetails=1`
      );
      const data = await response.json();
      setAddressSearchResults(data);
    } catch (error) {
      console.error('Error searching address:', error);
      setAddressSearchResults([]);
    } finally {
      setIsSearchingAddress(false);
    }
  };

  const selectAddressResult = (result: any) => {
    if (!mapInstance.current) return;
    
    const lat = parseFloat(result.lat);
    const lon = parseFloat(result.lon);
    
    mapInstance.current.getView().animate({
      center: fromLonLat([lon, lat]),
      zoom: 16,
      duration: 1000,
    });
    
    setAddressSearch('');
    setAddressSearchResults([]);
  };

  const clearLocationFilters = () => {
    setRegionFilter('all');
    setDistrictFilter('all');
    setWardFilter('all');
    setStreetFilter('all');
  };

  const getLocationCounts = (locationType: 'region' | 'district' | 'ward' | 'street', locationId: string) => {
    const idField = `${locationType}_id`;
    return listings.filter((listing) => (listing as any)[idField] === locationId).length;
  };

  useEffect(() => {
    if (regionFilter !== 'all') {
      fetchDistricts(regionFilter);
      setDistrictFilter('all');
      setWardFilter('all');
      setStreetFilter('all');
    } else {
      setDistricts([]);
      setWards([]);
      setStreets([]);
    }
  }, [regionFilter]);

  useEffect(() => {
    if (districtFilter !== 'all') {
      fetchWards(districtFilter);
      setWardFilter('all');
      setStreetFilter('all');
    } else {
      setWards([]);
      setStreets([]);
    }
  }, [districtFilter]);

  useEffect(() => {
    if (wardFilter !== 'all') {
      fetchStreets(wardFilter);
      setStreetFilter('all');
    } else {
      setStreets([]);
    }
  }, [wardFilter]);

  const fetchDistricts = async (regionId: string) => {
    const { data } = await supabase.from('districts').select('*').eq('region_id', regionId).order('name');
    setDistricts(data || []);
  };

  const fetchWards = async (districtId: string) => {
    const { data } = await supabase.from('wards').select('*').eq('district_id', districtId).order('name');
    setWards(data || []);
  };

  const fetchStreets = async (wardId: string) => {
    const { data } = await supabase.from('streets_villages').select('*').eq('ward_id', wardId).order('name');
    setStreets(data || []);
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
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
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

  const filteredListings = useMemo(() => {
    const filtered = listings.filter((listing) => {
      const matchesListingType = listingTypeFilter === 'all' || listing.listing_type === listingTypeFilter;
      const matchesPropertyType = propertyTypeFilter === 'all' || listing.property_type === propertyTypeFilter;
      const matchesDealer = dealerFilter === 'all' || listing.owner_id === dealerFilter;
      const matchesRegion = regionFilter === 'all' || listing.region_id === regionFilter;
      const matchesDistrict = districtFilter === 'all' || listing.district_id === districtFilter;
      const matchesWard = wardFilter === 'all' || listing.ward_id === wardFilter;
      const matchesStreet = streetFilter === 'all' || listing.street_village_id === streetFilter;
      
      return matchesListingType && matchesPropertyType && matchesDealer && matchesRegion && matchesDistrict && matchesWard && matchesStreet;
    });
    return getSortedListings(filtered);
  }, [listings, listingTypeFilter, propertyTypeFilter, dealerFilter, regionFilter, districtFilter, wardFilter, streetFilter, userLocation]);

  const zoomToListing = (listing: ListingWithPolygon) => {
    if (!mapInstance.current || !listing.polygon) return;

    try {
      const geojson = typeof listing.polygon.geojson === 'string' 
        ? JSON.parse(listing.polygon.geojson) 
        : listing.polygon.geojson;

      const coordinates = geojson.coordinates[0].map((coord: [number, number]) => 
        fromLonLat([coord[0], coord[1]])
      );

      const polygon = new Polygon([coordinates]);
      const extent = polygon.getExtent();

      mapInstance.current.getView().fit(extent, {
        padding: [100, 100, 100, 100],
        duration: 1000,
        maxZoom: 18,
      });

      setSelectedListing(listing);
      
      const center = getCenter(extent);
      overlayRef.current?.setPosition(center);
    } catch (error) {
      console.error('Error zooming to listing:', error);
      
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

  const getPolygonColor = (listing: ListingWithPolygon) => {
    if (listing.verification_status === 'verified') return '#22c55e';
    if (listing.verification_status === 'pending') return '#eab308';
    return '#94a3b8';
  };

  useEffect(() => {
    if (!mapRef.current) return;

    const satelliteLayer = new TileLayer({
      source: new XYZ({
        url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        attributions: '© Esri',
      }),
    });
    
    const labelsLayer = new TileLayer({
      source: new XYZ({
        url: 'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}',
        attributions: '© Esri',
      }),
    });
    
    baseTileLayerRef.current = satelliteLayer;

    const map = new Map({
      target: mapRef.current,
      layers: [satelliteLayer, labelsLayer],
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

    const source = basemap === 'satellite'
      ? new XYZ({
          url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
          attributions: 'Tiles © Esri',
        })
      : new XYZ({
          url: 'https://{a-c}.tile.openstreetmap.org/{z}/{x}/{y}.png',
          attributions: '© OpenStreetMap contributors',
        });

    baseTileLayerRef.current.setSource(source);
  }, [basemap]);

  useEffect(() => {
    if (!mapInstance.current) return;

    const layers = mapInstance.current.getLayers().getArray();
    layers.forEach(layer => {
      if (layer instanceof VectorLayer) {
        mapInstance.current?.removeLayer(layer);
      }
    });

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

        const color = getPolygonColor(listing);
        feature.setStyle(
          new Style({
            fill: new Fill({
              color: color + '66',
            }),
            stroke: new Stroke({
              color: color,
              width: 2,
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

    mapInstance.current.addLayer(vectorLayer);

    mapInstance.current.on('click', (evt) => {
      const feature = mapInstance.current?.forEachFeatureAtPixel(evt.pixel, (f) => f);
      if (feature) {
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
  }, [filteredListings]);

  useEffect(() => {
    if (!mapInstance.current || !listingParam || listings.length === 0) return;

    const targetListing = listings.find(l => l.id === listingParam);
    if (targetListing && targetListing.polygon) {
      setTimeout(() => {
        zoomToListing(targetListing);
      }, 500);
    }
  }, [listingParam, listings]);

  const FiltersContent = () => (
    <div className="space-y-6">
      <div className="space-y-3">
        <label className="text-sm font-semibold text-foreground">Listing Type</label>
        <Select value={listingTypeFilter} onValueChange={setListingTypeFilter}>
          <SelectTrigger className="h-11">
            <SelectValue placeholder="All Types" />
          </SelectTrigger>
          <SelectContent className="bg-popover/95 backdrop-blur-sm">
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="sale">For Sale</SelectItem>
            <SelectItem value="rent">For Rent</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-3">
        <label className="text-sm font-semibold text-foreground">Property Type</label>
        <Select value={propertyTypeFilter} onValueChange={setPropertyTypeFilter}>
          <SelectTrigger className="h-11">
            <SelectValue placeholder="All Property Types" />
          </SelectTrigger>
          <SelectContent className="bg-popover/95 backdrop-blur-sm">
            <SelectItem value="all">All Properties</SelectItem>
            <SelectItem value="land">Land</SelectItem>
            <SelectItem value="house">House</SelectItem>
            <SelectItem value="apartment">Apartment</SelectItem>
            <SelectItem value="commercial">Commercial</SelectItem>
            <SelectItem value="other">Other</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-3">
        <label className="text-sm font-semibold text-foreground">Dealer/Seller</label>
        <Popover open={dealerSearchOpen} onOpenChange={setDealerSearchOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={dealerSearchOpen}
              className="w-full justify-between h-11 font-normal"
            >
              {dealerFilter === 'all'
                ? 'All Dealers'
                : uniqueDealers.find((dealer) => dealer.id === dealerFilter)?.full_name || 'Select dealer...'}
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-full p-0 bg-popover/95 backdrop-blur-sm border-border" align="start">
            <Command className="bg-transparent">
              <CommandInput placeholder="Search dealer..." className="h-11" />
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

      <div className="pt-6 border-t space-y-4">
        <div className="flex items-center justify-between">
          <label className="text-sm font-semibold text-foreground">Location Filters</label>
          {(regionFilter !== 'all' || districtFilter !== 'all' || wardFilter !== 'all' || streetFilter !== 'all') && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearLocationFilters}
              className="text-xs h-8 hover:bg-destructive/10 hover:text-destructive"
            >
              Clear All
            </Button>
          )}
        </div>

        <div className="space-y-3">
          <div className="relative">
            <input
              type="text"
              placeholder="🔍 Search by address..."
              value={addressSearch}
              onChange={(e) => {
                setAddressSearch(e.target.value);
                searchAddress(e.target.value);
              }}
              className="w-full h-11 px-4 py-2 bg-background border border-input rounded-lg text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
            {addressSearchResults.length > 0 && (
              <div className="absolute z-50 w-full mt-2 bg-popover border border-border rounded-lg shadow-xl max-h-60 overflow-auto backdrop-blur-sm">
                {addressSearchResults.map((result, idx) => (
                  <button
                    key={idx}
                    onClick={() => selectAddressResult(result)}
                    className="w-full px-4 py-3 text-left text-sm hover:bg-accent/50 transition-colors border-b border-border/50 last:border-b-0 first:rounded-t-lg last:rounded-b-lg"
                  >
                    <div className="font-medium text-foreground flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-primary" />
                      <span className="line-clamp-1">{result.display_name}</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
        
        <div className="space-y-3">
          <label className="text-sm font-semibold text-foreground">Region</label>
          <Popover open={regionSearchOpen} onOpenChange={setRegionSearchOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={regionSearchOpen}
                className="w-full justify-between h-11 font-normal"
              >
                {regionFilter === 'all'
                  ? 'All Regions'
                  : regions.find((r) => r.id === regionFilter)?.name || 'Select region...'}
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-full p-0 bg-popover/95 backdrop-blur-sm border-border" align="start">
              <Command className="bg-transparent">
                <CommandInput placeholder="Search region..." className="h-11" />
                <CommandList>
                  <CommandEmpty>No region found.</CommandEmpty>
                  <CommandGroup>
                    <CommandItem
                      value="all"
                      onSelect={() => {
                        setRegionFilter('all');
                        setRegionSearchOpen(false);
                      }}
                    >
                      <Check className={cn("mr-2 h-4 w-4", regionFilter === 'all' ? "opacity-100" : "opacity-0")} />
                      All Regions
                    </CommandItem>
                    {regions.map((region) => (
                      <CommandItem
                        key={region.id}
                        value={region.name}
                        onSelect={() => {
                          setRegionFilter(region.id);
                          setRegionSearchOpen(false);
                        }}
                      >
                        <Check className={cn("mr-2 h-4 w-4", regionFilter === region.id ? "opacity-100" : "opacity-0")} />
                        <span className="flex-1">{region.name}</span>
                        <Badge variant="secondary" className="ml-2 text-xs">{getLocationCounts('region', region.id)}</Badge>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>

        {regionFilter !== 'all' && (
          <div className="space-y-3">
            <label className="text-sm font-semibold text-foreground">District</label>
            <Popover open={districtSearchOpen} onOpenChange={setDistrictSearchOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={districtSearchOpen}
                  className="w-full justify-between h-11 font-normal"
                >
                  {districtFilter === 'all'
                    ? 'All Districts'
                    : districts.find((d) => d.id === districtFilter)?.name || 'Select district...'}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-full p-0 bg-popover/95 backdrop-blur-sm border-border" align="start">
                <Command className="bg-transparent">
                  <CommandInput placeholder="Search district..." className="h-11" />
                  <CommandList>
                    <CommandEmpty>No district found.</CommandEmpty>
                    <CommandGroup>
                      <CommandItem
                        value="all"
                        onSelect={() => {
                          setDistrictFilter('all');
                          setDistrictSearchOpen(false);
                        }}
                      >
                        <Check className={cn("mr-2 h-4 w-4", districtFilter === 'all' ? "opacity-100" : "opacity-0")} />
                        All Districts
                      </CommandItem>
                      {districts.map((district) => (
                        <CommandItem
                          key={district.id}
                          value={district.name}
                          onSelect={() => {
                            setDistrictFilter(district.id);
                            setDistrictSearchOpen(false);
                          }}
                        >
                          <Check className={cn("mr-2 h-4 w-4", districtFilter === district.id ? "opacity-100" : "opacity-0")} />
                          <span className="flex-1">{district.name}</span>
                          <Badge variant="secondary" className="ml-2 text-xs">{getLocationCounts('district', district.id)}</Badge>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>
        )}

        {districtFilter !== 'all' && (
          <div className="space-y-3">
            <label className="text-sm font-semibold text-foreground">Ward</label>
            <Popover open={wardSearchOpen} onOpenChange={setWardSearchOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={wardSearchOpen}
                  className="w-full justify-between h-11 font-normal"
                >
                  {wardFilter === 'all'
                    ? 'All Wards'
                    : wards.find((w) => w.id === wardFilter)?.name || 'Select ward...'}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-full p-0 bg-popover/95 backdrop-blur-sm border-border" align="start">
                <Command className="bg-transparent">
                  <CommandInput placeholder="Search ward..." className="h-11" />
                  <CommandList>
                    <CommandEmpty>No ward found.</CommandEmpty>
                    <CommandGroup>
                      <CommandItem
                        value="all"
                        onSelect={() => {
                          setWardFilter('all');
                          setWardSearchOpen(false);
                        }}
                      >
                        <Check className={cn("mr-2 h-4 w-4", wardFilter === 'all' ? "opacity-100" : "opacity-0")} />
                        All Wards
                      </CommandItem>
                      {wards.map((ward) => (
                        <CommandItem
                          key={ward.id}
                          value={ward.name}
                          onSelect={() => {
                            setWardFilter(ward.id);
                            setWardSearchOpen(false);
                          }}
                        >
                          <Check className={cn("mr-2 h-4 w-4", wardFilter === ward.id ? "opacity-100" : "opacity-0")} />
                          <span className="flex-1">{ward.name}</span>
                          <Badge variant="secondary" className="ml-2 text-xs">{getLocationCounts('ward', ward.id)}</Badge>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>
        )}

        {wardFilter !== 'all' && (
          <div className="space-y-3">
            <label className="text-sm font-semibold text-foreground">Street/Village</label>
            <Popover open={streetSearchOpen} onOpenChange={setStreetSearchOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={streetSearchOpen}
                  className="w-full justify-between h-11 font-normal"
                >
                  {streetFilter === 'all'
                    ? 'All Streets'
                    : streets.find((s) => s.id === streetFilter)?.name || 'Select street...'}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-full p-0 bg-popover/95 backdrop-blur-sm border-border" align="start">
                <Command className="bg-transparent">
                  <CommandInput placeholder="Search street/village..." className="h-11" />
                  <CommandList>
                    <CommandEmpty>No street/village found.</CommandEmpty>
                    <CommandGroup>
                      <CommandItem
                        value="all"
                        onSelect={() => {
                          setStreetFilter('all');
                          setStreetSearchOpen(false);
                        }}
                      >
                        <Check className={cn("mr-2 h-4 w-4", streetFilter === 'all' ? "opacity-100" : "opacity-0")} />
                        All Streets
                      </CommandItem>
                      {streets.map((street) => (
                        <CommandItem
                          key={street.id}
                          value={street.name}
                          onSelect={() => {
                            setStreetFilter(street.id);
                            setStreetSearchOpen(false);
                          }}
                        >
                          <Check className={cn("mr-2 h-4 w-4", streetFilter === street.id ? "opacity-100" : "opacity-0")} />
                          <span className="flex-1">{street.name}</span>
                          <Badge variant="secondary" className="ml-2 text-xs">{getLocationCounts('street', street.id)}</Badge>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>
        )}
      </div>
    </div>
  );

  const PropertiesListContent = () => (
    <div className="space-y-4">
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : filteredListings.length === 0 ? (
        <div className="text-center py-12 space-y-3">
          <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-3">
            <MapPin className="h-8 w-8 text-muted-foreground" />
          </div>
          <p className="text-muted-foreground font-medium">No properties found</p>
          <p className="text-sm text-muted-foreground">Try adjusting your filters</p>
        </div>
      ) : (
        filteredListings.map((listing) => (
          <Card key={listing.id} className="overflow-hidden hover:shadow-lg transition-all hover:scale-[1.02] border-border bg-card/50 backdrop-blur-sm cursor-pointer" onClick={() => zoomToListing(listing)}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-3 mb-3">
                <h3 className="font-bold text-sm line-clamp-2 flex-1">{listing.title}</h3>
                {listing.verification_status === 'verified' && (
                  <Badge variant="default" className="bg-success text-success-foreground flex-shrink-0">
                    <CheckCircle2 className="h-3 w-3" />
                  </Badge>
                )}
              </div>
              
              <div className="space-y-2 mb-3">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <MapPin className="h-4 w-4 text-primary flex-shrink-0" />
                  <p className="text-xs line-clamp-1">{listing.location_label}</p>
                </div>
                
                {listing.distance !== undefined && listing.distance !== Infinity && (
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-xs font-normal">
                      📍 {listing.distance.toFixed(1)} km away
                    </Badge>
                  </div>
                )}
              </div>
              
              {listing.price && (
                <div className="px-3 py-2 bg-primary/5 rounded-lg mb-3">
                  <p className="text-lg font-bold text-primary">
                    {listing.currency || 'TZS'} {listing.price.toLocaleString()}
                  </p>
                </div>
              )}
              
              <div className="flex gap-2">
                <Button
                  size="default"
                  variant="outline"
                  className="flex-1 h-10 hover:bg-accent"
                  onClick={(e) => {
                    e.stopPropagation();
                    zoomToListing(listing);
                  }}
                >
                  <MapPin className="h-4 w-4 mr-2" />
                  Locate
                </Button>
                <Link to={`/listings/${listing.id}`} className="flex-1" onClick={(e) => e.stopPropagation()}>
                  <Button size="default" className="w-full h-10 font-medium">View Details</Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );

  return (
    <MainLayout>
      <div className="flex flex-col h-screen bg-background">
        <div className="flex-1 relative">
          <div ref={mapRef} className="w-full h-full rounded-lg overflow-hidden" />
          
          {/* Map Controls */}
          <div className="absolute top-4 left-4 z-10 flex flex-col gap-3">
            <Select value={basemap} onValueChange={(value: 'street' | 'satellite') => setBasemap(value)}>
              <SelectTrigger className="w-44 h-11 bg-card/95 backdrop-blur-sm shadow-lg border-border hover:bg-card transition-colors">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-popover/95 backdrop-blur-sm border-border">
                <SelectItem value="satellite">🛰️ Satellite View</SelectItem>
                <SelectItem value="street">🗺️ Street View</SelectItem>
              </SelectContent>
            </Select>

            {userLocation && (
              <Button
                size="sm"
                variant="secondary"
                className="shadow-lg bg-card/95 backdrop-blur-sm hover:bg-card hover:scale-105 transition-all h-11 w-11 p-0"
                onClick={() => {
                  if (mapInstance.current && userLocation) {
                    mapInstance.current.getView().animate({
                      center: fromLonLat([userLocation.lng, userLocation.lat]),
                      zoom: 14,
                      duration: 1000,
                    });
                  }
                }}
              >
                <Navigation2 className="h-5 w-5 text-primary" />
              </Button>
            )}
          </div>

          {/* Legend */}
          <Card className="absolute bottom-4 left-4 w-72 shadow-xl border-border bg-card/95 backdrop-blur-sm z-10">
            <CardContent className="p-5">
              <h3 className="text-sm font-bold mb-3 text-foreground">Map Legend</h3>
              <div className="flex items-center gap-2 px-3 py-2 bg-primary/5 rounded-lg mb-4">
                <span className="text-2xl font-bold text-primary">{filteredListings.length}</span>
                <span className="text-xs text-muted-foreground">properties visible</span>
              </div>
              <div className="space-y-3">
                <div className="flex items-center gap-3 group hover:bg-accent/5 p-2 rounded-lg transition-colors">
                  <div className="w-5 h-5 rounded bg-[#22c55e66] border-2 border-[#22c55e] flex-shrink-0" />
                  <div className="flex flex-col">
                    <span className="text-xs font-medium">Verified Listings</span>
                    <span className="text-[10px] text-muted-foreground">Ownership confirmed</span>
                  </div>
                  <CheckCircle2 className="h-3 w-3 text-[#22c55e] ml-auto" />
                </div>
                <div className="flex items-center gap-3 group hover:bg-accent/5 p-2 rounded-lg transition-colors">
                  <div className="w-5 h-5 rounded bg-[#eab30866] border-2 border-[#eab308] flex-shrink-0" />
                  <div className="flex flex-col">
                    <span className="text-xs font-medium">Pending Review</span>
                    <span className="text-[10px] text-muted-foreground">Under verification</span>
                  </div>
                </div>
                <div className="flex items-center gap-3 group hover:bg-accent/5 p-2 rounded-lg transition-colors">
                  <div className="w-5 h-5 rounded bg-[#94a3b866] border-2 border-[#94a3b8] flex-shrink-0" />
                  <div className="flex flex-col">
                    <span className="text-xs font-medium">Unverified</span>
                    <span className="text-[10px] text-muted-foreground">Not yet reviewed</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Mobile Buttons */}
          {isMobile && (
            <div className="absolute bottom-4 right-4 flex flex-col gap-3 z-10">
              <Drawer open={showFilters} onOpenChange={setShowFilters}>
                <DrawerTrigger asChild>
                  <Button size="lg" className="shadow-xl bg-primary hover:bg-primary/90 backdrop-blur-sm gap-2 h-12 font-medium">
                    <SlidersHorizontal className="h-5 w-5" />
                    Filters
                  </Button>
                </DrawerTrigger>
                <DrawerContent className="bg-background/95 backdrop-blur-xl border-t-border">
                  <DrawerHeader className="border-b border-border">
                    <DrawerTitle className="text-xl font-bold">Filter Properties</DrawerTitle>
                  </DrawerHeader>
                  <div className="px-4 pb-8 max-h-[75vh] overflow-y-auto">
                    <FiltersContent />
                  </div>
                </DrawerContent>
              </Drawer>
              
              <Drawer open={showPropertyList} onOpenChange={setShowPropertyList}>
                <DrawerTrigger asChild>
                  <Button size="lg" variant="secondary" className="shadow-xl bg-card/95 hover:bg-card backdrop-blur-sm gap-2 h-12 font-medium">
                    <List className="h-5 w-5" />
                    Properties ({filteredListings.length})
                  </Button>
                </DrawerTrigger>
                <DrawerContent className="bg-background/95 backdrop-blur-xl border-t-border">
                  <DrawerHeader className="border-b border-border">
                    <DrawerTitle className="text-xl font-bold">Available Properties</DrawerTitle>
                  </DrawerHeader>
                  <div className="px-4 pb-8 max-h-[75vh] overflow-y-auto">
                    <PropertiesListContent />
                  </div>
                </DrawerContent>
              </Drawer>
            </div>
          )}

          {/* Desktop Sidebars */}
          {!isMobile && (
            <>
              <Sheet open={showFilters} onOpenChange={setShowFilters}>
                <SheetTrigger asChild>
                  <Button size="default" className="absolute top-4 right-4 z-10 shadow-xl bg-primary hover:bg-primary/90 backdrop-blur-sm gap-2 h-11 font-medium">
                    <SlidersHorizontal className="h-5 w-5" />
                    Filters
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-96 overflow-y-auto bg-background/95 backdrop-blur-xl border-l-border">
                  <SheetHeader className="border-b border-border pb-4">
                    <SheetTitle className="text-xl font-bold">Filter Properties</SheetTitle>
                  </SheetHeader>
                  <div className="mt-6">
                    <FiltersContent />
                  </div>
                </SheetContent>
              </Sheet>

              <Sheet open={showPropertyList} onOpenChange={setShowPropertyList}>
                <SheetTrigger asChild>
                  <Button size="default" variant="secondary" className="absolute top-[4.5rem] right-4 z-10 shadow-xl bg-card/95 hover:bg-card backdrop-blur-sm gap-2 h-11 font-medium">
                    <List className="h-5 w-5" />
                    Properties ({filteredListings.length})
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-[32rem] overflow-y-auto bg-background/95 backdrop-blur-xl border-l-border">
                  <SheetHeader className="border-b border-border pb-4">
                    <SheetTitle className="text-xl font-bold">Available Properties</SheetTitle>
                  </SheetHeader>
                  <div className="mt-6">
                    <PropertiesListContent />
                  </div>
                </SheetContent>
              </Sheet>
            </>
          )}

          {/* Popup */}
          <div ref={popupRef} className="absolute">
            {selectedListing && (
              <Card className="w-80 shadow-2xl border-border bg-card/95 backdrop-blur-xl overflow-hidden">
                <CardContent className="p-0">
                  <div className="p-5 space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <h3 className="font-bold text-base line-clamp-2 text-foreground">{selectedListing.title}</h3>
                      {selectedListing.verification_status === 'verified' && (
                        <Badge variant="default" className="bg-success text-success-foreground flex-shrink-0">
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Verified
                        </Badge>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <MapPin className="h-4 w-4 text-primary flex-shrink-0" />
                      <p className="text-sm line-clamp-1">{selectedListing.location_label}</p>
                    </div>
                    
                    {selectedListing.price && (
                      <div className="px-4 py-3 bg-primary/5 rounded-lg">
                        <p className="text-xs text-muted-foreground mb-1">Price</p>
                        <p className="text-xl font-bold text-primary">
                          {selectedListing.currency || 'TZS'} {selectedListing.price.toLocaleString()}
                        </p>
                      </div>
                    )}
                    
                    <Link to={`/listings/${selectedListing.id}`} className="block">
                      <Button size="default" className="w-full h-11 font-medium hover:scale-[1.02] transition-transform">
                        View Full Details
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
