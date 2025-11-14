import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Clock, XCircle, MapPin, FileText, TrendingUp } from 'lucide-react';

export function VerificationDashboard() {
  const { profile } = useAuth();
  const [stats, setStats] = useState({
    pendingVerifications: 0,
    verifiedToday: 0,
    rejectedToday: 0,
    totalVerified: 0,
  });
  const [pendingListings, setPendingListings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchVerificationData();
  }, [profile]);

  const fetchVerificationData = async () => {
    try {
      // Fetch pending verifications
      const { data: pending, count: pendingCount } = await supabase
        .from('listings')
        .select('*, profiles(full_name)', { count: 'exact' })
        .eq('verification_status', 'pending')
        .order('created_at', { ascending: true })
        .limit(10);

      setPendingListings(pending || []);

      // Fetch total verified
      const { count: verifiedCount } = await supabase
        .from('listings')
        .select('*', { count: 'exact', head: true })
        .eq('verification_status', 'verified');

      // TODO: Fetch today's stats with proper date filtering
      setStats({
        pendingVerifications: pendingCount || 0,
        verifiedToday: 0,
        rejectedToday: 0,
        totalVerified: verifiedCount || 0,
      });
    } catch (error) {
      console.error('Error fetching verification data:', error);
    } finally {
      setLoading(false);
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
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold mb-2">Verification Dashboard</h1>
        <p className="text-muted-foreground">
          Review and verify property listings
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Pending Review
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-warning">{stats.pendingVerifications}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" />
              Verified Today
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-success">{stats.verifiedToday}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <XCircle className="h-4 w-4" />
              Rejected Today
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-destructive">{stats.rejectedToday}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Total Verified
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.totalVerified}</div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Verification tools</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Link to="/admin/verification">
            <Button>
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Review Queue
            </Button>
          </Link>
          <Link to="/admin/payments">
            <Button variant="outline">
              <FileText className="h-4 w-4 mr-2" />
              Payment Verification
            </Button>
          </Link>
          <Link to="/map">
            <Button variant="outline">
              <MapPin className="h-4 w-4 mr-2" />
              Polygon Validation
            </Button>
          </Link>
        </CardContent>
      </Card>

      {/* Pending Verifications Queue */}
      <Card>
        <CardHeader>
          <CardTitle>Pending Verifications</CardTitle>
          <CardDescription>Listings awaiting your review</CardDescription>
        </CardHeader>
        <CardContent>
          {pendingListings.length === 0 ? (
            <div className="text-center py-12">
              <CheckCircle2 className="h-12 w-12 mx-auto text-success mb-4" />
              <p className="text-muted-foreground">All caught up! No pending verifications.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {pendingListings.map((listing) => (
                <div key={listing.id} className="border rounded-lg p-4 hover:shadow-lg transition-shadow">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg">{listing.title}</h3>
                      <p className="text-sm text-muted-foreground">{listing.location_label}</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Submitted by {listing.profiles?.full_name}
                      </p>
                    </div>
                    <Badge variant="secondary">
                      <Clock className="h-3 w-3 mr-1" />
                      Pending
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex gap-2 text-sm">
                      <Badge variant="outline">{listing.property_type}</Badge>
                      <Badge variant="outline">{listing.listing_type}</Badge>
                    </div>
                    <Link to={`/listings/${listing.id}`}>
                      <Button size="sm">Review</Button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
