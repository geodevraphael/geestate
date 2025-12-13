import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MainLayout } from '@/components/layouts/MainLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { 
  FileUp, 
  Check, 
  X, 
  Eye, 
  Clock, 
  Phone, 
  MapPin,
  Loader2,
  ExternalLink,
  Plus
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface ListingRequest {
  id: string;
  user_id: string;
  survey_plan_url: string;
  location_description: string | null;
  contact_phone: string | null;
  notes: string | null;
  status: string;
  admin_notes: string | null;
  created_at: string;
  applicant?: {
    full_name: string;
    email: string;
  };
}

export default function AdminListingRequests() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const [requests, setRequests] = useState<ListingRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<ListingRequest | null>(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [processing, setProcessing] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const { data, error } = await (supabase as any)
        .from('listing_requests')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch applicant profiles
      if (data && data.length > 0) {
        const userIds = data.map((r: any) => r.user_id);
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name, email')
          .in('id', userIds);

        const profilesMap = new Map(profiles?.map(p => [p.id, p]) || []);
        
        const requestsWithProfiles = data.map((request: any) => ({
          ...request,
          applicant: profilesMap.get(request.user_id)
        }));
        
        setRequests(requestsWithProfiles);
      } else {
        setRequests([]);
      }
    } catch (error: any) {
      console.error('Error fetching requests:', error);
      toast({
        title: 'Error',
        description: 'Failed to load listing requests.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const handleUpdateStatus = async (requestId: string, status: 'approved' | 'rejected') => {
    setProcessing(true);
    try {
      const { error } = await (supabase as any)
        .from('listing_requests')
        .update({
          status,
          admin_notes: adminNotes,
          reviewed_by: user?.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', requestId);

      if (error) throw error;

      toast({
        title: status === 'approved' ? 'Request Approved' : 'Request Rejected',
        description: `The listing request has been ${status}.`,
      });

      setSelectedRequest(null);
      setAdminNotes('');
      fetchRequests();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update request.',
        variant: 'destructive',
      });
    } finally {
      setProcessing(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
      case 'approved':
        return <Badge className="bg-green-500"><Check className="h-3 w-3 mr-1" />Approved</Badge>;
      case 'rejected':
        return <Badge variant="destructive"><X className="h-3 w-3 mr-1" />Rejected</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <MainLayout>
      <div className="container py-6 max-w-6xl">
        <div className="mb-6">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FileUp className="h-6 w-6" />
            Listing Requests
          </h1>
          <p className="text-muted-foreground mt-1">
            Review and manage property listing requests from users
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : requests.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <FileUp className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No listing requests found</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {requests.map((request) => (
              <Card key={request.id} className="overflow-hidden">
                <CardContent className="p-4">
                  <div className="flex flex-col md:flex-row gap-4">
                    {/* Survey Plan Preview */}
                    <div 
                      className="w-full md:w-48 h-32 rounded-lg overflow-hidden bg-muted cursor-pointer relative group"
                      onClick={() => {
                        setSelectedRequest(request);
                        setPreviewOpen(true);
                      }}
                    >
                      <img 
                        src={request.survey_plan_url} 
                        alt="Survey Plan" 
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <Eye className="h-6 w-6 text-white" />
                      </div>
                    </div>

                    {/* Request Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div>
                          <p className="font-semibold">{request.applicant?.full_name || 'Unknown User'}</p>
                          <p className="text-sm text-muted-foreground">{request.applicant?.email}</p>
                        </div>
                        {getStatusBadge(request.status)}
                      </div>

                      {request.location_description && (
                        <p className="text-sm flex items-center gap-1 mb-1">
                          <MapPin className="h-4 w-4 text-muted-foreground" />
                          {request.location_description}
                        </p>
                      )}

                      {request.contact_phone && (
                        <p className="text-sm flex items-center gap-1 mb-1">
                          <Phone className="h-4 w-4 text-muted-foreground" />
                          {request.contact_phone}
                        </p>
                      )}

                      {request.notes && (
                        <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                          {request.notes}
                        </p>
                      )}

                      <p className="text-xs text-muted-foreground mt-2">
                        Submitted {format(new Date(request.created_at), 'PPp')}
                      </p>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-row md:flex-col gap-2 justify-end">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(request.survey_plan_url, '_blank')}
                      >
                        <ExternalLink className="h-4 w-4 mr-1" />
                        View Full
                      </Button>
                      
                      {(request.status === 'pending' || request.status === 'approved') && (
                        <Button
                          size="sm"
                          onClick={() => navigate(`/admin/listing-requests/${request.id}/create`)}
                        >
                          <Plus className="h-4 w-4 mr-1" />
                          Create Listing
                        </Button>
                      )}
                      
                      {request.status === 'pending' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedRequest(request);
                            setAdminNotes('');
                          }}
                        >
                          <X className="h-4 w-4 mr-1" />
                          Reject
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Review Dialog */}
        <Dialog open={!!selectedRequest && !previewOpen} onOpenChange={() => setSelectedRequest(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Review Listing Request</DialogTitle>
            </DialogHeader>
            
            {selectedRequest && (
              <div className="space-y-4">
                <div className="rounded-lg overflow-hidden bg-muted">
                  <img 
                    src={selectedRequest.survey_plan_url} 
                    alt="Survey Plan" 
                    className="w-full max-h-64 object-contain"
                  />
                </div>

                <div className="space-y-2 text-sm">
                  <p><strong>Applicant:</strong> {selectedRequest.applicant?.full_name}</p>
                  <p><strong>Email:</strong> {selectedRequest.applicant?.email}</p>
                  {selectedRequest.contact_phone && (
                    <p><strong>Phone:</strong> {selectedRequest.contact_phone}</p>
                  )}
                  {selectedRequest.location_description && (
                    <p><strong>Location:</strong> {selectedRequest.location_description}</p>
                  )}
                  {selectedRequest.notes && (
                    <p><strong>Notes:</strong> {selectedRequest.notes}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Admin Notes</label>
                  <Textarea
                    placeholder="Add notes about this request..."
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                    rows={3}
                  />
                </div>

                <div className="flex gap-2">
                  <Button
                    className="flex-1"
                    onClick={() => handleUpdateStatus(selectedRequest.id, 'approved')}
                    disabled={processing}
                  >
                    {processing ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Check className="h-4 w-4 mr-1" />}
                    Approve
                  </Button>
                  <Button
                    variant="destructive"
                    className="flex-1"
                    onClick={() => handleUpdateStatus(selectedRequest.id, 'rejected')}
                    disabled={processing}
                  >
                    {processing ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <X className="h-4 w-4 mr-1" />}
                    Reject
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Image Preview Dialog */}
        <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle>Survey Plan Preview</DialogTitle>
            </DialogHeader>
            {selectedRequest && (
              <img 
                src={selectedRequest.survey_plan_url} 
                alt="Survey Plan" 
                className="w-full max-h-[70vh] object-contain"
              />
            )}
          </DialogContent>
        </Dialog>

      </div>
    </MainLayout>
  );
}