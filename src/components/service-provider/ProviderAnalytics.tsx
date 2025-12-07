import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  TrendingUp, 
  Users, 
  DollarSign, 
  Star,
  Calendar,
  CheckCircle,
  XCircle,
  Clock
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';

interface ProviderAnalyticsProps {
  providerId: string;
}

interface AnalyticsData {
  totalEarnings: number;
  totalBookings: number;
  completedBookings: number;
  cancelledBookings: number;
  pendingBookings: number;
  averageRating: number;
  totalReviews: number;
  monthlyData: { month: string; earnings: number; bookings: number }[];
  serviceBreakdown: { name: string; count: number; earnings: number }[];
}

const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#00C49F', '#FFBB28'];

export function ProviderAnalytics({ providerId }: ProviderAnalyticsProps) {
  const { user } = useAuth();
  const [analytics, setAnalytics] = useState<AnalyticsData>({
    totalEarnings: 0,
    totalBookings: 0,
    completedBookings: 0,
    cancelledBookings: 0,
    pendingBookings: 0,
    averageRating: 0,
    totalReviews: 0,
    monthlyData: [],
    serviceBreakdown: [],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, [user]);

  const fetchAnalytics = async () => {
    try {
      // Fetch bookings
      const { data: bookings } = await supabase
        .from('service_bookings')
        .select('*, provider_services(name)')
        .eq('provider_id', user?.id);

      // Fetch reviews
      const { data: reviews } = await supabase
        .from('service_provider_reviews')
        .select('rating')
        .eq('provider_id', providerId);

      // Calculate analytics
      const completed = bookings?.filter(b => b.status === 'completed') || [];
      const cancelled = bookings?.filter(b => b.status === 'cancelled') || [];
      const pending = bookings?.filter(b => b.status === 'pending') || [];

      const totalEarnings = completed.reduce((sum, b) => sum + (b.total_price || 0), 0);
      const averageRating = reviews?.length 
        ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length 
        : 0;

      // Calculate monthly data
      const monthlyMap = new Map<string, { earnings: number; bookings: number }>();
      bookings?.forEach(booking => {
        const month = new Date(booking.booking_date).toLocaleDateString('en-US', { month: 'short' });
        const current = monthlyMap.get(month) || { earnings: 0, bookings: 0 };
        monthlyMap.set(month, {
          earnings: current.earnings + (booking.status === 'completed' ? (booking.total_price || 0) : 0),
          bookings: current.bookings + 1,
        });
      });

      const monthlyData = Array.from(monthlyMap.entries()).map(([month, data]) => ({
        month,
        ...data,
      }));

      // Calculate service breakdown
      const serviceMap = new Map<string, { count: number; earnings: number }>();
      bookings?.forEach(booking => {
        const serviceName = booking.provider_services?.name || 'Unknown';
        const current = serviceMap.get(serviceName) || { count: 0, earnings: 0 };
        serviceMap.set(serviceName, {
          count: current.count + 1,
          earnings: current.earnings + (booking.status === 'completed' ? (booking.total_price || 0) : 0),
        });
      });

      const serviceBreakdown = Array.from(serviceMap.entries()).map(([name, data]) => ({
        name,
        ...data,
      }));

      setAnalytics({
        totalEarnings,
        totalBookings: bookings?.length || 0,
        completedBookings: completed.length,
        cancelledBookings: cancelled.length,
        pendingBookings: pending.length,
        averageRating,
        totalReviews: reviews?.length || 0,
        monthlyData,
        serviceBreakdown,
      });
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  const statusData = [
    { name: 'Completed', value: analytics.completedBookings, color: '#22c55e' },
    { name: 'Pending', value: analytics.pendingBookings, color: '#eab308' },
    { name: 'Cancelled', value: analytics.cancelledBookings, color: '#ef4444' },
  ].filter(d => d.value > 0);

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 bg-green-100 dark:bg-green-950 rounded-full flex items-center justify-center">
                <DollarSign className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Earnings</p>
                <p className="text-xl font-bold">TZS {analytics.totalEarnings.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 bg-blue-100 dark:bg-blue-950 rounded-full flex items-center justify-center">
                <Calendar className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Bookings</p>
                <p className="text-xl font-bold">{analytics.totalBookings}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 bg-yellow-100 dark:bg-yellow-950 rounded-full flex items-center justify-center">
                <Star className="h-5 w-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Average Rating</p>
                <p className="text-xl font-bold">{analytics.averageRating.toFixed(1)} / 5</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 bg-purple-100 dark:bg-purple-950 rounded-full flex items-center justify-center">
                <CheckCircle className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Completion Rate</p>
                <p className="text-xl font-bold">
                  {analytics.totalBookings > 0 
                    ? Math.round((analytics.completedBookings / analytics.totalBookings) * 100)
                    : 0}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Monthly Earnings Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Monthly Performance
            </CardTitle>
          </CardHeader>
          <CardContent>
            {analytics.monthlyData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={analytics.monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip 
                    formatter={(value: number, name: string) => [
                      name === 'earnings' ? `TZS ${value.toLocaleString()}` : value,
                      name === 'earnings' ? 'Earnings' : 'Bookings'
                    ]}
                  />
                  <Bar dataKey="earnings" fill="#8884d8" name="earnings" />
                  <Bar dataKey="bookings" fill="#82ca9d" name="bookings" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                No data available yet
              </div>
            )}
          </CardContent>
        </Card>

        {/* Booking Status Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Booking Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            {statusData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {statusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                No bookings yet
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Service Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Service Performance</CardTitle>
          <CardDescription>Breakdown by service type</CardDescription>
        </CardHeader>
        <CardContent>
          {analytics.serviceBreakdown.length > 0 ? (
            <div className="space-y-4">
              {analytics.serviceBreakdown.map((service, index) => (
                <div key={service.name} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div 
                      className="h-3 w-3 rounded-full" 
                      style={{ backgroundColor: COLORS[index % COLORS.length] }}
                    />
                    <span className="font-medium">{service.name}</span>
                  </div>
                  <div className="flex items-center gap-6 text-sm">
                    <span className="text-muted-foreground">
                      {service.count} booking{service.count !== 1 ? 's' : ''}
                    </span>
                    <span className="font-medium text-primary">
                      TZS {service.earnings.toLocaleString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No service data available yet
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
