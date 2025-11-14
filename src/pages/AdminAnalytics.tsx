import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Navbar } from '@/components/Navbar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useNavigate } from 'react-router-dom';
import { BarChart, PieChart, TrendingUp, AlertTriangle, Shield, DollarSign } from 'lucide-react';
import { BarChart as RechartsBar, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart as RechartsPie, Pie, Cell } from 'recharts';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

export default function AdminAnalytics() {
  const { user, profile, hasRole } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState<any>({
    listingsByRegion: [],
    verificationStats: [],
    closedDeals: [],
    fraudTrend: [],
    topRiskSellers: [],
    topTrustedSellers: [],
    subscriptionRevenue: 0,
    avgPriceByRegion: [],
    floodRiskDistribution: [],
  });

  useEffect(() => {
    if (user) {
      if (!hasRole('admin') && !hasRole('compliance_officer')) {
        navigate('/dashboard');
        return;
      }
      fetchAnalytics();
    }
  }, [user, profile]);

  const fetchAnalytics = async () => {
    try {
      // 1. Listings per Region
      const { data: regionData } = await supabase
        .from('listings')
        .select('region_id, regions(name)')
        .not('region_id', 'is', null);

      const regionCounts = regionData?.reduce((acc: any, item) => {
        const regionName = (item.regions as any)?.name || 'Unknown';
        acc[regionName] = (acc[regionName] || 0) + 1;
        return acc;
      }, {});

      const listingsByRegion = Object.entries(regionCounts || {}).map(([name, count]) => ({
        name,
        listings: count,
      }));

      // 2. Verification Stats
      const { data: verificationData } = await supabase
        .from('listings')
        .select('verification_status');

      const verificationStats = verificationData?.reduce((acc: any, item) => {
        const status = item.verification_status || 'unverified';
        const existing = acc.find((s: any) => s.name === status);
        if (existing) {
          existing.value++;
        } else {
          acc.push({ name: status, value: 1 });
        }
        return acc;
      }, []);

      // 3. Closed Deals (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data: dealsData } = await supabase
        .from('deal_closures')
        .select('*, listings(region_id, regions(name))')
        .eq('closure_status', 'closed')
        .gte('closed_at', thirtyDaysAgo.toISOString());

      const closedDeals = dealsData?.reduce((acc: any, item) => {
        const regionName = (item.listings as any)?.regions?.name || 'Unknown';
        const existing = acc.find((r: any) => r.name === regionName);
        if (existing) {
          existing.deals++;
        } else {
          acc.push({ name: regionName, deals: 1 });
        }
        return acc;
      }, []);

      // 4. Fraud Signals
      const { data: fraudData } = await supabase
        .from('fraud_signals')
        .select('created_at, signal_score')
        .order('created_at', { ascending: true })
        .limit(30);

      const fraudTrend = fraudData?.map(f => ({
        date: new Date(f.created_at).toLocaleDateString(),
        score: f.signal_score,
      }));

      // 5. Top Risk Sellers
      const { data: riskSellers } = await supabase
        .from('reputation_scores')
        .select('user_id, total_score, fraud_flags_count, profiles(full_name)')
        .gt('fraud_flags_count', 0)
        .order('fraud_flags_count', { ascending: false })
        .limit(20);

      const topRiskSellers = riskSellers?.map(r => ({
        name: (r.profiles as any)?.full_name || 'Unknown',
        flags: r.fraud_flags_count,
        score: r.total_score,
      }));

      // 6. Top Trusted Sellers
      const { data: trustedSellers } = await supabase
        .from('reputation_scores')
        .select('user_id, total_score, deals_closed_count, profiles(full_name)')
        .gte('total_score', 80)
        .order('total_score', { ascending: false })
        .limit(20);

      const topTrustedSellers = trustedSellers?.map(t => ({
        name: (t.profiles as any)?.full_name || 'Unknown',
        deals: t.deals_closed_count,
        score: t.total_score,
      }));

      // 7. Subscription Revenue
      const { data: subscriptions } = await supabase
        .from('subscriptions')
        .select('amount_paid')
        .eq('is_active', true);

      const subscriptionRevenue = subscriptions?.reduce((sum, s) => sum + (s.amount_paid || 0), 0) || 0;

      // 8. Average Price by Region
      const { data: priceData } = await supabase
        .from('listings')
        .select('price, region_id, regions(name)')
        .not('price', 'is', null)
        .not('region_id', 'is', null);

      const avgPriceByRegion = Object.values(
        priceData?.reduce((acc: any, item) => {
          const regionName = (item.regions as any)?.name || 'Unknown';
          if (!acc[regionName]) {
            acc[regionName] = { name: regionName, total: 0, count: 0 };
          }
          acc[regionName].total += item.price || 0;
          acc[regionName].count++;
          return acc;
        }, {}) || {}
      ).map((r: any) => ({
        name: r.name,
        avgPrice: Math.round(r.total / r.count),
      }));

      // 9. Flood Risk Distribution
      const { data: floodData } = await supabase
        .from('spatial_risk_profiles')
        .select('flood_risk_level');

      const floodRiskDistribution = floodData?.reduce((acc: any, item) => {
        const level = item.flood_risk_level || 'unknown';
        const existing = acc.find((l: any) => l.name === level);
        if (existing) {
          existing.value++;
        } else {
          acc.push({ name: level, value: 1 });
        }
        return acc;
      }, []);

      setAnalytics({
        listingsByRegion,
        verificationStats,
        closedDeals,
        fraudTrend,
        topRiskSellers,
        topTrustedSellers,
        subscriptionRevenue,
        avgPriceByRegion,
        floodRiskDistribution,
      });
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto p-6">Loading analytics...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <div className="container mx-auto p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <BarChart className="h-8 w-8" />
            Analytics Dashboard
          </h1>
          <p className="text-muted-foreground">Comprehensive platform analytics and insights</p>
        </div>

        <Tabs defaultValue="listings" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="listings">Listings</TabsTrigger>
            <TabsTrigger value="deals">Deals & Revenue</TabsTrigger>
            <TabsTrigger value="fraud">Fraud & Risk</TabsTrigger>
            <TabsTrigger value="sellers">Sellers</TabsTrigger>
          </TabsList>

          <TabsContent value="listings" className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              {/* Listings by Region */}
              <Card>
                <CardHeader>
                  <CardTitle>Listings by Region</CardTitle>
                  <CardDescription>Distribution across Tanzania</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <RechartsBar data={analytics.listingsByRegion}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="listings" fill="#3b82f6" />
                    </RechartsBar>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Verification Status */}
              <Card>
                <CardHeader>
                  <CardTitle>Verification Status</CardTitle>
                  <CardDescription>Verified vs Unverified</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <RechartsPie>
                      <Pie
                        data={analytics.verificationStats}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={(entry) => `${entry.name}: ${entry.value}`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {analytics.verificationStats.map((_: any, index: number) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </RechartsPie>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Flood Risk Distribution */}
              <Card>
                <CardHeader>
                  <CardTitle>Flood Risk Distribution</CardTitle>
                  <CardDescription>Environmental risk levels</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <RechartsPie>
                      <Pie
                        data={analytics.floodRiskDistribution}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={(entry) => `${entry.name}: ${entry.value}`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {analytics.floodRiskDistribution.map((_: any, index: number) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </RechartsPie>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Average Price by Region */}
              <Card>
                <CardHeader>
                  <CardTitle>Average Price by Region</CardTitle>
                  <CardDescription>Market pricing insights</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <RechartsBar data={analytics.avgPriceByRegion}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="avgPrice" fill="#10b981" />
                    </RechartsBar>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="deals" className="space-y-6">
            <div className="grid md:grid-cols-3 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <DollarSign className="h-5 w-5" />
                    Subscription Revenue
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold">
                    {analytics.subscriptionRevenue.toLocaleString()} TZS
                  </p>
                  <p className="text-sm text-muted-foreground mt-2">Active subscriptions</p>
                </CardContent>
              </Card>

              <Card className="md:col-span-2">
                <CardHeader>
                  <CardTitle>Closed Deals (Last 30 Days)</CardTitle>
                  <CardDescription>By region</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <RechartsBar data={analytics.closedDeals}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="deals" fill="#8b5cf6" />
                    </RechartsBar>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="fraud" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5" />
                  Top 20 High-Risk Sellers
                </CardTitle>
                <CardDescription>Users with fraud flags</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {analytics.topRiskSellers.slice(0, 10).map((seller: any, idx: number) => (
                    <div key={idx} className="flex items-center justify-between p-2 border rounded">
                      <span>{seller.name}</span>
                      <div className="flex items-center gap-4">
                        <span className="text-sm text-muted-foreground">
                          {seller.flags} flags
                        </span>
                        <span className="text-sm font-medium">
                          Score: {seller.score}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="sellers" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Top 20 Trusted Sellers
                </CardTitle>
                <CardDescription>High reputation sellers</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {analytics.topTrustedSellers.slice(0, 10).map((seller: any, idx: number) => (
                    <div key={idx} className="flex items-center justify-between p-2 border rounded">
                      <span>{seller.name}</span>
                      <div className="flex items-center gap-4">
                        <span className="text-sm text-muted-foreground">
                          {seller.deals} deals
                        </span>
                        <span className="text-sm font-medium text-success">
                          Score: {seller.score}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
