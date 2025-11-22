import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { MapPin, Droplets, TrendingUp, AlertTriangle, Map as MapIcon, Layers, BarChart3, Target, Activity } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

export function SpatialDashboard() {
  const { profile } = useAuth();
  const [stats, setStats] = useState({
    totalAnalyzed: 0,
    highRisk: 0,
    mediumRisk: 0,
    lowRisk: 0,
    avgFloodScore: 0,
    pendingAnalysis: 0,
    valuationsComplete: 0,
    proximityComplete: 0,
    serviceRequests: 0,
    pendingValidation: 0,
  });
  const [recentAnalysis, setRecentAnalysis] = useState<any[]>([]);
  const [riskDistribution, setRiskDistribution] = useState<any[]>([]);
  const [landUseData, setLandUseData] = useState<any[]>([]);
  const [serviceRequests, setServiceRequests] = useState<any[]>([]);
  const [valuations, setValuations] = useState<any[]>([]);
  const [pendingPolygons, setPendingPolygons] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSpatialData();
  }, [profile]);

  const fetchSpatialData = async () => {
    try {
      // Fetch all spatial risk profiles
      const { data: allProfiles, count: totalCount } = await supabase
        .from('spatial_risk_profiles')
        .select('*', { count: 'exact' });

      // Calculate risk distribution
      const highRisk = allProfiles?.filter(p => p.flood_risk_score >= 70).length || 0;
      const mediumRisk = allProfiles?.filter(p => p.flood_risk_score >= 40 && p.flood_risk_score < 70).length || 0;
      const lowRisk = allProfiles?.filter(p => p.flood_risk_score < 40).length || 0;
      
      // Calculate average flood score
      const avgScore = allProfiles?.length 
        ? Math.round(allProfiles.reduce((sum, p) => sum + p.flood_risk_score, 0) / allProfiles.length)
        : 0;

      // Risk distribution for pie chart
      setRiskDistribution([
        { name: 'High Risk', value: highRisk, color: 'hsl(var(--destructive))' },
        { name: 'Medium Risk', value: mediumRisk, color: 'hsl(var(--warning))' },
        { name: 'Low Risk', value: lowRisk, color: 'hsl(var(--success))' },
      ]);

      // Fetch valuation estimates
      const { count: valuationsCount } = await supabase
        .from('valuation_estimates')
        .select('*', { count: 'exact', head: true });

      // Fetch proximity analyses
      const { count: proximityCount } = await supabase
        .from('proximity_analysis')
        .select('*', { count: 'exact', head: true });

      // Fetch service requests
      const { data: requests, count: requestsCount } = await supabase
        .from('service_requests')
        .select('*, listings(title, location_label)', { count: 'exact' })
        .in('service_category', ['spatial_analysis', 'valuation', 'surveying'])
        .order('created_at', { ascending: false })
        .limit(5);
      
      setServiceRequests(requests || []);

      // Fetch recent valuations
      const { data: recentValuations } = await supabase
        .from('valuation_estimates')
        .select('*, listings(title, location_label, property_type)')
        .order('estimated_at', { ascending: false })
        .limit(5);
      
      setValuations(recentValuations || []);

      // Fetch listings with unverified polygons
      const { data: unverifiedPolygons, count: unverifiedCount } = await supabase
        .from('listings')
        .select('*, listing_polygons(*)', { count: 'exact' })
        .eq('is_polygon_verified', false)
        .not('listing_polygons', 'is', null)
        .order('created_at', { ascending: false })
        .limit(5);
      
      setPendingPolygons(unverifiedPolygons || []);

      // Fetch land use data
      const { data: landUse } = await supabase
        .from('land_use_profiles')
        .select('dominant_land_use')
        .limit(100);

      // Aggregate land use
      const landUseMap = new Map();
      landUse?.forEach(lu => {
        const use = lu.dominant_land_use;
        landUseMap.set(use, (landUseMap.get(use) || 0) + 1);
      });
      
      const landUseArray = Array.from(landUseMap.entries())
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 5);
      
      setLandUseData(landUseArray);

      // Fetch recent spatial analysis
      const { data: analysis } = await supabase
        .from('spatial_risk_profiles')
        .select('*, listings(title, location_label, property_type)')
        .order('calculated_at', { ascending: false })
        .limit(8);

      setRecentAnalysis(analysis || []);

      // Count listings without analysis
      const { count: totalListings } = await supabase
        .from('listings')
        .select('*', { count: 'exact', head: true });
      
      const pending = Math.max(0, (totalListings || 0) - (totalCount || 0));

      setStats({
        totalAnalyzed: totalCount || 0,
        highRisk,
        mediumRisk,
        lowRisk,
        avgFloodScore: avgScore,
        pendingAnalysis: pending,
        valuationsComplete: valuationsCount || 0,
        proximityComplete: proximityCount || 0,
        serviceRequests: requestsCount || 0,
        pendingValidation: unverifiedCount || 0,
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
      <div className="space-y-8 p-6">
        <div className="space-y-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-96" />
        </div>
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
        <h1 className="text-3xl font-bold mb-2">Spatial Analyst Dashboard</h1>
        <p className="text-muted-foreground">
          Geographic and environmental analysis
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              Properties Analyzed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.totalAnalyzed}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.pendingAnalysis} pending analysis
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Droplets className="h-4 w-4" />
              Avg Flood Risk
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-primary">{stats.avgFloodScore}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.highRisk} high risk properties
            </p>
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
            <p className="text-xs text-success mt-1">
              Complete estimates
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Target className="h-4 w-4" />
              Proximity Analysis
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.proximityComplete}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Location insights
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Service Requests
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-primary">{stats.serviceRequests}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.pendingValidation} polygons to validate
            </p>
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
          <Link to="/admin/service-requests">
            <Button variant="outline">
              <Activity className="h-4 w-4 mr-2" />
              Service Requests
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

      {/* Analytics & Work Management */}
      <Tabs defaultValue="analytics" className="space-y-4">
        <TabsList>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="requests">Service Requests ({serviceRequests.length})</TabsTrigger>
          <TabsTrigger value="valuations">Valuations ({valuations.length})</TabsTrigger>
          <TabsTrigger value="polygons">Polygon Validation ({pendingPolygons.length})</TabsTrigger>
          <TabsTrigger value="recent">Recent Analysis</TabsTrigger>
        </TabsList>

        <TabsContent value="analytics" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Risk Distribution */}
            <Card>
              <CardHeader>
                <CardTitle>Risk Distribution</CardTitle>
                <CardDescription>Properties by flood risk level</CardDescription>
              </CardHeader>
              <CardContent>
                {riskDistribution.some(d => d.value > 0) ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={riskDistribution}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, value }) => `${name}: ${value}`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {riskDistribution.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[300px] flex items-center justify-center">
                    <p className="text-muted-foreground">No risk data available</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Land Use Distribution */}
            <Card>
              <CardHeader>
                <CardTitle>Top Land Uses</CardTitle>
                <CardDescription>Most common property types</CardDescription>
              </CardHeader>
              <CardContent>
                {landUseData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={landUseData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="value" fill="hsl(var(--primary))" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[300px] flex items-center justify-center">
                    <p className="text-muted-foreground">No land use data available</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="requests">
          <Card>
            <CardHeader>
              <CardTitle>Service Requests</CardTitle>
              <CardDescription>Spatial analysis and surveying requests</CardDescription>
            </CardHeader>
            <CardContent>
              {serviceRequests.length === 0 ? (
                <div className="text-center py-12">
                  <Activity className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No service requests</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {serviceRequests.map((request) => (
                    <div key={request.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold capitalize">
                            {request.service_type.replace(/_/g, ' ')}
                          </h3>
                          <Badge variant={
                            request.status === 'completed' ? 'default' :
                            request.status === 'in_progress' ? 'secondary' :
                            'outline'
                          }>
                            {request.status}
                          </Badge>
                        </div>
                        <p className="text-sm font-medium text-primary">
                          {request.listings?.title}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {request.listings?.location_label}
                        </p>
                        {request.request_notes && (
                          <p className="text-sm mt-2">{request.request_notes}</p>
                        )}
                        <p className="text-xs text-muted-foreground mt-1">
                          Requested {new Date(request.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <Link to={`/service-requests/${request.id}`}>
                        <Button size="sm">
                          View Details
                        </Button>
                      </Link>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="valuations">
          <Card>
            <CardHeader>
              <CardTitle>Valuation Reports</CardTitle>
              <CardDescription>Property valuation estimates</CardDescription>
            </CardHeader>
            <CardContent>
              {valuations.length === 0 ? (
                <div className="text-center py-12">
                  <TrendingUp className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No valuation reports</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {valuations.map((valuation) => (
                    <div key={valuation.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                      <div className="flex-1">
                        <h3 className="font-semibold">{valuation.listings?.title}</h3>
                        <p className="text-sm text-muted-foreground">
                          {valuation.listings?.location_label}
                        </p>
                        <div className="flex items-center gap-4 mt-2">
                          <div>
                            <p className="text-xs text-muted-foreground">Estimated Value</p>
                            <p className="text-lg font-bold text-primary">
                              {valuation.estimated_value?.toLocaleString()} {valuation.currency}
                            </p>
                          </div>
                          {valuation.confidence_score && (
                            <div>
                              <p className="text-xs text-muted-foreground">Confidence</p>
                              <p className="text-sm font-medium">
                                {valuation.confidence_score}%
                              </p>
                            </div>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-2">
                          Estimated {new Date(valuation.estimated_at).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex flex-col gap-2">
                        <Badge variant="outline" className="text-xs">
                          {valuation.listings?.property_type}
                        </Badge>
                        <Link to={`/listings/${valuation.listing_id}`}>
                          <Button size="sm" variant="outline">
                            Edit Report
                          </Button>
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="polygons">
          <Card>
            <CardHeader>
              <CardTitle>Polygon Validation</CardTitle>
              <CardDescription>Properties pending boundary verification</CardDescription>
            </CardHeader>
            <CardContent>
              {pendingPolygons.length === 0 ? (
                <div className="text-center py-12">
                  <Layers className="h-12 w-12 mx-auto text-success mb-4" />
                  <p className="text-muted-foreground">All polygons validated</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {pendingPolygons.map((listing: any) => (
                    <div key={listing.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                      <div className="flex-1">
                        <h3 className="font-semibold">{listing.title}</h3>
                        <p className="text-sm text-muted-foreground">
                          {listing.location_label}
                        </p>
                        {listing.listing_polygons?.[0] && (
                          <div className="flex items-center gap-4 mt-2 text-sm">
                            <span>
                              Area: {listing.listing_polygons[0].area_m2?.toFixed(0)} m²
                            </span>
                            <Badge variant="secondary">Unverified</Badge>
                          </div>
                        )}
                        <p className="text-xs text-muted-foreground mt-1">
                          Created {new Date(listing.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Link to={`/map?listing=${listing.id}`}>
                          <Button size="sm" variant="outline">
                            <MapIcon className="h-4 w-4 mr-2" />
                            View on Map
                          </Button>
                        </Link>
                        <Link to={`/admin/verification?listing=${listing.id}`}>
                          <Button size="sm">
                            Validate
                          </Button>
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="recent">
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
                    <div key={item.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                      <div className="flex-1">
                        <h3 className="font-semibold">{item.listings?.title}</h3>
                        <p className="text-sm text-muted-foreground">{item.listings?.location_label}</p>
                        <div className="flex flex-wrap gap-3 mt-2 text-sm">
                          <span className="flex items-center gap-1">
                            <Droplets className="h-3 w-3" />
                            Flood: {item.flood_risk_score}/100
                          </span>
                          {item.elevation_m && (
                            <span className="flex items-center gap-1">
                              <Activity className="h-3 w-3" />
                              Elevation: {item.elevation_m}m
                            </span>
                          )}
                          {item.near_river && (
                            <Badge variant="outline" className="text-xs">Near River</Badge>
                          )}
                          {item.listings?.property_type && (
                            <Badge variant="secondary" className="text-xs">
                              {item.listings.property_type}
                            </Badge>
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
        </TabsContent>
      </Tabs>
    </div>
  );
}
