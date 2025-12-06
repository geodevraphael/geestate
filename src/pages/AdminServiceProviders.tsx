import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { MainLayout } from '@/components/layouts/MainLayout';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { 
  CheckCircle, XCircle, Clock, Building2, User, 
  Mail, Phone, Calendar, FileText, Globe
} from 'lucide-react';

interface ProviderRequest {
  id: string;
  user_id: string;
  provider_type: string;
  company_name: string;
  license_number: string | null;
  years_in_business: number | null;
  description: string | null;
  services_offered: string[];
  service_areas: string[];
  contact_phone: string | null;
  contact_email: string;
  website_url: string | null;
  status: string;
  admin_notes: string | null;
  created_at: string;
  user?: { full_name: string; email: string };
}

function AdminServiceProvidersContent() {
  const { toast } = useToast();
  const [requests, setRequests] = useState<ProviderRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [adminNotes, setAdminNotes] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      const { data, error } = await supabase
        .from('service_provider_requests')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRequests((data || []) as ProviderRequest[]);
    } catch (error) {
      console.error('Error fetching requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (requestId: string) => {
    setProcessing(requestId);
    try {
      const { error } = await supabase.rpc('approve_service_provider_request', {
        request_id: requestId
      });

      if (error) throw error;

      toast({
        title: 'Provider Approved',
        description: 'The service provider has been approved and notified.',
      });
      
      fetchRequests();
    } catch (error: any) {
      console.error('Error approving request:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to approve request',
        variant: 'destructive',
      });
    } finally {
      setProcessing(null);
    }
  };

  const handleReject = async (requestId: string) => {
    setProcessing(requestId);
    try {
      const notes = adminNotes[requestId] || '';
      
      const { error } = await supabase
        .from('service_provider_requests')
        .update({
          status: 'rejected',
          admin_notes: notes,
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', requestId);

      if (error) throw error;

      // Notify user
      const request = requests.find(r => r.id === requestId);
      if (request) {
        await supabase.from('notifications').insert({
          user_id: request.user_id,
          type: 'listing_verified' as const,
          title: 'Service Provider Application Rejected',
          message: notes || 'Your application was not approved at this time.',
          link_url: '/become-service-provider',
        });
      }

      toast({
        title: 'Request Rejected',
        description: 'The provider has been notified.',
      });
      
      fetchRequests();
    } catch (error: any) {
      console.error('Error rejecting request:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to reject request',
        variant: 'destructive',
      });
    } finally {
      setProcessing(null);
    }
  };

  const pendingRequests = requests.filter(r => r.status === 'pending');
  const approvedRequests = requests.filter(r => r.status === 'approved');
  const rejectedRequests = requests.filter(r => r.status === 'rejected');

  const renderRequestCard = (request: ProviderRequest) => (
    <Card key={request.id} className="mb-4">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              {request.company_name}
            </CardTitle>
            <CardDescription className="mt-1">
              {request.provider_type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
            </CardDescription>
          </div>
          <Badge variant={
            request.status === 'pending' ? 'secondary' :
            request.status === 'approved' ? 'default' : 'destructive'
          }>
            {request.status}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Applicant Info */}
        <div className="grid md:grid-cols-2 gap-4 text-sm">
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-muted-foreground" />
            <span>{request.user?.full_name || 'Unknown'}</span>
          </div>
          <div className="flex items-center gap-2">
            <Mail className="h-4 w-4 text-muted-foreground" />
            <span>{request.contact_email}</span>
          </div>
          {request.contact_phone && (
            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-muted-foreground" />
              <span>{request.contact_phone}</span>
            </div>
          )}
          {request.website_url && (
            <div className="flex items-center gap-2">
              <Globe className="h-4 w-4 text-muted-foreground" />
              <a href={request.website_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                {request.website_url}
              </a>
            </div>
          )}
          {request.license_number && (
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <span>License: {request.license_number}</span>
            </div>
          )}
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span>Applied: {format(new Date(request.created_at), 'MMM d, yyyy')}</span>
          </div>
        </div>

        {/* Description */}
        {request.description && (
          <div>
            <p className="text-sm font-medium mb-1">Description</p>
            <p className="text-sm text-muted-foreground">{request.description}</p>
          </div>
        )}

        {/* Services */}
        {request.services_offered.length > 0 && (
          <div>
            <p className="text-sm font-medium mb-2">Services Offered</p>
            <div className="flex flex-wrap gap-1.5">
              {request.services_offered.map((service, idx) => (
                <Badge key={idx} variant="outline" className="text-xs">{service}</Badge>
              ))}
            </div>
          </div>
        )}

        {/* Service Areas */}
        {request.service_areas.length > 0 && (
          <div>
            <p className="text-sm font-medium mb-2">Service Areas</p>
            <div className="flex flex-wrap gap-1.5">
              {request.service_areas.map((area, idx) => (
                <Badge key={idx} variant="secondary" className="text-xs">{area}</Badge>
              ))}
            </div>
          </div>
        )}

        {/* Actions for pending requests */}
        {request.status === 'pending' && (
          <div className="pt-4 border-t space-y-3">
            <Textarea
              placeholder="Admin notes (optional, shown to applicant if rejected)"
              value={adminNotes[request.id] || ''}
              onChange={(e) => setAdminNotes({ ...adminNotes, [request.id]: e.target.value })}
              rows={2}
            />
            <div className="flex gap-3">
              <Button
                onClick={() => handleApprove(request.id)}
                disabled={processing === request.id}
                className="flex-1"
              >
                <CheckCircle className="mr-2 h-4 w-4" />
                {processing === request.id ? 'Processing...' : 'Approve'}
              </Button>
              <Button
                variant="destructive"
                onClick={() => handleReject(request.id)}
                disabled={processing === request.id}
                className="flex-1"
              >
                <XCircle className="mr-2 h-4 w-4" />
                Reject
              </Button>
            </div>
          </div>
        )}

        {/* Show admin notes for reviewed requests */}
        {request.status !== 'pending' && request.admin_notes && (
          <div className="pt-4 border-t">
            <p className="text-sm font-medium mb-1">Admin Notes</p>
            <p className="text-sm text-muted-foreground">{request.admin_notes}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );

  if (loading) {
    return (
      <MainLayout>
        <div className="container mx-auto px-4 py-8">
          <Skeleton className="h-8 w-64 mb-6" />
          <Skeleton className="h-64 w-full" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-6 md:py-8">
        <div className="mb-6">
          <h1 className="text-2xl md:text-3xl font-bold mb-2">Service Provider Applications</h1>
          <p className="text-muted-foreground">Review and manage service provider registrations</p>
        </div>

        <Tabs defaultValue="pending">
          <TabsList className="mb-6">
            <TabsTrigger value="pending" className="gap-2">
              <Clock className="h-4 w-4" />
              Pending ({pendingRequests.length})
            </TabsTrigger>
            <TabsTrigger value="approved" className="gap-2">
              <CheckCircle className="h-4 w-4" />
              Approved ({approvedRequests.length})
            </TabsTrigger>
            <TabsTrigger value="rejected" className="gap-2">
              <XCircle className="h-4 w-4" />
              Rejected ({rejectedRequests.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pending">
            {pendingRequests.length === 0 ? (
              <Card className="p-8 text-center">
                <Clock className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                <h3 className="text-lg font-semibold">No Pending Requests</h3>
                <p className="text-muted-foreground">All applications have been reviewed.</p>
              </Card>
            ) : (
              pendingRequests.map(renderRequestCard)
            )}
          </TabsContent>

          <TabsContent value="approved">
            {approvedRequests.length === 0 ? (
              <Card className="p-8 text-center">
                <CheckCircle className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                <h3 className="text-lg font-semibold">No Approved Providers</h3>
                <p className="text-muted-foreground">No applications have been approved yet.</p>
              </Card>
            ) : (
              approvedRequests.map(renderRequestCard)
            )}
          </TabsContent>

          <TabsContent value="rejected">
            {rejectedRequests.length === 0 ? (
              <Card className="p-8 text-center">
                <XCircle className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                <h3 className="text-lg font-semibold">No Rejected Applications</h3>
                <p className="text-muted-foreground">No applications have been rejected.</p>
              </Card>
            ) : (
              rejectedRequests.map(renderRequestCard)
            )}
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}

export default function AdminServiceProviders() {
  return (
    <ProtectedRoute requireRole={['admin']}>
      <AdminServiceProvidersContent />
    </ProtectedRoute>
  );
}