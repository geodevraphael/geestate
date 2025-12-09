import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { 
  Calendar, Clock, User, Phone, MapPin,
  CheckCircle, XCircle, MessageSquare, 
  CreditCard, Sparkles, DollarSign, Receipt
} from 'lucide-react';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';

interface Booking {
  id: string;
  service_id: string;
  client_id: string;
  booking_date: string;
  booking_time: string;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  notes: string;
  total_price: number;
  created_at: string;
  payment_confirmed_at: string | null;
  payment_reference: string | null;
  provider_services: {
    name: string;
    price: number;
    price_type: string;
  };
  profiles: {
    full_name: string;
    email: string;
    phone: string;
  };
  listings?: {
    id: string;
    title: string;
    location_label: string;
  };
}

interface BookingRequestsProps {
  providerId: string;
  onUpdate: () => void;
}

const STATUS_OPTIONS = [
  { value: 'pending', label: 'Pending', color: 'bg-amber-500/10 text-amber-600 border-amber-500/20' },
  { value: 'confirmed', label: 'Confirmed', color: 'bg-blue-500/10 text-blue-600 border-blue-500/20' },
  { value: 'completed', label: 'Completed', color: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' },
  { value: 'cancelled', label: 'Cancelled', color: 'bg-red-500/10 text-red-600 border-red-500/20' },
];

export function BookingRequests({ providerId, onUpdate }: BookingRequestsProps) {
  const { user } = useAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [responseNote, setResponseNote] = useState('');

  useEffect(() => {
    fetchBookings();
    
    const channel = supabase
      .channel('booking-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'service_bookings',
          filter: `provider_id=eq.${user?.id}`,
        },
        () => {
          fetchBookings();
          toast.info('New booking request received!');
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const fetchBookings = async () => {
    try {
      const { data, error } = await supabase
        .from('service_bookings')
        .select(`
          *,
          provider_services (name, price, price_type),
          listings (id, title, location_label)
        `)
        .eq('provider_id', user?.id)
        .order('booking_date', { ascending: true })
        .order('booking_time', { ascending: true });

      if (error) throw error;
      
      // Fetch client details separately
      const bookingsWithClients = await Promise.all(
        (data || []).map(async (booking: any) => {
          const { data: client } = await supabase
            .from('profiles')
            .select('full_name, email, phone')
            .eq('id', booking.client_id)
            .single();
          return { ...booking, profiles: client };
        })
      );
      
      setBookings(bookingsWithClients as Booking[]);
    } catch (error) {
      console.error('Error fetching bookings:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateBookingStatus = async (bookingId: string, status: string) => {
    try {
      const updateData: any = { status };
      if (responseNote) {
        updateData.provider_notes = responseNote;
      }

      const { error } = await (supabase
        .from('service_bookings' as any)
        .update(updateData)
        .eq('id', bookingId) as any);

      if (error) throw error;

      const booking = bookings.find(b => b.id === bookingId);
      if (booking) {
        await supabase.from('notifications').insert({
          user_id: booking.client_id,
          title: `Booking ${status}`,
          message: `Your booking for ${booking.provider_services?.name} has been ${status}`,
          type: 'system' as any,
          link_url: '/my-bookings',
        });
      }

      toast.success(`Booking ${status}`);
      setSelectedBooking(null);
      setResponseNote('');
      fetchBookings();
      onUpdate();
    } catch (error: any) {
      toast.error(error.message || 'Failed to update booking');
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
    const option = STATUS_OPTIONS.find(s => s.value === status) || STATUS_OPTIONS[0];
    const barColors: Record<string, string> = {
      pending: 'bg-gradient-to-r from-amber-500 to-orange-500',
      confirmed: 'bg-gradient-to-r from-blue-500 to-indigo-500',
      completed: 'bg-gradient-to-r from-emerald-500 to-teal-500',
      cancelled: 'bg-gradient-to-r from-red-500 to-rose-500',
    };
    return { 
      ...option, 
      barColor: barColors[status] || 'bg-muted' 
    };
  };

  const filteredBookings = filter === 'all' 
    ? bookings 
    : bookings.filter(b => b.status === filter);

  const pendingCount = bookings.filter(b => b.status === 'pending').length;
  const paidBookings = bookings.filter(b => b.payment_confirmed_at);
  const totalRevenue = paidBookings.reduce((sum, b) => sum + (b.total_price || 0), 0);
  const totalCommission = totalRevenue * 0.02;

  return (
    <Card className="overflow-hidden">
      <CardHeader className="bg-gradient-to-r from-primary/5 to-transparent border-b">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2 text-xl">
              <Calendar className="h-5 w-5 text-primary" />
              Booking Requests
              {pendingCount > 0 && (
                <Badge className="bg-amber-500 text-white animate-pulse">{pendingCount} new</Badge>
              )}
            </CardTitle>
            <CardDescription>Manage client bookings and track payments</CardDescription>
          </div>
          
          {/* Quick Stats */}
          <div className="flex gap-4">
            <div className="text-center px-4 py-2 rounded-lg bg-emerald-500/10">
              <p className="text-xs text-muted-foreground">Revenue</p>
              <p className="text-lg font-bold text-emerald-600">TZS {totalRevenue.toLocaleString()}</p>
            </div>
            <div className="text-center px-4 py-2 rounded-lg bg-amber-500/10">
              <p className="text-xs text-muted-foreground">Commission (2%)</p>
              <p className="text-lg font-bold text-amber-600">TZS {totalCommission.toLocaleString()}</p>
            </div>
          </div>
        </div>
        
        {/* Filter */}
        <div className="pt-4">
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter bookings" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Bookings</SelectItem>
              {STATUS_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent className="p-6">
        {loading ? (
          <div className="grid gap-4 md:grid-cols-2">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i} className="animate-pulse">
                <div className="h-1.5 bg-muted" />
                <CardContent className="p-4 space-y-3">
                  <div className="h-5 bg-muted rounded w-3/4" />
                  <div className="h-4 bg-muted rounded w-1/2" />
                  <div className="grid grid-cols-2 gap-2">
                    <div className="h-4 bg-muted rounded" />
                    <div className="h-4 bg-muted rounded" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredBookings.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-primary/10 flex items-center justify-center">
              <Calendar className="h-10 w-10 text-primary" />
            </div>
            <h3 className="text-xl font-semibold mb-2">No bookings found</h3>
            <p className="text-muted-foreground max-w-md mx-auto">
              {filter === 'all' 
                ? 'Booking requests from clients will appear here.'
                : `No ${filter} bookings at the moment.`}
            </p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {filteredBookings.map((booking) => {
              const statusConfig = getStatusConfig(booking.status, !!booking.payment_confirmed_at);
              return (
                <Card key={booking.id} className="group overflow-hidden hover:shadow-lg transition-all duration-300">
                  <div className={`h-1.5 ${statusConfig.barColor}`} />
                  <CardContent className="p-5 space-y-4">
                    {/* Header */}
                    <div className="flex items-start justify-between">
                      <div className="space-y-1 flex-1">
                        <h3 className="font-semibold text-lg">
                          {booking.provider_services?.name}
                        </h3>
                        <Badge variant="outline" className={statusConfig.color}>
                          {statusConfig.label}
                        </Badge>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-primary">
                          TZS {booking.total_price?.toLocaleString() || 'N/A'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(booking.created_at), 'MMM d, yyyy')}
                        </p>
                      </div>
                    </div>

                    {/* Client & Schedule */}
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span className="truncate">{booking.profiles?.full_name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <span>{booking.profiles?.phone || 'N/A'}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span>{format(new Date(booking.booking_date), 'EEE, MMM d')}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span>{booking.booking_time}</span>
                      </div>
                    </div>

                    {/* Related Property */}
                    {booking.listings && (
                      <div className="flex items-center gap-2 text-sm p-2 rounded-lg bg-muted/50">
                        <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
                        <Link 
                          to={`/listings/${booking.listings.id}`}
                          className="text-primary hover:underline truncate"
                        >
                          {booking.listings.title}
                        </Link>
                      </div>
                    )}

                    {/* Client Notes */}
                    {booking.notes && (
                      <div className="flex items-start gap-2 text-sm p-2 rounded-lg bg-muted/50">
                        <MessageSquare className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                        <p className="line-clamp-2">{booking.notes}</p>
                      </div>
                    )}

                    {/* Payment Info */}
                    {booking.payment_confirmed_at && (
                      <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                        <div className="flex items-center gap-2 text-emerald-700">
                          <CreditCard className="h-4 w-4" />
                          <span className="font-medium">Payment Confirmed</span>
                        </div>
                        {booking.payment_reference && (
                          <div className="flex items-center gap-2 mt-1 text-sm text-emerald-600">
                            <Receipt className="h-3 w-3" />
                            <span>Ref: {booking.payment_reference}</span>
                          </div>
                        )}
                        <p className="text-xs text-muted-foreground mt-2">
                          2% commission ({Math.round((booking.total_price || 0) * 0.02).toLocaleString()} TZS) will be added to your GeoInsight fees.
                        </p>
                      </div>
                    )}

                    {/* Actions */}
                    {booking.status === 'pending' && (
                      <div className="flex gap-2 pt-2">
                        <Button
                          size="sm"
                          className="flex-1 gap-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600"
                          onClick={() => setSelectedBooking(booking)}
                        >
                          <CheckCircle className="h-4 w-4" />
                          Accept
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1 text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => updateBookingStatus(booking.id, 'cancelled')}
                        >
                          <XCircle className="h-4 w-4 mr-1" />
                          Decline
                        </Button>
                      </div>
                    )}

                    {booking.status === 'confirmed' && !booking.payment_confirmed_at && (
                      <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                        <p className="text-sm text-amber-700">
                          <strong>Awaiting payment confirmation from client.</strong>
                        </p>
                        <Button
                          size="sm"
                          className="mt-2 w-full"
                          onClick={() => updateBookingStatus(booking.id, 'completed')}
                        >
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Mark as Completed
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Accept Booking Dialog */}
        <Dialog open={!!selectedBooking} onOpenChange={() => setSelectedBooking(null)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                Confirm Booking
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="p-4 rounded-lg bg-muted/50 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Service</span>
                  <span className="font-medium">{selectedBooking?.provider_services?.name}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Client</span>
                  <span className="font-medium">{selectedBooking?.profiles?.full_name}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Date & Time</span>
                  <span className="font-medium">
                    {selectedBooking && format(new Date(selectedBooking.booking_date), 'MMM d')} at {selectedBooking?.booking_time}
                  </span>
                </div>
                <div className="flex justify-between pt-2 border-t">
                  <span className="font-medium">Amount</span>
                  <span className="text-lg font-bold text-primary">
                    TZS {selectedBooking?.total_price?.toLocaleString()}
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Add a note for the client (optional)</label>
                <Textarea
                  value={responseNote}
                  onChange={(e) => setResponseNote(e.target.value)}
                  placeholder="Any special instructions or confirmation details..."
                  rows={3}
                />
              </div>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setSelectedBooking(null)} className="flex-1">
                Cancel
              </Button>
              <Button 
                onClick={() => selectedBooking && updateBookingStatus(selectedBooking.id, 'confirmed')}
                className="flex-1 gap-2"
              >
                <CheckCircle className="h-4 w-4" />
                Confirm Booking
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}