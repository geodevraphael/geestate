import React, { useEffect, useState } from 'react';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { Navbar } from '@/components/Navbar';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Activity, CheckCircle2, XCircle, RefreshCw, AlertTriangle } from 'lucide-react';

interface HealthCheck {
  status: string;
  timestamp: string;
  version?: string;
  database?: {
    status: string;
    message: string;
  };
}

interface SystemStats {
  newListings24h: number;
  failedWebhooks: number;
  openDisputes: number;
  unresolvedFlags: number;
}

export default function SystemStatus() {
  return (
    <ProtectedRoute requireRole={['admin']}>
      <SystemStatusContent />
    </ProtectedRoute>
  );
}

function SystemStatusContent() {
  const { toast } = useToast();
  const [health, setHealth] = useState<HealthCheck | null>(null);
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchSystemStatus();
  }, []);

  const fetchSystemStatus = async () => {
    try {
      setLoading(true);

      // Fetch health check
      const { data: healthData, error: healthError } = await supabase.functions.invoke('health-check');

      if (healthError) throw healthError;
      setHealth(healthData);

      // Fetch system stats
      const now = new Date();
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      const [listings, webhooks, disputes, flags] = await Promise.all([
        supabase
          .from('listings')
          .select('id', { count: 'exact', head: true })
          .gte('created_at', yesterday.toISOString()),
        
        supabase
          .from('webhook_deliveries')
          .select('id', { count: 'exact', head: true })
          .not('error_message', 'is', null)
          .gte('created_at', yesterday.toISOString()),
        
        supabase
          .from('disputes')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'open'),
        
        supabase
          .from('compliance_flags')
          .select('id', { count: 'exact', head: true })
          .eq('resolved', false),
      ]);

      setStats({
        newListings24h: listings.count || 0,
        failedWebhooks: webhooks.count || 0,
        openDisputes: disputes.count || 0,
        unresolvedFlags: flags.count || 0,
      });
    } catch (error) {
      console.error('Error fetching system status:', error);
      toast({
        title: 'Error',
        description: 'Failed to load system status',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchSystemStatus();
  };

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="container mx-auto py-8 flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </>
    );
  }

  const isHealthy = health?.status === 'ok' && health?.database?.status === 'ok';

  return (
    <>
      <Navbar />
      <div className="container mx-auto py-8 px-4">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
              <Activity className="h-8 w-8" />
              System Status
            </h1>
            <p className="text-muted-foreground">Monitor system health and performance</p>
          </div>

          <Button onClick={handleRefresh} disabled={refreshing}>
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {/* Health Status */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {isHealthy ? (
                <CheckCircle2 className="h-6 w-6 text-green-500" />
              ) : (
                <XCircle className="h-6 w-6 text-red-500" />
              )}
              System Health
            </CardTitle>
            <CardDescription>
              Last checked: {health?.timestamp ? new Date(health.timestamp).toLocaleString() : 'Unknown'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <div className="text-sm text-muted-foreground mb-1">Overall Status</div>
                <Badge variant={health?.status === 'ok' ? 'default' : 'destructive'}>
                  {health?.status?.toUpperCase() || 'UNKNOWN'}
                </Badge>
              </div>
              <div>
                <div className="text-sm text-muted-foreground mb-1">Database</div>
                <Badge variant={health?.database?.status === 'ok' ? 'default' : 'destructive'}>
                  {health?.database?.status?.toUpperCase() || 'UNKNOWN'}
                </Badge>
              </div>
              {health?.version && (
                <div>
                  <div className="text-sm text-muted-foreground mb-1">Version</div>
                  <div className="font-mono text-sm">{health.version}</div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* System Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">New Listings (24h)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats?.newListings24h || 0}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                {stats?.failedWebhooks ? (
                  <AlertTriangle className="h-4 w-4 text-yellow-500" />
                ) : null}
                Failed Webhooks (24h)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats?.failedWebhooks || 0}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                {stats?.openDisputes ? (
                  <AlertTriangle className="h-4 w-4 text-red-500" />
                ) : null}
                Open Disputes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats?.openDisputes || 0}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                {stats?.unresolvedFlags ? (
                  <AlertTriangle className="h-4 w-4 text-red-500" />
                ) : null}
                Unresolved Flags
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats?.unresolvedFlags || 0}</div>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
