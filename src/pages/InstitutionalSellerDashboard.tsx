import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { InstitutionalSellerWithDetails } from '@/types/database';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Building2, ExternalLink, Edit, BarChart3, FileText, Users, TrendingUp } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { InstitutionProfileCompletion } from '@/components/InstitutionProfileCompletion';

export default function InstitutionalSellerDashboard() {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [institution, setInstitution] = useState<InstitutionalSellerWithDetails | null>(null);
  const [stats, setStats] = useState({
    totalListings: 0,
    activeListings: 0,
    viewsThisMonth: 0,
    inquiriesThisMonth: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchInstitutionData();
    }
  }, [user]);

  const fetchInstitutionData = async () => {
    try {
      // Fetch institution profile
      const { data: instData, error: instError } = await supabase
        .from('institutional_sellers')
        .select('*')
        .eq('profile_id', user?.id)
        .single();

      if (instError) throw instError;
      setInstitution(instData as any);

      // Fetch statistics
      const { count: totalCount } = await supabase
        .from('listings')
        .select('*', { count: 'exact', head: true })
        .eq('owner_id', user?.id);

      const { count: activeCount } = await supabase
        .from('listings')
        .select('*', { count: 'exact', head: true })
        .eq('owner_id', user?.id)
        .eq('status', 'published');

      setStats({
        totalListings: totalCount || 0,
        activeListings: activeCount || 0,
        viewsThisMonth: 0, // Placeholder
        inquiriesThisMonth: 0, // Placeholder
      });
    } catch (error) {
      console.error('Error fetching institution data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load dashboard data',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/3" />
          <div className="h-64 bg-muted rounded" />
        </div>
      </div>
    );
  }

  if (!institution) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <Building2 className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
        <h2 className="text-2xl font-bold mb-2">No Institutional Profile Found</h2>
        <p className="text-muted-foreground mb-4">
          You haven't applied as an institutional seller yet.
        </p>
        <Button asChild>
          <a href="/institutional-seller/apply">Apply Now</a>
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6 md:py-8 max-w-7xl space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
            <Building2 className="h-6 w-6 md:h-8 md:w-8" />
            {institution.institution_name}
          </h1>
          <p className="text-sm md:text-base text-muted-foreground">Institutional Seller Dashboard</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {institution.is_approved && institution.slug && (
            <Button variant="outline" asChild size="sm">
              <a href={`/institution/${institution.slug}`} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-4 w-4 mr-2" />
                View Public Page
              </a>
            </Button>
          )}
          <Button variant="outline" size="sm">
            <Edit className="h-4 w-4 mr-2" />
            Edit Profile
          </Button>
        </div>
      </div>

      {/* Status Badge */}
      {!institution.is_approved && (
        <Card className="border-warning bg-warning/10">
          <CardContent className="pt-6">
            <p className="text-sm">
              <strong>⏳ Pending Approval:</strong> Your institutional seller application is under review. 
              You'll be notified once it's approved and your custom landing page will be activated.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Stats Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Listings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl md:text-3xl font-bold">{stats.totalListings}</div>
            <p className="text-xs text-muted-foreground mt-1">All properties</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active Listings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl md:text-3xl font-bold text-success">{stats.activeListings}</div>
            <p className="text-xs text-muted-foreground mt-1">Published & visible</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Views (30d)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl md:text-3xl font-bold">{stats.viewsThisMonth}</div>
            <p className="text-xs text-muted-foreground mt-1">Coming soon</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Inquiries (30d)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl md:text-3xl font-bold">{stats.inquiriesThisMonth}</div>
            <p className="text-xs text-muted-foreground mt-1">Coming soon</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3 lg:w-auto lg:inline-grid">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="listings">Listings</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          {/* Profile Completion */}
          <InstitutionProfileCompletion institution={institution} />

          <Card>
            <CardHeader>
              <CardTitle>Institution Profile</CardTitle>
              <CardDescription>Your public-facing institutional information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Institution Type</p>
                  <p className="font-medium">
                    {institution.institution_type.charAt(0).toUpperCase() + institution.institution_type.slice(1)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Public URL</p>
                  {institution.is_approved && institution.slug ? (
                    <a 
                      href={`/institution/${institution.slug}`} 
                      className="font-medium text-primary hover:underline text-sm break-all"
                    >
                      /institution/{institution.slug}
                    </a>
                  ) : (
                    <p className="text-sm text-muted-foreground">Available after approval</p>
                  )}
                </div>
                {institution.year_established && (
                  <div>
                    <p className="text-sm text-muted-foreground">Year Established</p>
                    <p className="font-medium">{institution.year_established}</p>
                  </div>
                )}
                {institution.total_employees && (
                  <div>
                    <p className="text-sm text-muted-foreground">Total Employees</p>
                    <p className="font-medium">{institution.total_employees}</p>
                  </div>
                )}
              </div>

              {institution.about_company && (
                <div className="pt-4 border-t">
                  <p className="text-sm text-muted-foreground mb-2">About</p>
                  <p className="text-sm line-clamp-3">{institution.about_company}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate('/create-listing')}>
              <CardContent className="pt-6 text-center">
                <FileText className="h-8 w-8 mx-auto mb-2 text-primary" />
                <h3 className="font-semibold mb-1">Create New Listing</h3>
                <p className="text-xs text-muted-foreground">Add a new property</p>
              </CardContent>
            </Card>

            <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate('/listings')}>
              <CardContent className="pt-6 text-center">
                <BarChart3 className="h-8 w-8 mx-auto mb-2 text-primary" />
                <h3 className="font-semibold mb-1">Manage Listings</h3>
                <p className="text-xs text-muted-foreground">View & edit properties</p>
              </CardContent>
            </Card>

            <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate('/messages')}>
              <CardContent className="pt-6 text-center">
                <Users className="h-8 w-8 mx-auto mb-2 text-primary" />
                <h3 className="font-semibold mb-1">View Inquiries</h3>
                <p className="text-xs text-muted-foreground">Buyer messages</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="listings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Your Listings</CardTitle>
              <CardDescription>Manage all your property listings</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="mb-4">View and manage all your listings</p>
                <Button asChild>
                  <a href="/listings">Go to Listings</a>
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Performance Analytics</CardTitle>
              <CardDescription>Track your listing performance and engagement</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Analytics coming soon</p>
                <p className="text-sm mt-2">Track views, inquiries, and conversion rates</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}