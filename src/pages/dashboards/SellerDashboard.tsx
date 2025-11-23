import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert } from '@/components/ui/alert';
import { ListingDeletionWarning } from '@/components/ListingDeletionWarning';
import { Plus, Eye, CheckCircle2, Clock, AlertCircle, TrendingUp, Calendar, MessageSquare, Upload, DollarSign, Loader2 } from 'lucide-react';
import { Listing } from '@/types/database';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';

export function SellerDashboard() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [listings, setListings] = useState<any[]>([]);
  const [stats, setStats] = useState({ total: 0, published: 0, pending: 0, draft: 0 });
  const [recentVisits, setRecentVisits] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedListings, setSelectedListings] = useState<string[]>([]);
  const [batchDialogOpen, setBatchDialogOpen] = useState(false);
  const [pricePerM2, setPricePerM2] = useState('');
  const [editingPrice, setEditingPrice] = useState<string | null>(null);
  const [tempPrice, setTempPrice] = useState('');

  useEffect(() => {
    fetchSellerData();
  }, [profile]);

  const fetchSellerData = async () => {
    if (!profile) return;

    try {
      // Fetch seller's listings with valuations and polygon data
      const { data: listingsData, error } = await supabase
        .from('listings')
        .select(`
          *,
          valuation:valuation_estimates(estimated_value, estimation_currency),
          polygon:listing_polygons(area_m2)
        `)
        .eq('owner_id', profile.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setListings(listingsData || []);
      setStats({
        total: listingsData?.length || 0,
        published: listingsData?.filter((l: any) => l.status === 'published').length || 0,
        pending: listingsData?.filter((l: any) => l.verification_status === 'pending').length || 0,
        draft: listingsData?.filter((l: any) => l.status === 'draft').length || 0,
      });

      // Fetch recent visit requests
      const { data: visits } = await supabase
        .from('visit_requests')
        .select('*, listings(title), profiles!visit_requests_buyer_id_fkey(full_name)')
        .eq('seller_id', profile.id)
        .order('created_at', { ascending: false })
        .limit(5);

      setRecentVisits(visits || []);
    } catch (error) {
      console.error('Error fetching seller data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const icons = {
      published: <CheckCircle2 className="h-3 w-3 mr-1" />,
      draft: <Clock className="h-3 w-3 mr-1" />,
      archived: <AlertCircle className="h-3 w-3 mr-1" />,
    };
    return (
      <Badge variant={status === 'published' ? 'default' : 'secondary'} className="flex items-center">
        {icons[status as keyof typeof icons]}
        {status}
      </Badge>
    );
  };

  const getVerificationBadge = (status: string) => {
    const variants: Record<string, any> = {
      verified: 'default',
      pending: 'secondary',
      rejected: 'destructive',
      unverified: 'outline',
    };
    return <Badge variant={variants[status] || 'outline'}>{status}</Badge>;
  };

  const handlePublishListing = async (listingId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    try {
      const { error } = await supabase
        .from('listings')
        .update({ status: 'published' as 'published' })
        .eq('id', listingId);

      if (error) throw error;

      toast({
        title: 'Listing Published',
        description: 'Your listing is now visible to buyers',
      });

      // Refresh the listings
      fetchSellerData();
    } catch (error: any) {
      console.error('Error publishing listing:', error);
      toast({
        title: 'Error',
        description: 'Failed to publish listing. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleSelectListing = (listingId: string, checked: boolean) => {
    if (checked) {
      setSelectedListings([...selectedListings, listingId]);
    } else {
      setSelectedListings(selectedListings.filter(id => id !== listingId));
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedListings(listings.map(l => l.id));
    } else {
      setSelectedListings([]);
    }
  };

  const handleBatchUpdate = async () => {
    const priceValue = parseFloat(pricePerM2);
    if (!priceValue || priceValue <= 0) {
      toast({
        title: 'Invalid Price',
        description: 'Please enter a valid price per square meter',
        variant: 'destructive',
      });
      return;
    }

    try {
      const updates = [];
      for (const listingId of selectedListings) {
        const listing = listings.find(l => l.id === listingId);
        const area = listing?.polygon?.area_m2;
        
        if (area) {
          const totalPrice = priceValue * area;
          updates.push(
            supabase
              .from('listings')
              .update({ price: totalPrice })
              .eq('id', listingId)
          );
        }
      }

      await Promise.all(updates);

      toast({
        title: 'Prices Updated',
        description: `Successfully updated ${selectedListings.length} listing(s)`,
      });

      setBatchDialogOpen(false);
      setPricePerM2('');
      setSelectedListings([]);
      fetchSellerData();
    } catch (error) {
      console.error('Error updating prices:', error);
      toast({
        title: 'Error',
        description: 'Failed to update prices. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleUpdatePrice = async (listingId: string, newPrice: string) => {
    const priceValue = parseFloat(newPrice);
    if (!priceValue || priceValue <= 0) {
      toast({
        title: 'Invalid Price',
        description: 'Please enter a valid price',
        variant: 'destructive',
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('listings')
        .update({ price: priceValue })
        .eq('id', listingId);

      if (error) throw error;

      toast({
        title: 'Price Updated',
        description: 'Listing price has been updated successfully',
      });

      setEditingPrice(null);
      setTempPrice('');
      fetchSellerData();
    } catch (error) {
      console.error('Error updating price:', error);
      toast({
        title: 'Error',
        description: 'Failed to update price. Please try again.',
        variant: 'destructive',
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6 md:space-y-8 p-4 md:p-6 lg:p-8">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold mb-2">Seller Dashboard</h1>
        <p className="text-sm md:text-base text-muted-foreground">
          Manage your listings and track your performance
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        <Card className="hover-lift">
          <CardHeader className="pb-2 md:pb-3">
            <CardTitle className="text-xs md:text-sm font-medium text-muted-foreground">
              <span className="hidden sm:inline">Total Listings</span>
              <span className="sm:hidden">Total</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl md:text-3xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>

        <Card className="hover-lift">
          <CardHeader className="pb-2 md:pb-3">
            <CardTitle className="text-xs md:text-sm font-medium text-muted-foreground">Published</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl md:text-3xl font-bold text-success">{stats.published}</div>
          </CardContent>
        </Card>

        <Card className="hover-lift">
          <CardHeader className="pb-2 md:pb-3">
            <CardTitle className="text-xs md:text-sm font-medium text-muted-foreground">Drafts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl md:text-3xl font-bold text-muted-foreground">{stats.draft}</div>
          </CardContent>
        </Card>

        <Card className="hover-lift">
          <CardHeader className="pb-2 md:pb-3">
            <CardTitle className="text-xs md:text-sm font-medium text-muted-foreground">
              <span className="hidden sm:inline">Pending</span>
              <span className="sm:hidden">Pending</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl md:text-3xl font-bold text-warning">{stats.pending}</div>
          </CardContent>
        </Card>
      </div>

      {/* Info: Draft vs Published */}
      {stats.draft > 0 && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <div className="ml-2">
            <h4 className="font-semibold mb-1">You have {stats.draft} draft listing{stats.draft > 1 ? 's' : ''}</h4>
            <p className="text-sm text-muted-foreground">
              Draft listings are not visible to buyers. Click "Publish Listing" on any draft to make it visible on the marketplace, or edit your listing and click "Publish Listing" to make it live.
            </p>
          </div>
        </Alert>
      )}

      {/* Quick Actions */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-lg md:text-xl">Quick Actions</CardTitle>
          <CardDescription className="text-xs md:text-sm">Manage your business</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-2 md:flex md:flex-wrap gap-2 md:gap-3">
          <Link to="/listings/new" className="w-full md:w-auto">
            <Button className="w-full h-11 md:h-10" size="sm">
              <Plus className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Create Listing</span>
              <span className="sm:hidden">Create</span>
            </Button>
          </Link>
          {stats.draft > 0 && (
            <Link to="/drafts" className="w-full md:w-auto">
              <Button variant="outline" className="w-full h-11 md:h-10" size="sm">
                <Clock className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">View Drafts ({stats.draft})</span>
                <span className="sm:hidden">Drafts</span>
              </Button>
            </Link>
          )}
          <Link to="/visit-requests" className="w-full md:w-auto">
            <Button variant="outline" className="w-full h-11 md:h-10" size="sm">
              <Calendar className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Visit Requests</span>
              <span className="sm:hidden">Visits</span>
            </Button>
          </Link>
          <Link to="/payment-proofs" className="w-full md:w-auto">
            <Button variant="outline" className="w-full h-11 md:h-10" size="sm">
              <TrendingUp className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Payments</span>
              <span className="sm:hidden">Pay</span>
            </Button>
          </Link>
          <Link to="/messages" className="w-full md:w-auto">
            <Button variant="outline" className="w-full h-11 md:h-10" size="sm">
              <MessageSquare className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Messages</span>
              <span className="sm:hidden">Msgs</span>
            </Button>
          </Link>
        </CardContent>
      </Card>

      {/* Recent Visit Requests */}
      {recentVisits.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Visit Requests</CardTitle>
            <CardDescription>Buyers interested in your properties</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentVisits.map((visit) => (
                <div key={visit.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <h3 className="font-semibold">{visit.listings?.title}</h3>
                    <p className="text-sm text-muted-foreground">
                      Requested by {visit.profiles?.full_name}
                    </p>
                    <p className="text-sm mt-1">
                      {new Date(visit.requested_date).toLocaleDateString()} - {visit.requested_time_slot}
                    </p>
                  </div>
                  <Badge variant={visit.status === 'approved' ? 'default' : 'secondary'}>
                    {visit.status}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* My Listings */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg md:text-xl">My Listings</CardTitle>
              <CardDescription className="text-xs md:text-sm">View and manage all your property listings</CardDescription>
            </div>
            {selectedListings.length > 0 && (
              <Button onClick={() => setBatchDialogOpen(true)} size="sm">
                <DollarSign className="h-4 w-4 mr-2" />
                Update {selectedListings.length} Price{selectedListings.length > 1 ? 's' : ''}
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {listings.length === 0 ? (
            <div className="text-center py-8 md:py-12">
              <p className="text-sm md:text-base text-muted-foreground mb-4">You haven't created any listings yet</p>
              <Link to="/listings/new">
                <Button className="h-11 md:h-10">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Your First Listing
                </Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-2">
              {listings.length > 1 && (
                <div className="flex items-center gap-2 p-2 border-b">
                  <Checkbox 
                    checked={selectedListings.length === listings.length}
                    onCheckedChange={handleSelectAll}
                  />
                  <span className="text-sm font-medium">Select All</span>
                </div>
              )}
              <div className="space-y-3 md:space-y-4">
                {listings.map((listing) => (
                  <div key={listing.id} className="border rounded-xl p-3 md:p-4 hover:shadow-lg transition-all duration-300">
                    <div className="flex items-start gap-3">
                      <Checkbox 
                        checked={selectedListings.includes(listing.id)}
                        onCheckedChange={(checked) => handleSelectListing(listing.id, checked as boolean)}
                        onClick={(e) => e.stopPropagation()}
                      />
                      <div className="flex-1 min-w-0">
                        <Link to={`/listings/${listing.id}`}>
                          <div className="flex items-start justify-between mb-2 gap-2">
                            <div className="flex-1 min-w-0">
                              <h3 className="font-semibold text-sm md:text-lg line-clamp-2">{listing.title}</h3>
                              <p className="text-xs md:text-sm text-muted-foreground line-clamp-1">{listing.location_label}</p>
                            </div>
                            <div className="flex flex-col gap-1.5 md:gap-2 flex-shrink-0">
                              {getStatusBadge(listing.status!)}
                              {getVerificationBadge(listing.verification_status!)}
                            </div>
                          </div>
                          <div className="flex items-center justify-between text-xs md:text-sm gap-2">
                            <span className="text-muted-foreground truncate">
                              {listing.property_type} • {listing.listing_type}
                              {listing.polygon?.area_m2 && ` • ${listing.polygon.area_m2.toLocaleString()} m²`}
                            </span>
                          </div>
                        </Link>
                        
                        {/* Inline Price Edit */}
                        <div className="mt-2 flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                          {editingPrice === listing.id ? (
                            <>
                              <Input
                                type="number"
                                value={tempPrice}
                                onChange={(e) => setTempPrice(e.target.value)}
                                className="h-8 max-w-[200px]"
                                placeholder="Enter price"
                                autoFocus
                              />
                              <Button 
                                size="sm" 
                                onClick={() => handleUpdatePrice(listing.id, tempPrice)}
                                className="h-8"
                              >
                                Save
                              </Button>
                              <Button 
                                size="sm" 
                                variant="ghost"
                                onClick={() => {
                                  setEditingPrice(null);
                                  setTempPrice('');
                                }}
                                className="h-8"
                              >
                                Cancel
                              </Button>
                            </>
                          ) : (
                            <div className="flex items-center gap-2">
                              {(listing.price || listing.valuation?.[0]?.estimated_value) && (
                                <span className="font-semibold">
                                  {listing.price 
                                    ? `${listing.price.toLocaleString()} ${listing.currency}` 
                                    : `${(listing.valuation[0].estimated_value).toLocaleString()} ${listing.valuation[0].estimation_currency || 'TZS'} (Est.)`
                                  }
                                </span>
                              )}
                              <Button 
                                size="sm" 
                                variant="ghost"
                                onClick={() => {
                                  setEditingPrice(listing.id);
                                  setTempPrice(listing.price?.toString() || '');
                                }}
                                className="h-7 px-2"
                              >
                                <DollarSign className="h-3 w-3" />
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                   
                   <ListingDeletionWarning
                     listingId={listing.id}
                     listingTitle={listing.title}
                     deletionWarningSentAt={(listing as any).deletion_warning_sent_at}
                     republishRequestedAt={(listing as any).republish_requested_at}
                     pendingDeletion={(listing as any).pending_deletion || false}
                     onRepublish={() => fetchSellerData()}
                   />
                   
                   {listing.status === 'draft' && (
                    <div className="mt-3 pt-3 border-t flex gap-2">
                      <Button
                        size="sm"
                        onClick={(e) => handlePublishListing(listing.id, e)}
                        className="flex-1 h-10 md:h-9 text-xs md:text-sm"
                      >
                        <Upload className="h-3 md:h-4 w-3 md:w-4 mr-1.5 md:mr-2" />
                        <span className="hidden sm:inline">Publish Listing</span>
                        <span className="sm:hidden">Publish</span>
                      </Button>
                      <Link to={`/listings/${listing.id}/edit`} className="flex-1">
                        <Button size="sm" variant="outline" className="w-full h-10 md:h-9 text-xs md:text-sm">
                          Edit
                        </Button>
                      </Link>
                    </div>
                  )}
                 </div>
               ))}
             </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Batch Price Update Dialog */}
      <Dialog open={batchDialogOpen} onOpenChange={setBatchDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Batch Update Prices</DialogTitle>
            <DialogDescription>
              Set price per square meter for {selectedListings.length} selected listing(s). 
              The system will calculate the total price based on each plot's area.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="pricePerM2">Price per Square Meter ({listings[0]?.currency || 'TZS'})</Label>
              <Input
                id="pricePerM2"
                type="number"
                value={pricePerM2}
                onChange={(e) => setPricePerM2(e.target.value)}
                placeholder="Enter price per m²"
              />
            </div>
            {pricePerM2 && (
              <div className="space-y-2 max-h-[200px] overflow-y-auto border rounded-lg p-3">
                <p className="text-sm font-medium mb-2">Preview:</p>
                {selectedListings.map(id => {
                  const listing = listings.find(l => l.id === id);
                  const area = listing?.polygon?.area_m2;
                  const totalPrice = area ? parseFloat(pricePerM2) * area : 0;
                  return (
                    <div key={id} className="text-xs flex justify-between py-1">
                      <span className="truncate max-w-[200px]">{listing?.title}</span>
                      <span className="font-medium">
                        {area ? `${area.toLocaleString()} m² × ${parseFloat(pricePerM2).toLocaleString()} = ${totalPrice.toLocaleString()} ${listing?.currency || 'TZS'}` : 'No area data'}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBatchDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleBatchUpdate}>
              Update Prices
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
