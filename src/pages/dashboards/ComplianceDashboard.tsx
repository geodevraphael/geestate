import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertTriangle, Shield, Flag, Eye, TrendingDown, Activity, Clock, Target } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';

export function ComplianceDashboard() {
  const { profile } = useAuth();
  const [stats, setStats] = useState({
    activeFlags: 0,
    openDisputes: 0,
    fraudSignals: 0,
    resolvedToday: 0,
    avgResolutionTime: 0,
    criticalIssues: 0,
  });
  const [recentFlags, setRecentFlags] = useState<any[]>([]);
  const [recentDisputes, setRecentDisputes] = useState<any[]>([]);
  const [flagTrend, setFlagTrend] = useState<any[]>([]);
  const [flagsByType, setFlagsByType] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchComplianceData();
  }, [profile]);

  const fetchComplianceData = async () => {
    try {
      // Fetch all compliance flags
      const { data: allFlags, count: flagsCount } = await supabase
        .from('compliance_flags')
        .select('*', { count: 'exact' })
        .eq('resolved', false);

      // Count critical issues (severity >= 8)
      const criticalCount = allFlags?.filter(f => f.severity >= 8).length || 0;

      // Fetch recent active flags
      const { data: flags } = await supabase
        .from('compliance_flags')
        .select('*, listings(title, location_label)')
        .eq('resolved', false)
        .order('severity', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(6);

      setRecentFlags(flags || []);

      // Fetch open disputes
      const { data: disputes, count: disputesCount } = await supabase
        .from('disputes')
        .select('*, listings(title)', { count: 'exact' })
        .in('status', ['open', 'in_review'])
        .order('created_at', { ascending: false })
        .limit(5);

      setRecentDisputes(disputes || []);

      // Fetch fraud signals
      const { count: fraudCount } = await supabase
        .from('fraud_signals')
        .select('*', { count: 'exact', head: true })
        .gte('signal_score', 50);

      // Calculate resolved today
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const { count: resolvedCount } = await supabase
        .from('compliance_flags')
        .select('*', { count: 'exact', head: true })
        .eq('resolved', true)
        .gte('resolved_at', today.toISOString());

      // Flags by type
      const typeMap = new Map();
      allFlags?.forEach(flag => {
        const type = flag.type;
        typeMap.set(type, (typeMap.get(type) || 0) + 1);
      });
      
      const types = Array.from(typeMap.entries())
        .map(([name, value]) => ({
          name: name.replace(/_/g, ' ').toUpperCase(),
          value,
        }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 5);
      
      setFlagsByType(types);

      // Flag trend (last 7 days)
      const trend: any[] = [];
      for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dayStart = new Date(date.setHours(0, 0, 0, 0));
        const dayEnd = new Date(date.setHours(23, 59, 59, 999));
        
        const { count: created } = await supabase
          .from('compliance_flags')
          .select('*', { count: 'exact', head: true })
          .gte('created_at', dayStart.toISOString())
          .lte('created_at', dayEnd.toISOString());
        
        const { count: resolved } = await supabase
          .from('compliance_flags')
          .select('*', { count: 'exact', head: true })
          .eq('resolved', true)
          .gte('resolved_at', dayStart.toISOString())
          .lte('resolved_at', dayEnd.toISOString());
        
        trend.push({
          day: dayStart.toLocaleDateString('en-US', { weekday: 'short' }),
          created: created || 0,
          resolved: resolved || 0,
        });
      }
      
      setFlagTrend(trend);

      setStats({
        activeFlags: flagsCount || 0,
        openDisputes: disputesCount || 0,
        fraudSignals: fraudCount || 0,
        resolvedToday: resolvedCount || 0,
        avgResolutionTime: 0, // Placeholder
        criticalIssues: criticalCount,
      });
    } catch (error) {
      console.error('Error fetching compliance data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getSeverityBadge = (severity: number) => {
    if (severity >= 8) return <Badge variant="destructive">Critical</Badge>;
    if (severity >= 5) return <Badge variant="default">High</Badge>;
    if (severity >= 3) return <Badge variant="secondary">Medium</Badge>;
    return <Badge variant="outline">Low</Badge>;
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
      <div>
        <h1 className="text-3xl font-bold mb-2">Compliance Dashboard</h1>
        <p className="text-muted-foreground">
          Monitor and manage compliance issues
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Flag className="h-4 w-4" />
              Active Flags
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-destructive">{stats.activeFlags}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.criticalIssues} critical
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Open Disputes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-warning">{stats.openDisputes}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Require resolution
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Fraud Signals
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-destructive">{stats.fraudSignals}</div>
            <p className="text-xs text-muted-foreground mt-1">
              High risk detected
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <TrendingDown className="h-4 w-4" />
              Resolved Today
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-success">{stats.resolvedToday}</div>
            <p className="text-xs text-success mt-1">
              Issues closed
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Analytics Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Flag Trends</CardTitle>
            <CardDescription>Created vs resolved over 7 days</CardDescription>
          </CardHeader>
          <CardContent>
            {flagTrend.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={flagTrend}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="day" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="created" stroke="hsl(var(--destructive))" name="Created" />
                  <Line type="monotone" dataKey="resolved" stroke="hsl(var(--success))" name="Resolved" />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[250px] flex items-center justify-center">
                <p className="text-muted-foreground">No trend data</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Flags by Type</CardTitle>
            <CardDescription>Top compliance issues</CardDescription>
          </CardHeader>
          <CardContent>
            {flagsByType.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={flagsByType} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="name" type="category" width={100} />
                  <Tooltip />
                  <Bar dataKey="value" fill="hsl(var(--warning))" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[250px] flex items-center justify-center">
                <p className="text-muted-foreground">No flag data</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Compliance management tools</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Link to="/compliance-flags">
            <Button>
              <Flag className="h-4 w-4 mr-2" />
              Review Flags
            </Button>
          </Link>
          <Link to="/disputes">
            <Button variant="outline">
              <Shield className="h-4 w-4 mr-2" />
              Manage Disputes
            </Button>
          </Link>
          <Link to="/fraud-detection">
            <Button variant="outline">
              <AlertTriangle className="h-4 w-4 mr-2" />
              Fraud Detection
            </Button>
          </Link>
          <Link to="/audit-logs">
            <Button variant="outline">
              <Activity className="h-4 w-4 mr-2" />
              Audit Logs
            </Button>
          </Link>
        </CardContent>
      </Card>

      {/* Tabs for Flags and Disputes */}
      <Tabs defaultValue="flags" className="space-y-4">
        <TabsList>
          <TabsTrigger value="flags">Active Flags</TabsTrigger>
          <TabsTrigger value="disputes">Open Disputes</TabsTrigger>
        </TabsList>

        <TabsContent value="flags">
          <Card>
            <CardHeader>
              <CardTitle>Active Compliance Flags</CardTitle>
              <CardDescription>Priority-sorted issues requiring attention</CardDescription>
            </CardHeader>
            <CardContent>
              {recentFlags.length === 0 ? (
                <div className="text-center py-12">
                  <Shield className="h-12 w-12 mx-auto text-success mb-4" />
                  <p className="text-muted-foreground">No active compliance flags</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {recentFlags.map((flag) => (
                    <div key={flag.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold">
                            {flag.type.replace(/_/g, ' ').toUpperCase()}
                          </h3>
                          {getSeverityBadge(flag.severity)}
                        </div>
                        <p className="text-sm font-medium text-primary">
                          {flag.listings?.title}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {flag.listings?.location_label}
                        </p>
                        <p className="text-sm mt-2">{flag.notes}</p>
                        <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {new Date(flag.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <Link to="/compliance-flags">
                        <Button size="sm" variant="outline">
                          <Eye className="h-4 w-4 mr-2" />
                          Review
                        </Button>
                      </Link>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="disputes">
          <Card>
            <CardHeader>
              <CardTitle>Open Disputes</CardTitle>
              <CardDescription>Disputes requiring resolution</CardDescription>
            </CardHeader>
            <CardContent>
              {recentDisputes.length === 0 ? (
                <div className="text-center py-12">
                  <Shield className="h-12 w-12 mx-auto text-success mb-4" />
                  <p className="text-muted-foreground">No open disputes</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {recentDisputes.map((dispute) => (
                    <div key={dispute.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold capitalize">
                            {dispute.dispute_type.replace(/_/g, ' ')}
                          </h3>
                          <Badge variant={dispute.status === 'open' ? 'destructive' : 'secondary'}>
                            {dispute.status}
                          </Badge>
                        </div>
                        <p className="text-sm font-medium text-primary">
                          {dispute.listings?.title}
                        </p>
                        <p className="text-sm mt-2">{dispute.description}</p>
                        <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          Opened {new Date(dispute.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <Link to="/disputes">
                        <Button size="sm" variant="outline">
                          <Eye className="h-4 w-4 mr-2" />
                          Resolve
                        </Button>
                      </Link>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
