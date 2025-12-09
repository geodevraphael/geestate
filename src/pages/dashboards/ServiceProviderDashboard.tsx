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
  Eye,
  FileSearch,
  MessageSquare,
  Receipt,
  Wallet
} from 'lucide-react';
import { ServiceManagement } from '@/components/service-provider/ServiceManagement';
import { CalendarManagement } from '@/components/service-provider/CalendarManagement';
import { BookingRequests } from '@/components/service-provider/BookingRequests';
import { ServiceRequests } from '@/components/service-provider/ServiceRequests';
import { ProviderAnalytics } from '@/components/service-provider/ProviderAnalytics';
import { ProviderProfileSettings } from '@/components/service-provider/ProviderProfileSettings';
import { ProviderEarnings } from '@/components/service-provider/ProviderEarnings';
import { ClientMessaging } from '@/components/service-provider/ClientMessaging';
import { Link } from 'react-router-dom';

interface ProviderProfile {
  id: string;
  user_id: string;
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
  pendingRequests: number;
  acceptedRequests: number;
  completedRequests: number;
  totalEarnings: number;
  activeServices: number;
  pendingFees: number;
}

export default function ServiceProviderDashboard() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<ProviderProfile | null>(null);
  const [stats, setStats] = useState<DashboardStats>({
    pendingRequests: 0,
    acceptedRequests: 0,
    completedRequests: 0,
    totalEarnings: 0,
    activeServices: 0,
    pendingFees: 0
  });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('requests');

  useEffect(() => {
    if (user) {
      fetchProviderProfile();
    }
  }, [user]);

  useEffect(() => {
    if (profile) {
      fetchDashboardStats();
    }
  }, [profile]);

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
    if (!profile) return;

    try {
      // Fetch service request stats using the profile ID
      const { data: requests } = await supabase
        .from('service_requests')
        .select('id, status, payment_amount, payment_confirmed_at')
        .eq('service_provider_id', profile.id);

      const pendingRequests = requests?.filter(r => ['pending', 'assigned'].includes(r.status)).length || 0;
      const acceptedRequests = requests?.filter(r => ['accepted', 'quoted', 'in_progress'].includes(r.status)).length || 0;
      const completedRequests = requests?.filter(r => r.status === 'completed').length || 0;
      const totalEarnings = requests
        ?.filter(r => r.status === 'completed' && r.payment_confirmed_at)
        .reduce((sum, r) => sum + (r.payment_amount || 0), 0) || 0;

      // Fetch active services count
      const { count: activeServices } = await supabase
        .from('provider_services')
        .select('id', { count: 'exact' })
        .eq('provider_id', user?.id)
        .eq('is_active', true);

      // Fetch pending platform fees
      const { data: fees } = await supabase
        .from('geoinsight_income_records')
        .select('amount_due')
        .eq('user_id', user?.id)
        .in('status', ['pending', 'awaiting_review']);

      const pendingFees = fees?.reduce((sum, f) => sum + f.amount_due, 0) || 0;

      setStats({
        pendingRequests,
        acceptedRequests,
        completedRequests,
        totalEarnings,
        activeServices: activeServices || 0,
        pendingFees
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
                  <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
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
            <div className="flex gap-2 flex-wrap">
              {stats.pendingFees > 0 && (
                <Link to="/geoinsight-payments">
                  <Button variant="outline" className="gap-2 border-amber-500/50 text-amber-600">
                    <Receipt className="h-4 w-4" />
                    Fees Due: TZS {stats.pendingFees.toLocaleString()}
                  </Button>
                </Link>
              )}
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
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <Card 
            className={`cursor-pointer transition-all hover:shadow-md ${activeTab === 'requests' ? 'ring-2 ring-primary' : ''}`}
            onClick={() => setActiveTab('requests')}
          >
            <CardContent className="p-4">
              <div className="flex flex-col">
                <div className="flex items-center justify-between">
                  <Bell className="h-5 w-5 text-amber-600" />
                  <Badge variant="secondary" className="bg-amber-500/10 text-amber-600">
                    {stats.pendingRequests}
                  </Badge>
                </div>
                <p className="text-2xl font-bold mt-2">{stats.pendingRequests}</p>
                <p className="text-xs text-muted-foreground">New Requests</p>
              </div>
            </CardContent>
          </Card>

          <Card 
            className={`cursor-pointer transition-all hover:shadow-md ${activeTab === 'requests' ? 'ring-2 ring-primary' : ''}`}
            onClick={() => setActiveTab('requests')}
          >
            <CardContent className="p-4">
              <div className="flex flex-col">
                <div className="flex items-center justify-between">
                  <Clock className="h-5 w-5 text-blue-600" />
                </div>
                <p className="text-2xl font-bold mt-2">{stats.acceptedRequests}</p>
                <p className="text-xs text-muted-foreground">In Progress</p>
              </div>
            </CardContent>
          </Card>

          <Card 
            className={`cursor-pointer transition-all hover:shadow-md`}
            onClick={() => setActiveTab('requests')}
          >
            <CardContent className="p-4">
              <div className="flex flex-col">
                <div className="flex items-center justify-between">
                  <CheckCircle className="h-5 w-5 text-emerald-600" />
                </div>
                <p className="text-2xl font-bold mt-2">{stats.completedRequests}</p>
                <p className="text-xs text-muted-foreground">Completed</p>
              </div>
            </CardContent>
          </Card>

          <Card 
            className={`cursor-pointer transition-all hover:shadow-md ${activeTab === 'earnings' ? 'ring-2 ring-primary' : ''}`}
            onClick={() => setActiveTab('earnings')}
          >
            <CardContent className="p-4">
              <div className="flex flex-col">
                <div className="flex items-center justify-between">
                  <Wallet className="h-5 w-5 text-emerald-600" />
                </div>
                <p className="text-lg font-bold mt-2">TZS {(stats.totalEarnings / 1000).toFixed(0)}K</p>
                <p className="text-xs text-muted-foreground">Total Earnings</p>
              </div>
            </CardContent>
          </Card>

          <Card 
            className={`cursor-pointer transition-all hover:shadow-md ${activeTab === 'services' ? 'ring-2 ring-primary' : ''}`}
            onClick={() => setActiveTab('services')}
          >
            <CardContent className="p-4">
              <div className="flex flex-col">
                <div className="flex items-center justify-between">
                  <Briefcase className="h-5 w-5 text-purple-600" />
                </div>
                <p className="text-2xl font-bold mt-2">{stats.activeServices}</p>
                <p className="text-xs text-muted-foreground">Active Services</p>
              </div>
            </CardContent>
          </Card>

          <Card 
            className={`cursor-pointer transition-all hover:shadow-md ${stats.pendingFees > 0 ? 'border-amber-500/50' : ''}`}
            onClick={() => setActiveTab('earnings')}
          >
            <CardContent className="p-4">
              <div className="flex flex-col">
                <div className="flex items-center justify-between">
                  <Receipt className="h-5 w-5 text-amber-600" />
                  {stats.pendingFees > 0 && (
                    <AlertCircle className="h-4 w-4 text-amber-500" />
                  )}
                </div>
                <p className="text-lg font-bold mt-2 text-amber-600">
                  TZS {stats.pendingFees.toLocaleString()}
                </p>
                <p className="text-xs text-muted-foreground">Fees Due</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid grid-cols-4 md:grid-cols-8 w-full">
            <TabsTrigger value="requests" className="gap-2">
              <FileSearch className="h-4 w-4" />
              <span className="hidden sm:inline">Requests</span>
            </TabsTrigger>
            <TabsTrigger value="earnings" className="gap-2">
              <Wallet className="h-4 w-4" />
              <span className="hidden sm:inline">Earnings</span>
            </TabsTrigger>
            <TabsTrigger value="messages" className="gap-2">
              <MessageSquare className="h-4 w-4" />
              <span className="hidden sm:inline">Messages</span>
            </TabsTrigger>
            <TabsTrigger value="services" className="gap-2">
              <Briefcase className="h-4 w-4" />
              <span className="hidden sm:inline">Services</span>
            </TabsTrigger>
            <TabsTrigger value="calendar" className="gap-2">
              <Calendar className="h-4 w-4" />
              <span className="hidden sm:inline">Calendar</span>
            </TabsTrigger>
            <TabsTrigger value="bookings" className="gap-2">
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">Bookings</span>
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

          <TabsContent value="requests">
            <ServiceRequests providerId={profile.id} />
          </TabsContent>

          <TabsContent value="earnings">
            <ProviderEarnings providerId={profile.id} userId={user?.id || ''} />
          </TabsContent>

          <TabsContent value="messages">
            <ClientMessaging providerId={profile.id} />
          </TabsContent>

          <TabsContent value="services">
            <ServiceManagement providerId={profile.id} onUpdate={fetchDashboardStats} />
          </TabsContent>

          <TabsContent value="calendar">
            <CalendarManagement providerId={profile.id} />
          </TabsContent>

          <TabsContent value="bookings">
            <BookingRequests providerId={profile.id} onUpdate={fetchDashboardStats} />
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
