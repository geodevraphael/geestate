import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DollarSign, TrendingUp, Clock, CheckCircle, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

export function AdminIncomeOverview() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalRevenue: 0,
    thisMonth: 0,
    thisYear: 0,
    pending: 0,
    overdue: 0,
    awaitingReview: 0,
    commissions: 0,
    verifications: 0,
    subscriptions: 0,
    penalties: 0,
  });

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      setLoading(true);

      // Fetch all income records
      const { data: records, error } = await supabase
        .from('geoinsight_income_records')
        .select('*, fee_definition:geoinsight_fee_definitions(*)');

      if (error) throw error;

      const now = new Date();
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();

      const totalRevenue = records?.filter(r => r.status === 'paid')
        .reduce((sum, r) => sum + Number(r.amount_due), 0) || 0;

      const thisMonth = records?.filter(r => {
        const date = new Date(r.created_at);
        return r.status === 'paid' && 
               date.getMonth() === currentMonth && 
               date.getFullYear() === currentYear;
      }).reduce((sum, r) => sum + Number(r.amount_due), 0) || 0;

      const thisYear = records?.filter(r => {
        const date = new Date(r.created_at);
        return r.status === 'paid' && date.getFullYear() === currentYear;
      }).reduce((sum, r) => sum + Number(r.amount_due), 0) || 0;

      const pending = records?.filter(r => r.status === 'pending')
        .reduce((sum, r) => sum + Number(r.amount_due), 0) || 0;

      const overdue = records?.filter(r => r.status === 'overdue')
        .reduce((sum, r) => sum + Number(r.amount_due), 0) || 0;

      const awaitingReview = records?.filter(r => r.status === 'awaiting_review')
        .reduce((sum, r) => sum + Number(r.amount_due), 0) || 0;

      // By category
      const commissions = records?.filter(r => 
        r.fee_definition?.code.includes('COMMISSION')
      ).reduce((sum, r) => sum + Number(r.amount_due), 0) || 0;

      const verifications = records?.filter(r => 
        r.fee_definition?.code.includes('VERIFICATION')
      ).reduce((sum, r) => sum + Number(r.amount_due), 0) || 0;

      const subscriptions = records?.filter(r => 
        r.fee_definition?.code.includes('SUBSCRIPTION')
      ).reduce((sum, r) => sum + Number(r.amount_due), 0) || 0;

      const penalties = records?.filter(r => 
        r.fee_definition?.code.includes('PENALTY')
      ).reduce((sum, r) => sum + Number(r.amount_due), 0) || 0;

      setStats({
        totalRevenue,
        thisMonth,
        thisYear,
        pending,
        overdue,
        awaitingReview,
        commissions,
        verifications,
        subscriptions,
        penalties,
      });
    } catch (error: any) {
      console.error('Error fetching stats:', error);
      toast.error('Failed to load statistics');
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
    return <div className="text-center py-8">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Main Revenue Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.totalRevenue)}</div>
            <p className="text-xs text-muted-foreground">All time</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">This Month</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.thisMonth)}</div>
            <p className="text-xs text-muted-foreground">{new Date().toLocaleString('default', { month: 'long' })}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">This Year</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.thisYear)}</div>
            <p className="text-xs text-muted-foreground">{new Date().getFullYear()}</p>
          </CardContent>
        </Card>
      </div>

      {/* Status Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Clock className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.pending)}</div>
            <p className="text-xs text-muted-foreground">Awaiting payment</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overdue</CardTitle>
            <AlertCircle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{formatCurrency(stats.overdue)}</div>
            <p className="text-xs text-muted-foreground">Past due date</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Under Review</CardTitle>
            <TrendingUp className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.awaitingReview)}</div>
            <p className="text-xs text-muted-foreground">Pending verification</p>
          </CardContent>
        </Card>
      </div>

      {/* Income by Category */}
      <Card>
        <CardHeader>
          <CardTitle>Income by Category</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-blue-500" />
                <span>Commissions</span>
              </div>
              <span className="font-bold">{formatCurrency(stats.commissions)}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-green-500" />
                <span>Verifications</span>
              </div>
              <span className="font-bold">{formatCurrency(stats.verifications)}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-purple-500" />
                <span>Subscriptions</span>
              </div>
              <span className="font-bold">{formatCurrency(stats.subscriptions)}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500" />
                <span>Penalties</span>
              </div>
              <span className="font-bold">{formatCurrency(stats.penalties)}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
