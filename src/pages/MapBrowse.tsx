import { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Navbar } from '@/components/Navbar';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MapPin, CheckCircle2 } from 'lucide-react';
import { ListingWithDetails, ListingPolygon } from '@/types/database';
import Map from 'ol/Map';
import View from 'ol/View';
import TileLayer from 'ol/layer/Tile';
import OSM from 'ol/source/OSM';
import XYZ from 'ol/source/XYZ';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import { Polygon } from 'ol/geom';
import Feature from 'ol/Feature';
import { Style, Fill, Stroke } from 'ol/style';
import { fromLonLat } from 'ol/proj';
import Overlay from 'ol/Overlay';
import 'ol/ol.css';

interface ListingWithPolygon extends ListingWithDetails {
  polygon?: ListingPolygon;
}

export default function MapBrowse() {
  const [listings, setListings] = useState<ListingWithPolygon[]>([]);
  const [loading, setLoading] = useState(true);
  const [listingTypeFilter, setListingTypeFilter] = useState<string>('all');
  const [propertyTypeFilter, setPropertyTypeFilter] = useState<string>('all');
  const [basemap, setBasemap] = useState<'street' | 'satellite'>('street');
  const [selectedListing, setSelectedListing] = useState<ListingWithPolygon | null>(null);
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<Map | null>(null);
  const popupRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<Overlay | null>(null);
  const baseTileLayerRef = useRef<TileLayer<OSM> | null>(null);

  useEffect(() => {
    fetchListingsWithPolygons();
  }, []);

  const fetchListingsWithPolygons = async () => {
    try {
      const { data, error } = await (supabase as any)
        .from('listings')
        .select(`
          *,
          polygon:listing_polygons(*)
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

  const filteredListings = listings.filter((listing) => {
    const matchesListingType = listingTypeFilter === 'all' || listing.listing_type === listingTypeFilter;
    const matchesPropertyType = propertyTypeFilter === 'all' || listing.property_type === propertyTypeFilter;
    return matchesListingType && matchesPropertyType;
  });

  const getPolygonColor = (listing: ListingWithPolygon) => {
    if (listing.verification_status === 'verified') return '#22c55e';
    if (listing.verification_status === 'pending') return '#eab308';
    return '#94a3b8';
  };

  useEffect(() => {
    if (!mapRef.current) return;

    const baseLayer = new TileLayer({
      source: new OSM(),
    });
    baseTileLayerRef.current = baseLayer;

    const map = new Map({
      target: mapRef.current,
      layers: [baseLayer],
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
      : new OSM();

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

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <div className="h-[calc(100vh-4rem)] flex">
        {/* Filters Sidebar */}
        <div className="w-80 border-r border-border bg-card p-4 overflow-y-auto">
          <h2 className="text-xl font-bold mb-4">Map Filters</h2>
          
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

            <div className="pt-4 border-t border-border">
              <label className="text-sm font-medium mb-2 block">Basemap</label>
              <Select value={basemap} onValueChange={(value: 'street' | 'satellite') => setBasemap(value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select Basemap" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="street">Street Map</SelectItem>
                  <SelectItem value="satellite">Satellite Imagery</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="pt-4 border-t border-border">
              <p className="text-sm text-muted-foreground mb-2">
                {loading ? 'Loading...' : `${filteredListings.length} polygon(s) on map`}
              </p>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <div className="w-4 h-4 rounded bg-success"></div>
                  <span>Verified</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <div className="w-4 h-4 rounded bg-warning"></div>
                  <span>Pending</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <div className="w-4 h-4 rounded bg-muted"></div>
                  <span>Unverified</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Map */}
        <div className="flex-1 relative">
          <div ref={mapRef} className="h-full w-full" />

          <div ref={popupRef} className="absolute bg-card border border-border rounded-lg shadow-lg p-0 min-w-[250px]" style={{ display: selectedListing ? 'block' : 'none' }}>
            {selectedListing && (
              <div className="p-4">
                <h3 className="font-semibold mb-2">{selectedListing.title}</h3>
                <div className="flex items-center gap-1 text-sm text-muted-foreground mb-2">
                  <MapPin className="h-3 w-3" />
                  {selectedListing.location_label}
                </div>
                {selectedListing.verification_status === 'verified' && (
                  <Badge className="bg-success text-success-foreground mb-2">
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

          {filteredListings.length === 0 && !loading && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <Card className="pointer-events-auto">
                <CardContent className="p-6 text-center">
                  <p className="text-muted-foreground">No listings with polygons found matching your criteria</p>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
