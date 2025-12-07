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
  Calendar, 
  Clock, 
  User, 
  Phone, 
  Mail, 
  MapPin,
  CheckCircle,
  XCircle,
  MessageSquare,
  DollarSign
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
  { value: 'pending', label: 'Pending', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'confirmed', label: 'Confirmed', color: 'bg-blue-100 text-blue-800' },
  { value: 'completed', label: 'Completed', color: 'bg-green-100 text-green-800' },
  { value: 'cancelled', label: 'Cancelled', color: 'bg-red-100 text-red-800' },
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
    
    // Subscribe to new bookings
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
          profiles!service_bookings_client_id_fkey (full_name, email, phone),
          listings (id, title, location_label)
        `)
        .eq('provider_id', user?.id)
        .order('booking_date', { ascending: true })
        .order('booking_time', { ascending: true });

      if (error) throw error;
      setBookings(data || []);
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

      const { error } = await supabase
        .from('service_bookings')
        .update(updateData)
        .eq('id', bookingId);

      if (error) throw error;

      // Create notification for client
      const booking = bookings.find(b => b.id === bookingId);
      if (booking) {
        await supabase.from('notifications').insert({
          user_id: booking.client_id,
          title: `Booking ${status}`,
          message: `Your booking for ${booking.provider_services?.name} has been ${status}`,
          type: 'system',
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

  const getStatusBadge = (status: string) => {
    const option = STATUS_OPTIONS.find(s => s.value === status);
    return option || STATUS_OPTIONS[0];
  };

  const filteredBookings = filter === 'all' 
    ? bookings 
    : bookings.filter(b => b.status === filter);

  const pendingCount = bookings.filter(b => b.status === 'pending').length;

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Booking Requests
              {pendingCount > 0 && (
                <Badge variant="destructive">{pendingCount} pending</Badge>
              )}
            </CardTitle>
            <CardDescription>Manage client bookings and appointments</CardDescription>
          </div>
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Filter" />
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
      <CardContent>
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
          </div>
        ) : filteredBookings.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No bookings found</p>
            <p className="text-sm">Booking requests will appear here</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredBookings.map((booking) => {
              const statusInfo = getStatusBadge(booking.status);
              return (
                <Card key={booking.id} className="overflow-hidden">
                  <div className={`h-1 ${
                    booking.status === 'pending' ? 'bg-yellow-500' :
                    booking.status === 'confirmed' ? 'bg-blue-500' :
                    booking.status === 'completed' ? 'bg-green-500' :
                    'bg-red-500'
                  }`} />
                  <CardContent className="p-4">
                    <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                      <div className="flex-1 space-y-3">
                        <div className="flex items-start justify-between">
                          <div>
                            <h3 className="font-semibold text-lg">
                              {booking.provider_services?.name}
                            </h3>
                            <Badge className={statusInfo.color}>
                              {statusInfo.label}
                            </Badge>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold text-primary">
                              TZS {booking.total_price?.toLocaleString() || 'N/A'}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {format(new Date(booking.created_at), 'MMM d, yyyy')}
                            </p>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <span>{format(new Date(booking.booking_date), 'EEE, MMM d')}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-muted-foreground" />
                            <span>{booking.booking_time}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <span>{booking.profiles?.full_name}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Phone className="h-4 w-4 text-muted-foreground" />
                            <span>{booking.profiles?.phone || 'N/A'}</span>
                          </div>
                        </div>

                        {booking.listings && (
                          <div className="flex items-center gap-2 text-sm bg-muted/50 p-2 rounded">
                            <MapPin className="h-4 w-4 text-muted-foreground" />
                            <span>Related Property: </span>
                            <Link 
                              to={`/listings/${booking.listings.id}`}
                              className="text-primary hover:underline"
                            >
                              {booking.listings.title}
                            </Link>
                          </div>
                        )}

                        {booking.notes && (
                          <div className="flex items-start gap-2 text-sm bg-muted/50 p-2 rounded">
                            <MessageSquare className="h-4 w-4 text-muted-foreground mt-0.5" />
                            <p>{booking.notes}</p>
                          </div>
                        )}
                      </div>

                      {booking.status === 'pending' && (
                        <div className="flex gap-2 shrink-0">
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-green-600 border-green-200 hover:bg-green-50"
                            onClick={() => setSelectedBooking(booking)}
                          >
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Accept
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-red-600 border-red-200 hover:bg-red-50"
                            onClick={() => updateBookingStatus(booking.id, 'cancelled')}
                          >
                            <XCircle className="h-4 w-4 mr-1" />
                            Decline
                          </Button>
                        </div>
                      )}

                      {booking.status === 'confirmed' && (
                        <Button
                          size="sm"
                          onClick={() => updateBookingStatus(booking.id, 'completed')}
                        >
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Mark Complete
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Accept Booking Dialog */}
        <Dialog open={!!selectedBooking} onOpenChange={() => setSelectedBooking(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirm Booking</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p>
                Confirm booking for <strong>{selectedBooking?.provider_services?.name}</strong> with{' '}
                <strong>{selectedBooking?.profiles?.full_name}</strong>?
              </p>
              <div className="space-y-2">
                <label className="text-sm font-medium">Add a note (optional)</label>
                <Textarea
                  value={responseNote}
                  onChange={(e) => setResponseNote(e.target.value)}
                  placeholder="Any special instructions or confirmation details..."
                  rows={3}
                />
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setSelectedBooking(null)}>
                  Cancel
                </Button>
                <Button onClick={() => selectedBooking && updateBookingStatus(selectedBooking.id, 'confirmed')}>
                  Confirm Booking
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
