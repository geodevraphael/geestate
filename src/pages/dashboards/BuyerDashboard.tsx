import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Heart, Calendar, MessageSquare, CreditCard, TrendingUp, MapPin, User, ShoppingBag } from 'lucide-react';

export function BuyerDashboard() {
  const { profile } = useAuth();
  const [stats, setStats] = useState({
    savedListings: 0,
    visitRequests: 0,
    activeMessages: 0,
    paymentProofs: 0,
  });
  const [recentListings, setRecentListings] = useState<any[]>([]);
  const [upcomingVisits, setUpcomingVisits] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBuyerData();
  }, [profile]);

  const fetchBuyerData = async () => {
    if (!profile) return;

    try {
      // Fetch visit requests
      const { data: visits } = await supabase
        .from('visit_requests')
        .select('*, listings(title, location_label)')
        .eq('buyer_id', profile.id)
        .order('requested_date', { ascending: true })
        .limit(5);

      setUpcomingVisits(visits || []);

      // Fetch payment proofs
      const { data: payments } = await supabase
        .from('payment_proofs')
        .select('*', { count: 'exact', head: true })
        .eq('buyer_id', profile.id);

      // Fetch messages
      const { data: messages } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('receiver_id', profile.id)
        .eq('is_read', false);

      // Fetch recent published listings
      const { data: listings } = await supabase
        .from('listings')
        .select('*')
        .eq('status', 'published')
        .order('created_at', { ascending: false })
        .limit(6);

      setRecentListings(listings || []);

      setStats({
        savedListings: 0, // TODO: Implement favorites/saved listings
        visitRequests: visits?.length || 0,
        activeMessages: messages?.length || 0,
        paymentProofs: payments?.length || 0,
      });
    } catch (error) {
      console.error('Error fetching buyer data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: any; label: string }> = {
      pending: { variant: 'secondary', label: 'Pending' },
      approved: { variant: 'default', label: 'Approved' },
      rejected: { variant: 'destructive', label: 'Rejected' },
      completed: { variant: 'default', label: 'Completed' },
    };
    const config = variants[status] || variants.pending;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4 md:space-y-8 p-3 md:p-6 lg:p-8 pb-20 md:pb-8">
      <div className="space-y-1">
        <h1 className="text-xl md:text-3xl font-bold">Buyer Dashboard</h1>
        <p className="text-sm md:text-base text-muted-foreground">
          Welcome back, {profile?.full_name}! Find your dream property.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-4">
        <Card className="hover-lift">
          <CardHeader className="pb-1 md:pb-3 pt-3 md:pt-6">
            <CardTitle className="text-xs md:text-sm font-medium text-muted-foreground flex items-center gap-1 md:gap-2">
              <Heart className="h-3.5 md:h-4 w-3.5 md:w-4" />
              <span className="hidden sm:inline">Saved Listings</span>
              <span className="sm:hidden text-[11px]">Saved</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-3 md:pb-6">
            <div className="text-xl md:text-3xl font-bold">{stats.savedListings}</div>
          </CardContent>
        </Card>

        <Card className="hover-lift">
          <CardHeader className="pb-1 md:pb-3 pt-3 md:pt-6">
            <CardTitle className="text-xs md:text-sm font-medium text-muted-foreground flex items-center gap-1 md:gap-2">
              <Calendar className="h-3.5 md:h-4 w-3.5 md:w-4" />
              <span className="hidden sm:inline">Visit Requests</span>
              <span className="sm:hidden text-[11px]">Visits</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-3 md:pb-6">
            <div className="text-xl md:text-3xl font-bold">{stats.visitRequests}</div>
          </CardContent>
        </Card>

        <Card className="hover-lift">
          <CardHeader className="pb-1 md:pb-3 pt-3 md:pt-6">
            <CardTitle className="text-xs md:text-sm font-medium text-muted-foreground flex items-center gap-1 md:gap-2">
              <MessageSquare className="h-3.5 md:h-4 w-3.5 md:w-4" />
              <span className="hidden sm:inline">Messages</span>
              <span className="sm:hidden text-[11px]">Msgs</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-3 md:pb-6">
            <div className="text-xl md:text-3xl font-bold">{stats.activeMessages}</div>
          </CardContent>
        </Card>

        <Card className="hover-lift">
          <CardHeader className="pb-1 md:pb-3 pt-3 md:pt-6">
            <CardTitle className="text-xs md:text-sm font-medium text-muted-foreground flex items-center gap-1 md:gap-2">
              <CreditCard className="h-3.5 md:h-4 w-3.5 md:w-4" />
              <span className="hidden sm:inline">Payments</span>
              <span className="sm:hidden text-[11px]">Pays</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-3 md:pb-6">
            <div className="text-xl md:text-3xl font-bold">{stats.paymentProofs}</div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card className="glass-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-base md:text-xl">Quick Actions</CardTitle>
          <CardDescription className="text-xs md:text-sm">Start exploring properties</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 md:flex md:flex-wrap gap-2">
          <Link to="/listings" className="w-full md:w-auto">
            <Button className="w-full h-12 md:h-10" size="sm">
              <TrendingUp className="h-4 w-4 mr-2" />
              Browse Listings
            </Button>
          </Link>
          <Link to="/sellers" className="w-full md:w-auto">
            <Button variant="outline" className="w-full h-12 md:h-10" size="sm">
              <User className="h-4 w-4 mr-2" />
              Browse Sellers
            </Button>
          </Link>
          <Link to="/map" className="w-full md:w-auto">
            <Button variant="outline" className="w-full h-12 md:h-10" size="sm">
              <MapPin className="h-4 w-4 mr-2" />
              Explore Map
            </Button>
          </Link>
          <Link to="/visit-requests" className="w-full md:w-auto">
            <Button variant="outline" className="w-full h-12 md:h-10" size="sm">
              <Calendar className="h-4 w-4 mr-2" />
              Visit Requests
            </Button>
          </Link>
          <Link to="/messages" className="w-full md:w-auto">
            <Button variant="outline" className="w-full h-12 md:h-10" size="sm">
              <MessageSquare className="h-4 w-4 mr-2" />
              Messages
            </Button>
          </Link>
          <Link to="/deals" className="w-full md:w-auto">
            <Button variant="outline" className="w-full h-12 md:h-10" size="sm">
              <ShoppingBag className="h-4 w-4 mr-2" />
              My Deals
            </Button>
          </Link>
        </CardContent>
      </Card>

      {/* Upcoming Visits */}
      {upcomingVisits.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base md:text-xl">Upcoming Property Visits</CardTitle>
            <CardDescription className="text-xs md:text-sm">Your scheduled property viewings</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 md:space-y-3">
              {upcomingVisits.map((visit) => (
                <div key={visit.id} className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-0 sm:justify-between p-3 md:p-4 border rounded-lg hover:shadow-md transition-shadow">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-sm md:text-base line-clamp-1">{visit.listings?.title}</h3>
                    <p className="text-xs md:text-sm text-muted-foreground line-clamp-1">{visit.listings?.location_label}</p>
                    <p className="text-xs md:text-sm mt-1">
                      {new Date(visit.requested_date).toLocaleDateString()} - {visit.requested_time_slot}
                    </p>
                  </div>
                  <div className="self-start sm:self-auto">
                    {getStatusBadge(visit.status)}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Listings */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base md:text-xl">Recent Listings</CardTitle>
          <CardDescription className="text-xs md:text-sm">Newly available properties</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 md:gap-4">
            {recentListings.map((listing) => (
              <Link key={listing.id} to={`/listings/${listing.id}`}>
                <div className="border rounded-xl p-3 md:p-4 hover:shadow-lg transition-all duration-300 active:scale-[0.98] md:hover:scale-105 hover-lift min-h-[100px]">
                  <h3 className="font-semibold text-sm md:text-base mb-1 md:mb-2 line-clamp-2">{listing.title}</h3>
                  <p className="text-xs md:text-sm text-muted-foreground mb-2 line-clamp-1">{listing.location_label}</p>
                  <div className="flex items-center justify-between gap-2">
                    <Badge variant="outline" className="text-[10px] md:text-xs px-1.5 md:px-2">{listing.property_type}</Badge>
                    {listing.price && (
                      <span className="font-semibold text-xs md:text-sm whitespace-nowrap">
                        {listing.price.toLocaleString()} {listing.currency}
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
