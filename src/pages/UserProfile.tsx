import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Navbar } from '@/components/Navbar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { 
  User, Mail, Phone, MapPin, Calendar, Shield, 
  Star, Building2, Edit, CheckCircle2, Bell 
} from 'lucide-react';
import { format } from 'date-fns';
import { NotificationSettings } from '@/components/NotificationSettings';

interface UserProfile {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  bio: string | null;
  address: string | null;
  organization_name: string | null;
  profile_photo_url: string | null;
  created_at: string;
}

interface UserRole {
  role: string;
  assigned_at: string;
  assigned_by: string | null;
}

export default function UserProfile() {
  const { userId } = useParams<{ userId: string }>();
  const { user, profile: currentUserProfile, hasRole } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [roles, setRoles] = useState<UserRole[]>([]);
  const [reputation, setReputation] = useState<any>(null);
  const [listings, setListings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const isOwnProfile = user?.id === userId;
  const canManageRoles = hasRole('admin');

  useEffect(() => {
    if (userId) {
      fetchUserProfile();
    }
  }, [userId]);

  const fetchUserProfile = async () => {
    try {
      // Fetch profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (profileError) throw profileError;
      setProfile(profileData);

      // Fetch roles
      const { data: rolesData, error: rolesError } = await supabase
        .from('user_roles')
        .select('role, assigned_at, assigned_by')
        .eq('user_id', userId)
        .order('assigned_at', { ascending: true });

      if (rolesError) throw rolesError;
      setRoles(rolesData || []);

      // Fetch reputation
      const { data: reputationData } = await supabase
        .from('reputation_scores')
        .select('*')
        .eq('user_id', userId)
        .single();

      setReputation(reputationData);

      // Fetch listings if user is seller/broker
      if (rolesData?.some(r => ['seller', 'broker'].includes(r.role))) {
        const { data: listingsData } = await supabase
          .from('listings')
          .select('id, title, status, verification_status, created_at')
          .eq('owner_id', userId)
          .eq('status', 'published')
          .limit(5);

        setListings(listingsData || []);
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRoleBadge = (role: string) => {
    const roleColors: Record<string, string> = {
      admin: 'bg-destructive text-destructive-foreground',
      verification_officer: 'bg-primary text-primary-foreground',
      compliance_officer: 'bg-warning text-warning-foreground',
      spatial_analyst: 'bg-accent text-accent-foreground',
      customer_success: 'bg-secondary text-secondary-foreground',
      seller: 'bg-success text-success-foreground',
      broker: 'bg-primary text-primary-foreground',
      buyer: 'bg-muted text-muted-foreground',
      staff: 'bg-secondary text-secondary-foreground',
    };

    return (
      <Badge className={roleColors[role] || 'bg-secondary'}>
        {role.replace(/_/g, ' ')}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-8">
          <Card>
            <CardContent className="text-center py-12">
              <User className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h2 className="text-xl font-semibold mb-2">User Not Found</h2>
              <p className="text-muted-foreground">The user profile you're looking for doesn't exist.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        {/* Profile Header */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-6 items-start">
              <Avatar className="h-24 w-24">
                <AvatarImage src={profile.profile_photo_url || undefined} />
                <AvatarFallback className="text-2xl">
                  {profile.full_name.split(' ').map(n => n[0]).join('').toUpperCase()}
                </AvatarFallback>
              </Avatar>

              <div className="flex-1">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h1 className="text-3xl font-bold mb-2">{profile.full_name}</h1>
                    <div className="flex flex-wrap gap-2 mb-3">
                      {roles.map((role) => getRoleBadge(role.role))}
                    </div>
                  </div>
                  {isOwnProfile && (
                    <Link to={`/profile/${userId}/edit`}>
                      <Button variant="outline">
                        <Edit className="h-4 w-4 mr-2" />
                        Edit Profile
                      </Button>
                    </Link>
                  )}
                </div>

                {profile.bio && (
                  <p className="text-muted-foreground mb-4">{profile.bio}</p>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Mail className="h-4 w-4" />
                    {profile.email}
                  </div>
                  {profile.phone && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Phone className="h-4 w-4" />
                      {profile.phone}
                    </div>
                  )}
                  {profile.address && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <MapPin className="h-4 w-4" />
                      {profile.address}
                    </div>
                  )}
                  {profile.organization_name && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Building2 className="h-4 w-4" />
                      {profile.organization_name}
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    Member since {format(new Date(profile.created_at), 'MMM yyyy')}
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Push Notification Settings - Only for own profile */}
          {isOwnProfile && (
            <div className="md:col-span-2">
              <NotificationSettings />
            </div>
          )}
          {/* Reputation Score */}
          {reputation && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Star className="h-5 w-5 text-warning" />
                  Reputation Score
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">Total Score</span>
                      <span className="text-2xl font-bold">{reputation.total_score}</span>
                    </div>
                  </div>
                  <Separator />
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Honesty</span>
                      <span className="font-medium">{reputation.honesty_score}/100</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Reliability</span>
                      <span className="font-medium">{reputation.reliability_score}/100</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Communication</span>
                      <span className="font-medium">{reputation.communication_score}/100</span>
                    </div>
                  </div>
                  <Separator />
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Deals Closed</span>
                      <span className="font-medium">{reputation.deals_closed_count}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Fraud Flags</span>
                      <span className="font-medium text-destructive">{reputation.fraud_flags_count}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Active Listings */}
          {listings.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Active Listings</CardTitle>
                <CardDescription>Published properties</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {listings.map((listing) => (
                    <Link key={listing.id} to={`/listings/${listing.id}`}>
                      <div className="p-3 border rounded-lg hover:shadow-md transition-shadow">
                        <div className="flex items-center justify-between">
                          <h4 className="font-medium">{listing.title}</h4>
                          <CheckCircle2 className="h-4 w-4 text-success" />
                        </div>
                      </div>
                    </Link>
                  ))}
                  <Link to={`/listings?owner=${userId}`} className="block">
                    <Button variant="outline" className="w-full mt-2">
                      View All Listings
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Role Management (Admin Only) */}
          {canManageRoles && !isOwnProfile && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Role Management
                </CardTitle>
                <CardDescription>Admin controls</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {roles.map((role) => (
                    <div key={role.role} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        {getRoleBadge(role.role)}
                        <p className="text-xs text-muted-foreground mt-1">
                          Assigned {format(new Date(role.assigned_at), 'MMM dd, yyyy')}
                        </p>
                      </div>
                    </div>
                  ))}
                  <Link to={`/admin/users/${userId}/roles`}>
                    <Button variant="outline" className="w-full">
                      <Shield className="h-4 w-4 mr-2" />
                      Manage Roles
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
