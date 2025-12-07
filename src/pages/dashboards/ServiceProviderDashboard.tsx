import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { MainLayout } from '@/components/layouts/MainLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { 
  Briefcase, 
  Calendar, 
  DollarSign, 
  Star, 
  Clock, 
  Users,
  Plus,
  Settings,
  Bell,
  TrendingUp,
  CheckCircle,
  AlertCircle,
  Eye
} from 'lucide-react';
import { ServiceManagement } from '@/components/service-provider/ServiceManagement';
import { CalendarManagement } from '@/components/service-provider/CalendarManagement';
import { BookingRequests } from '@/components/service-provider/BookingRequests';
import { ProviderAnalytics } from '@/components/service-provider/ProviderAnalytics';
import { ProviderProfileSettings } from '@/components/service-provider/ProviderProfileSettings';
import { Link } from 'react-router-dom';

interface ProviderProfile {
  id: string;
  company_name: string;
  provider_type: string;
  is_verified: boolean;
  rating: number;
  total_reviews: number;
  completed_projects: number;
  contact_email: string;
  contact_phone?: string;
  description?: string;
  website_url?: string;
  service_areas?: string[];
  is_active?: boolean;
}

interface DashboardStats {
  pendingBookings: number;
  totalBookings: number;
  monthlyEarnings: number;
  activeServices: number;
}

export default function ServiceProviderDashboard() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<ProviderProfile | null>(null);
  const [stats, setStats] = useState<DashboardStats>({
    pendingBookings: 0,
    totalBookings: 0,
    monthlyEarnings: 0,
    activeServices: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchProviderProfile();
      fetchDashboardStats();
    }
  }, [user]);

  const fetchProviderProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('service_provider_profiles')
        .select('*')
        .eq('user_id', user?.id)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      setProfile(data);
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchDashboardStats = async () => {
    try {
      // Fetch booking stats
      const { data: bookings } = await supabase
        .from('service_bookings')
        .select('id, status, total_price')
        .eq('provider_id', user?.id);

      const pendingBookings = bookings?.filter(b => b.status === 'pending').length || 0;
      const totalBookings = bookings?.length || 0;
      const monthlyEarnings = bookings
        ?.filter(b => b.status === 'completed')
        .reduce((sum, b) => sum + (b.total_price || 0), 0) || 0;

      // Fetch active services count
      const { count: activeServices } = await supabase
        .from('provider_services')
        .select('id', { count: 'exact' })
        .eq('provider_id', user?.id)
        .eq('is_active', true);

      setStats({
        pendingBookings,
        totalBookings,
        monthlyEarnings,
        activeServices: activeServices || 0
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
        </div>
      </MainLayout>
    );
  }

  if (!profile) {
    return (
      <MainLayout>
        <div className="container mx-auto px-4 py-12">
          <Card className="max-w-lg mx-auto text-center">
            <CardHeader>
              <CardTitle>Complete Your Provider Profile</CardTitle>
              <CardDescription>
                You need to set up your service provider profile to access this dashboard.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link to="/become-service-provider">
                <Button size="lg">
                  <Plus className="h-4 w-4 mr-2" />
                  Set Up Profile
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="w-full px-4 md:px-6 lg:px-8 py-6 space-y-6">
        {/* Header with gradient */}
        <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent rounded-2xl p-6 border">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl md:text-3xl font-bold">{profile.company_name}</h1>
                {profile.is_verified ? (
                  <Badge className="bg-green-100 text-green-800">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Verified
                  </Badge>
                ) : (
                  <Badge variant="secondary">
                    <Clock className="h-3 w-3 mr-1" />
                    Pending Verification
                  </Badge>
                )}
              </div>
              <p className="text-muted-foreground mt-1 capitalize">{profile.provider_type.replace('_', ' ')}</p>
              <div className="flex items-center gap-4 mt-2">
                <div className="flex items-center gap-1">
                  <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                  <span className="font-medium">{profile.rating?.toFixed(1) || '0.0'}</span>
                  <span className="text-muted-foreground">({profile.total_reviews} reviews)</span>
                </div>
                <span className="text-muted-foreground">•</span>
                <span className="text-muted-foreground">{profile.completed_projects} projects</span>
              </div>
            </div>
            <div className="flex gap-2">
              <Link to={`/service-providers/${profile.id}`}>
                <Button variant="outline">
                  <Eye className="h-4 w-4 mr-2" />
                  View Public Profile
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-950/30 dark:to-blue-900/20 border-blue-200/50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Pending Bookings</p>
                  <p className="text-2xl font-bold">{stats.pendingBookings}</p>
                </div>
                <div className="h-10 w-10 bg-blue-500/10 rounded-full flex items-center justify-center">
                  <Bell className="h-5 w-5 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-50 to-green-100/50 dark:from-green-950/30 dark:to-green-900/20 border-green-200/50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Bookings</p>
                  <p className="text-2xl font-bold">{stats.totalBookings}</p>
                </div>
                <div className="h-10 w-10 bg-green-500/10 rounded-full flex items-center justify-center">
                  <Calendar className="h-5 w-5 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-50 to-purple-100/50 dark:from-purple-950/30 dark:to-purple-900/20 border-purple-200/50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Monthly Earnings</p>
                  <p className="text-2xl font-bold">TZS {stats.monthlyEarnings.toLocaleString()}</p>
                </div>
                <div className="h-10 w-10 bg-purple-500/10 rounded-full flex items-center justify-center">
                  <DollarSign className="h-5 w-5 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-orange-50 to-orange-100/50 dark:from-orange-950/30 dark:to-orange-900/20 border-orange-200/50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Active Services</p>
                  <p className="text-2xl font-bold">{stats.activeServices}</p>
                </div>
                <div className="h-10 w-10 bg-orange-500/10 rounded-full flex items-center justify-center">
                  <Briefcase className="h-5 w-5 text-orange-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="bookings" className="space-y-4">
          <TabsList className="grid grid-cols-5 w-full max-w-2xl">
            <TabsTrigger value="bookings" className="gap-2">
              <Calendar className="h-4 w-4" />
              <span className="hidden sm:inline">Bookings</span>
            </TabsTrigger>
            <TabsTrigger value="services" className="gap-2">
              <Briefcase className="h-4 w-4" />
              <span className="hidden sm:inline">Services</span>
            </TabsTrigger>
            <TabsTrigger value="calendar" className="gap-2">
              <Clock className="h-4 w-4" />
              <span className="hidden sm:inline">Calendar</span>
            </TabsTrigger>
            <TabsTrigger value="analytics" className="gap-2">
              <TrendingUp className="h-4 w-4" />
              <span className="hidden sm:inline">Analytics</span>
            </TabsTrigger>
            <TabsTrigger value="settings" className="gap-2">
              <Settings className="h-4 w-4" />
              <span className="hidden sm:inline">Settings</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="bookings">
            <BookingRequests providerId={profile.id} onUpdate={fetchDashboardStats} />
          </TabsContent>

          <TabsContent value="services">
            <ServiceManagement providerId={profile.id} onUpdate={fetchDashboardStats} />
          </TabsContent>

          <TabsContent value="calendar">
            <CalendarManagement providerId={profile.id} />
          </TabsContent>

          <TabsContent value="analytics">
            <ProviderAnalytics providerId={profile.id} />
          </TabsContent>

          <TabsContent value="settings">
            <ProviderProfileSettings profile={profile} onUpdate={fetchProviderProfile} />
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}
