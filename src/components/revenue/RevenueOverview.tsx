import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DollarSign, TrendingUp, TrendingDown, Percent, Building2, Calendar } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

export function RevenueOverview() {
  const { user } = useAuth();
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
  });
  const [taxRate, setTaxRate] = useState(18); // Default TRA VAT rate

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
      if (settings?.tax_rate) {
        setTaxRate(settings.tax_rate);
      }
    } catch (error) {
      console.error('Error fetching tax settings:', error);
    }
  };

  const fetchRevenueStats = async () => {
    try {
      setLoading(true);

      // Fetch completed deals for this user
      const { data: deals, error: dealsError } = await supabase
        .from('deal_closures')
        .select('*, listing:listings(title)')
        .eq('seller_id', user?.id)
        .eq('closure_status', 'closed');

      if (dealsError) throw dealsError;

      // Fetch GeoInsight fees owed
      const { data: fees, error: feesError } = await supabase
        .from('geoinsight_income_records')
        .select('*')
        .eq('user_id', user?.id);

      if (feesError) throw feesError;

      const now = new Date();
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();

      // Calculate totals
      const totalRevenue = deals?.reduce((sum, d) => sum + Number(d.final_price), 0) || 0;
      
      const thisMonth = deals?.filter(d => {
        const date = new Date(d.closed_at);
        return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
      }).reduce((sum, d) => sum + Number(d.final_price), 0) || 0;

      const thisYear = deals?.filter(d => {
        const date = new Date(d.closed_at);
        return date.getFullYear() === currentYear;
      }).reduce((sum, d) => sum + Number(d.final_price), 0) || 0;

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
      });
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
    return <div className="text-center py-8">Loading revenue data...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Main Revenue Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.totalRevenue)}</div>
            <p className="text-xs text-muted-foreground">From all deals</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">This Month</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.thisMonth)}</div>
            <p className="text-xs text-muted-foreground">{new Date().toLocaleString('default', { month: 'long' })}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">This Year</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.thisYear)}</div>
            <p className="text-xs text-muted-foreground">{new Date().getFullYear()}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed Deals</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.completedDeals}</div>
            <p className="text-xs text-muted-foreground">Total transactions</p>
          </CardContent>
        </Card>
      </div>

      {/* Revenue Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Revenue Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-primary" />
                <div>
                  <p className="font-medium">Gross Revenue</p>
                  <p className="text-sm text-muted-foreground">Total from all sales</p>
                </div>
              </div>
              <span className="text-xl font-bold">{formatCurrency(stats.totalRevenue)}</span>
            </div>

            <div className="flex items-center justify-between p-4 bg-red-500/10 rounded-lg">
              <div className="flex items-center gap-2">
                <TrendingDown className="h-5 w-5 text-destructive" />
                <div>
                  <p className="font-medium">GeoInsight Fees</p>
                  <p className="text-sm text-muted-foreground">Platform commissions & fees</p>
                </div>
              </div>
              <span className="text-xl font-bold text-destructive">-{formatCurrency(stats.geoinsightFees)}</span>
            </div>

            <div className="flex items-center justify-between p-4 bg-orange-500/10 rounded-lg">
              <div className="flex items-center gap-2">
                <Percent className="h-5 w-5 text-orange-600" />
                <div>
                  <p className="font-medium">Tax (TRA - {taxRate}%)</p>
                  <p className="text-sm text-muted-foreground">Tanzania Revenue Authority</p>
                </div>
              </div>
              <span className="text-xl font-bold text-orange-600">-{formatCurrency(stats.taxAmount)}</span>
            </div>

            <div className="flex items-center justify-between p-4 bg-green-500/10 rounded-lg border-2 border-green-500">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-green-600" />
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

      {/* Pending Payments */}
      {stats.pendingPayments > 0 && (
        <Card className="border-orange-500">
          <CardHeader>
            <CardTitle className="text-orange-600">Pending GeoInsight Payments</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <p className="text-muted-foreground">
                You have outstanding payments to GeoInsight
              </p>
              <span className="text-2xl font-bold text-orange-600">{formatCurrency(stats.pendingPayments)}</span>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
