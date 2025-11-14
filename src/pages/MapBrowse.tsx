import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Navbar } from '@/components/Navbar';
import { MapContainer, TileLayer, Polygon, Popup } from 'react-leaflet';
import type { LatLngExpression } from 'leaflet';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MapPin, CheckCircle2 } from 'lucide-react';
import { ListingWithDetails, ListingPolygon } from '@/types/database';
import 'leaflet/dist/leaflet.css';

interface ListingWithPolygon extends ListingWithDetails {
  polygon?: ListingPolygon;
}

export default function MapBrowse() {
  const [listings, setListings] = useState<ListingWithPolygon[]>([]);
  const [loading, setLoading] = useState(true);
  const [listingTypeFilter, setListingTypeFilter] = useState<string>('all');
  const [propertyTypeFilter, setPropertyTypeFilter] = useState<string>('all');

  useEffect(() => {
    fetchListingsWithPolygons();
  }, []);

  const fetchListingsWithPolygons = async () => {
    try {
      const { data, error } = await supabase
        .from('listings')
        .select(`
          *,
          polygon:listing_polygons(*)
        `)
        .eq('status', 'published')
        .not('listing_polygons', 'is', null);

      if (error) throw error;
      setListings(data || []);
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

  // Tanzania center coordinates
  const center: LatLngExpression = [-6.369028, 34.888822];

  const getPolygonColor = (listing: ListingWithPolygon) => {
    if (listing.verification_status === 'verified') return '#22c55e'; // Success green
    if (listing.verification_status === 'pending') return '#eab308'; // Warning yellow
    return '#94a3b8'; // Muted gray
  };

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
          <MapContainer
            center={center}
            zoom={6}
            className="h-full w-full"
            style={{ background: '#f8f9fa' }}
            {...({} as any)}
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              {...({} as any)}
            />

            {filteredListings.map((listing) => {
              if (!listing.polygon?.geojson) return null;

              try {
                const geojson = typeof listing.polygon.geojson === 'string' 
                  ? JSON.parse(listing.polygon.geojson) 
                  : listing.polygon.geojson;

                const coordinates = geojson.coordinates[0].map((coord: [number, number]) => [coord[1], coord[0]]);

                return (
                  <Polygon
                    key={listing.id}
                    positions={coordinates}
                    pathOptions={{
                      color: getPolygonColor(listing),
                      fillColor: getPolygonColor(listing),
                      fillOpacity: 0.4,
                      weight: 2,
                    }}
                  >
                    <Popup {...({ maxWidth: 300 } as any)}>
                      <div className="p-2">
                        <h3 className="font-semibold mb-2">{listing.title}</h3>
                        <div className="flex items-center gap-1 text-sm text-muted-foreground mb-2">
                          <MapPin className="h-3 w-3" />
                          {listing.location_label}
                        </div>
                        {listing.verification_status === 'verified' && (
                          <Badge className="bg-success text-success-foreground mb-2">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Verified
                          </Badge>
                        )}
                        <div className="text-lg font-bold text-primary mb-3">
                          {listing.price ? `${listing.price.toLocaleString()} ${listing.currency}` : 'Price on request'}
                        </div>
                        <Link to={`/listings/${listing.id}`}>
                          <Button size="sm" className="w-full">
                            View Details
                          </Button>
                        </Link>
                      </div>
                    </Popup>
                  </Polygon>
                );
              } catch (error) {
                console.error('Error rendering polygon:', error);
                return null;
              }
            })}
          </MapContainer>

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
