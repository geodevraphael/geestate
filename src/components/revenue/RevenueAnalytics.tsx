import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export function RevenueAnalytics() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [monthlyData, setMonthlyData] = useState<any[]>([]);
  const [categoryData, setCategoryData] = useState<any[]>([]);
  const [deductionData, setDeductionData] = useState<any[]>([]);

  useEffect(() => {
    if (user) {
      fetchAnalytics();
    }
  }, [user]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);

      // Fetch deals
      const { data: deals, error: dealsError } = await supabase
        .from('deal_closures')
        .select('*, listing:listings(listing_type)')
        .eq('seller_id', user?.id)
        .eq('closure_status', 'closed');

      if (dealsError) throw dealsError;

      // Fetch fees
      const { data: fees, error: feesError } = await supabase
        .from('geoinsight_income_records')
        .select('*')
        .eq('user_id', user?.id);

      if (feesError) throw feesError;

      // Fetch tax settings
      const { data: profile } = await supabase
        .from('profiles')
        .select('social_links')
        .eq('id', user?.id)
        .single();

      const taxRate = (profile?.social_links as any)?.tra_rate || 18;

      // Process monthly data (last 6 months)
      const months = [];
      const now = new Date();
      for (let i = 5; i >= 0; i--) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthDeals = deals?.filter(d => {
          const dealDate = new Date(d.closed_at);
          return dealDate.getMonth() === date.getMonth() && 
                 dealDate.getFullYear() === date.getFullYear();
        }) || [];

        const revenue = monthDeals.reduce((sum, d) => sum + Number(d.final_price), 0);
        const commission = fees?.filter(f => {
          const feeDate = new Date(f.created_at);
          return feeDate.getMonth() === date.getMonth() && 
                 feeDate.getFullYear() === date.getFullYear();
        }).reduce((sum, f) => sum + Number(f.amount_due), 0) || 0;

        const tax = revenue * (taxRate / 100);
        const net = revenue - commission - tax;

        months.push({
          month: date.toLocaleDateString('en-US', { month: 'short' }),
          revenue,
          commission,
          tax,
          net,
        });
      }
      setMonthlyData(months);

      // Process category data (by listing type)
      const sales = deals?.filter(d => d.listing?.listing_type === 'sale') || [];
      const rentals = deals?.filter(d => d.listing?.listing_type === 'rent') || [];

      setCategoryData([
        { name: 'Sales', value: sales.reduce((sum, d) => sum + Number(d.final_price), 0), count: sales.length },
        { name: 'Rentals', value: rentals.reduce((sum, d) => sum + Number(d.final_price), 0), count: rentals.length },
      ]);

      // Process deduction breakdown
      const totalRevenue = deals?.reduce((sum, d) => sum + Number(d.final_price), 0) || 0;
      const totalCommission = fees?.reduce((sum, f) => sum + Number(f.amount_due), 0) || 0;
      const totalTax = totalRevenue * (taxRate / 100);
      const netRevenue = totalRevenue - totalCommission - totalTax;

      setDeductionData([
        { name: 'Net Revenue', value: netRevenue },
        { name: 'GeoInsight Fees', value: totalCommission },
        { name: 'TRA Tax', value: totalTax },
      ]);

    } catch (error: any) {
      console.error('Error fetching analytics:', error);
      toast.error('Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-TZ', {
      style: 'currency',
      currency: 'TZS',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const COLORS = ['#10b981', '#ef4444', '#f59e0b'];

  if (loading) {
    return <div className="text-center py-8">Loading analytics...</div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Monthly Revenue Trend</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis tickFormatter={(value) => formatCurrency(value)} />
              <Tooltip formatter={(value: any) => formatCurrency(value)} />
              <Legend />
              <Line type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" name="Gross Revenue" strokeWidth={2} />
              <Line type="monotone" dataKey="net" stroke="#10b981" name="Net Revenue" strokeWidth={2} />
              <Line type="monotone" dataKey="commission" stroke="#ef4444" name="Commissions" strokeWidth={2} />
              <Line type="monotone" dataKey="tax" stroke="#f59e0b" name="Tax" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Revenue by Category</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={(entry) => `${entry.name}: ${formatCurrency(entry.value)}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={index === 0 ? 'hsl(var(--primary))' : '#10b981'} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: any) => formatCurrency(value)} />
              </PieChart>
            </ResponsiveContainer>
            <div className="mt-4 space-y-2">
              {categoryData.map((cat, index) => (
                <div key={index} className="flex items-center justify-between text-sm">
                  <span>{cat.name}</span>
                  <span className="font-medium">{cat.count} deals</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Revenue Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={deductionData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis tickFormatter={(value) => formatCurrency(value)} />
                <Tooltip formatter={(value: any) => formatCurrency(value)} />
                <Bar dataKey="value" fill="hsl(var(--primary))">
                  {deductionData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
