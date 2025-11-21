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
import { MapPin, CheckCircle2, Check, ChevronsUpDown, SlidersHorizontal, List, Navigation2 } from 'lucide-react';
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
    const count = listings.filter((listing) => (listing as any)[idField] === locationId).length;
    
    // Also count listings without boundaries assigned
    const unassignedCount = listings.filter((listing) => !(listing as any)[idField]).length;
    
    return count;
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

  const listingsWithoutBoundaries = useMemo(() => {
    return listings.filter(l => !l.region_id || !l.district_id || !l.ward_id).length;
  }, [listings]);

  const filteredListings = useMemo(() => {
    const filtered = listings.filter((listing) => {
      const matchesListingType = listingTypeFilter === 'all' || listing.listing_type === listingTypeFilter;
      const matchesPropertyType = propertyTypeFilter === 'all' || listing.property_type === propertyTypeFilter;
      const matchesDealer = dealerFilter === 'all' || listing.owner_id === dealerFilter;
      
      // For location filters, handle both cases:
      // 1. Listings with boundary IDs set
      // 2. Listings without boundaries (show in all filters)
      const matchesRegion = regionFilter === 'all' || 
        (listing.region_id ? listing.region_id === regionFilter : false);
      const matchesDistrict = districtFilter === 'all' || 
        (listing.district_id ? listing.district_id === districtFilter : false);
      const matchesWard = wardFilter === 'all' || 
        (listing.ward_id ? listing.ward_id === wardFilter : false);
      const matchesStreet = streetFilter === 'all' || 
        (listing.street_village_id ? listing.street_village_id === streetFilter : false);
      
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
        <div>
          <label className="text-sm font-medium mb-2 flex items-center justify-between">
            <span>Address Search</span>
            {isSearchingAddress && <span className="text-xs text-muted-foreground">Searching...</span>}
          </label>
          <div className="relative">
            <input
              type="text"
              value={addressSearch}
              onChange={(e) => {
                setAddressSearch(e.target.value);
                searchAddress(e.target.value);
              }}
              placeholder="Search by address..."
              className="w-full px-3 py-2 border border-input rounded-md bg-background text-sm"
            />
            {addressSearchResults.length > 0 && (
              <div className="absolute z-10 w-full mt-1 bg-popover border border-border rounded-md shadow-lg max-h-60 overflow-auto">
                {addressSearchResults.map((result, idx) => (
                  <button
                    key={idx}
                    onClick={() => selectAddressResult(result)}
                    className="w-full px-3 py-2 text-left text-sm hover:bg-accent hover:text-accent-foreground border-b border-border last:border-0"
                  >
                    <div className="font-medium">{result.display_name.split(',')[0]}</div>
                    <div className="text-xs text-muted-foreground truncate">{result.display_name}</div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">Location Filters</h3>
          {(regionFilter !== 'all' || districtFilter !== 'all' || wardFilter !== 'all' || streetFilter !== 'all') && (
            <Button variant="ghost" size="sm" onClick={clearLocationFilters} className="h-auto py-1 px-2 text-xs">
              Clear All
            </Button>
          )}
        </div>
        
        {listingsWithoutBoundaries > 0 && (
          <div className="text-xs bg-yellow-500/10 border border-yellow-500/20 rounded p-2 text-yellow-700 dark:text-yellow-300">
            <p className="font-medium mb-1">⚠️ Location Data Missing</p>
            <p>{listingsWithoutBoundaries} of {listings.length} listings don't have location boundaries assigned. They won't appear in location-based filters.</p>
          </div>
        )}
        
        <div>
          <label className="text-sm font-medium mb-2 block">Region</label>
          <Popover open={regionSearchOpen} onOpenChange={setRegionSearchOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={regionSearchOpen}
                className="w-full justify-between"
              >
                {regionFilter === 'all'
                  ? 'All Regions'
                  : regions.find((r) => r.id === regionFilter)?.name || 'Select region...'}
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[280px] p-0">
              <Command>
                <CommandInput placeholder="Search region..." />
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

        <div>
          <label className="text-sm font-medium mb-2 block">District</label>
          <Popover open={districtSearchOpen} onOpenChange={setDistrictSearchOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={districtSearchOpen}
                disabled={regionFilter === 'all'}
                className="w-full justify-between"
              >
                {districtFilter === 'all'
                  ? regionFilter === 'all' ? 'Select region first' : 'All Districts'
                  : districts.find((d) => d.id === districtFilter)?.name || 'Select district...'}
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[280px] p-0">
              <Command>
                <CommandInput placeholder="Search district..." />
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

        <div>
          <label className="text-sm font-medium mb-2 block">Ward</label>
          <Popover open={wardSearchOpen} onOpenChange={setWardSearchOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={wardSearchOpen}
                disabled={districtFilter === 'all'}
                className="w-full justify-between"
              >
                {wardFilter === 'all'
                  ? districtFilter === 'all' ? 'Select district first' : 'All Wards'
                  : wards.find((w) => w.id === wardFilter)?.name || 'Select ward...'}
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[280px] p-0">
              <Command>
                <CommandInput placeholder="Search ward..." />
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

        <div>
          <label className="text-sm font-medium mb-2 block">Street/Village</label>
          <Popover open={streetSearchOpen} onOpenChange={setStreetSearchOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={streetSearchOpen}
                disabled={wardFilter === 'all'}
                className="w-full justify-between"
              >
                {streetFilter === 'all'
                  ? wardFilter === 'all' ? 'Select ward first' : 'All Streets'
                  : streets.find((s) => s.id === streetFilter)?.name || 'Select street...'}
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[280px] p-0">
              <Command>
                <CommandInput placeholder="Search street..." />
                <CommandList>
                  <CommandEmpty>No street found.</CommandEmpty>
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
      </div>

      <div>
        <label className="text-sm font-medium mb-2 block">Basemap</label>
        <Select value={basemap} onValueChange={(value: 'street' | 'satellite') => setBasemap(value)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="satellite">Satellite</SelectItem>
            <SelectItem value="street">Street Map</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="pt-4 border-t border-border">
        <h3 className="text-sm font-semibold mb-2">Legend</h3>
        <div className="text-xs text-muted-foreground mb-3">
          {filteredListings.length} polygon(s) on map
          {listingsWithoutBoundaries > 0 && (
            <div className="mt-2 p-2 bg-yellow-500/10 border border-yellow-500/20 rounded text-yellow-700 dark:text-yellow-300">
              {listingsWithoutBoundaries} listing(s) without location data assigned. Some filters may not work for these.
            </div>
          )}
        </div>
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: '#22c55e' }} />
            <span className="text-sm">Verified</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: '#eab308' }} />
            <span className="text-sm">Pending</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: '#94a3b8' }} />
            <span className="text-sm">Unverified</span>
          </div>
        </div>
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
          </>
        )}

        {/* Map Container */}
        <div className={cn(
          "h-full w-full",
          !isMobile && "pl-80"
        )}>
          <div ref={mapRef} className="w-full h-full" />

          {/* Popup Overlay */}
          <div ref={popupRef} className="absolute bg-card border border-border rounded-lg shadow-xl p-0 min-w-[250px] max-w-[300px]" style={{ display: selectedListing ? 'block' : 'none' }}>
            {selectedListing && (
              <div className="p-4">
                <h3 className="font-semibold text-base mb-2 line-clamp-2">{selectedListing.title}</h3>
                <div className="flex items-center gap-1 text-sm text-muted-foreground mb-2">
                  <MapPin className="h-4 w-4" />
                  {selectedListing.location_label}
                </div>
                {selectedListing.verification_status === 'verified' && (
                  <Badge className="bg-green-500 text-white mb-2">
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    Verified
                  </Badge>
                )}
                <div className="text-lg font-bold text-primary mb-3">
                  {selectedListing.price ? `${selectedListing.price.toLocaleString()} ${selectedListing.currency}` : 'Price on request'}
                </div>
                <Link to={`/listings/${selectedListing.id}`}>
                  <Button size="sm" className="w-full">
                    View Details
                  </Button>
                </Link>
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
