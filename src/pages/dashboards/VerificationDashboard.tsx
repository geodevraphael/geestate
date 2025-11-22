import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { CheckCircle2, Clock, XCircle, MapPin, FileText, TrendingUp, AlertCircle, Shield, Calendar, Eye } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell } from 'recharts';

export function VerificationDashboard() {
  const { profile } = useAuth();
  const [stats, setStats] = useState({
    pendingVerifications: 0,
    verifiedToday: 0,
    rejectedToday: 0,
    totalVerified: 0,
    verificationRate: 0,
    avgReviewTime: 0,
  });
  const [pendingListings, setPendingListings] = useState<any[]>([]);
  const [verificationTrend, setVerificationTrend] = useState<any[]>([]);
  const [statusDistribution, setStatusDistribution] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchVerificationData();
  }, [profile]);

  const fetchVerificationData = async () => {
    try {
      // Fetch pending verifications
      const { data: pending, count: pendingCount } = await supabase
        .from('listings')
        .select('*, profiles(full_name, email)', { count: 'exact' })
        .eq('verification_status', 'pending')
        .order('created_at', { ascending: true })
        .limit(10);

      setPendingListings(pending || []);

      // Fetch total verified
      const { count: verifiedCount } = await supabase
        .from('listings')
        .select('*', { count: 'exact', head: true })
        .eq('verification_status', 'verified');

      // Fetch today's verifications
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const { count: verifiedToday } = await supabase
        .from('listings')
        .select('*', { count: 'exact', head: true })
        .eq('verification_status', 'verified')
        .gte('updated_at', today.toISOString());

      const { count: rejectedToday } = await supabase
        .from('listings')
        .select('*', { count: 'exact', head: true })
        .eq('verification_status', 'rejected')
        .gte('updated_at', today.toISOString());

      // Calculate verification rate
      const { count: totalListings } = await supabase
        .from('listings')
        .select('*', { count: 'exact', head: true });
      
      const verificationRate = totalListings ? Math.round((verifiedCount! / totalListings) * 100) : 0;

      // Fetch verification status distribution
      const { data: allListings } = await supabase
        .from('listings')
        .select('verification_status');

      const statusMap = new Map();
      allListings?.forEach(listing => {
        const status = listing.verification_status || 'unverified';
        statusMap.set(status, (statusMap.get(status) || 0) + 1);
      });

      const statusColors: Record<string, string> = {
        verified: 'hsl(var(--success))',
        pending: 'hsl(var(--warning))',
        rejected: 'hsl(var(--destructive))',
        unverified: 'hsl(var(--muted))',
      };

      const distribution = Array.from(statusMap.entries()).map(([name, value]) => ({
        name: name.charAt(0).toUpperCase() + name.slice(1),
        value,
        color: statusColors[name] || 'hsl(var(--muted))',
      }));

      setStatusDistribution(distribution);

      // Verification trend (last 7 days)
      const trend: any[] = [];
      for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dayStart = new Date(date.setHours(0, 0, 0, 0));
        const dayEnd = new Date(date.setHours(23, 59, 59, 999));
        
        const { count: verified } = await supabase
          .from('listings')
          .select('*', { count: 'exact', head: true })
          .eq('verification_status', 'verified')
          .gte('updated_at', dayStart.toISOString())
          .lte('updated_at', dayEnd.toISOString());

        const { count: rejected } = await supabase
          .from('listings')
          .select('*', { count: 'exact', head: true })
          .eq('verification_status', 'rejected')
          .gte('updated_at', dayStart.toISOString())
          .lte('updated_at', dayEnd.toISOString());
        
        trend.push({
          day: dayStart.toLocaleDateString('en-US', { weekday: 'short' }),
          verified: verified || 0,
          rejected: rejected || 0,
        });
      }
      
      setVerificationTrend(trend);

      setStats({
        pendingVerifications: pendingCount || 0,
        verifiedToday: verifiedToday || 0,
        rejectedToday: rejectedToday || 0,
        totalVerified: verifiedCount || 0,
        verificationRate,
        avgReviewTime: 2.5, // Placeholder
      });
    } catch (error) {
      console.error('Error fetching verification data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-8 p-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-3">
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-10 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">Verification Dashboard</h1>
          <p className="text-muted-foreground">
            Review and verify property listings with quality assurance
          </p>
        </div>
        <Badge variant="outline" className="text-sm">
          <Shield className="h-3 w-3 mr-1" />
          Quality Control
        </Badge>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="hover:shadow-md transition-shadow border-l-4 border-l-warning">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Pending Review
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-warning">{stats.pendingVerifications}</div>
            <p className="text-xs text-muted-foreground mt-1">Awaiting verification</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow border-l-4 border-l-success">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" />
              Verified Today
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-success">{stats.verifiedToday}</div>
            <p className="text-xs text-muted-foreground mt-1">Last 24 hours</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow border-l-4 border-l-destructive">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <XCircle className="h-4 w-4" />
              Rejected Today
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-destructive">{stats.rejectedToday}</div>
            <p className="text-xs text-muted-foreground mt-1">Last 24 hours</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow border-l-4 border-l-primary">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Verification Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.verificationRate}%</div>
            <p className="text-xs text-success mt-1">Of all listings</p>
          </CardContent>
        </Card>
      </div>

      {/* Analytics Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Verification Trend
            </CardTitle>
            <CardDescription>Daily verification activity over last 7 days</CardDescription>
          </CardHeader>
          <CardContent>
            {verificationTrend.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={verificationTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="day" stroke="hsl(var(--muted-foreground))" />
                  <YAxis stroke="hsl(var(--muted-foreground))" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--background))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '6px'
                    }}
                  />
                  <Legend />
                  <Bar dataKey="verified" fill="hsl(var(--success))" name="Verified" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="rejected" fill="hsl(var(--destructive))" name="Rejected" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[280px] flex items-center justify-center">
                <p className="text-muted-foreground">No verification data</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-accent" />
              Status Distribution
            </CardTitle>
            <CardDescription>Overall listing verification status</CardDescription>
          </CardHeader>
          <CardContent>
            {statusDistribution.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={statusDistribution}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value, percent }) => `${name}: ${value} (${(percent * 100).toFixed(0)}%)`}
                    outerRadius={90}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {statusDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[280px] flex items-center justify-center">
                <p className="text-muted-foreground">No data available</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card className="hover:shadow-md transition-shadow bg-gradient-to-br from-background to-muted/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-primary" />
            Quick Actions
          </CardTitle>
          <CardDescription>Access verification tools instantly</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Link to="/admin/verification">
            <Button className="shadow-sm">
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Review Queue
            </Button>
          </Link>
          <Link to="/admin/payments">
            <Button variant="outline" className="shadow-sm">
              <FileText className="h-4 w-4 mr-2" />
              Payment Verification
            </Button>
          </Link>
          <Link to="/map">
            <Button variant="outline" className="shadow-sm">
              <MapPin className="h-4 w-4 mr-2" />
              Polygon Validation
            </Button>
          </Link>
          <Link to="/admin/compliance">
            <Button variant="outline" className="shadow-sm">
              <AlertCircle className="h-4 w-4 mr-2" />
              Compliance Flags
            </Button>
          </Link>
        </CardContent>
      </Card>

      {/* Pending Verifications Queue */}
      <Card className="hover:shadow-md transition-shadow">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-warning" />
            Pending Verifications
          </CardTitle>
          <CardDescription>Listings awaiting your expert review</CardDescription>
        </CardHeader>
        <CardContent>
          {pendingListings.length === 0 ? (
            <div className="text-center py-12">
              <CheckCircle2 className="h-12 w-12 mx-auto text-success mb-4" />
              <p className="text-muted-foreground font-medium">All caught up!</p>
              <p className="text-sm text-muted-foreground mt-1">No pending verifications at the moment.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {pendingListings.map((listing) => (
                <div key={listing.id} className="border rounded-lg p-4 hover:shadow-sm hover:border-primary/50 transition-all">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold text-lg">{listing.title}</h3>
                        <Badge variant="secondary" className="text-xs">
                          <Clock className="h-3 w-3 mr-1" />
                          Pending
                        </Badge>
                      </div>
                      <div className="space-y-1.5">
                        <p className="text-sm text-muted-foreground flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {listing.location_label}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          👤 Submitted by <span className="font-medium">{listing.profiles?.full_name}</span>
                        </p>
                        {listing.profiles?.email && (
                          <p className="text-xs text-muted-foreground">
                            📧 {listing.profiles.email}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          Submitted {new Date(listing.created_at).toLocaleDateString('en-US', { 
                            month: 'short', 
                            day: 'numeric', 
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between flex-wrap gap-3">
                    <div className="flex gap-2 text-sm flex-wrap">
                      <Badge variant="outline" className="capitalize">{listing.property_type}</Badge>
                      <Badge variant="outline" className="capitalize">{listing.listing_type}</Badge>
                      {listing.price && (
                        <Badge variant="outline">{listing.currency} {listing.price.toLocaleString()}</Badge>
                      )}
                    </div>
                    <Link to={`/listings/${listing.id}`}>
                      <Button size="sm" className="shadow-sm">
                        <Eye className="h-4 w-4 mr-2" />
                        Review Now
                      </Button>
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
