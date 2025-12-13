import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { Navbar } from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { Loader2, UserCog, Search, Shield, Mail, Phone, Calendar, Ban, UserCheck } from 'lucide-react';
import { AppRole } from '@/types/database';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Textarea } from '@/components/ui/textarea';

interface UserWithRoles {
  id: string;
  email: string;
  full_name: string;
  phone: string | null;
  created_at: string;
  roles: AppRole[];
  banned_at: string | null;
  ban_reason: string | null;
}

export default function ManageUsers() {
  return (
    <ProtectedRoute requireRole={['admin']}>
      <ManageUsersContent />
    </ProtectedRoute>
  );
}

function ManageUsersContent() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [users, setUsers] = useState<UserWithRoles[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<UserWithRoles[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [roleFilter, setRoleFilter] = useState<AppRole | 'all'>('all');
  const [banDialogOpen, setBanDialogOpen] = useState(false);
  const [unbanDialogOpen, setUnbanDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserWithRoles | null>(null);
  const [banReason, setBanReason] = useState('');
  const [banning, setBanning] = useState(false);

  const availableRoles: AppRole[] = [
    'admin',
    'buyer',
    'seller',
    'broker',
    'verification_officer',
    'compliance_officer',
    'spatial_analyst',
    'customer_success',
    'staff',
  ];

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    filterUsers();
  }, [searchQuery, roleFilter, users]);

  const fetchUsers = async () => {
    try {
      setLoading(true);

      // Fetch all users from auth.users via profiles
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, email, full_name, phone, created_at, banned_at, ban_reason')
        .order('created_at', { ascending: false });

      if (profilesError) throw profilesError;

      // Fetch all role assignments
      const { data: rolesData, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role');

      if (rolesError) throw rolesError;

      // Combine users with their roles
      const usersWithRoles: UserWithRoles[] = (profilesData || []).map((profile) => ({
        id: profile.id,
        email: profile.email,
        full_name: profile.full_name,
        phone: profile.phone,
        created_at: profile.created_at,
        banned_at: profile.banned_at,
        ban_reason: profile.ban_reason,
        roles: rolesData
          ?.filter((r) => r.user_id === profile.id)
          .map((r) => r.role as AppRole) || [],
      }));

      setUsers(usersWithRoles);
      setFilteredUsers(usersWithRoles);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch users. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleBanUser = async () => {
    if (!selectedUser || !user) return;
    
    setBanning(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          banned_at: new Date().toISOString(),
          banned_by: user.id,
          ban_reason: banReason || null,
        })
        .eq('id', selectedUser.id);

      if (error) throw error;

      toast({
        title: 'User Banned',
        description: `${selectedUser.full_name} has been banned.`,
      });

      fetchUsers();
    } catch (error) {
      console.error('Error banning user:', error);
      toast({
        title: 'Error',
        description: 'Failed to ban user. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setBanning(false);
      setBanDialogOpen(false);
      setSelectedUser(null);
      setBanReason('');
    }
  };

  const handleUnbanUser = async () => {
    if (!selectedUser) return;
    
    setBanning(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          banned_at: null,
          banned_by: null,
          ban_reason: null,
        })
        .eq('id', selectedUser.id);

      if (error) throw error;

      toast({
        title: 'User Unbanned',
        description: `${selectedUser.full_name} has been unbanned.`,
      });

      fetchUsers();
    } catch (error) {
      console.error('Error unbanning user:', error);
      toast({
        title: 'Error',
        description: 'Failed to unban user. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setBanning(false);
      setUnbanDialogOpen(false);
      setSelectedUser(null);
    }
  };

  const filterUsers = () => {
    let filtered = [...users];

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (user) =>
          user.email.toLowerCase().includes(query) ||
          user.full_name.toLowerCase().includes(query) ||
          user.roles.some((role) => role.toLowerCase().includes(query))
      );
    }

    // Apply role filter
    if (roleFilter !== 'all') {
      filtered = filtered.filter((user) => user.roles.includes(roleFilter));
    }

    setFilteredUsers(filtered);
  };

  const getRoleBadgeVariant = (role: AppRole) => {
    switch (role) {
      case 'admin':
        return 'destructive';
      case 'verification_officer':
      case 'compliance_officer':
      case 'spatial_analyst':
        return 'default';
      case 'seller':
      case 'broker':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="w-full py-8 px-4 md:px-8 flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <div className="w-full py-8 px-4 md:px-8">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-3xl flex items-center gap-2">
                  <Shield className="h-8 w-8 text-primary" />
                  User Management
                </CardTitle>
                <CardDescription className="mt-2">
                  Manage user accounts and role assignments
                </CardDescription>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-primary">{users.length}</div>
                <div className="text-sm text-muted-foreground">Total Users</div>
              </div>
            </div>
          </CardHeader>

          <CardContent>
            {/* Filters */}
            <div className="flex flex-col md:flex-row gap-4 mb-6">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, email, or role..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="flex gap-2 flex-wrap">
                <Button
                  variant={roleFilter === 'all' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setRoleFilter('all')}
                >
                  All Roles
                </Button>
                {availableRoles.map((role) => (
                  <Button
                    key={role}
                    variant={roleFilter === role ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setRoleFilter(role)}
                  >
                    {role.replace(/_/g, ' ')}
                  </Button>
                ))}
              </div>
            </div>

            {/* Results count */}
            <div className="mb-4 text-sm text-muted-foreground">
              Showing {filteredUsers.length} of {users.length} users
            </div>

            {/* Users Table */}
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Roles</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        No users found matching your criteria
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredUsers.map((userItem) => (
                      <TableRow key={userItem.id} className={userItem.banned_at ? 'bg-destructive/10' : ''}>
                        <TableCell>
                          <div className="font-medium">{userItem.full_name}</div>
                          <div className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                            <Mail className="h-3 w-3" />
                            {userItem.email}
                          </div>
                        </TableCell>
                        <TableCell>
                          {userItem.phone ? (
                            <div className="flex items-center gap-1 text-sm">
                              <Phone className="h-3 w-3 text-muted-foreground" />
                              {userItem.phone}
                            </div>
                          ) : (
                            <span className="text-sm text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {userItem.roles.length > 0 ? (
                              userItem.roles.map((role) => (
                                <Badge
                                  key={role}
                                  variant={getRoleBadgeVariant(role)}
                                  className="text-xs"
                                >
                                  {role.replace(/_/g, ' ')}
                                </Badge>
                              ))
                            ) : (
                              <Badge variant="outline" className="text-xs">
                                No roles
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {userItem.banned_at ? (
                            <div>
                              <Badge variant="destructive" className="text-xs">
                                <Ban className="h-3 w-3 mr-1" />
                                Banned
                              </Badge>
                              {userItem.ban_reason && (
                                <p className="text-xs text-muted-foreground mt-1 max-w-[150px] truncate" title={userItem.ban_reason}>
                                  {userItem.ban_reason}
                                </p>
                              )}
                            </div>
                          ) : (
                            <Badge variant="outline" className="text-xs text-green-600 border-green-600">
                              <UserCheck className="h-3 w-3 mr-1" />
                              Active
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Calendar className="h-3 w-3" />
                            {formatDate(userItem.created_at)}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex gap-2 justify-end">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => navigate(`/admin/users/${userItem.id}/roles`)}
                              className="gap-1"
                            >
                              <UserCog className="h-4 w-4" />
                              Roles
                            </Button>
                            {userItem.banned_at ? (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setSelectedUser(userItem);
                                  setUnbanDialogOpen(true);
                                }}
                                className="gap-1 text-green-600 border-green-600 hover:bg-green-50"
                              >
                                <UserCheck className="h-4 w-4" />
                                Unban
                              </Button>
                            ) : (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setSelectedUser(userItem);
                                  setBanDialogOpen(true);
                                }}
                                className="gap-1 text-destructive border-destructive hover:bg-destructive/10"
                              >
                                <Ban className="h-4 w-4" />
                                Ban
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Ban User Dialog */}
      <AlertDialog open={banDialogOpen} onOpenChange={setBanDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <Ban className="h-5 w-5" />
              Ban User
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to ban <strong>{selectedUser?.full_name}</strong>? 
              This will prevent them from accessing the platform.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <label className="text-sm font-medium">Ban Reason (optional)</label>
            <Textarea
              placeholder="Enter the reason for banning this user..."
              value={banReason}
              onChange={(e) => setBanReason(e.target.value)}
              className="mt-2"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={banning}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBanUser}
              disabled={banning}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {banning ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Ban className="h-4 w-4 mr-2" />}
              Ban User
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Unban User Dialog */}
      <AlertDialog open={unbanDialogOpen} onOpenChange={setUnbanDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-green-600">
              <UserCheck className="h-5 w-5" />
              Unban User
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to unban <strong>{selectedUser?.full_name}</strong>? 
              This will restore their access to the platform.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={banning}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleUnbanUser}
              disabled={banning}
              className="bg-green-600 text-white hover:bg-green-700"
            >
              {banning ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <UserCheck className="h-4 w-4 mr-2" />}
              Unban User
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
