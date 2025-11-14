import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Shield, Flag, Eye, TrendingDown, Activity } from 'lucide-react';

export function ComplianceDashboard() {
  const { profile } = useAuth();
  const [stats, setStats] = useState({
    activeFlags: 0,
    openDisputes: 0,
    fraudSignals: 0,
    resolvedToday: 0,
  });
  const [recentFlags, setRecentFlags] = useState<any[]>([]);
  const [recentDisputes, setRecentDisputes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchComplianceData();
  }, [profile]);

  const fetchComplianceData = async () => {
    try {
      // Fetch active compliance flags
      const { data: flags, count: flagsCount } = await supabase
        .from('compliance_flags')
        .select('*, listings(title)', { count: 'exact' })
        .eq('resolved', false)
        .order('created_at', { ascending: false })
        .limit(5);

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

      setStats({
        activeFlags: flagsCount || 0,
        openDisputes: disputesCount || 0,
        fraudSignals: fraudCount || 0,
        resolvedToday: 0, // TODO: Calculate today's resolutions
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
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
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
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Flag className="h-4 w-4" />
              Active Flags
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-destructive">{stats.activeFlags}</div>
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

      {/* Active Compliance Flags */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Compliance Flags</CardTitle>
          <CardDescription>Issues requiring attention</CardDescription>
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
                <div key={flag.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold">{flag.type.replace(/_/g, ' ').toUpperCase()}</h3>
                      {getSeverityBadge(flag.severity)}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Listing: {flag.listings?.title}
                    </p>
                    <p className="text-sm mt-1">{flag.notes}</p>
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

      {/* Open Disputes */}
      {recentDisputes.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Open Disputes</CardTitle>
            <CardDescription>Disputes requiring resolution</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentDisputes.map((dispute) => (
                <div key={dispute.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold">{dispute.dispute_type.replace(/_/g, ' ')}</h3>
                      <Badge variant={dispute.status === 'open' ? 'destructive' : 'secondary'}>
                        {dispute.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Listing: {dispute.listings?.title}
                    </p>
                    <p className="text-sm mt-1">{dispute.description}</p>
                  </div>
                  <Link to="/disputes">
                    <Button size="sm" variant="outline">
                      <Eye className="h-4 w-4 mr-2" />
                      Review
                    </Button>
                  </Link>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
