import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MapPin, Droplets, TrendingUp, AlertTriangle, Map as MapIcon, Layers } from 'lucide-react';

export function SpatialDashboard() {
  const { profile } = useAuth();
  const [stats, setStats] = useState({
    totalAnalyzed: 0,
    highRisk: 0,
    pendingAnalysis: 0,
    valuationsComplete: 0,
  });
  const [recentAnalysis, setRecentAnalysis] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSpatialData();
  }, [profile]);

  const fetchSpatialData = async () => {
    try {
      // Fetch total spatial risk profiles
      const { count: totalCount } = await supabase
        .from('spatial_risk_profiles')
        .select('*', { count: 'exact', head: true });

      // Fetch high-risk properties
      const { count: highRiskCount } = await supabase
        .from('spatial_risk_profiles')
        .select('*', { count: 'exact', head: true })
        .gte('flood_risk_score', 70);

      // Fetch valuation estimates
      const { count: valuationsCount } = await supabase
        .from('valuation_estimates')
        .select('*', { count: 'exact', head: true });

      // Fetch recent spatial analysis
      const { data: analysis } = await supabase
        .from('spatial_risk_profiles')
        .select('*, listings(title, location_label)')
        .order('calculated_at', { ascending: false })
        .limit(10);

      setRecentAnalysis(analysis || []);

      setStats({
        totalAnalyzed: totalCount || 0,
        highRisk: highRiskCount || 0,
        pendingAnalysis: 0, // TODO: Calculate pending
        valuationsComplete: valuationsCount || 0,
      });
    } catch (error) {
      console.error('Error fetching spatial data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRiskBadge = (level: string, score: number) => {
    if (score >= 70) return <Badge variant="destructive">High Risk</Badge>;
    if (score >= 40) return <Badge variant="default">Medium Risk</Badge>;
    return <Badge variant="secondary">Low Risk</Badge>;
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
        <h1 className="text-3xl font-bold mb-2">Spatial Analyst Dashboard</h1>
        <p className="text-muted-foreground">
          Geographic and environmental analysis
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              Total Analyzed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.totalAnalyzed}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Droplets className="h-4 w-4" />
              High Risk
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-destructive">{stats.highRisk}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Pending
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-warning">{stats.pendingAnalysis}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Valuations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.valuationsComplete}</div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Analysis Tools</CardTitle>
          <CardDescription>Spatial analysis utilities</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Link to="/map">
            <Button>
              <MapIcon className="h-4 w-4 mr-2" />
              Interactive Map
            </Button>
          </Link>
          <Link to="/admin/verification">
            <Button variant="outline">
              <Layers className="h-4 w-4 mr-2" />
              Polygon Validation
            </Button>
          </Link>
          <Link to="/listings">
            <Button variant="outline">
              <Droplets className="h-4 w-4 mr-2" />
              Risk Assessment
            </Button>
          </Link>
          <Link to="/admin/analytics">
            <Button variant="outline">
              <TrendingUp className="h-4 w-4 mr-2" />
              Valuation Reports
            </Button>
          </Link>
        </CardContent>
      </Card>

      {/* Recent Analysis */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Spatial Analysis</CardTitle>
          <CardDescription>Latest property assessments</CardDescription>
        </CardHeader>
        <CardContent>
          {recentAnalysis.length === 0 ? (
            <div className="text-center py-12">
              <MapPin className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No analysis data available</p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentAnalysis.map((item) => (
                <div key={item.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex-1">
                    <h3 className="font-semibold">{item.listings?.title}</h3>
                    <p className="text-sm text-muted-foreground">{item.listings?.location_label}</p>
                    <div className="flex gap-4 mt-2 text-sm">
                      <span className="flex items-center gap-1">
                        <Droplets className="h-3 w-3" />
                        Flood Risk: {item.flood_risk_score}
                      </span>
                      {item.elevation_m && (
                        <span>Elevation: {item.elevation_m}m</span>
                      )}
                      {item.near_river && (
                        <Badge variant="outline">Near River</Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    {getRiskBadge(item.flood_risk_level, item.flood_risk_score)}
                    <span className="text-xs text-muted-foreground">
                      {new Date(item.calculated_at).toLocaleDateString()}
                    </span>
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
