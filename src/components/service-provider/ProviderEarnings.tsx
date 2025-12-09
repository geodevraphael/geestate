import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  DollarSign, TrendingUp, ArrowUpRight, ArrowDownRight, 
  Calendar, CreditCard, AlertCircle, CheckCircle2, Clock,
  Download, Receipt, ExternalLink
} from 'lucide-react';
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { Link } from 'react-router-dom';

interface ProviderEarningsProps {
  providerId: string;
  userId: string;
}

export function ProviderEarnings({ providerId, userId }: ProviderEarningsProps) {
  const [period, setPeriod] = useState<'this_month' | 'last_month' | 'all'>('this_month');

  // Fetch completed service requests with payments
  const { data: completedServices = [] } = useQuery({
    queryKey: ['provider-completed-services', providerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('service_requests')
        .select('id, service_type, payment_amount, payment_confirmed_at, created_at')
        .eq('service_provider_id', providerId)
        .eq('status', 'completed')
        .not('payment_confirmed_at', 'is', null)
        .order('payment_confirmed_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
  });

  // Fetch GeoInsight income records (fees owed to platform)
  const { data: incomeRecords = [] } = useQuery({
    queryKey: ['provider-income-records', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('geoinsight_income_records')
        .select(`
          *,
          fee_definition:geoinsight_fee_definitions(name, code, percentage_rate)
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
  });

  // Calculate stats
  const now = new Date();
  const thisMonthStart = startOfMonth(now);
  const thisMonthEnd = endOfMonth(now);
  const lastMonthStart = startOfMonth(subMonths(now, 1));
  const lastMonthEnd = endOfMonth(subMonths(now, 1));

  const getFilteredServices = () => {
    if (period === 'all') return completedServices;
    const start = period === 'this_month' ? thisMonthStart : lastMonthStart;
    const end = period === 'this_month' ? thisMonthEnd : lastMonthEnd;
    return completedServices.filter(s => {
      const date = new Date(s.payment_confirmed_at);
      return date >= start && date <= end;
    });
  };

  const filteredServices = getFilteredServices();
  
  const totalEarnings = filteredServices.reduce((sum, s) => sum + (s.payment_amount || 0), 0);
  const platformFees = totalEarnings * 0.02; // 2% platform fee
  const netEarnings = totalEarnings - platformFees;

  const thisMonthEarnings = completedServices
    .filter(s => {
      const date = new Date(s.payment_confirmed_at);
      return date >= thisMonthStart && date <= thisMonthEnd;
    })
    .reduce((sum, s) => sum + (s.payment_amount || 0), 0);

  const lastMonthEarnings = completedServices
    .filter(s => {
      const date = new Date(s.payment_confirmed_at);
      return date >= lastMonthStart && date <= lastMonthEnd;
    })
    .reduce((sum, s) => sum + (s.payment_amount || 0), 0);

  const growthPercent = lastMonthEarnings > 0 
    ? ((thisMonthEarnings - lastMonthEarnings) / lastMonthEarnings) * 100 
    : 0;

  const pendingFees = incomeRecords
    .filter(r => r.status === 'pending' || r.status === 'awaiting_review')
    .reduce((sum, r) => sum + r.amount_due, 0);

  const paidFees = incomeRecords
    .filter(r => r.status === 'paid')
    .reduce((sum, r) => sum + r.amount_due, 0);

  return (
    <div className="space-y-6">
      {/* Earnings Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100/50 dark:from-emerald-950/30 dark:to-emerald-900/20 border-emerald-200/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Earnings</p>
                <p className="text-2xl font-bold text-emerald-700">TZS {totalEarnings.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {period === 'this_month' ? 'This month' : period === 'last_month' ? 'Last month' : 'All time'}
                </p>
              </div>
              <div className="h-12 w-12 bg-emerald-500/10 rounded-full flex items-center justify-center">
                <DollarSign className="h-6 w-6 text-emerald-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-950/30 dark:to-blue-900/20 border-blue-200/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Net Earnings</p>
                <p className="text-2xl font-bold text-blue-700">TZS {netEarnings.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground mt-1">After 2% platform fee</p>
              </div>
              <div className="h-12 w-12 bg-blue-500/10 rounded-full flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100/50 dark:from-purple-950/30 dark:to-purple-900/20 border-purple-200/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Growth</p>
                <div className="flex items-center gap-2">
                  <p className="text-2xl font-bold text-purple-700">
                    {growthPercent >= 0 ? '+' : ''}{growthPercent.toFixed(1)}%
                  </p>
                  {growthPercent >= 0 ? (
                    <ArrowUpRight className="h-5 w-5 text-emerald-500" />
                  ) : (
                    <ArrowDownRight className="h-5 w-5 text-red-500" />
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-1">vs last month</p>
              </div>
              <div className="h-12 w-12 bg-purple-500/10 rounded-full flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-50 to-amber-100/50 dark:from-amber-950/30 dark:to-amber-900/20 border-amber-200/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Platform Fees Due</p>
                <p className="text-2xl font-bold text-amber-700">TZS {pendingFees.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground mt-1">Pending payment</p>
              </div>
              <div className="h-12 w-12 bg-amber-500/10 rounded-full flex items-center justify-center">
                <Receipt className="h-6 w-6 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Period Tabs */}
      <div className="flex items-center justify-between">
        <div className="flex gap-1 p-1 bg-muted rounded-lg">
          {[
            { value: 'this_month', label: 'This Month' },
            { value: 'last_month', label: 'Last Month' },
            { value: 'all', label: 'All Time' },
          ].map((tab) => (
            <Button
              key={tab.value}
              variant={period === tab.value ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setPeriod(tab.value as typeof period)}
              className="h-8"
            >
              {tab.label}
            </Button>
          ))}
        </div>

        {pendingFees > 0 && (
          <Link to="/geoinsight-payments">
            <Button variant="outline" className="gap-2 border-amber-500/50 text-amber-700 hover:bg-amber-500/10">
              <CreditCard className="h-4 w-4" />
              Pay Platform Fees
              <ExternalLink className="h-3 w-3" />
            </Button>
          </Link>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Transactions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Recent Payments
            </CardTitle>
            <CardDescription>Payments received from clients</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {filteredServices.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <DollarSign className="h-10 w-10 mx-auto mb-3 opacity-50" />
                <p>No payments received yet</p>
              </div>
            ) : (
              filteredServices.slice(0, 5).map((service) => (
                <div key={service.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-emerald-500/10 flex items-center justify-center">
                      <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">{service.service_type.replace(/_/g, ' ')}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(service.payment_confirmed_at), 'MMM d, yyyy')}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-emerald-600">+TZS {service.payment_amount?.toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">
                      Fee: TZS {((service.payment_amount || 0) * 0.02).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Platform Fees */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Receipt className="h-5 w-5" />
              Platform Fees
            </CardTitle>
            <CardDescription>2% commission on completed services</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {incomeRecords.filter(r => r.fee_definition?.code === 'SERVICE_COMMISSION').length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Receipt className="h-10 w-10 mx-auto mb-3 opacity-50" />
                <p>No platform fees yet</p>
              </div>
            ) : (
              incomeRecords
                .filter(r => r.fee_definition?.code === 'SERVICE_COMMISSION')
                .slice(0, 5)
                .map((record: any) => (
                  <div key={record.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                    <div className="flex items-center gap-3">
                      <div className={`h-10 w-10 rounded-full flex items-center justify-center ${
                        record.status === 'paid' ? 'bg-emerald-500/10' : 'bg-amber-500/10'
                      }`}>
                        {record.status === 'paid' ? (
                          <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                        ) : (
                          <Clock className="h-5 w-5 text-amber-600" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-sm">{record.description}</p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(record.created_at), 'MMM d, yyyy')}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`font-bold ${record.status === 'paid' ? 'text-emerald-600' : 'text-amber-600'}`}>
                        TZS {record.amount_due.toLocaleString()}
                      </p>
                      <Badge 
                        variant="outline" 
                        className={record.status === 'paid' 
                          ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                          : 'bg-amber-500/10 text-amber-600 border-amber-500/20'
                        }
                      >
                        {record.status === 'paid' ? 'Paid' : 'Due'}
                      </Badge>
                    </div>
                  </div>
                ))
            )}

            {pendingFees > 0 && (
              <div className="mt-4 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-amber-700">Platform Fees Due</p>
                    <p className="text-xs text-amber-600">
                      You have TZS {pendingFees.toLocaleString()} in pending platform fees. 
                      Please pay to maintain your account in good standing.
                    </p>
                    <Link to="/geoinsight-payments">
                      <Button size="sm" variant="outline" className="mt-2 gap-1 text-amber-700 border-amber-500/30">
                        Pay Now <ExternalLink className="h-3 w-3" />
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
