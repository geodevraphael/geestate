import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DollarSign, TrendingUp, TrendingDown, Percent, Building2, Calendar, ListChecks, Clock, Briefcase, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { Progress } from '@/components/ui/progress';

export function RevenueOverview() {
  const { user, hasRole } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalRevenue: 0,
    thisMonth: 0,
    thisYear: 0,
    geoinsightFees: 0,
    taxAmount: 0,
    netRevenue: 0,
    pendingPayments: 0,
    completedDeals: 0,
    activeListings: 0,
    expectedRevenueFromListings: 0,
    totalListingValue: 0,
    serviceRevenue: 0,
    serviceCommissions: 0,
    completedServices: 0,
  });
  const [taxRate, setTaxRate] = useState(18);
  const isServiceProvider = hasRole('service_provider');

  useEffect(() => {
    if (user) {
      fetchRevenueStats();
      fetchTaxSettings();
    }
  }, [user]);

  const fetchTaxSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('social_links')
        .eq('id', user?.id)
        .single();

      if (error) throw error;

      const settings = data?.social_links as any;
      if (settings?.tra_rate) {
        setTaxRate(settings.tra_rate);
      }
    } catch (error) {
      console.error('Error fetching tax settings:', error);
    }
  };

  const fetchRevenueStats = async () => {
    try {
      setLoading(true);

      // Fetch completed deals
      const { data: deals, error: dealsError } = await supabase
        .from('deal_closures')
        .select('*, listing:listings(title)')
        .eq('seller_id', user?.id)
        .eq('closure_status', 'closed');

      if (dealsError) throw dealsError;

      // Fetch active listings with valuations
      const { data: listings, error: listingsError } = await supabase
        .from('listings')
        .select(`
          *,
          polygon:listing_polygons(area_m2),
          valuation:valuation_estimates(estimated_value, estimation_currency)
        `)
        .eq('owner_id', user?.id)
        .eq('status', 'published');

      if (listingsError) throw listingsError;

      // Fetch GeoInsight fees
      const { data: fees, error: feesError } = await supabase
        .from('geoinsight_income_records')
        .select('*, fee_definition:geoinsight_fee_definitions(code)')
        .eq('user_id', user?.id);

      if (feesError) throw feesError;

      // Fetch service bookings for service providers
      let serviceRevenue = 0;
      let serviceCommissions = 0;
      let completedServices = 0;

      if (isServiceProvider) {
        const { data: bookings, error: bookingsError } = await supabase
          .from('service_bookings')
          .select('*, service:provider_services(price)')
          .eq('provider_id', user?.id)
          .eq('status', 'completed')
          .not('payment_confirmed_at', 'is', null);

        if (!bookingsError && bookings) {
          completedServices = bookings.length;
          serviceRevenue = bookings.reduce((sum, b) => sum + Number(b.total_price || b.service?.price || 0), 0);
          serviceCommissions = serviceRevenue * 0.02; // 2% commission
        }
      }

      const now = new Date();
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();

      // Calculate revenue from completed deals
      const dealRevenue = deals?.reduce((sum, d) => sum + Number(d.final_price), 0) || 0;
      const totalRevenue = dealRevenue + serviceRevenue;
      
      const thisMonth = deals?.filter(d => {
        const date = new Date(d.closed_at);
        return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
      }).reduce((sum, d) => sum + Number(d.final_price), 0) || 0;

      const thisYear = deals?.filter(d => {
        const date = new Date(d.closed_at);
        return date.getFullYear() === currentYear;
      }).reduce((sum, d) => sum + Number(d.final_price), 0) || 0;

      // Calculate expected revenue from active listings
      const totalListingValue = listings?.reduce((sum, l) => {
        const price = Number(l.price) || 0;
        const valuationPrice = l.valuation?.[0]?.estimated_value || 0;
        return sum + (price > 0 ? price : valuationPrice);
      }, 0) || 0;
      
      const listingsWithPrice = listings?.filter(l => l.price && Number(l.price) > 0).length || 0;
      const listingsUsingValuation = (listings?.length || 0) - listingsWithPrice;
      
      const expectedRevenueFromListings = totalListingValue * 0.97;

      const geoinsightFees = fees?.reduce((sum, f) => sum + Number(f.amount_due), 0) || 0;
      const pendingPayments = fees?.filter(f => f.status === 'pending' || f.status === 'overdue')
        .reduce((sum, f) => sum + Number(f.amount_due), 0) || 0;

      const taxAmount = totalRevenue * (taxRate / 100);
      const netRevenue = totalRevenue - geoinsightFees - taxAmount;

      setStats({
        totalRevenue,
        thisMonth,
        thisYear,
        geoinsightFees,
        taxAmount,
        netRevenue,
        pendingPayments,
        completedDeals: deals?.length || 0,
        activeListings: listings?.length || 0,
        expectedRevenueFromListings,
        totalListingValue,
        listingsWithPrice,
        listingsUsingValuation,
        serviceRevenue,
        serviceCommissions,
        completedServices,
      } as any);
    } catch (error: any) {
      console.error('Error fetching revenue stats:', error);
      toast.error('Failed to load revenue statistics');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-TZ', {
      style: 'currency',
      currency: 'TZS',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center space-y-4">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto"></div>
          <p className="text-muted-foreground">Loading revenue data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary to-primary/80 p-6 text-primary-foreground">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />
        <div className="relative flex items-center gap-3">
          <Sparkles className="h-6 w-6" />
          <div>
            <h2 className="text-2xl font-bold">Revenue Overview</h2>
            <p className="text-primary-foreground/80">
              Track your earnings from property sales{isServiceProvider ? ' and services' : ''}
            </p>
          </div>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-2 border-primary/20 hover:border-primary/40 transition-all hover:shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <div className="p-2 rounded-xl bg-primary/10">
              <DollarSign className="h-5 w-5 text-primary" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{formatCurrency(stats.totalRevenue)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              From {stats.completedDeals} deals{isServiceProvider ? ` + ${(stats as any).completedServices || 0} services` : ''}
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-all">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">This Month</CardTitle>
            <div className="p-2 rounded-xl bg-blue-500/10">
              <Calendar className="h-5 w-5 text-blue-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{formatCurrency(stats.thisMonth)}</div>
            <p className="text-xs text-muted-foreground mt-1">{new Date().toLocaleString('default', { month: 'long', year: 'numeric' })}</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-all">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">This Year</CardTitle>
            <div className="p-2 rounded-xl bg-amber-500/10">
              <TrendingUp className="h-5 w-5 text-amber-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{formatCurrency(stats.thisYear)}</div>
            <p className="text-xs text-muted-foreground mt-1">{new Date().getFullYear()}</p>
          </CardContent>
        </Card>

        <Card className="border-emerald-500/30 hover:shadow-lg transition-all">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Net Revenue</CardTitle>
            <div className="p-2 rounded-xl bg-emerald-500/10">
              <TrendingUp className="h-5 w-5 text-emerald-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-emerald-600">{formatCurrency(stats.netRevenue)}</div>
            <p className="text-xs text-muted-foreground mt-1">After deductions</p>
          </CardContent>
        </Card>
      </div>

      {/* Service Provider Revenue Section */}
      {isServiceProvider && (stats as any).serviceRevenue > 0 && (
        <Card className="border-2 border-purple-500/20 bg-gradient-to-br from-purple-500/5 to-transparent">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-purple-500/10">
                  <Briefcase className="h-6 w-6 text-purple-600" />
                </div>
                <div>
                  <CardTitle className="text-xl">Service Revenue</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    Revenue from {(stats as any).completedServices} completed services
                  </p>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/20">
                <p className="text-sm font-medium text-muted-foreground mb-1">Total Service Revenue</p>
                <p className="text-3xl font-bold text-purple-600">{formatCurrency((stats as any).serviceRevenue)}</p>
              </div>
              <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20">
                <p className="text-sm font-medium text-muted-foreground mb-1">Platform Commission (2%)</p>
                <p className="text-3xl font-bold text-amber-600">{formatCurrency((stats as any).serviceCommissions)}</p>
              </div>
              <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                <p className="text-sm font-medium text-muted-foreground mb-1">Net Service Revenue</p>
                <p className="text-3xl font-bold text-emerald-600">
                  {formatCurrency((stats as any).serviceRevenue - (stats as any).serviceCommissions)}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-4 bg-muted/50 rounded-xl">
              <Briefcase className="h-5 w-5 text-purple-600 mt-0.5" />
              <div>
                <p className="text-sm font-medium">Service Commission Rate</p>
                <p className="text-xs text-muted-foreground mt-1">
                  GeoInsight charges a 2% commission on all completed service transactions. 
                  This fee is charged when clients confirm payment for your services.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Active Listings Overview */}
      <Card className="border-2 border-blue-500/20">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl">Active Listings Revenue Potential</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">Expected revenue from your {stats.activeListings} active listings</p>
            </div>
            <ListChecks className="h-8 w-8 text-blue-600" />
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">Total Listing Value</p>
              <p className="text-3xl font-bold">{formatCurrency(stats.totalListingValue)}</p>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">Active Listings</p>
              <p className="text-3xl font-bold">{stats.activeListings}</p>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">Expected Revenue (Est.)</p>
              <p className="text-3xl font-bold text-blue-600">{formatCurrency(stats.expectedRevenueFromListings)}</p>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Revenue Potential</span>
              <span className="font-medium">{stats.activeListings > 0 ? '97%' : '0%'} of listing value (after 3% commission)</span>
            </div>
            <Progress value={stats.activeListings > 0 ? 97 : 0} className="h-2" />
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div className="flex items-start gap-2 p-4 bg-blue-500/10 rounded-lg">
              <Clock className="h-5 w-5 text-blue-600 mt-0.5" />
              <div>
                <p className="text-sm font-medium">Estimated Potential</p>
                <p className="text-xs text-muted-foreground mt-1">
                  This represents the total potential revenue from all your published listings. 
                  Actual revenue will vary based on negotiations and final sale prices.
                </p>
              </div>
            </div>

            {(stats as any).listingsUsingValuation > 0 && (
              <div className="flex items-start gap-2 p-4 bg-amber-500/10 rounded-lg border border-amber-500/30">
                <Building2 className="h-5 w-5 text-amber-600 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-amber-600">Using Market Valuations</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {(stats as any).listingsUsingValuation} of {stats.activeListings} listings use estimated market value (no price set).
                    {(stats as any).listingsWithPrice > 0 && ` ${(stats as any).listingsWithPrice} listings have set prices.`}
                  </p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Revenue Breakdown */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Revenue Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-primary/10 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center">
                    <DollarSign className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">Gross Revenue</p>
                    <p className="text-sm text-muted-foreground">Total from all sales</p>
                  </div>
                </div>
                <span className="text-xl font-bold">{formatCurrency(stats.totalRevenue)}</span>
              </div>

              <div className="flex items-center justify-between p-4 bg-destructive/10 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-destructive/20 flex items-center justify-center">
                    <TrendingDown className="h-5 w-5 text-destructive" />
                  </div>
                  <div>
                    <p className="font-medium">GeoInsight Fees</p>
                    <p className="text-sm text-muted-foreground">Platform commissions</p>
                  </div>
                </div>
                <span className="text-xl font-bold text-destructive">-{formatCurrency(stats.geoinsightFees)}</span>
              </div>

              <div className="flex items-center justify-between p-4 bg-orange-500/10 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-orange-500/20 flex items-center justify-center">
                    <Percent className="h-5 w-5 text-orange-600" />
                  </div>
                  <div>
                    <p className="font-medium">Tax (TRA - {taxRate}%)</p>
                    <p className="text-sm text-muted-foreground">Tanzania Revenue Authority</p>
                  </div>
                </div>
                <span className="text-xl font-bold text-orange-600">-{formatCurrency(stats.taxAmount)}</span>
              </div>

              <div className="flex items-center justify-between p-4 bg-green-500/10 rounded-lg border-2 border-green-500/30">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-green-500/20 flex items-center justify-center">
                    <TrendingUp className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <p className="font-medium text-lg">Net Revenue</p>
                    <p className="text-sm text-muted-foreground">After all deductions</p>
                  </div>
                </div>
                <span className="text-2xl font-bold text-green-600">{formatCurrency(stats.netRevenue)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Business Metrics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-5 w-5 text-primary" />
                    <span className="font-medium">Completed Deals</span>
                  </div>
                  <span className="text-2xl font-bold">{stats.completedDeals}</span>
                </div>
                <Progress value={(stats.completedDeals / Math.max(stats.activeListings + stats.completedDeals, 1)) * 100} className="h-2" />
                <p className="text-xs text-muted-foreground">
                  {stats.completedDeals} of {stats.activeListings + stats.completedDeals} total listings closed
                </p>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ListChecks className="h-5 w-5 text-blue-600" />
                    <span className="font-medium">Active Listings</span>
                  </div>
                  <span className="text-2xl font-bold text-blue-600">{stats.activeListings}</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Currently published and available for sale
                </p>
              </div>

              {stats.completedDeals > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Average Deal Value</span>
                    <span className="text-xl font-bold">{formatCurrency(stats.totalRevenue / stats.completedDeals)}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Average revenue per closed transaction
                  </p>
                </div>
              )}

              {stats.pendingPayments > 0 && (
                <div className="p-4 bg-orange-500/10 border border-orange-500/30 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Clock className="h-5 w-5 text-orange-600" />
                    <p className="font-medium text-orange-600">Outstanding Payments</p>
                  </div>
                  <p className="text-2xl font-bold text-orange-600 mb-1">{formatCurrency(stats.pendingPayments)}</p>
                  <p className="text-xs text-muted-foreground">
                    You have pending payments to GeoInsight
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
