import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Shield, AlertTriangle, CheckCircle2, Users, 
  FileText, TrendingUp, Activity, Settings 
} from 'lucide-react';

export function AdminDashboard() {
  const { profile } = useAuth();
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalListings: 0,
    pendingVerifications: 0,
    activeFlags: 0,
    activeDisputes: 0,
    todaySignups: 0,
  });
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAdminData();
  }, [profile]);

  const fetchAdminData = async () => {
    try {
      // Fetch total users
      const { count: usersCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      // Fetch total listings
      const { count: listingsCount } = await supabase
        .from('listings')
        .select('*', { count: 'exact', head: true });

      // Fetch pending verifications
      const { count: pendingCount } = await supabase
        .from('listings')
        .select('*', { count: 'exact', head: true })
        .eq('verification_status', 'pending');

      // Fetch active compliance flags
      const { count: flagsCount } = await supabase
        .from('compliance_flags')
        .select('*', { count: 'exact', head: true })
        .eq('resolved', false);

      // Fetch active disputes
      const { count: disputesCount } = await supabase
        .from('disputes')
        .select('*', { count: 'exact', head: true })
        .in('status', ['open', 'in_review']);

      // Fetch recent audit logs
      const { data: auditLogs } = await supabase
        .from('audit_logs')
        .select('*, profiles(full_name)')
        .order('created_at', { ascending: false })
        .limit(10);

      setRecentActivity(auditLogs || []);

      setStats({
        totalUsers: usersCount || 0,
        totalListings: listingsCount || 0,
        pendingVerifications: pendingCount || 0,
        activeFlags: flagsCount || 0,
        activeDisputes: disputesCount || 0,
        todaySignups: 0, // TODO: Calculate today's signups
      });
    } catch (error) {
      console.error('Error fetching admin data:', error);
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
        <h1 className="text-3xl font-bold mb-2">Admin Dashboard</h1>
        <p className="text-muted-foreground">
          System overview and administrative controls
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Users className="h-4 w-4" />
              Total Users
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalUsers}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Listings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalListings}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" />
              Pending
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-warning">{stats.pendingVerifications}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Flags
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{stats.activeFlags}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Disputes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeDisputes}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Today
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">{stats.todaySignups}</div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Administrative Actions</CardTitle>
          <CardDescription>Manage platform operations</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Link to="/admin/verification">
            <Button variant="outline" className="w-full">
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Verify Listings
            </Button>
          </Link>
          <Link to="/compliance-flags">
            <Button variant="outline" className="w-full">
              <AlertTriangle className="h-4 w-4 mr-2" />
              Compliance Flags
            </Button>
          </Link>
          <Link to="/disputes">
            <Button variant="outline" className="w-full">
              <Shield className="h-4 w-4 mr-2" />
              Disputes
            </Button>
          </Link>
          <Link to="/admin/analytics">
            <Button variant="outline" className="w-full">
              <Activity className="h-4 w-4 mr-2" />
              Analytics
            </Button>
          </Link>
          <Link to="/admin/payments">
            <Button variant="outline" className="w-full">
              <TrendingUp className="h-4 w-4 mr-2" />
              Payments
            </Button>
          </Link>
          <Link to="/fraud-detection">
            <Button variant="outline" className="w-full">
              <Shield className="h-4 w-4 mr-2" />
              Fraud Detection
            </Button>
          </Link>
          <Link to="/audit-logs">
            <Button variant="outline" className="w-full">
              <FileText className="h-4 w-4 mr-2" />
              Audit Logs
            </Button>
          </Link>
          <Link to="/institutional-sellers">
            <Button variant="outline" className="w-full">
              <Users className="h-4 w-4 mr-2" />
              Institutions
            </Button>
          </Link>
        </CardContent>
      </Card>

      {/* System Alerts */}
      {(stats.activeFlags > 0 || stats.activeDisputes > 0 || stats.pendingVerifications > 10) && (
        <Card className="border-warning">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-warning">
              <AlertTriangle className="h-5 w-5" />
              Action Required
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {stats.pendingVerifications > 10 && (
              <div className="flex items-center justify-between p-3 bg-warning/10 rounded-lg">
                <span>High volume of pending verifications</span>
                <Link to="/admin/verification">
                  <Button size="sm" variant="outline">Review</Button>
                </Link>
              </div>
            )}
            {stats.activeFlags > 0 && (
              <div className="flex items-center justify-between p-3 bg-destructive/10 rounded-lg">
                <span>{stats.activeFlags} unresolved compliance flags</span>
                <Link to="/compliance-flags">
                  <Button size="sm" variant="outline">Review</Button>
                </Link>
              </div>
            )}
            {stats.activeDisputes > 0 && (
              <div className="flex items-center justify-between p-3 bg-destructive/10 rounded-lg">
                <span>{stats.activeDisputes} open disputes</span>
                <Link to="/disputes">
                  <Button size="sm" variant="outline">Review</Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent System Activity</CardTitle>
          <CardDescription>Latest audit log entries</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {recentActivity.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No recent activity</p>
            ) : (
              recentActivity.map((log) => (
                <div key={log.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">{log.action_type}</p>
                    <p className="text-sm text-muted-foreground">
                      by {log.profiles?.full_name || 'System'}
                    </p>
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {new Date(log.created_at).toLocaleString()}
                  </span>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
