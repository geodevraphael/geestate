import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Eye, CheckCircle2, Clock, AlertCircle, TrendingUp, Calendar, MessageSquare } from 'lucide-react';
import { Listing } from '@/types/database';

export function SellerDashboard() {
  const { profile } = useAuth();
  const [listings, setListings] = useState<Listing[]>([]);
  const [stats, setStats] = useState({ total: 0, published: 0, pending: 0, draft: 0 });
  const [recentVisits, setRecentVisits] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSellerData();
  }, [profile]);

  const fetchSellerData = async () => {
    if (!profile) return;

    try {
      // Fetch seller's listings
      const { data: listingsData, error } = await supabase
        .from('listings')
        .select('*')
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold mb-2">Seller Dashboard</h1>
        <p className="text-muted-foreground">
          Manage your listings and track your performance
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Listings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Published</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-success">{stats.published}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Drafts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-muted-foreground">{stats.draft}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pending Verification</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-warning">{stats.pending}</div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Manage your business</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Link to="/listings/new">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Listing
            </Button>
          </Link>
          <Link to="/visit-requests">
            <Button variant="outline">
              <Calendar className="h-4 w-4 mr-2" />
              Visit Requests
            </Button>
          </Link>
          <Link to="/payment-proofs">
            <Button variant="outline">
              <TrendingUp className="h-4 w-4 mr-2" />
              Payment Proofs
            </Button>
          </Link>
          <Link to="/messages">
            <Button variant="outline">
              <MessageSquare className="h-4 w-4 mr-2" />
              Messages
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
          <CardTitle>My Listings</CardTitle>
          <CardDescription>View and manage all your property listings</CardDescription>
        </CardHeader>
        <CardContent>
          {listings.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground mb-4">You haven't created any listings yet</p>
              <Link to="/listings/new">
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Your First Listing
                </Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {listings.map((listing) => (
                <Link key={listing.id} to={`/listings/${listing.id}`}>
                  <div className="border rounded-lg p-4 hover:shadow-lg transition-shadow">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg">{listing.title}</h3>
                        <p className="text-sm text-muted-foreground">{listing.location_label}</p>
                      </div>
                      <div className="flex flex-col gap-2">
                        {getStatusBadge(listing.status!)}
                        {getVerificationBadge(listing.verification_status!)}
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex gap-4">
                        <span className="text-muted-foreground">
                          {listing.property_type} • {listing.listing_type}
                        </span>
                      </div>
                      {listing.price && (
                        <span className="font-semibold">
                          {listing.price.toLocaleString()} {listing.currency}
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
