import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Building2, UserCheck, CheckCircle, XCircle, Clock, Users } from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';

interface RoleRequest {
  id: string;
  user_id: string;
  requested_role: string;
  status: string;
  business_name: string | null;
  license_number: string | null;
  experience_years: number | null;
  portfolio_url: string | null;
  reason: string | null;
  created_at: string;
  reviewed_at: string | null;
  rejection_reason: string | null;
  applicant?: {
    full_name: string;
    email: string;
  };
}

interface InstitutionalSeller {
  id: string;
  institution_name: string;
  institution_type: string;
  contact_person: string;
  contact_email: string;
  contact_phone: string | null;
  is_approved: boolean | null;
  created_at: string;
  approved_at: string | null;
  notes: string | null;
  applicant?: {
    full_name: string;
    email: string;
  };
}

export default function AdminApprovals() {
  const { user, hasRole, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  
  const [roleRequests, setRoleRequests] = useState<RoleRequest[]>([]);
  const [institutions, setInstitutions] = useState<InstitutionalSeller[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('role-requests');
  
  // Rejection dialog state
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<{ id: string; type: 'role' | 'institution' } | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  useEffect(() => {
    if (authLoading) return;
    
    if (!user) {
      navigate('/auth');
      return;
    }

    if (hasRole('admin')) {
      fetchData();
    } else {
      toast({
        title: 'Access Denied',
        description: 'You need admin privileges to access this page.',
        variant: 'destructive',
      });
      navigate('/dashboard');
    }
  }, [user, hasRole, authLoading]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch role requests (user_id references auth.users, not profiles, so fetch separately)
      const { data: roleData, error: roleError } = await supabase
        .from('role_requests')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (roleError) throw roleError;

      // Fetch applicant profiles for role requests
      const roleRequestsWithProfiles: RoleRequest[] = [];
      if (roleData && roleData.length > 0) {
        const userIds = roleData.map(r => r.user_id);
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('id, full_name, email')
          .in('id', userIds);

        const profilesMap = new Map(profilesData?.map(p => [p.id, p]) || []);
        
        for (const request of roleData) {
          const profile = profilesMap.get(request.user_id);
          roleRequestsWithProfiles.push({
            ...request,
            applicant: profile ? { full_name: profile.full_name, email: profile.email } : undefined
          } as RoleRequest);
        }
      }
      setRoleRequests(roleRequestsWithProfiles);

      // Fetch institutional sellers (profile_id references profiles directly)
      const { data: instData, error: instError } = await supabase
        .from('institutional_sellers')
        .select('*')
        .is('is_approved', null)
        .order('created_at', { ascending: false });

      if (instError) throw instError;

      // Fetch applicant profiles for institutions
      const institutionsWithProfiles: InstitutionalSeller[] = [];
      if (instData && instData.length > 0) {
        const profileIds = instData.map(i => i.profile_id);
        const { data: instProfilesData } = await supabase
          .from('profiles')
          .select('id, full_name, email')
          .in('id', profileIds);

        const instProfilesMap = new Map(instProfilesData?.map(p => [p.id, p]) || []);
        
        for (const inst of instData) {
          const profile = instProfilesMap.get(inst.profile_id);
          institutionsWithProfiles.push({
            ...inst,
            applicant: profile ? { full_name: profile.full_name, email: profile.email } : undefined
          } as InstitutionalSeller);
        }
      }
      setInstitutions(institutionsWithProfiles);
    } catch (error: any) {
      console.error('Error fetching data:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to load approval requests',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleApproveRole = async (requestId: string) => {
    try {
      const { error } = await supabase.rpc('approve_role_request', {
        request_id: requestId,
      });

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Role request approved successfully',
      });
      fetchData();
    } catch (error: any) {
      console.error('Error approving role:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to approve role request',
        variant: 'destructive',
      });
    }
  };

  const handleRejectRole = async () => {
    if (!selectedItem || selectedItem.type !== 'role') return;

    try {
      const { error } = await supabase.rpc('reject_role_request', {
        request_id: selectedItem.id,
        reason: rejectionReason || 'No reason provided',
      });

      if (error) throw error;

      toast({
        title: 'Rejected',
        description: 'Role request has been rejected',
      });
      setRejectDialogOpen(false);
      setRejectionReason('');
      fetchData();
    } catch (error: any) {
      console.error('Error rejecting role:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to reject role request',
        variant: 'destructive',
      });
    }
  };

  const handleApproveInstitution = async (id: string) => {
    try {
      const { error } = await supabase
        .from('institutional_sellers')
        .update({
          is_approved: true,
          approved_by_admin_id: user?.id,
          approved_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Institution approved successfully',
      });
      fetchData();
    } catch (error: any) {
      console.error('Error approving institution:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to approve institution',
        variant: 'destructive',
      });
    }
  };

  const handleRejectInstitution = async () => {
    if (!selectedItem || selectedItem.type !== 'institution') return;

    try {
      const { error } = await supabase
        .from('institutional_sellers')
        .update({
          is_approved: false,
          notes: rejectionReason || 'Rejected by admin',
        })
        .eq('id', selectedItem.id);

      if (error) throw error;

      toast({
        title: 'Rejected',
        description: 'Institution has been rejected',
      });
      setRejectDialogOpen(false);
      setRejectionReason('');
      fetchData();
    } catch (error: any) {
      console.error('Error rejecting institution:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to reject institution',
        variant: 'destructive',
      });
    }
  };

  const openRejectDialog = (id: string, type: 'role' | 'institution') => {
    setSelectedItem({ id, type });
    setRejectDialogOpen(true);
  };

  const handleReject = () => {
    if (selectedItem?.type === 'role') {
      handleRejectRole();
    } else {
      handleRejectInstitution();
    }
  };

  const pendingCount = roleRequests.length + institutions.length;

  if (authLoading || loading) {
    return (
      <div className="container mx-auto p-4 md:p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center space-y-4">
            <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto" />
            <p className="text-muted-foreground">Loading approval requests...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
          <UserCheck className="h-6 w-6 md:h-8 md:w-8" />
          Approval Center
        </h1>
        <p className="text-sm md:text-base text-muted-foreground">
          Manage role requests and institutional seller applications
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Pending Approvals
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl md:text-3xl font-bold text-warning">{pendingCount}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Users className="h-4 w-4" />
              Role Requests
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl md:text-3xl font-bold">{roleRequests.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Institutions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl md:text-3xl font-bold">{institutions.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="role-requests">
            Role Requests ({roleRequests.length})
          </TabsTrigger>
          <TabsTrigger value="institutions">
            Institutions ({institutions.length})
          </TabsTrigger>
        </TabsList>

        {/* Role Requests Tab */}
        <TabsContent value="role-requests" className="space-y-4">
          {roleRequests.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <CheckCircle className="h-12 w-12 mx-auto mb-4 text-success" />
                <p className="text-muted-foreground">No pending role requests</p>
              </CardContent>
            </Card>
          ) : (
            roleRequests.map((request) => (
              <Card key={request.id}>
                <CardHeader>
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                    <div className="flex-1">
                      <CardTitle className="flex items-center gap-2 mb-1">
                        {(request as any).applicant?.full_name || 'Unknown User'}
                        <Badge variant="secondary">{request.requested_role}</Badge>
                      </CardTitle>
                      <CardDescription>
                        {(request as any).applicant?.email} • Applied{' '}
                        {format(new Date(request.created_at), 'MMM dd, yyyy')}
                      </CardDescription>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleApproveRole(request.id)}
                        className="flex items-center gap-1"
                      >
                        <CheckCircle className="h-4 w-4" />
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => openRejectDialog(request.id, 'role')}
                        className="flex items-center gap-1"
                      >
                        <XCircle className="h-4 w-4" />
                        Reject
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    {request.business_name && (
                      <div>
                        <span className="text-muted-foreground">Business Name:</span>{' '}
                        <span className="font-medium">{request.business_name}</span>
                      </div>
                    )}
                    {request.license_number && (
                      <div>
                        <span className="text-muted-foreground">License #:</span>{' '}
                        <span className="font-medium">{request.license_number}</span>
                      </div>
                    )}
                    {request.experience_years !== null && (
                      <div>
                        <span className="text-muted-foreground">Experience:</span>{' '}
                        <span className="font-medium">{request.experience_years} years</span>
                      </div>
                    )}
                    {request.portfolio_url && (
                      <div>
                        <span className="text-muted-foreground">Portfolio:</span>{' '}
                        <a
                          href={request.portfolio_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline"
                        >
                          View
                        </a>
                      </div>
                    )}
                  </div>
                  {request.reason && (
                    <div className="mt-4 p-3 bg-muted rounded-lg">
                      <p className="text-sm">
                        <span className="font-semibold">Reason:</span> {request.reason}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        {/* Institutions Tab */}
        <TabsContent value="institutions" className="space-y-4">
          {institutions.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <CheckCircle className="h-12 w-12 mx-auto mb-4 text-success" />
                <p className="text-muted-foreground">No pending institution applications</p>
              </CardContent>
            </Card>
          ) : (
            institutions.map((institution) => (
              <Card key={institution.id}>
                <CardHeader>
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                    <div className="flex-1">
                      <CardTitle className="flex items-center gap-2 mb-1">
                        {institution.institution_name}
                        <Badge variant="outline">
                          {institution.institution_type.charAt(0).toUpperCase() +
                            institution.institution_type.slice(1)}
                        </Badge>
                      </CardTitle>
                      <CardDescription>
                        Applied {format(new Date(institution.created_at), 'MMM dd, yyyy')}
                      </CardDescription>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleApproveInstitution(institution.id)}
                        className="flex items-center gap-1"
                      >
                        <CheckCircle className="h-4 w-4" />
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => openRejectDialog(institution.id, 'institution')}
                        className="flex items-center gap-1"
                      >
                        <XCircle className="h-4 w-4" />
                        Reject
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <h4 className="font-semibold mb-2">Contact Information</h4>
                      <div className="space-y-1">
                        <p>
                          <span className="text-muted-foreground">Contact Person:</span>{' '}
                          {institution.contact_person}
                        </p>
                        <p>
                          <span className="text-muted-foreground">Email:</span>{' '}
                          {institution.contact_email}
                        </p>
                        {institution.contact_phone && (
                          <p>
                            <span className="text-muted-foreground">Phone:</span>{' '}
                            {institution.contact_phone}
                          </p>
                        )}
                      </div>
                    </div>
                    <div>
                      <h4 className="font-semibold mb-2">Applicant</h4>
                      <div className="space-y-1">
                        <p>
                          <span className="text-muted-foreground">User:</span>{' '}
                          {(institution as any).applicant?.full_name || 'N/A'}
                        </p>
                        <p>
                          <span className="text-muted-foreground">Email:</span>{' '}
                          {(institution as any).applicant?.email || 'N/A'}
                        </p>
                      </div>
                    </div>
                  </div>
                  {institution.notes && (
                    <div className="mt-4 p-3 bg-muted rounded-lg">
                      <p className="text-sm">
                        <span className="font-semibold">Notes:</span> {institution.notes}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>

      {/* Rejection Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Request</DialogTitle>
            <DialogDescription>
              Please provide a reason for rejecting this request. The applicant will be notified.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="rejection-reason">Rejection Reason</Label>
              <Textarea
                id="rejection-reason"
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Enter reason for rejection..."
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleReject}>
              Reject Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
