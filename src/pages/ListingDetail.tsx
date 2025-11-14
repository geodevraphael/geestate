import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Navbar } from '@/components/Navbar';
import { MapContainer, TileLayer, Polygon } from 'react-leaflet';
import type { LatLngExpression } from 'leaflet';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { MapPin, CheckCircle2, AlertCircle, Calendar, Building2, DollarSign, Edit, ArrowLeft } from 'lucide-react';
import { ListingWithDetails, ListingPolygon, ListingMedia, Profile } from '@/types/database';

export default function ListingDetail() {
  const { id } = useParams<{ id: string }>();
  const { profile } = useAuth();
  const [listing, setListing] = useState<ListingWithDetails | null>(null);
  const [polygon, setPolygon] = useState<ListingPolygon | null>(null);
  const [media, setMedia] = useState<ListingMedia[]>([]);
  const [owner, setOwner] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      fetchListing();
    }
  }, [id]);

  const fetchListing = async () => {
    try {
      // Fetch listing
      const { data: listingData, error: listingError } = await (supabase as any)
        .from('listings')
        .select('*')
        .eq('id', id)
        .single();

      if (listingError) throw listingError;
      setListing(listingData);

      // Fetch polygon
      const { data: polygonData } = await (supabase as any)
        .from('listing_polygons')
        .select('*')
        .eq('listing_id', id)
        .maybeSingle();

      setPolygon(polygonData);

      // Fetch media
      const { data: mediaData } = await (supabase as any)
        .from('listing_media')
        .select('*')
        .eq('listing_id', id)
        .order('created_at', { ascending: true });

      setMedia(mediaData || []);

      // Fetch owner
      if (listingData) {
        const { data: ownerData } = await (supabase as any)
          .from('profiles')
          .select('*')
          .eq('id', listingData.owner_id)
          .single();

        setOwner(ownerData);
      }
    } catch (error) {
      console.error('Error fetching listing:', error);
    } finally {
      setLoading(false);
    }
  };

  const canEdit = profile?.id === listing?.owner_id || 
    profile?.role && ['admin', 'verification_officer', 'compliance_officer'].includes(profile.role);

  const getVerificationBadge = () => {
    if (!listing) return null;

    const config: Record<string, { className: string; icon: React.ReactNode; label: string }> = {
      verified: { className: 'bg-success text-success-foreground', icon: <CheckCircle2 className="h-4 w-4" />, label: 'Verified' },
      pending: { className: 'bg-warning text-warning-foreground', icon: <AlertCircle className="h-4 w-4" />, label: 'Pending Verification' },
      rejected: { className: 'bg-destructive text-destructive-foreground', icon: <AlertCircle className="h-4 w-4" />, label: 'Rejected' },
      unverified: { className: 'bg-muted text-muted-foreground', icon: <AlertCircle className="h-4 w-4" />, label: 'Unverified' },
    };

    const c = config[listing.verification_status];

    return (
      <Badge className={`flex items-center gap-2 w-fit ${c.className}`}>
        {c.icon}
        {c.label}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
          <div className="text-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!listing) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
          <Card>
            <CardContent className="p-8 text-center">
              <h2 className="text-2xl font-bold mb-2">Listing Not Found</h2>
              <p className="text-muted-foreground mb-4">This listing may have been removed or doesn't exist.</p>
              <Link to="/listings">
                <Button>Browse All Listings</Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const polygonCoordinates = polygon?.geojson
    ? (() => {
        try {
          const geojson = typeof polygon.geojson === 'string' 
            ? JSON.parse(polygon.geojson) 
            : polygon.geojson;
          return geojson.coordinates[0].map((coord: [number, number]) => [coord[1], coord[0]]);
        } catch {
          return null;
        }
      })()
    : null;

  const center: LatLngExpression = polygon?.centroid_lat && polygon?.centroid_lng
    ? [polygon.centroid_lat, polygon.centroid_lng]
    : [-6.369028, 34.888822];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6 flex items-center justify-between">
          <Link to="/listings">
            <Button variant="outline" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Listings
            </Button>
          </Link>
          {canEdit && (
            <Link to={`/listings/${id}/edit`}>
              <Button size="sm">
                <Edit className="mr-2 h-4 w-4" />
                Edit Listing
              </Button>
            </Link>
          )}
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Image Gallery */}
            {media.length > 0 && (
              <Card>
                <CardContent className="p-0">
                  <div className="aspect-video bg-muted relative overflow-hidden">
                    <img
                      src={media[0].file_url}
                      alt={listing.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  {media.length > 1 && (
                    <div className="grid grid-cols-4 gap-2 p-4">
                      {media.slice(1, 5).map((item) => (
                        <div key={item.id} className="aspect-video bg-muted rounded overflow-hidden">
                          <img src={item.file_url} alt="" className="w-full h-full object-cover" />
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Details */}
            <Card>
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h1 className="text-3xl font-bold mb-2">{listing.title}</h1>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <MapPin className="h-4 w-4" />
                      {listing.location_label}
                      {listing.region && `, ${listing.region}`}
                    </div>
                  </div>
                  {getVerificationBadge()}
                </div>

                <div className="text-3xl font-bold text-primary mb-6">
                  {listing.price ? `${listing.price.toLocaleString()} ${listing.currency}` : 'Price on request'}
                </div>

                <div className="flex flex-wrap gap-2 mb-6">
                  <Badge variant="outline" className="capitalize">
                    <Building2 className="mr-1 h-3 w-3" />
                    {listing.property_type}
                  </Badge>
                  <Badge variant="outline" className="capitalize">
                    <DollarSign className="mr-1 h-3 w-3" />
                    For {listing.listing_type}
                  </Badge>
                  <Badge variant="outline" className="capitalize">
                    {listing.status}
                  </Badge>
                </div>

                <Separator className="my-6" />

                <div>
                  <h2 className="text-xl font-semibold mb-3">Description</h2>
                  <p className="text-muted-foreground whitespace-pre-wrap">
                    {listing.description || 'No description provided.'}
                  </p>
                </div>

                {listing.verification_notes && (
                  <>
                    <Separator className="my-6" />
                    <div>
                      <h2 className="text-xl font-semibold mb-3">Verification Notes</h2>
                      <p className="text-muted-foreground">{listing.verification_notes}</p>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Map */}
            {polygon && polygonCoordinates && (
              <Card>
                <CardContent className="p-0">
                  <div className="h-96 rounded-lg overflow-hidden">
                    <MapContainer center={center} zoom={15} className="h-full w-full">
                      <TileLayer
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                      />
                      <Polygon
                        positions={polygonCoordinates}
                        pathOptions={{
                          color: listing.verification_status === 'verified' ? '#22c55e' : '#eab308',
                          fillColor: listing.verification_status === 'verified' ? '#22c55e' : '#eab308',
                          fillOpacity: 0.4,
                          weight: 3,
                        }}
                      />
                    </MapContainer>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Owner Info */}
            <Card>
              <CardContent className="p-6">
                <h2 className="text-lg font-semibold mb-4">Listed By</h2>
                <div className="space-y-2">
                  <p className="font-medium">{owner?.organization_name || owner?.full_name}</p>
                  <Badge variant="outline" className="capitalize">
                    {owner?.role}
                  </Badge>
                  {owner?.phone && (
                    <p className="text-sm text-muted-foreground">Phone: {owner.phone}</p>
                  )}
                </div>
                <Button className="w-full mt-4">
                  Contact Seller
                </Button>
              </CardContent>
            </Card>

            {/* Property Details */}
            <Card>
              <CardContent className="p-6">
                <h2 className="text-lg font-semibold mb-4">Property Details</h2>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Property Type</span>
                    <span className="font-medium capitalize">{listing.property_type}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Listing Type</span>
                    <span className="font-medium capitalize">For {listing.listing_type}</span>
                  </div>
                  {listing.region && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Region</span>
                      <span className="font-medium">{listing.region}</span>
                    </div>
                  )}
                  {listing.district && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">District</span>
                      <span className="font-medium">{listing.district}</span>
                    </div>
                  )}
                  {listing.ward && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Ward</span>
                      <span className="font-medium">{listing.ward}</span>
                    </div>
                  )}
                  {polygon?.area_m2 && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Area</span>
                      <span className="font-medium">{polygon.area_m2.toLocaleString()} m²</span>
                    </div>
                  )}
                  <Separator />
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Posted</span>
                    <span className="font-medium">
                      {new Date(listing.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
