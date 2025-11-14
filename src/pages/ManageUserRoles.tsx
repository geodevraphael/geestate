import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Navbar } from '@/components/Navbar';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { Shield, Plus, Trash2, ArrowLeft, AlertCircle } from 'lucide-react';
import { AppRole } from '@/types/database';
import { format } from 'date-fns';

interface RoleAssignment {
  id: string;
  role: AppRole;
  assigned_at: string;
  assigned_by: string | null;
}

export default function ManageUserRoles() {
  return (
    <ProtectedRoute requireRole={['admin']}>
      <ManageUserRolesContent />
    </ProtectedRoute>
  );
}

function ManageUserRolesContent() {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const [userProfile, setUserProfile] = useState<any>(null);
  const [roles, setRoles] = useState<RoleAssignment[]>([]);
  const [newRole, setNewRole] = useState<AppRole | ''>('');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  const availableRoles: AppRole[] = [
    'buyer',
    'seller',
    'broker',
    'admin',
    'verification_officer',
    'compliance_officer',
    'spatial_analyst',
    'customer_success',
    'staff',
  ];

  useEffect(() => {
    if (userId) {
      fetchUserData();
    }
  }, [userId]);

  const fetchUserData = async () => {
    try {
      // Fetch user profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (profileError) throw profileError;
      setUserProfile(profileData);

      // Fetch roles with assigner info
      const { data: rolesData, error: rolesError } = await supabase
        .from('user_roles')
        .select('id, role, assigned_at, assigned_by')
        .eq('user_id', userId)
        .order('assigned_at', { ascending: true });

      if (rolesError) throw rolesError;
      
      setRoles(rolesData || []);
    } catch (error) {
      console.error('Error fetching user data:', error);
      toast.error('Failed to load user data');
    } finally {
      setLoading(false);
    }
  };

  const handleAssignRole = async () => {
    if (!newRole || !userId || !currentUser) {
      toast.error('Please select a role');
      return;
    }

    setProcessing(true);

    try {
      // Check if role already exists
      if (roles.some(r => r.role === newRole)) {
        toast.error('User already has this role');
        setProcessing(false);
        return;
      }

      // Insert new role
      const { error: insertError } = await supabase
        .from('user_roles')
        .insert({
          user_id: userId,
          role: newRole,
          assigned_by: currentUser.id,
        });

      if (insertError) throw insertError;

      // Log the action
      await supabase.from('audit_logs').insert({
        action_type: 'role_assigned',
        actor_id: currentUser.id,
        action_details: {
          user_id: userId,
          role: newRole,
          reason: reason || 'No reason provided',
        },
      });

      toast.success(`Role ${newRole} assigned successfully`);
      setNewRole('');
      setReason('');
      fetchUserData();
    } catch (error: any) {
      console.error('Error assigning role:', error);
      toast.error(error.message || 'Failed to assign role');
    } finally {
      setProcessing(false);
    }
  };

  const handleRevokeRole = async (roleId: string, role: AppRole) => {
    if (!currentUser || !userId) return;

    // Prevent revoking the last role
    if (roles.length === 1) {
      toast.error('Cannot revoke the last role. User must have at least one role.');
      return;
    }

    setProcessing(true);

    try {
      const { error: deleteError } = await supabase
        .from('user_roles')
        .delete()
        .eq('id', roleId);

      if (deleteError) throw deleteError;

      // Log the action
      await supabase.from('audit_logs').insert({
        action_type: 'role_revoked',
        actor_id: currentUser.id,
        action_details: {
          user_id: userId,
          role: role,
        },
      });

      toast.success(`Role ${role} revoked successfully`);
      fetchUserData();
    } catch (error: any) {
      console.error('Error revoking role:', error);
      toast.error(error.message || 'Failed to revoke role');
    } finally {
      setProcessing(false);
    }
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

  if (!userProfile) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-8">
          <Card>
            <CardContent className="text-center py-12">
              <AlertCircle className="h-12 w-12 mx-auto text-destructive mb-4" />
              <h2 className="text-xl font-semibold mb-2">User Not Found</h2>
              <p className="text-muted-foreground mb-4">The user you're trying to manage doesn't exist.</p>
              <Link to="/admin/users">
                <Button>Back to Users</Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const unassignedRoles = availableRoles.filter(
    role => !roles.some(r => r.role === role)
  );

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Button
          variant="ghost"
          onClick={() => navigate(-1)}
          className="mb-6"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>

        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">Manage User Roles</h1>
          <p className="text-muted-foreground">
            Managing roles for <span className="font-medium">{userProfile.full_name}</span>
          </p>
        </div>

        {/* Current Roles */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Current Roles</CardTitle>
            <CardDescription>
              {roles.length} role(s) assigned
            </CardDescription>
          </CardHeader>
          <CardContent>
            {roles.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Shield className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No roles assigned yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {roles.map((roleAssignment) => (
                  <div
                    key={roleAssignment.id}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge className="capitalize">
                          {roleAssignment.role.replace(/_/g, ' ')}
                        </Badge>
                        {roles[0].id === roleAssignment.id && (
                          <Badge variant="outline">Primary</Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Assigned {format(new Date(roleAssignment.assigned_at), 'MMM dd, yyyy')}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRevokeRole(roleAssignment.id, roleAssignment.role)}
                      disabled={processing || roles.length === 1}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Assign New Role */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Assign New Role
            </CardTitle>
            <CardDescription>
              Add additional roles to this user
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Select Role</Label>
              <Select value={newRole} onValueChange={(value) => setNewRole(value as AppRole)}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a role..." />
                </SelectTrigger>
                <SelectContent>
                  {unassignedRoles.length === 0 ? (
                    <div className="p-2 text-sm text-muted-foreground">
                      All roles already assigned
                    </div>
                  ) : (
                    unassignedRoles.map((role) => (
                      <SelectItem key={role} value={role} className="capitalize">
                        {role.replace(/_/g, ' ')}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Reason (Optional)</Label>
              <Textarea
                placeholder="Why are you assigning this role?"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
              />
            </div>

            <Button
              onClick={handleAssignRole}
              disabled={!newRole || processing || unassignedRoles.length === 0}
              className="w-full"
            >
              <Plus className="h-4 w-4 mr-2" />
              Assign Role
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
