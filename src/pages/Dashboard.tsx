import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Navbar } from '@/components/Navbar';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, MapPin, FileText, CheckCircle2, AlertCircle, Clock } from 'lucide-react';
import { Listing } from '@/types/database';

export default function Dashboard() {
  return (
    <ProtectedRoute>
      <DashboardContent />
    </ProtectedRoute>
  );
}

function DashboardContent() {
  const { profile, roles, hasRole } = useAuth();
  const [listings, setListings] = useState<Listing[]>([]);
  const [stats, setStats] = useState({ total: 0, published: 0, pending: 0, draft: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, [profile, roles]);

  const fetchDashboardData = async () => {
    if (!profile || !roles || roles.length === 0) return;

    try {
      const isSeller = hasRole('seller') || hasRole('broker') || hasRole('admin');
      const isAdmin = hasRole('admin') || hasRole('verification_officer') || hasRole('compliance_officer');

      if (isSeller) {
        // Fetch user's own listings
        const { data, error } = await (supabase as any)
          .from('listings')
          .select('*')
          .eq('owner_id', profile.id)
          .order('created_at', { ascending: false });

        if (error) throw error;
        
        setListings(data || []);
        setStats({
          total: data?.length || 0,
          published: data?.filter((l: any) => l.status === 'published').length || 0,
          pending: data?.filter((l: any) => l.verification_status === 'pending').length || 0,
          draft: data?.filter((l: any) => l.status === 'draft').length || 0,
        });
      } else if (isAdmin) {
        // Fetch all listings for admin
        const { data, error } = await (supabase as any)
          .from('listings')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(10);

        if (error) throw error;
        
        setListings(data || []);
        
        // Fetch stats
        const { count: totalCount } = await (supabase as any)
          .from('listings')
          .select('*', { count: 'exact', head: true });
        
        const { count: pendingCount } = await (supabase as any)
          .from('listings')
          .select('*', { count: 'exact', head: true })
          .eq('verification_status', 'pending');

        setStats({
          total: totalCount || 0,
          published: 0,
          pending: pendingCount || 0,
          draft: 0,
        });
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { variant: any; icon: React.ReactNode }> = {
      published: { variant: 'default', icon: <CheckCircle2 className="h-3 w-3 mr-1" /> },
      draft: { variant: 'secondary', icon: <FileText className="h-3 w-3 mr-1" /> },
      archived: { variant: 'outline', icon: <Clock className="h-3 w-3 mr-1" /> },
      closed: { variant: 'outline', icon: <Clock className="h-3 w-3 mr-1" /> },
    };

    const config = statusConfig[status] || { variant: 'secondary', icon: null };
    return (
      <Badge variant={config.variant} className="capitalize flex items-center w-fit">
        {config.icon}
        {status}
      </Badge>
    );
  };

  const getVerificationBadge = (status: string) => {
    const statusConfig: Record<string, { className: string; icon: React.ReactNode }> = {
      verified: { className: 'bg-success text-success-foreground', icon: <CheckCircle2 className="h-3 w-3 mr-1" /> },
      pending: { className: 'bg-warning text-warning-foreground', icon: <Clock className="h-3 w-3 mr-1" /> },
      rejected: { className: 'bg-destructive text-destructive-foreground', icon: <AlertCircle className="h-3 w-3 mr-1" /> },
      unverified: { className: 'bg-muted text-muted-foreground', icon: <AlertCircle className="h-3 w-3 mr-1" /> },
    };

    const config = statusConfig[status] || statusConfig.unverified;
    return (
      <Badge className={`capitalize flex items-center w-fit ${config.className}`}>
        {config.icon}
        {status}
      </Badge>
    );
  };

  const isSeller = hasRole('seller') || hasRole('broker') || hasRole('admin');
  const isAdmin = hasRole('admin') || hasRole('verification_officer') || hasRole('compliance_officer');

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome back, {profile?.full_name}
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Listings</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.total}</div>
            </CardContent>
          </Card>
          
          {isSeller && (
            <>
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
            </>
          )}
          
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Pending Verification</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-warning">{stats.pending}</div>
            </CardContent>
          </Card>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-4 mb-8">
          {isSeller && (
            <Link to="/listings/new">
              <Button className="bg-primary hover:bg-primary/90">
                <Plus className="mr-2 h-4 w-4" />
                Create New Listing
              </Button>
            </Link>
          )}
          {isAdmin && (
            <Link to="/admin/verifications">
              <Button variant="outline">
                <CheckCircle2 className="mr-2 h-4 w-4" />
                View Verifications
              </Button>
            </Link>
          )}
          <Link to="/map">
            <Button variant="outline">
              <MapPin className="mr-2 h-4 w-4" />
              Browse Map
            </Button>
          </Link>
        </div>

        {/* Listings Table */}
        <Card>
          <CardHeader>
            <CardTitle>
              {isSeller ? 'Your Listings' : 'Recent Listings'}
            </CardTitle>
            <CardDescription>
              {loading ? 'Loading...' : `${listings.length} listing(s) found`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {listings.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground mb-4">No listings found</p>
                {isSeller && (
                  <Link to="/listings/new">
                    <Button>Create Your First Listing</Button>
                  </Link>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {listings.map((listing) => (
                  <Link
                    key={listing.id}
                    to={`/listings/${listing.id}`}
                    className="block p-4 border border-border rounded-lg hover:bg-accent/5 transition-colors"
                  >
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg mb-1">{listing.title}</h3>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                          <MapPin className="h-4 w-4" />
                          {listing.location_label}
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {getStatusBadge(listing.status)}
                          {getVerificationBadge(listing.verification_status)}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-primary">
                          {listing.price ? `${listing.price.toLocaleString()} ${listing.currency}` : 'Price on request'}
                        </div>
                        <div className="text-sm text-muted-foreground capitalize">
                          For {listing.listing_type}
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
