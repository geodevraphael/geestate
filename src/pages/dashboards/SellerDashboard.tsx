import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert } from '@/components/ui/alert';
import { ListingDeletionWarning } from '@/components/ListingDeletionWarning';
import { Plus, Eye, CheckCircle2, Clock, AlertCircle, TrendingUp, Calendar, MessageSquare, Upload, DollarSign, Loader2, MapPin, Building, Tag, Maximize2, Search, Filter, ChevronLeft, ChevronRight, Sparkles, ArrowRight, BarChart3 } from 'lucide-react';
import { Listing } from '@/types/database';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

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
  
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [verificationFilter, setVerificationFilter] = useState<string>('all');
  const [totalCount, setTotalCount] = useState(0);

  useEffect(() => {
    fetchSellerData();
  }, [profile, currentPage, itemsPerPage, searchQuery, statusFilter, verificationFilter]);

  const fetchSellerData = async () => {
    if (!profile) return;

    try {
      const { count: totalCount } = await supabase
        .from('listings')
        .select('*', { count: 'exact', head: true })
        .eq('owner_id', profile.id);

      setTotalCount(totalCount || 0);

      const { data: statsData } = await supabase
        .from('listings')
        .select('status, verification_status')
        .eq('owner_id', profile.id);

      if (statsData) {
        setStats({
          total: statsData.length,
          published: statsData.filter((l: any) => l.status === 'published').length,
          pending: statsData.filter((l: any) => l.verification_status === 'pending').length,
          draft: statsData.filter((l: any) => l.status === 'draft').length,
        });
      }

      let query = supabase
        .from('listings')
        .select(`
          *,
          valuation:valuation_estimates(estimated_value, estimation_currency),
          polygon:listing_polygons(area_m2)
        `, { count: 'exact' })
        .eq('owner_id', profile.id);

      if (searchQuery) {
        query = query.or(`title.ilike.%${searchQuery}%,location_label.ilike.%${searchQuery}%,block_number.ilike.%${searchQuery}%,plot_number.ilike.%${searchQuery}%`);
      }

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter as any);
      }

      if (verificationFilter !== 'all') {
        query = query.eq('verification_status', verificationFilter as any);
      }

      const from = (currentPage - 1) * itemsPerPage;
      const to = from + itemsPerPage - 1;
      
      const { data: listingsData, error, count } = await query
        .order('created_at', { ascending: false })
        .range(from, to);

      if (error) throw error;

      setListings(listingsData || []);
      if (count !== null) {
        setTotalCount(count);
      }

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
    const config: Record<string, { icon: any; className: string }> = {
      published: { icon: CheckCircle2, className: 'bg-success/10 text-success border-success/20' },
      draft: { icon: Clock, className: 'bg-muted text-muted-foreground border-muted' },
      archived: { icon: AlertCircle, className: 'bg-destructive/10 text-destructive border-destructive/20' },
    };
    const { icon: Icon, className } = config[status] || config.draft;
    return (
      <Badge variant="outline" className={`flex items-center gap-1 ${className}`}>
        <Icon className="h-3 w-3" />
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

  const handleSelectAllPages = async () => {
    if (!profile) return;
    
    try {
      let query = supabase
        .from('listings')
        .select('id')
        .eq('owner_id', profile.id);

      if (searchQuery) {
        query = query.or(`title.ilike.%${searchQuery}%,location_label.ilike.%${searchQuery}%,block_number.ilike.%${searchQuery}%,plot_number.ilike.%${searchQuery}%`);
      }
      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter as any);
      }
      if (verificationFilter !== 'all') {
        query = query.eq('verification_status', verificationFilter as any);
      }

      const { data, error } = await query;
      if (error) throw error;

      setSelectedListings(data?.map(l => l.id) || []);
      toast({
        title: 'All Listings Selected',
        description: `Selected ${data?.length || 0} listings across all pages`,
      });
    } catch (error) {
      console.error('Error selecting all:', error);
    }
  };

  const totalPages = Math.ceil(totalCount / itemsPerPage);

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
        <div className="animate-spin h-8 w-8 border-4 border-accent border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6 md:space-y-8 p-4 md:p-6 lg:p-8 pb-24 md:pb-8 w-full">
      {/* Welcome Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary to-primary/80 p-6 md:p-8 text-primary-foreground">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />
        <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="h-5 w-5 text-accent" />
              <span className="text-sm font-medium text-primary-foreground/80">Seller Dashboard</span>
            </div>
            <h1 className="text-2xl md:text-4xl font-display font-bold mb-2">
              Welcome back, {profile?.full_name?.split(' ')[0] || 'Seller'}
            </h1>
            <p className="text-primary-foreground/80">
              Manage your listings and track performance
            </p>
          </div>
          <Link to="/listings/new">
            <Button size="lg" className="bg-accent hover:bg-accent/90 text-accent-foreground gap-2 shadow-lg">
              <Plus className="h-5 w-5" />
              Create Listing
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <Card className="group hover:shadow-lg transition-all duration-300 border-border/50 bg-card/50 backdrop-blur-sm">
          <CardContent className="p-4 md:p-6">
            <div className="flex items-center justify-between mb-3">
              <div className="p-2 rounded-xl bg-primary/10 text-primary">
                <Building className="h-5 w-5" />
              </div>
              <span className="text-xs font-medium text-muted-foreground">Total</span>
            </div>
            <div className="text-2xl md:text-3xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground mt-1">Listings</p>
          </CardContent>
        </Card>

        <Card className="group hover:shadow-lg transition-all duration-300 border-border/50 bg-card/50 backdrop-blur-sm">
          <CardContent className="p-4 md:p-6">
            <div className="flex items-center justify-between mb-3">
              <div className="p-2 rounded-xl bg-success/10 text-success">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <span className="text-xs font-medium text-muted-foreground">Live</span>
            </div>
            <div className="text-2xl md:text-3xl font-bold text-success">{stats.published}</div>
            <p className="text-xs text-muted-foreground mt-1">Published</p>
          </CardContent>
        </Card>

        <Card className="group hover:shadow-lg transition-all duration-300 border-border/50 bg-card/50 backdrop-blur-sm">
          <CardContent className="p-4 md:p-6">
            <div className="flex items-center justify-between mb-3">
              <div className="p-2 rounded-xl bg-muted text-muted-foreground">
                <Clock className="h-5 w-5" />
              </div>
              <span className="text-xs font-medium text-muted-foreground">Draft</span>
            </div>
            <div className="text-2xl md:text-3xl font-bold">{stats.draft}</div>
            <p className="text-xs text-muted-foreground mt-1">Unpublished</p>
          </CardContent>
        </Card>

        <Card className="group hover:shadow-lg transition-all duration-300 border-border/50 bg-card/50 backdrop-blur-sm">
          <CardContent className="p-4 md:p-6">
            <div className="flex items-center justify-between mb-3">
              <div className="p-2 rounded-xl bg-warning/10 text-warning">
                <AlertCircle className="h-5 w-5" />
              </div>
              <span className="text-xs font-medium text-muted-foreground">Review</span>
            </div>
            <div className="text-2xl md:text-3xl font-bold text-warning">{stats.pending}</div>
            <p className="text-xs text-muted-foreground mt-1">Pending</p>
          </CardContent>
        </Card>
      </div>

      {/* Draft Alert */}
      {stats.draft > 0 && (
        <Alert className="border-warning/50 bg-warning/5">
          <Clock className="h-4 w-4 text-warning" />
          <div className="ml-2">
            <h4 className="font-semibold">You have {stats.draft} draft listing{stats.draft > 1 ? 's' : ''}</h4>
            <p className="text-sm text-muted-foreground">
              Draft listings are not visible to buyers. Publish them to make them live.
            </p>
          </div>
        </Alert>
      )}

      {/* Quick Actions */}
      <Card className="border-border/50 overflow-hidden">
        <CardHeader className="pb-4 bg-muted/30">
          <CardTitle className="text-lg md:text-xl flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-accent" />
            Quick Actions
          </CardTitle>
          <CardDescription>Manage your business</CardDescription>
        </CardHeader>
        <CardContent className="p-4 md:p-6">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            <Link to="/listings/new" className="group">
              <div className="flex flex-col items-center gap-2 p-4 rounded-xl border border-border/50 hover:border-accent hover:bg-accent/5 transition-all">
                <div className="p-3 rounded-full bg-accent/10 group-hover:bg-accent/20 transition-colors">
                  <Plus className="h-5 w-5 text-accent" />
                </div>
                <span className="text-sm font-medium text-center">Create</span>
              </div>
            </Link>
            {stats.draft > 0 && (
              <Link to="/drafts" className="group">
                <div className="flex flex-col items-center gap-2 p-4 rounded-xl border border-border/50 hover:border-warning hover:bg-warning/5 transition-all">
                  <div className="p-3 rounded-full bg-warning/10 group-hover:bg-warning/20 transition-colors">
                    <Clock className="h-5 w-5 text-warning" />
                  </div>
                  <span className="text-sm font-medium text-center">Drafts ({stats.draft})</span>
                </div>
              </Link>
            )}
            <Link to="/visit-requests" className="group">
              <div className="flex flex-col items-center gap-2 p-4 rounded-xl border border-border/50 hover:border-success hover:bg-success/5 transition-all">
                <div className="p-3 rounded-full bg-success/10 group-hover:bg-success/20 transition-colors">
                  <Calendar className="h-5 w-5 text-success" />
                </div>
                <span className="text-sm font-medium text-center">Visits</span>
              </div>
            </Link>
            <Link to="/payment-proofs" className="group">
              <div className="flex flex-col items-center gap-2 p-4 rounded-xl border border-border/50 hover:border-primary hover:bg-primary/5 transition-all">
                <div className="p-3 rounded-full bg-primary/10 group-hover:bg-primary/20 transition-colors">
                  <DollarSign className="h-5 w-5 text-primary" />
                </div>
                <span className="text-sm font-medium text-center">Payments</span>
              </div>
            </Link>
            <Link to="/messages" className="group">
              <div className="flex flex-col items-center gap-2 p-4 rounded-xl border border-border/50 hover:border-primary hover:bg-primary/5 transition-all">
                <div className="p-3 rounded-full bg-primary/10 group-hover:bg-primary/20 transition-colors">
                  <MessageSquare className="h-5 w-5 text-primary" />
                </div>
                <span className="text-sm font-medium text-center">Messages</span>
              </div>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Recent Visits */}
      {recentVisits.length > 0 && (
        <Card className="border-border/50">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <Calendar className="h-5 w-5 text-success" />
                Recent Visit Requests
              </CardTitle>
              <Link to="/visit-requests">
                <Button variant="ghost" size="sm" className="gap-1 text-muted-foreground">
                  View all <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentVisits.slice(0, 3).map((visit) => (
                <div 
                  key={visit.id} 
                  className="flex items-center gap-4 p-3 rounded-xl border border-border/50 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-success/10 flex items-center justify-center">
                    <Calendar className="h-5 w-5 text-success" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-sm line-clamp-1">{visit.listings?.title}</h3>
                    <p className="text-xs text-muted-foreground">
                      {visit.profiles?.full_name} • {new Date(visit.requested_date).toLocaleDateString()}
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

      {/* Listings Management */}
      <Card className="border-border/50">
        <CardHeader className="pb-4">
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg md:text-xl flex items-center gap-2">
                  <Building className="h-5 w-5 text-primary" />
                  My Listings
                </CardTitle>
                <CardDescription>
                  {totalCount > 0 ? `${totalCount.toLocaleString()} total listings` : 'No listings found'}
                </CardDescription>
              </div>
              {selectedListings.length > 0 && (
                <Button onClick={() => setBatchDialogOpen(true)} size="sm" className="gap-2">
                  <Tag className="h-4 w-4" />
                  Set Price ({selectedListings.length})
                </Button>
              )}
            </div>
            
            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search listings..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-[140px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="published">Published</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                </SelectContent>
              </Select>
              <Select value={verificationFilter} onValueChange={setVerificationFilter}>
                <SelectTrigger className="w-full sm:w-[140px]">
                  <SelectValue placeholder="Verification" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="verified">Verified</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {listings.length > 0 ? (
            <>
              <div className="flex items-center gap-3 mb-4 pb-3 border-b">
                <Checkbox
                  checked={selectedListings.length === listings.length && listings.length > 0}
                  onCheckedChange={handleSelectAll}
                />
                <span className="text-sm text-muted-foreground">
                  {selectedListings.length > 0 ? `${selectedListings.length} selected` : 'Select all'}
                </span>
                {totalCount > itemsPerPage && selectedListings.length === listings.length && (
                  <Button variant="link" size="sm" onClick={handleSelectAllPages} className="text-accent">
                    Select all {totalCount} listings
                  </Button>
                )}
              </div>
              
              <div className="space-y-3">
                {listings.map((listing) => (
                  <div 
                    key={listing.id} 
                    className="flex items-center gap-4 p-4 rounded-xl border border-border/50 hover:bg-muted/50 hover:border-accent/30 transition-all group"
                  >
                    <Checkbox
                      checked={selectedListings.includes(listing.id)}
                      onCheckedChange={(checked) => handleSelectListing(listing.id, checked as boolean)}
                      onClick={(e) => e.stopPropagation()}
                    />
                    
                    <Link to={`/listings/${listing.id}`} className="flex-1 min-w-0 flex items-center gap-4">
                      <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                        <MapPin className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-medium text-sm line-clamp-1">{listing.title}</h3>
                          {listing.pending_deletion && (
                            <Badge variant="destructive" className="text-xs">Pending Deletion</Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-1">{listing.location_label}</p>
                        {listing.polygon?.area_m2 && (
                          <p className="text-xs text-muted-foreground">
                            {listing.polygon.area_m2.toLocaleString()} m²
                          </p>
                        )}
                      </div>
                    </Link>
                    
                    <div className="flex items-center gap-2">
                      {getStatusBadge(listing.status)}
                      {listing.status === 'draft' && (
                        <Button
                          size="sm"
                          onClick={(e) => handlePublishListing(listing.id, e)}
                          className="bg-success hover:bg-success/90"
                        >
                          Publish
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-6 pt-4 border-t">
                  <p className="text-sm text-muted-foreground">
                    Page {currentPage} of {totalPages}
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-12">
              <Building className="h-12 w-12 mx-auto mb-4 text-muted-foreground/30" />
              <h3 className="font-medium mb-2">No listings found</h3>
              <p className="text-sm text-muted-foreground mb-4">
                {searchQuery || statusFilter !== 'all' || verificationFilter !== 'all'
                  ? 'Try adjusting your filters'
                  : 'Create your first listing to get started'}
              </p>
              <Link to="/listings/new">
                <Button className="gap-2">
                  <Plus className="h-4 w-4" />
                  Create Listing
                </Button>
              </Link>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Batch Update Dialog */}
      <Dialog open={batchDialogOpen} onOpenChange={setBatchDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Set Price per m²</DialogTitle>
            <DialogDescription>
              This will calculate and update prices for {selectedListings.length} selected listing(s) based on their area.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="pricePerM2">Price per Square Meter (TZS)</Label>
              <Input
                id="pricePerM2"
                type="number"
                placeholder="e.g., 50000"
                value={pricePerM2}
                onChange={(e) => setPricePerM2(e.target.value)}
              />
            </div>
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
