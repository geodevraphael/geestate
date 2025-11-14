import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Navbar } from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, XCircle, Clock, Eye, MapPin, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { logAuditAction } from '@/lib/auditLog';
import { PolygonValidationPanel } from '@/components/PolygonValidationPanel';

interface ListingWithOwner {
  id: string;
  title: string;
  location_label: string;
  property_type: string;
  listing_type: string;
  verification_status: string;
  created_at: string;
  owner_id: string;
  price: number | null;
  profiles?: {
    full_name: string;
    email: string;
  };
  listing_polygons?: {
    geojson: any;
    area_m2: number;
  }[];
  listing_media?: {
    file_url: string;
  }[];
}

export default function AdminVerification() {
  const { user, profile, hasRole } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [listings, setListings] = useState<ListingWithOwner[]>([]);
  const [selectedListing, setSelectedListing] = useState<ListingWithOwner | null>(null);
  const [loading, setLoading] = useState(true);
  const [verificationNotes, setVerificationNotes] = useState('');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (user) {
      if (!hasRole('admin') && !hasRole('verification_officer')) {
        navigate('/dashboard');
        return;
      }
      fetchListings();
    }
  }, [user, profile]);

  const fetchListings = async () => {
    try {
      const { data, error } = await supabase
        .from('listings')
        .select(`
          *,
          profiles(full_name, email),
          listing_polygons(geojson, area_m2),
          listing_media(file_url)
        `)
        .in('verification_status', ['unverified', 'pending'])
        .order('created_at', { ascending: false });

      if (error) throw error;
      setListings((data as any) || []);
    } catch (error) {
      console.error('Error fetching listings:', error);
      toast({
        title: 'Error',
        description: 'Failed to load listings',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleVerification = async (listingId: string, status: 'verified' | 'rejected') => {
    setProcessing(true);
    try {
      const { error } = await supabase
        .from('listings')
        .update({
          verification_status: status,
          verification_notes: verificationNotes || null,
        })
        .eq('id', listingId);

      if (error) throw error;

      await logAuditAction(
        status === 'verified' ? 'VERIFY_LISTING' : 'REJECT_LISTING',
        user!.id,
        listingId,
        { notes: verificationNotes }
      );

      // If verified, also verify polygon
      if (status === 'verified') {
        await supabase
          .from('listings')
          .update({ is_polygon_verified: true })
          .eq('id', listingId);
      }

      toast({
        title: status === 'verified' ? 'Verified' : 'Rejected',
        description: `Listing has been ${status}`,
      });

      setSelectedListing(null);
      setVerificationNotes('');
      fetchListings();
    } catch (error) {
      console.error('Error updating verification:', error);
      toast({
        title: 'Error',
        description: 'Failed to update verification status',
        variant: 'destructive',
      });
    } finally {
      setProcessing(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, any> = {
      unverified: <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />Unverified</Badge>,
      pending: <Badge variant="default"><Clock className="h-3 w-3 mr-1" />Pending</Badge>,
      verified: <Badge variant="default"><CheckCircle2 className="h-3 w-3 mr-1" />Verified</Badge>,
      rejected: <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Rejected</Badge>,
    };
    return variants[status] || <Badge>{status}</Badge>;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto p-6">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <div className="container mx-auto p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <CheckCircle2 className="h-8 w-8" />
            Listing Verification
          </h1>
          <p className="text-muted-foreground">Review and verify property listings</p>
        </div>

        <Tabs defaultValue="pending" className="space-y-6">
          <TabsList>
            <TabsTrigger value="pending">
              Pending ({listings.filter(l => l.verification_status === 'pending').length})
            </TabsTrigger>
            <TabsTrigger value="unverified">
              Unverified ({listings.filter(l => l.verification_status === 'unverified').length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pending" className="space-y-6">
            {listings.filter(l => l.verification_status === 'pending').length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  No pending listings for verification
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-6 lg:grid-cols-2">
                {listings
                  .filter(l => l.verification_status === 'pending')
                  .map(listing => (
                    <Card key={listing.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setSelectedListing(listing)}>
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div>
                            <CardTitle>{listing.title}</CardTitle>
                            <CardDescription className="flex items-center gap-2 mt-1">
                              <MapPin className="h-3 w-3" />
                              {listing.location_label}
                            </CardDescription>
                          </div>
                          {getStatusBadge(listing.verification_status)}
                        </div>
                      </CardHeader>
                      <CardContent>
                        {listing.listing_media && listing.listing_media.length > 0 && (
                          <img
                            src={listing.listing_media[0].file_url}
                            alt={listing.title}
                            className="w-full h-40 object-cover rounded-lg mb-4"
                          />
                        )}
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Owner:</span>
                            <span>{listing.profiles?.full_name}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Type:</span>
                            <span className="capitalize">{listing.property_type}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Submitted:</span>
                            <span>{format(new Date(listing.created_at), 'MMM dd, yyyy')}</span>
                          </div>
                          {listing.listing_polygons && listing.listing_polygons.length > 0 && (
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Area:</span>
                              <span>{(listing.listing_polygons[0].area_m2 / 10000).toFixed(2)} ha</span>
                            </div>
                          )}
                        </div>
                        <Button variant="outline" className="w-full mt-4" onClick={(e) => {
                          e.stopPropagation();
                          setSelectedListing(listing);
                        }}>
                          <Eye className="h-4 w-4 mr-2" />
                          Review
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="unverified">
            {listings.filter(l => l.verification_status === 'unverified').length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  No unverified listings
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {listings
                  .filter(l => l.verification_status === 'unverified')
                  .map(listing => (
                    <Card key={listing.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setSelectedListing(listing)}>
                      <CardContent className="py-4">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <h3 className="font-semibold">{listing.title}</h3>
                            <p className="text-sm text-muted-foreground">{listing.location_label}</p>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="text-right text-sm">
                              <p className="text-muted-foreground">Owner</p>
                              <p>{listing.profiles?.full_name}</p>
                            </div>
                            {getStatusBadge(listing.verification_status)}
                            <Button variant="outline" size="sm" onClick={(e) => {
                              e.stopPropagation();
                              setSelectedListing(listing);
                            }}>
                              Review
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Review Dialog */}
        {selectedListing && (
          <Card className="fixed inset-4 z-50 overflow-auto bg-background shadow-2xl">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-2xl">{selectedListing.title}</CardTitle>
                  <CardDescription className="flex items-center gap-2 mt-1">
                    <MapPin className="h-4 w-4" />
                    {selectedListing.location_label}
                  </CardDescription>
                </div>
                <Button variant="ghost" size="icon" onClick={() => {
                  setSelectedListing(null);
                  setVerificationNotes('');
                }}>
                  <XCircle className="h-5 w-5" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Images */}
              {selectedListing.listing_media && selectedListing.listing_media.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-2">Property Images</h3>
                  <div className="grid grid-cols-3 gap-4">
                    {selectedListing.listing_media.map((media, idx) => (
                      <img
                        key={idx}
                        src={media.file_url}
                        alt={`Property ${idx + 1}`}
                        className="w-full h-40 object-cover rounded-lg"
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Owner Info */}
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-semibold mb-2">Owner Information</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Name:</span>
                      <span>{selectedListing.profiles?.full_name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Email:</span>
                      <span>{selectedListing.profiles?.email}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold mb-2">Listing Details</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Type:</span>
                      <span className="capitalize">{selectedListing.property_type}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">For:</span>
                      <span className="capitalize">{selectedListing.listing_type}</span>
                    </div>
                    {selectedListing.price && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Price:</span>
                        <span>{selectedListing.price.toLocaleString()} TZS</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Polygon Validation */}
              {selectedListing.listing_polygons && selectedListing.listing_polygons.length > 0 && (
                <PolygonValidationPanel geojson={selectedListing.listing_polygons[0].geojson} />
              )}

              {/* Verification Notes */}
              <div>
                <h3 className="font-semibold mb-2">Verification Notes</h3>
                <Textarea
                  value={verificationNotes}
                  onChange={(e) => setVerificationNotes(e.target.value)}
                  placeholder="Add notes about this verification (optional)..."
                  rows={4}
                />
              </div>

              {/* Actions */}
              <div className="flex gap-4 justify-end pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => {
                    setSelectedListing(null);
                    setVerificationNotes('');
                  }}
                  disabled={processing}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => handleVerification(selectedListing.id, 'rejected')}
                  disabled={processing}
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Reject
                </Button>
                <Button
                  onClick={() => handleVerification(selectedListing.id, 'verified')}
                  disabled={processing}
                >
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Approve & Verify
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
