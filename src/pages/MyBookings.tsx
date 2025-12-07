import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { MainLayout } from '@/components/layouts/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, Clock, MapPin, User, Phone, Star, XCircle } from 'lucide-react';
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

      // Fetch provider profiles separately
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'confirmed': return 'bg-blue-100 text-blue-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">My Bookings</h1>
          <Link to="/service-providers">
            <Button>Browse Service Providers</Button>
          </Link>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
          </div>
        ) : bookings.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <Calendar className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h3 className="text-lg font-medium mb-2">No bookings yet</h3>
              <p className="text-muted-foreground mb-4">
                Browse service providers to book appointments
              </p>
              <Link to="/service-providers">
                <Button>Find Service Providers</Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {bookings.map((booking) => (
              <Card key={booking.id}>
                <div className={`h-1 ${
                  booking.status === 'pending' ? 'bg-yellow-500' :
                  booking.status === 'confirmed' ? 'bg-blue-500' :
                  booking.status === 'completed' ? 'bg-green-500' :
                  'bg-red-500'
                }`} />
                <CardContent className="p-6">
                  <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                    <div className="flex-1 space-y-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-semibold text-lg">
                            {booking.provider_services?.name}
                          </h3>
                          <p className="text-muted-foreground">
                            by {booking.service_provider_profiles?.company_name}
                          </p>
                        </div>
                        <Badge className={getStatusColor(booking.status)}>
                          {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                        </Badge>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <span>{format(new Date(booking.booking_date), 'EEE, MMM d, yyyy')}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <span>{booking.booking_time}</span>
                        </div>
                        {booking.service_provider_profiles?.contact_phone && (
                          <div className="flex items-center gap-2">
                            <Phone className="h-4 w-4 text-muted-foreground" />
                            <span>{booking.service_provider_profiles.contact_phone}</span>
                          </div>
                        )}
                        <div className="font-medium text-primary">
                          TZS {booking.total_price?.toLocaleString() || 'N/A'}
                        </div>
                      </div>

                      {booking.listings && (
                        <div className="flex items-center gap-2 text-sm bg-muted/50 p-2 rounded">
                          <MapPin className="h-4 w-4 text-muted-foreground" />
                          <span>Property: {booking.listings.title}</span>
                        </div>
                      )}

                      {booking.notes && (
                        <p className="text-sm text-muted-foreground bg-muted/50 p-2 rounded">
                          {booking.notes}
                        </p>
                      )}
                    </div>

                    <div className="flex gap-2 shrink-0">
                      {booking.status === 'pending' && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-destructive"
                          onClick={() => cancelBooking(booking.id)}
                        >
                          <XCircle className="h-4 w-4 mr-1" />
                          Cancel
                        </Button>
                      )}
                      {booking.status === 'completed' && (
                        <Button variant="outline" size="sm">
                          <Star className="h-4 w-4 mr-1" />
                          Leave Review
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </MainLayout>
  );
}
