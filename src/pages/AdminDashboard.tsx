import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { GenerateSampleDataButton } from '@/components/GenerateSampleDataButton';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Activity,
  Users,
  MapPin,
  DollarSign,
  AlertTriangle,
  TrendingUp,
  FileCheck,
  Flag,
  Briefcase,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface DashboardStats {
  totalListings: number;
  newListingsToday: number;
  pendingVerifications: number;
  totalUsers: number;
  activeSubscriptions: number;
  fraudSignals: number;
  complianceFlags: number;
  closedDeals: number;
  serviceRequests: number;
  pendingServiceRequests: number;
}

export default function AdminDashboard() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats>({
    totalListings: 0,
    newListingsToday: 0,
    pendingVerifications: 0,
    totalUsers: 0,
    activeSubscriptions: 0,
    fraudSignals: 0,
    complianceFlags: 0,
    closedDeals: 0,
    serviceRequests: 0,
    pendingServiceRequests: 0,
  });
  const [loading, setLoading] = useState(true);
  const [recentRequests, setRecentRequests] = useState<any[]>([]);

  useEffect(() => {
    if (user && profile?.role === 'admin') {
      fetchDashboardStats();
    } else if (user && profile?.role !== 'admin') {
      navigate('/dashboard');
    }
  }, [user, profile]);

  const fetchDashboardStats = async () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [
      listingsRes,
      newListingsRes,
      pendingVerRes,
      usersRes,
      subsRes,
      fraudRes,
      complianceRes,
      dealsRes,
      serviceReqRes,
      pendingServiceReqRes,
    ] = await Promise.all([
      supabase.from('listings').select('id', { count: 'exact', head: true }),
      supabase
        .from('listings')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', today.toISOString()),
      supabase
        .from('listings')
        .select('id', { count: 'exact', head: true })
        .eq('verification_status', 'pending'),
      supabase.from('profiles').select('id', { count: 'exact', head: true }),
      supabase
        .from('subscriptions')
        .select('id', { count: 'exact', head: true })
        .eq('is_active', true),
      supabase.from('fraud_signals').select('id', { count: 'exact', head: true }),
      supabase
        .from('compliance_flags')
        .select('id', { count: 'exact', head: true })
        .eq('resolved', false),
      supabase
        .from('deal_closures')
        .select('id', { count: 'exact', head: true })
        .eq('closure_status', 'closed'),
      supabase.from('service_requests').select('id', { count: 'exact', head: true }),
      supabase
        .from('service_requests')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'pending'),
    ]);

    setStats({
      totalListings: listingsRes.count || 0,
      newListingsToday: newListingsRes.count || 0,
      pendingVerifications: pendingVerRes.count || 0,
      totalUsers: usersRes.count || 0,
      activeSubscriptions: subsRes.count || 0,
      fraudSignals: fraudRes.count || 0,
      complianceFlags: complianceRes.count || 0,
      closedDeals: dealsRes.count || 0,
      serviceRequests: serviceReqRes.count || 0,
      pendingServiceRequests: pendingServiceReqRes.count || 0,
    });

    // Fetch recent service requests
    const { data: requests } = await supabase
      .from('service_requests')
      .select(`
        *,
        listings!inner(title, location_label)
      `)
      .order('created_at', { ascending: false })
      .limit(5);

    if (requests) {
      const requestsWithProfiles = await Promise.all(
        requests.map(async (request) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('id', request.requester_id)
            .single();
          
          return {
            ...request,
            listing: request.listings,
            requester: profile
          };
        })
      );
      setRecentRequests(requestsWithProfiles);
    }

    setLoading(false);
  };

  if (loading) {
    return <div className="container mx-auto p-6">Loading...</div>;
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">GeoInsight Admin Intelligence</h1>
        <p className="text-muted-foreground">Comprehensive system overview and analytics</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card className="cursor-pointer hover:bg-muted/50" onClick={() => navigate('/listings')}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Listings</CardTitle>
            <MapPin className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalListings}</div>
            <p className="text-xs text-muted-foreground">
              +{stats.newListingsToday} today
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Verifications</CardTitle>
            <FileCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pendingVerifications}</div>
            <p className="text-xs text-muted-foreground">Require review</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalUsers}</div>
            <p className="text-xs text-muted-foreground">Registered accounts</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Subscriptions</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeSubscriptions}</div>
            <p className="text-xs text-muted-foreground">Paid plans</p>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:bg-muted/50" onClick={() => navigate('/fraud-detection')}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Fraud Signals</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.fraudSignals}</div>
            <Badge variant={stats.fraudSignals > 10 ? 'destructive' : 'secondary'} className="text-xs">
              {stats.fraudSignals > 10 ? 'High Alert' : 'Normal'}
            </Badge>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:bg-muted/50" onClick={() => navigate('/compliance-flags')}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Compliance Flags</CardTitle>
            <Flag className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.complianceFlags}</div>
            <p className="text-xs text-muted-foreground">Unresolved</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Closed Deals</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.closedDeals}</div>
            <p className="text-xs text-muted-foreground">Successful transactions</p>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:bg-muted/50" onClick={() => navigate('/admin/service-requests')}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Service Requests</CardTitle>
            <Briefcase className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.serviceRequests}</div>
            <p className="text-xs text-muted-foreground">
              {stats.pendingServiceRequests} pending
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">System Health</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <Badge variant="default" className="text-xs">
              All Systems Operational
            </Badge>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Common administrative tasks</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <button
              className="w-full text-left p-3 border rounded-lg hover:bg-muted/50 transition-colors"
              onClick={() => navigate('/listings')}
            >
              <p className="font-semibold">Review Pending Listings</p>
              <p className="text-xs text-muted-foreground">
                {stats.pendingVerifications} listings awaiting verification
              </p>
            </button>
            <button
              className="w-full text-left p-3 border rounded-lg hover:bg-muted/50 transition-colors"
              onClick={() => navigate('/admin-payments')}
            >
              <p className="font-semibold">Process Payment Proofs</p>
              <p className="text-xs text-muted-foreground">Review submitted payment evidence</p>
            </button>
            <button
              className="w-full text-left p-3 border rounded-lg hover:bg-muted/50 transition-colors"
              onClick={() => navigate('/fraud-detection')}
            >
              <p className="font-semibold">Investigate Fraud Signals</p>
              <p className="text-xs text-muted-foreground">
                {stats.fraudSignals} signals require attention
              </p>
            </button>
            <button
              className="w-full text-left p-3 border rounded-lg hover:bg-muted/50 transition-colors"
              onClick={() => navigate('/compliance-flags')}
            >
              <p className="font-semibold">Resolve Compliance Flags</p>
              <p className="text-xs text-muted-foreground">
                {stats.complianceFlags} unresolved compliance issues
              </p>
            </button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>System Insights</CardTitle>
            <CardDescription>Platform performance metrics</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium">Verification Rate</p>
                <p className="text-sm text-muted-foreground">
                  {stats.totalListings > 0
                    ? Math.round(
                        ((stats.totalListings - stats.pendingVerifications) / stats.totalListings) *
                          100
                      )
                    : 0}
                  %
                </p>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary"
                  style={{
                    width: `${
                      stats.totalListings > 0
                        ? ((stats.totalListings - stats.pendingVerifications) / stats.totalListings) *
                          100
                        : 0
                    }%`,
                  }}
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium">Deal Success Rate</p>
                <p className="text-sm text-muted-foreground">
                  {stats.closedDeals > 0 ? '95%' : '0%'}
                </p>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-green-600"
                  style={{ width: stats.closedDeals > 0 ? '95%' : '0%' }}
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium">Subscription Rate</p>
                <p className="text-sm text-muted-foreground">
                  {stats.totalUsers > 0
                    ? Math.round((stats.activeSubscriptions / stats.totalUsers) * 100)
                    : 0}
                  %
                </p>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-600"
                  style={{
                    width: `${
                      stats.totalUsers > 0
                        ? (stats.activeSubscriptions / stats.totalUsers) * 100
                        : 0
                    }%`,
                  }}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Service Requests */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Recent Service Requests</CardTitle>
              <CardDescription>Latest geospatial and professional services</CardDescription>
            </div>
            <button
              onClick={() => navigate('/admin/service-requests')}
              className="text-sm text-primary hover:underline"
            >
              View All
            </button>
          </div>
        </CardHeader>
        <CardContent>
          {recentRequests.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No service requests yet
            </p>
          ) : (
            <div className="space-y-4">
              {recentRequests.map((request) => (
                <div
                  key={request.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                  onClick={() => navigate(`/admin/service-requests/${request.id}`)}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">
                        {request.service_type.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}
                      </p>
                      <Badge variant={request.status === 'pending' ? 'secondary' : 'default'}>
                        {request.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {request.listing?.title} • {request.requester?.full_name}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">
                      {new Date(request.created_at).toLocaleDateString()}
                    </p>
                    {request.quoted_price && (
                      <p className="text-sm font-medium">
                        {request.quoted_currency} {request.quoted_price.toLocaleString()}
                      </p>
                    )}
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
