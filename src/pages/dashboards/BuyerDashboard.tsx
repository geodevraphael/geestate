import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Heart, Calendar, MessageSquare, CreditCard, TrendingUp, MapPin } from 'lucide-react';

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
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold mb-2">Buyer Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome back, {profile?.full_name}! Find your dream property.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Heart className="h-4 w-4" />
              Saved Listings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.savedListings}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Visit Requests
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.visitRequests}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Unread Messages
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.activeMessages}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              Payment Proofs
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.paymentProofs}</div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Start exploring properties</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Link to="/listings">
            <Button>
              <TrendingUp className="h-4 w-4 mr-2" />
              Browse Listings
            </Button>
          </Link>
          <Link to="/map">
            <Button variant="outline">
              <MapPin className="h-4 w-4 mr-2" />
              Explore Map
            </Button>
          </Link>
          <Link to="/visit-requests">
            <Button variant="outline">
              <Calendar className="h-4 w-4 mr-2" />
              My Visit Requests
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

      {/* Upcoming Visits */}
      {upcomingVisits.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Upcoming Property Visits</CardTitle>
            <CardDescription>Your scheduled property viewings</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {upcomingVisits.map((visit) => (
                <div key={visit.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex-1">
                    <h3 className="font-semibold">{visit.listings?.title}</h3>
                    <p className="text-sm text-muted-foreground">{visit.listings?.location_label}</p>
                    <p className="text-sm mt-1">
                      {new Date(visit.requested_date).toLocaleDateString()} - {visit.requested_time_slot}
                    </p>
                  </div>
                  {getStatusBadge(visit.status)}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Listings */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Listings</CardTitle>
          <CardDescription>Newly available properties</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {recentListings.map((listing) => (
              <Link key={listing.id} to={`/listings/${listing.id}`}>
                <div className="border rounded-lg p-4 hover:shadow-lg transition-shadow">
                  <h3 className="font-semibold mb-2">{listing.title}</h3>
                  <p className="text-sm text-muted-foreground mb-2">{listing.location_label}</p>
                  <div className="flex items-center justify-between">
                    <Badge variant="outline">{listing.property_type}</Badge>
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
        </CardContent>
      </Card>
    </div>
  );
}
