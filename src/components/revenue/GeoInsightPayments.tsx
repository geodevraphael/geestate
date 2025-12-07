import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { Upload, AlertCircle, DollarSign, Clock, CheckCircle2, Briefcase, TrendingUp, ArrowUpRight } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';

export function GeoInsightPayments() {
  const { user, hasRole } = useAuth();
  const [loading, setLoading] = useState(true);
  const [payments, setPayments] = useState<any[]>([]);
  const [serviceBookings, setServiceBookings] = useState<any[]>([]);
  const [summary, setSummary] = useState({
    pending: 0,
    overdue: 0,
    paid: 0,
    serviceCommissions: 0,
    listingFees: 0,
    totalDue: 0,
  });

  const isServiceProvider = hasRole('service_provider');

  useEffect(() => {
    if (user) {
      fetchPayments();
      if (isServiceProvider) {
        fetchServiceBookings();
      }
    }
  }, [user, isServiceProvider]);

  const fetchPayments = async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('geoinsight_income_records')
        .select('*, fee_definition:geoinsight_fee_definitions(*)')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setPayments(data || []);

      // Calculate summary by fee type
      const serviceCommissions = data?.filter(p => p.fee_definition?.code === 'SERVICE_COMMISSION')
        .reduce((sum, p) => sum + Number(p.amount_due), 0) || 0;
      
      const listingFees = data?.filter(p => p.fee_definition?.code === 'LISTING_FEE')
        .reduce((sum, p) => sum + Number(p.amount_due), 0) || 0;

      const pending = data?.filter(p => p.status === 'pending')
        .reduce((sum, p) => sum + Number(p.amount_due), 0) || 0;
      const overdue = data?.filter(p => p.status === 'overdue')
        .reduce((sum, p) => sum + Number(p.amount_due), 0) || 0;
      const paid = data?.filter(p => p.status === 'paid')
        .reduce((sum, p) => sum + Number(p.amount_due), 0) || 0;

      setSummary({ 
        pending, 
        overdue, 
        paid, 
        serviceCommissions,
        listingFees,
        totalDue: pending + overdue 
      });
    } catch (error: any) {
      console.error('Error fetching payments:', error);
      toast.error('Failed to load payments');
    } finally {
      setLoading(false);
    }
  };

  const fetchServiceBookings = async () => {
    try {
      const { data, error } = await supabase
        .from('service_bookings')
        .select(`
          *,
          service:provider_services(name, price),
          client:profiles!service_bookings_client_id_fkey(full_name)
        `)
        .eq('provider_id', user?.id)
        .eq('status', 'completed')
        .not('payment_confirmed_at', 'is', null)
        .order('payment_confirmed_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      setServiceBookings(data || []);
    } catch (error) {
      console.error('Error fetching service bookings:', error);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-TZ', {
      style: 'currency',
      currency: 'TZS',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const getStatusBadge = (status: string) => {
    const config: Record<string, { variant: any; className: string; icon: any }> = {
      paid: { variant: 'default', className: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30', icon: CheckCircle2 },
      pending: { variant: 'secondary', className: 'bg-amber-500/10 text-amber-600 border-amber-500/30', icon: Clock },
      overdue: { variant: 'destructive', className: 'bg-destructive/10 text-destructive border-destructive/30', icon: AlertCircle },
      awaiting_review: { variant: 'outline', className: 'bg-blue-500/10 text-blue-600 border-blue-500/30', icon: Clock },
    };

    const statusConfig = config[status] || config.pending;
    const Icon = statusConfig.icon;

    return (
      <Badge variant={statusConfig.variant} className={statusConfig.className}>
        <Icon className="h-3 w-3 mr-1" />
        {status.replace(/_/g, ' ')}
      </Badge>
    );
  };

  const getFeeTypeBadge = (code: string) => {
    const config: Record<string, { label: string; className: string }> = {
      SERVICE_COMMISSION: { label: 'Service Fee', className: 'bg-purple-500/10 text-purple-600 border-purple-500/30' },
      LISTING_FEE: { label: 'Listing Fee', className: 'bg-blue-500/10 text-blue-600 border-blue-500/30' },
      SALE_COMMISSION: { label: 'Sale Commission', className: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30' },
      RENT_COMMISSION: { label: 'Rent Commission', className: 'bg-teal-500/10 text-teal-600 border-teal-500/30' },
      MONTHLY_SUBSCRIPTION: { label: 'Subscription', className: 'bg-orange-500/10 text-orange-600 border-orange-500/30' },
    };

    const typeConfig = config[code] || { label: code, className: 'bg-muted text-muted-foreground' };

    return (
      <Badge variant="outline" className={typeConfig.className}>
        {typeConfig.label}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center space-y-4">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto" />
          <p className="text-muted-foreground">Loading payments...</p>
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
        <div className="relative">
          <h2 className="text-2xl font-bold mb-2">GeoInsight Platform Fees</h2>
          <p className="text-primary-foreground/80">
            Manage your platform fees including listing fees{isServiceProvider ? ' and service commissions (2%)' : ''}
          </p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-border/50 hover:shadow-lg transition-all duration-300">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-3">
              <div className="p-2 rounded-xl bg-amber-500/10">
                <Clock className="h-5 w-5 text-amber-600" />
              </div>
              <span className="text-xs font-medium text-muted-foreground">Pending</span>
            </div>
            <div className="text-2xl font-bold">{formatCurrency(summary.pending)}</div>
            <p className="text-xs text-muted-foreground mt-1">Awaiting payment</p>
          </CardContent>
        </Card>

        <Card className="border-destructive/30 hover:shadow-lg transition-all duration-300">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-3">
              <div className="p-2 rounded-xl bg-destructive/10">
                <AlertCircle className="h-5 w-5 text-destructive" />
              </div>
              <span className="text-xs font-medium text-destructive">Overdue</span>
            </div>
            <div className="text-2xl font-bold text-destructive">{formatCurrency(summary.overdue)}</div>
            <p className="text-xs text-muted-foreground mt-1">Past due date</p>
          </CardContent>
        </Card>

        <Card className="border-emerald-500/30 hover:shadow-lg transition-all duration-300">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-3">
              <div className="p-2 rounded-xl bg-emerald-500/10">
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              </div>
              <span className="text-xs font-medium text-muted-foreground">Paid</span>
            </div>
            <div className="text-2xl font-bold text-emerald-600">{formatCurrency(summary.paid)}</div>
            <p className="text-xs text-muted-foreground mt-1">Total paid</p>
          </CardContent>
        </Card>

        {isServiceProvider && (
          <Card className="border-purple-500/30 hover:shadow-lg transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-3">
                <div className="p-2 rounded-xl bg-purple-500/10">
                  <Briefcase className="h-5 w-5 text-purple-600" />
                </div>
                <span className="text-xs font-medium text-muted-foreground">Service Fees</span>
              </div>
              <div className="text-2xl font-bold text-purple-600">{formatCurrency(summary.serviceCommissions)}</div>
              <p className="text-xs text-muted-foreground mt-1">2% commission fees</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Total Due Progress */}
      {summary.totalDue > 0 && (
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-semibold text-lg">Total Amount Due</h3>
                <p className="text-sm text-muted-foreground">Combined pending and overdue payments</p>
              </div>
              <span className="text-3xl font-bold text-amber-600">{formatCurrency(summary.totalDue)}</span>
            </div>
            <Progress value={(summary.paid / (summary.paid + summary.totalDue)) * 100} className="h-2" />
            <p className="text-xs text-muted-foreground mt-2">
              {Math.round((summary.paid / (summary.paid + summary.totalDue)) * 100)}% of total fees paid
            </p>
          </CardContent>
        </Card>
      )}

      {summary.overdue > 0 && (
        <Alert variant="destructive" className="border-2">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="font-medium">
            You have overdue payments totaling {formatCurrency(summary.overdue)}. Please submit payment proof as soon as possible.
          </AlertDescription>
        </Alert>
      )}

      {/* Service Provider Commissions Breakdown */}
      {isServiceProvider && serviceBookings.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-purple-500/10">
                <Briefcase className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <CardTitle>Service Commission Breakdown</CardTitle>
                <CardDescription>2% commission from completed service payments</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {serviceBookings.map((booking) => (
                <div key={booking.id} className="flex items-center justify-between p-4 rounded-xl border border-border/50 hover:bg-muted/50 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="p-2 rounded-lg bg-purple-500/10">
                      <TrendingUp className="h-4 w-4 text-purple-600" />
                    </div>
                    <div>
                      <p className="font-medium">{booking.service?.name}</p>
                      <p className="text-sm text-muted-foreground">
                        Client: {booking.client?.full_name} • {format(new Date(booking.payment_confirmed_at), 'MMM dd, yyyy')}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">{formatCurrency(booking.total_price || booking.service?.price || 0)}</p>
                    <p className="text-sm text-purple-600">
                      Commission: {formatCurrency((booking.total_price || booking.service?.price || 0) * 0.02)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Payments Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-primary/10">
              <DollarSign className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle>Payment History</CardTitle>
              <CardDescription>All your GeoInsight platform fees and commissions</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {payments.length === 0 ? (
            <div className="text-center py-12">
              <DollarSign className="h-12 w-12 mx-auto mb-4 text-muted-foreground/30" />
              <p className="text-muted-foreground">No payments found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payments.map((payment) => (
                    <TableRow key={payment.id} className="group hover:bg-muted/50">
                      <TableCell className="font-medium">
                        {format(new Date(payment.created_at), 'MMM dd, yyyy')}
                      </TableCell>
                      <TableCell>
                        <div className="max-w-xs truncate">
                          {payment.description}
                        </div>
                      </TableCell>
                      <TableCell>
                        {getFeeTypeBadge(payment.fee_definition?.code)}
                      </TableCell>
                      <TableCell className="font-semibold">
                        {formatCurrency(payment.amount_due)}
                      </TableCell>
                      <TableCell>
                        {payment.due_date 
                          ? format(new Date(payment.due_date), 'MMM dd, yyyy')
                          : '-'}
                      </TableCell>
                      <TableCell>{getStatusBadge(payment.status)}</TableCell>
                      <TableCell>
                        {(payment.status === 'pending' || payment.status === 'overdue') && (
                          <Button size="sm" className="gap-1 group-hover:shadow-md transition-all" asChild>
                            <a href="/geoinsight-payments">
                              <Upload className="h-3 w-3" />
                              Pay Now
                              <ArrowUpRight className="h-3 w-3" />
                            </a>
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
