import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { MainLayout } from '@/components/layouts/MainLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { 
  Calendar, Clock, MapPin, Phone, Star, XCircle, 
  CheckCircle2, CreditCard, Building2, ArrowRight,
  Sparkles, Receipt
} from 'lucide-react';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';

interface Booking {
  id: string;
  provider_id: string;
  service_id: string;
  listing_id: string | null;
  booking_date: string;
  booking_time: string;
  status: string;
  notes: string;
  total_price: number;
  created_at: string;
  payment_confirmed_at: string | null;
  payment_reference: string | null;
  provider_services: {
    name: string;
    price: number;
  };
  service_provider_profiles: {
    company_name: string;
    contact_phone: string;
  };
  listings?: {
    title: string;
    location_label: string;
  };
}

export default function MyBookings() {
  const { user } = useAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmingPayment, setConfirmingPayment] = useState<Booking | null>(null);
  const [paymentReference, setPaymentReference] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (user) {
      fetchBookings();
    }
  }, [user]);

  const fetchBookings = async () => {
    try {
      const { data, error } = await (supabase
        .from('service_bookings' as any)
        .select(`
          *,
          provider_services (name, price),
          listings (title, location_label)
        `)
        .eq('client_id', user?.id)
        .order('booking_date', { ascending: false }) as any);

      if (error) throw error;

      const bookingsWithProviders = await Promise.all(
        ((data as any[]) || []).map(async (booking) => {
          const { data: provider } = await supabase
            .from('service_provider_profiles')
            .select('company_name, contact_phone')
            .eq('user_id', booking.provider_id)
            .single();
          
          return {
            ...booking,
            service_provider_profiles: provider || { company_name: 'Unknown', contact_phone: '' }
          };
        })
      );

      setBookings(bookingsWithProviders);
    } catch (error) {
      console.error('Error fetching bookings:', error);
    } finally {
      setLoading(false);
    }
  };

  const cancelBooking = async (bookingId: string) => {
    if (!confirm('Are you sure you want to cancel this booking?')) return;

    try {
      const { error } = await (supabase
        .from('service_bookings' as any)
        .update({ status: 'cancelled' })
        .eq('id', bookingId) as any);

      if (error) throw error;
      toast.success('Booking cancelled');
      fetchBookings();
    } catch (error: any) {
      toast.error(error.message || 'Failed to cancel booking');
    }
  };

  const confirmPayment = async () => {
    if (!confirmingPayment || !paymentReference.trim()) {
      toast.error('Please enter a payment reference');
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await (supabase
        .from('service_bookings' as any)
        .update({ 
          payment_confirmed_at: new Date().toISOString(),
          payment_confirmed_by: user?.id,
          payment_reference: paymentReference.trim(),
          status: 'completed'
        })
        .eq('id', confirmingPayment.id) as any);

      if (error) throw error;
      
      // Notify the provider
      await supabase.from('notifications').insert({
        user_id: confirmingPayment.provider_id,
        title: 'Payment Confirmed',
        message: `Client confirmed payment of TZS ${confirmingPayment.total_price?.toLocaleString()} for ${confirmingPayment.provider_services?.name}. Reference: ${paymentReference}`,
        type: 'payment_proof_submitted' as any,
        link_url: '/service-provider/dashboard',
      });

      toast.success('Payment confirmed! The service provider will be notified.');
      setConfirmingPayment(null);
      setPaymentReference('');
      fetchBookings();
    } catch (error: any) {
      toast.error(error.message || 'Failed to confirm payment');
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusConfig = (status: string, paymentConfirmed: boolean) => {
    if (paymentConfirmed) {
      return { 
        label: 'Paid', 
        color: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
        barColor: 'bg-gradient-to-r from-emerald-500 to-teal-500'
      };
    }
    switch (status) {
      case 'pending': return { 
        label: 'Pending', 
        color: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
        barColor: 'bg-gradient-to-r from-amber-500 to-orange-500'
      };
      case 'confirmed': return { 
        label: 'Confirmed', 
        color: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
        barColor: 'bg-gradient-to-r from-blue-500 to-indigo-500'
      };
      case 'completed': return { 
        label: 'Completed', 
        color: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
        barColor: 'bg-gradient-to-r from-emerald-500 to-teal-500'
      };
      case 'cancelled': return { 
        label: 'Cancelled', 
        color: 'bg-red-500/10 text-red-600 border-red-500/20',
        barColor: 'bg-gradient-to-r from-red-500 to-rose-500'
      };
      default: return { 
        label: status, 
        color: 'bg-muted text-muted-foreground',
        barColor: 'bg-muted'
      };
    }
  };

  return (
    <MainLayout>
      <div className="w-full px-4 md:px-6 lg:px-8 py-6 md:py-8">
        {/* Hero Header */}
        <div className="relative mb-8 p-6 md:p-8 rounded-2xl bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-primary/10 overflow-hidden">
          <div className="absolute inset-0 bg-grid-white/5 [mask-image:linear-gradient(0deg,transparent,black)]" />
          <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-3">
                <Calendar className="h-8 w-8 text-primary" />
                My Bookings
              </h1>
              <p className="text-muted-foreground mt-1">Track and manage your service appointments</p>
            </div>
            <Link to="/service-providers">
              <Button className="gap-2 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg shadow-primary/25">
                <Sparkles className="h-4 w-4" />
                Browse Providers
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>

        {loading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="animate-pulse">
                <div className="h-1.5 bg-muted rounded-t-lg" />
                <CardContent className="p-6 space-y-4">
                  <div className="h-6 bg-muted rounded w-3/4" />
                  <div className="h-4 bg-muted rounded w-1/2" />
                  <div className="grid grid-cols-2 gap-2">
                    <div className="h-4 bg-muted rounded" />
                    <div className="h-4 bg-muted rounded" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : bookings.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="text-center py-16">
              <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-primary/10 flex items-center justify-center">
                <Calendar className="h-10 w-10 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">No bookings yet</h3>
              <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
                Find verified service providers for land surveys, legal services, valuations and more.
              </p>
              <Link to="/service-providers">
                <Button size="lg" className="gap-2">
                  <Sparkles className="h-4 w-4" />
                  Find Service Providers
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {bookings.map((booking) => {
              const statusConfig = getStatusConfig(booking.status, !!booking.payment_confirmed_at);
              return (
                <Card key={booking.id} className="group overflow-hidden hover:shadow-lg transition-all duration-300 hover:border-primary/30">
                  <div className={`h-1.5 ${statusConfig.barColor}`} />
                  <CardContent className="p-5 space-y-4">
                    {/* Header */}
                    <div className="flex items-start justify-between">
                      <div className="space-y-1 flex-1 min-w-0">
                        <h3 className="font-semibold text-lg truncate">
                          {booking.provider_services?.name}
                        </h3>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Building2 className="h-4 w-4 shrink-0" />
                          <span className="truncate">{booking.service_provider_profiles?.company_name}</span>
                        </div>
                      </div>
                      <Badge variant="outline" className={`${statusConfig.color} shrink-0`}>
                        {statusConfig.label}
                      </Badge>
                    </div>

                    {/* Details Grid */}
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Calendar className="h-4 w-4 shrink-0" />
                        <span>{format(new Date(booking.booking_date), 'MMM d, yyyy')}</span>
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Clock className="h-4 w-4 shrink-0" />
                        <span>{booking.booking_time}</span>
                      </div>
                      {booking.service_provider_profiles?.contact_phone && (
                        <div className="flex items-center gap-2 text-muted-foreground col-span-2">
                          <Phone className="h-4 w-4 shrink-0" />
                          <span>{booking.service_provider_profiles.contact_phone}</span>
                        </div>
                      )}
                    </div>

                    {/* Price */}
                    <div className="flex items-center justify-between pt-3 border-t">
                      <span className="text-sm text-muted-foreground">Total Amount</span>
                      <span className="text-lg font-bold text-primary">
                        TZS {booking.total_price?.toLocaleString() || 'N/A'}
                      </span>
                    </div>

                    {/* Related Property */}
                    {booking.listings && (
                      <div className="flex items-center gap-2 text-sm p-2 rounded-lg bg-muted/50">
                        <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
                        <span className="truncate">{booking.listings.title}</span>
                      </div>
                    )}

                    {/* Payment Reference */}
                    {booking.payment_reference && (
                      <div className="flex items-center gap-2 text-sm p-2 rounded-lg bg-emerald-500/10">
                        <Receipt className="h-4 w-4 text-emerald-600 shrink-0" />
                        <span className="text-emerald-700">Ref: {booking.payment_reference}</span>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-2 pt-2">
                      {booking.status === 'pending' && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1 text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => cancelBooking(booking.id)}
                        >
                          <XCircle className="h-4 w-4 mr-1" />
                          Cancel
                        </Button>
                      )}
                      {(booking.status === 'confirmed' || booking.status === 'completed') && !booking.payment_confirmed_at && (
                        <Button
                          size="sm"
                          className="flex-1 gap-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600"
                          onClick={() => setConfirmingPayment(booking)}
                        >
                          <CreditCard className="h-4 w-4" />
                          Confirm Payment
                        </Button>
                      )}
                      {booking.payment_confirmed_at && (
                        <Button variant="outline" size="sm" className="flex-1 gap-2">
                          <Star className="h-4 w-4" />
                          Leave Review
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Payment Confirmation Dialog */}
        <Dialog open={!!confirmingPayment} onOpenChange={() => setConfirmingPayment(null)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                Confirm Payment
              </DialogTitle>
              <DialogDescription>
                Confirm that you have paid the service provider for this service.
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              {/* Service Summary */}
              <div className="p-4 rounded-lg bg-muted/50 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Service</span>
                  <span className="font-medium">{confirmingPayment?.provider_services?.name}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Provider</span>
                  <span className="font-medium">{confirmingPayment?.service_provider_profiles?.company_name}</span>
                </div>
                <div className="flex justify-between pt-2 border-t">
                  <span className="font-medium">Amount Paid</span>
                  <span className="text-lg font-bold text-primary">
                    TZS {confirmingPayment?.total_price?.toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Payment Reference Input */}
              <div className="space-y-2">
                <Label htmlFor="payment_reference">Payment Reference / Transaction ID *</Label>
                <Input
                  id="payment_reference"
                  placeholder="e.g., M-Pesa XXXXX, Bank Ref #"
                  value={paymentReference}
                  onChange={(e) => setPaymentReference(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Enter the transaction reference from your payment method (M-Pesa, bank transfer, etc.)
                </p>
              </div>

              {/* Commission Notice */}
              <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                <p className="text-sm text-amber-700">
                  <strong>Note:</strong> A 2% platform commission will be charged to the service provider.
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <Button 
                variant="outline" 
                onClick={() => setConfirmingPayment(null)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button 
                onClick={confirmPayment}
                disabled={submitting || !paymentReference.trim()}
                className="flex-1 gap-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600"
              >
                {submitting ? (
                  <>
                    <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Confirming...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4" />
                    Confirm Payment
                  </>
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}