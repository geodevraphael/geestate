import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { GenerateSampleDataButton } from '@/components/GenerateSampleDataButton';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Shield, AlertTriangle, CheckCircle2, Users, 
  FileText, TrendingUp, Activity, Settings, Sparkles, ArrowRight, BarChart3, CreditCard, Building, Clock
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
      const { count: usersCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      const { count: listingsCount } = await supabase
        .from('listings')
        .select('*', { count: 'exact', head: true });

      const { count: pendingCount } = await supabase
        .from('listings')
        .select('*', { count: 'exact', head: true })
        .eq('verification_status', 'pending');

      const { count: flagsCount } = await supabase
        .from('compliance_flags')
        .select('*', { count: 'exact', head: true })
        .eq('resolved', false);

      const { count: disputesCount } = await supabase
        .from('disputes')
        .select('*', { count: 'exact', head: true })
        .in('status', ['open', 'in_review']);

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
        todaySignups: 0,
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
        <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="h-5 w-5 text-accent" />
              <span className="text-sm font-medium text-primary-foreground/80">Admin Dashboard</span>
            </div>
            <h1 className="text-2xl md:text-4xl font-display font-bold mb-2">
              System Overview
            </h1>
            <p className="text-primary-foreground/80">
              Monitor and manage platform operations
            </p>
          </div>
          <GenerateSampleDataButton />
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 md:gap-4">
        <Card className="group hover:shadow-lg transition-all duration-300 border-border/50 bg-card/50 backdrop-blur-sm">
          <CardContent className="p-4 md:p-6">
            <div className="flex items-center justify-between mb-3">
              <div className="p-2 rounded-xl bg-primary/10 text-primary">
                <Users className="h-5 w-5" />
              </div>
            </div>
            <div className="text-2xl md:text-3xl font-bold">{stats.totalUsers}</div>
            <p className="text-xs text-muted-foreground mt-1">Total Users</p>
          </CardContent>
        </Card>

        <Card className="group hover:shadow-lg transition-all duration-300 border-border/50 bg-card/50 backdrop-blur-sm">
          <CardContent className="p-4 md:p-6">
            <div className="flex items-center justify-between mb-3">
              <div className="p-2 rounded-xl bg-accent/10 text-accent">
                <Building className="h-5 w-5" />
              </div>
            </div>
            <div className="text-2xl md:text-3xl font-bold">{stats.totalListings}</div>
            <p className="text-xs text-muted-foreground mt-1">Listings</p>
          </CardContent>
        </Card>

        <Card className="group hover:shadow-lg transition-all duration-300 border-border/50 bg-card/50 backdrop-blur-sm">
          <CardContent className="p-4 md:p-6">
            <div className="flex items-center justify-between mb-3">
              <div className="p-2 rounded-xl bg-warning/10 text-warning">
                <Clock className="h-5 w-5" />
              </div>
            </div>
            <div className="text-2xl md:text-3xl font-bold text-warning">{stats.pendingVerifications}</div>
            <p className="text-xs text-muted-foreground mt-1">Pending</p>
          </CardContent>
        </Card>

        <Card className="group hover:shadow-lg transition-all duration-300 border-border/50 bg-card/50 backdrop-blur-sm">
          <CardContent className="p-4 md:p-6">
            <div className="flex items-center justify-between mb-3">
              <div className="p-2 rounded-xl bg-destructive/10 text-destructive">
                <AlertTriangle className="h-5 w-5" />
              </div>
            </div>
            <div className="text-2xl md:text-3xl font-bold text-destructive">{stats.activeFlags}</div>
            <p className="text-xs text-muted-foreground mt-1">Flags</p>
          </CardContent>
        </Card>

        <Card className="group hover:shadow-lg transition-all duration-300 border-border/50 bg-card/50 backdrop-blur-sm">
          <CardContent className="p-4 md:p-6">
            <div className="flex items-center justify-between mb-3">
              <div className="p-2 rounded-xl bg-primary/10 text-primary">
                <Shield className="h-5 w-5" />
              </div>
            </div>
            <div className="text-2xl md:text-3xl font-bold">{stats.activeDisputes}</div>
            <p className="text-xs text-muted-foreground mt-1">Disputes</p>
          </CardContent>
        </Card>

        <Card className="group hover:shadow-lg transition-all duration-300 border-border/50 bg-card/50 backdrop-blur-sm">
          <CardContent className="p-4 md:p-6">
            <div className="flex items-center justify-between mb-3">
              <div className="p-2 rounded-xl bg-success/10 text-success">
                <TrendingUp className="h-5 w-5" />
              </div>
            </div>
            <div className="text-2xl md:text-3xl font-bold text-success">{stats.todaySignups}</div>
            <p className="text-xs text-muted-foreground mt-1">Today</p>
          </CardContent>
        </Card>
      </div>

      {/* System Alerts */}
      {(stats.activeFlags > 0 || stats.activeDisputes > 0 || stats.pendingVerifications > 10) && (
        <Card className="border-warning/50 bg-warning/5">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-warning">
              <AlertTriangle className="h-5 w-5" />
              Action Required
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {stats.pendingVerifications > 10 && (
              <div className="flex items-center justify-between p-3 bg-background/50 rounded-xl border border-border/50">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-warning/10">
                    <Clock className="h-4 w-4 text-warning" />
                  </div>
                  <span className="text-sm font-medium">High volume of pending verifications</span>
                </div>
                <Link to="/admin/verification">
                  <Button size="sm" variant="outline" className="gap-1">
                    Review <ArrowRight className="h-3 w-3" />
                  </Button>
                </Link>
              </div>
            )}
            {stats.activeFlags > 0 && (
              <div className="flex items-center justify-between p-3 bg-background/50 rounded-xl border border-border/50">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-destructive/10">
                    <AlertTriangle className="h-4 w-4 text-destructive" />
                  </div>
                  <span className="text-sm font-medium">{stats.activeFlags} unresolved compliance flags</span>
                </div>
                <Link to="/admin/compliance">
                  <Button size="sm" variant="outline" className="gap-1">
                    Review <ArrowRight className="h-3 w-3" />
                  </Button>
                </Link>
              </div>
            )}
            {stats.activeDisputes > 0 && (
              <div className="flex items-center justify-between p-3 bg-background/50 rounded-xl border border-border/50">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-destructive/10">
                    <Shield className="h-4 w-4 text-destructive" />
                  </div>
                  <span className="text-sm font-medium">{stats.activeDisputes} open disputes</span>
                </div>
                <Link to="/disputes">
                  <Button size="sm" variant="outline" className="gap-1">
                    Review <ArrowRight className="h-3 w-3" />
                  </Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Quick Actions */}
      <Card className="border-border/50 overflow-hidden">
        <CardHeader className="pb-4 bg-muted/30">
          <CardTitle className="text-lg md:text-xl flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-accent" />
            Administrative Actions
          </CardTitle>
          <CardDescription>Manage platform operations</CardDescription>
        </CardHeader>
        <CardContent className="p-4 md:p-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Link to="/admin/verification" className="group">
              <div className="flex flex-col items-center gap-2 p-4 rounded-xl border border-border/50 hover:border-success hover:bg-success/5 transition-all">
                <div className="p-3 rounded-full bg-success/10 group-hover:bg-success/20 transition-colors">
                  <CheckCircle2 className="h-5 w-5 text-success" />
                </div>
                <span className="text-sm font-medium text-center">Verify</span>
              </div>
            </Link>
            <Link to="/admin/compliance" className="group">
              <div className="flex flex-col items-center gap-2 p-4 rounded-xl border border-border/50 hover:border-warning hover:bg-warning/5 transition-all">
                <div className="p-3 rounded-full bg-warning/10 group-hover:bg-warning/20 transition-colors">
                  <AlertTriangle className="h-5 w-5 text-warning" />
                </div>
                <span className="text-sm font-medium text-center">Compliance</span>
              </div>
            </Link>
            <Link to="/disputes" className="group">
              <div className="flex flex-col items-center gap-2 p-4 rounded-xl border border-border/50 hover:border-primary hover:bg-primary/5 transition-all">
                <div className="p-3 rounded-full bg-primary/10 group-hover:bg-primary/20 transition-colors">
                  <Shield className="h-5 w-5 text-primary" />
                </div>
                <span className="text-sm font-medium text-center">Disputes</span>
              </div>
            </Link>
            <Link to="/admin/analytics" className="group">
              <div className="flex flex-col items-center gap-2 p-4 rounded-xl border border-border/50 hover:border-accent hover:bg-accent/5 transition-all">
                <div className="p-3 rounded-full bg-accent/10 group-hover:bg-accent/20 transition-colors">
                  <Activity className="h-5 w-5 text-accent" />
                </div>
                <span className="text-sm font-medium text-center">Analytics</span>
              </div>
            </Link>
            <Link to="/admin/payments" className="group">
              <div className="flex flex-col items-center gap-2 p-4 rounded-xl border border-border/50 hover:border-success hover:bg-success/5 transition-all">
                <div className="p-3 rounded-full bg-success/10 group-hover:bg-success/20 transition-colors">
                  <CreditCard className="h-5 w-5 text-success" />
                </div>
                <span className="text-sm font-medium text-center">Payments</span>
              </div>
            </Link>
            <Link to="/fraud-detection" className="group">
              <div className="flex flex-col items-center gap-2 p-4 rounded-xl border border-border/50 hover:border-destructive hover:bg-destructive/5 transition-all">
                <div className="p-3 rounded-full bg-destructive/10 group-hover:bg-destructive/20 transition-colors">
                  <Shield className="h-5 w-5 text-destructive" />
                </div>
                <span className="text-sm font-medium text-center">Fraud</span>
              </div>
            </Link>
            <Link to="/audit-logs" className="group">
              <div className="flex flex-col items-center gap-2 p-4 rounded-xl border border-border/50 hover:border-primary hover:bg-primary/5 transition-all">
                <div className="p-3 rounded-full bg-primary/10 group-hover:bg-primary/20 transition-colors">
                  <FileText className="h-5 w-5 text-primary" />
                </div>
                <span className="text-sm font-medium text-center">Logs</span>
              </div>
            </Link>
            <Link to="/institutional-sellers" className="group">
              <div className="flex flex-col items-center gap-2 p-4 rounded-xl border border-border/50 hover:border-accent hover:bg-accent/5 transition-all">
                <div className="p-3 rounded-full bg-accent/10 group-hover:bg-accent/20 transition-colors">
                  <Users className="h-5 w-5 text-accent" />
                </div>
                <span className="text-sm font-medium text-center">Institutions</span>
              </div>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <Card className="border-border/50">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Activity className="h-5 w-5 text-accent" />
              Recent System Activity
            </CardTitle>
            <Link to="/audit-logs">
              <Button variant="ghost" size="sm" className="gap-1 text-muted-foreground">
                View all <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          {recentActivity.length === 0 ? (
            <div className="text-center py-12">
              <Activity className="h-12 w-12 mx-auto mb-4 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">No recent activity</p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentActivity.slice(0, 5).map((log) => (
                <div 
                  key={log.id} 
                  className="flex items-center gap-4 p-3 rounded-xl border border-border/50 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Activity className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">{log.action_type}</p>
                    <p className="text-xs text-muted-foreground">
                      by {log.profiles?.full_name || 'System'}
                    </p>
                  </div>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {new Date(log.created_at).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
