import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Heart, Calendar, MessageSquare, CreditCard, TrendingUp, MapPin, User, ShoppingBag, ArrowRight, Sparkles } from 'lucide-react';

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
      const { data: visits } = await supabase
        .from('visit_requests')
        .select('*, listings(title, location_label)')
        .eq('buyer_id', profile.id)
        .order('requested_date', { ascending: true })
        .limit(5);

      setUpcomingVisits(visits || []);

      const { data: payments } = await supabase
        .from('payment_proofs')
        .select('*', { count: 'exact', head: true })
        .eq('buyer_id', profile.id);

      const { data: messages } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('receiver_id', profile.id)
        .eq('is_read', false);

      const { data: listings } = await supabase
        .from('listings')
        .select('*')
        .eq('status', 'published')
        .order('created_at', { ascending: false })
        .limit(6);

      setRecentListings(listings || []);

      setStats({
        savedListings: 0,
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
        <div className="animate-spin h-8 w-8 border-4 border-accent border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6 md:space-y-8 p-4 md:p-6 lg:p-8 pb-24 md:pb-8 max-w-7xl mx-auto">
      {/* Welcome Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary to-primary/80 p-6 md:p-8 text-primary-foreground">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />
        <div className="relative">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="h-5 w-5 text-accent" />
            <span className="text-sm font-medium text-primary-foreground/80">Welcome back</span>
          </div>
          <h1 className="text-2xl md:text-4xl font-display font-bold mb-2">
            {profile?.full_name}
          </h1>
          <p className="text-primary-foreground/80 max-w-md">
            Find your dream property with verified listings and complete transparency.
          </p>
        </div>
      </div>

      {/* Stats Grid - Modern Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <Card className="group hover:shadow-lg transition-all duration-300 border-border/50 bg-card/50 backdrop-blur-sm">
          <CardContent className="p-4 md:p-6">
            <div className="flex items-center justify-between mb-3">
              <div className="p-2 rounded-xl bg-accent/10 text-accent">
                <Heart className="h-5 w-5" />
              </div>
              <span className="text-xs font-medium text-muted-foreground">Saved</span>
            </div>
            <div className="text-2xl md:text-3xl font-bold">{stats.savedListings}</div>
            <p className="text-xs text-muted-foreground mt-1">Listings</p>
          </CardContent>
        </Card>

        <Card className="group hover:shadow-lg transition-all duration-300 border-border/50 bg-card/50 backdrop-blur-sm">
          <CardContent className="p-4 md:p-6">
            <div className="flex items-center justify-between mb-3">
              <div className="p-2 rounded-xl bg-success/10 text-success">
                <Calendar className="h-5 w-5" />
              </div>
              <span className="text-xs font-medium text-muted-foreground">Visits</span>
            </div>
            <div className="text-2xl md:text-3xl font-bold">{stats.visitRequests}</div>
            <p className="text-xs text-muted-foreground mt-1">Requested</p>
          </CardContent>
        </Card>

        <Card className="group hover:shadow-lg transition-all duration-300 border-border/50 bg-card/50 backdrop-blur-sm">
          <CardContent className="p-4 md:p-6">
            <div className="flex items-center justify-between mb-3">
              <div className="p-2 rounded-xl bg-primary/10 text-primary">
                <MessageSquare className="h-5 w-5" />
              </div>
              <span className="text-xs font-medium text-muted-foreground">Unread</span>
            </div>
            <div className="text-2xl md:text-3xl font-bold">{stats.activeMessages}</div>
            <p className="text-xs text-muted-foreground mt-1">Messages</p>
          </CardContent>
        </Card>

        <Card className="group hover:shadow-lg transition-all duration-300 border-border/50 bg-card/50 backdrop-blur-sm">
          <CardContent className="p-4 md:p-6">
            <div className="flex items-center justify-between mb-3">
              <div className="p-2 rounded-xl bg-warning/10 text-warning">
                <CreditCard className="h-5 w-5" />
              </div>
              <span className="text-xs font-medium text-muted-foreground">Payments</span>
            </div>
            <div className="text-2xl md:text-3xl font-bold">{stats.paymentProofs}</div>
            <p className="text-xs text-muted-foreground mt-1">Submitted</p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions - More Visual */}
      <Card className="border-border/50 overflow-hidden">
        <CardHeader className="pb-4 bg-muted/30">
          <CardTitle className="text-lg md:text-xl flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-accent" />
            Quick Actions
          </CardTitle>
          <CardDescription>Start exploring properties</CardDescription>
        </CardHeader>
        <CardContent className="p-4 md:p-6">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            <Link to="/listings" className="group">
              <div className="flex flex-col items-center gap-2 p-4 rounded-xl border border-border/50 hover:border-accent hover:bg-accent/5 transition-all">
                <div className="p-3 rounded-full bg-accent/10 group-hover:bg-accent/20 transition-colors">
                  <TrendingUp className="h-5 w-5 text-accent" />
                </div>
                <span className="text-sm font-medium text-center">Browse</span>
              </div>
            </Link>
            <Link to="/sellers" className="group">
              <div className="flex flex-col items-center gap-2 p-4 rounded-xl border border-border/50 hover:border-primary hover:bg-primary/5 transition-all">
                <div className="p-3 rounded-full bg-primary/10 group-hover:bg-primary/20 transition-colors">
                  <User className="h-5 w-5 text-primary" />
                </div>
                <span className="text-sm font-medium text-center">Sellers</span>
              </div>
            </Link>
            <Link to="/map" className="group">
              <div className="flex flex-col items-center gap-2 p-4 rounded-xl border border-border/50 hover:border-success hover:bg-success/5 transition-all">
                <div className="p-3 rounded-full bg-success/10 group-hover:bg-success/20 transition-colors">
                  <MapPin className="h-5 w-5 text-success" />
                </div>
                <span className="text-sm font-medium text-center">Map</span>
              </div>
            </Link>
            <Link to="/visit-requests" className="group">
              <div className="flex flex-col items-center gap-2 p-4 rounded-xl border border-border/50 hover:border-warning hover:bg-warning/5 transition-all">
                <div className="p-3 rounded-full bg-warning/10 group-hover:bg-warning/20 transition-colors">
                  <Calendar className="h-5 w-5 text-warning" />
                </div>
                <span className="text-sm font-medium text-center">Visits</span>
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
            <Link to="/deals" className="group">
              <div className="flex flex-col items-center gap-2 p-4 rounded-xl border border-border/50 hover:border-accent hover:bg-accent/5 transition-all">
                <div className="p-3 rounded-full bg-accent/10 group-hover:bg-accent/20 transition-colors">
                  <ShoppingBag className="h-5 w-5 text-accent" />
                </div>
                <span className="text-sm font-medium text-center">Deals</span>
              </div>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Two Column Layout */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Upcoming Visits */}
        <Card className="border-border/50">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <Calendar className="h-5 w-5 text-success" />
                Upcoming Visits
              </CardTitle>
              <Link to="/visit-requests">
                <Button variant="ghost" size="sm" className="gap-1 text-muted-foreground">
                  View all <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {upcomingVisits.length > 0 ? (
              <div className="space-y-3">
                {upcomingVisits.slice(0, 3).map((visit) => (
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
                        {new Date(visit.requested_date).toLocaleDateString()} • {visit.requested_time_slot}
                      </p>
                    </div>
                    {getStatusBadge(visit.status)}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Calendar className="h-12 w-12 mx-auto mb-3 opacity-20" />
                <p className="text-sm">No upcoming visits</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Listings */}
        <Card className="border-border/50">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-accent" />
                New Listings
              </CardTitle>
              <Link to="/listings">
                <Button variant="ghost" size="sm" className="gap-1 text-muted-foreground">
                  View all <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentListings.slice(0, 4).map((listing) => (
                <Link key={listing.id} to={`/listings/${listing.id}`}>
                  <div className="flex items-center gap-4 p-3 rounded-xl border border-border/50 hover:bg-muted/50 hover:border-accent/50 transition-all">
                    <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-accent/10 flex items-center justify-center">
                      <MapPin className="h-5 w-5 text-accent" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-sm line-clamp-1">{listing.title}</h3>
                      <p className="text-xs text-muted-foreground line-clamp-1">{listing.location_label}</p>
                    </div>
                    {listing.price && (
                      <span className="text-sm font-semibold whitespace-nowrap">
                        {listing.price.toLocaleString()} {listing.currency}
                      </span>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
