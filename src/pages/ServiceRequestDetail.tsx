import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { MainLayout } from '@/components/layouts/MainLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { ArrowLeft, Upload, MessageSquare, DollarSign, Calendar, FileText, CheckCircle2 } from 'lucide-react';
import { format } from 'date-fns';

export default function ServiceRequestDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [providerNotes, setProviderNotes] = useState('');
  const [quotedPrice, setQuotedPrice] = useState('');
  const [quotedCurrency, setQuotedCurrency] = useState('TZS');
  const [estimatedDate, setEstimatedDate] = useState('');
  const [status, setStatus] = useState('');
  const [reportFile, setReportFile] = useState<File | null>(null);

  const { data: request, isLoading } = useQuery({
    queryKey: ['service-request', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('service_requests')
        .select(`
          *,
          listings(title, location_label, owner_id),
          provider:service_provider_profiles(company_name, contact_phone, contact_email)
        `)
        .eq('id', id)
        .single();

      if (error) throw error;

      // Fetch requester profile separately
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, email, phone')
        .eq('id', data.requester_id)
        .single();

      return {
        ...data,
        listing: data.listings,
        requester: profile,
        provider: data.provider
      };
    },
  });

  const updateRequestMutation = useMutation({
    mutationFn: async (updates: any) => {
      const { error } = await supabase
        .from('service_requests')
        .update(updates)
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service-request', id] });
      queryClient.invalidateQueries({ queryKey: ['admin-service-requests'] });
      toast.success('Request updated successfully');
    },
    onError: (error) => {
      toast.error('Failed to update request: ' + error.message);
    },
  });

  const uploadReportMutation = useMutation({
    mutationFn: async (file: File) => {
      const fileExt = file.name.split('.').pop();
      const fileName = `${id}-${Date.now()}.${fileExt}`;
      const filePath = `reports/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('payment-proofs')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('payment-proofs')
        .getPublicUrl(filePath);

      const { error: updateError } = await supabase
        .from('service_requests')
        .update({ report_file_url: publicUrl })
        .eq('id', id);

      if (updateError) throw updateError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service-request', id] });
      toast.success('Report uploaded successfully');
      setReportFile(null);
    },
    onError: (error) => {
      toast.error('Failed to upload report: ' + error.message);
    },
  });

  const handleUpdateQuote = () => {
    const updates: any = {};
    if (providerNotes) updates.provider_notes = providerNotes;
    if (quotedPrice) updates.quoted_price = parseFloat(quotedPrice);
    if (quotedCurrency) updates.quoted_currency = quotedCurrency;
    if (estimatedDate) updates.estimated_completion_date = estimatedDate;
    if (status) updates.status = status;

    updateRequestMutation.mutate(updates);
  };

  const handleUploadReport = () => {
    if (reportFile) {
      uploadReportMutation.mutate(reportFile);
    }
  };

  const handleMarkCompleted = () => {
    updateRequestMutation.mutate({
      status: 'completed',
      actual_completion_date: new Date().toISOString().split('T')[0],
    });
  };

  const sendMessageToClient = async () => {
    if (!request?.listing?.owner_id || !request?.requester_id) return;

    const { error } = await supabase.from('messages').insert({
      listing_id: request.listing_id,
      sender_id: request.listing.owner_id,
      receiver_id: request.requester_id,
      content: providerNotes,
      message_type: 'text',
    });

    if (error) {
      toast.error('Failed to send message: ' + error.message);
    } else {
      toast.success('Message sent to client');
      setProviderNotes('');
    }
  };

  if (isLoading) {
    return (
      <MainLayout>
        <div className="container mx-auto p-6">Loading...</div>
      </MainLayout>
    );
  }

  if (!request) {
    return (
      <MainLayout>
        <div className="container mx-auto p-6">Request not found</div>
      </MainLayout>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-500';
      case 'quoted': return 'bg-blue-500';
      case 'in_progress': return 'bg-purple-500';
      case 'completed': return 'bg-green-500';
      case 'cancelled': return 'bg-gray-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <MainLayout>
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/admin/service-requests')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Service Request Details</h1>
            <p className="text-muted-foreground">Manage and update service request</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Request Information */}
            <Card>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle>{request.service_type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</CardTitle>
                    <CardDescription>Category: {request.service_category}</CardDescription>
                  </div>
                  <Badge className={getStatusColor(request.status)}>
                    {request.status.replace(/_/g, ' ')}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-muted-foreground">Listing</Label>
                  <p className="font-medium">{request.listing?.title}</p>
                  <p className="text-sm text-muted-foreground">{request.listing?.location_label}</p>
                </div>
                
                <div>
                  <Label className="text-muted-foreground">Client Information</Label>
                  <p className="font-medium">{request.requester?.full_name}</p>
                  <p className="text-sm text-muted-foreground">{request.requester?.email}</p>
                  {request.requester?.phone && (
                    <p className="text-sm text-muted-foreground">{request.requester.phone}</p>
                  )}
                </div>

                {request.request_notes && (
                  <div>
                    <Label className="text-muted-foreground">Client Notes</Label>
                    <p className="text-sm">{request.request_notes}</p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                  <div>
                    <Label className="text-muted-foreground">Requested</Label>
                    <p className="text-sm">{format(new Date(request.created_at), 'PPP')}</p>
                  </div>
                  {request.estimated_completion_date && (
                    <div>
                      <Label className="text-muted-foreground">Est. Completion</Label>
                      <p className="text-sm">{format(new Date(request.estimated_completion_date), 'PPP')}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Update Quote & Status */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Update Quote & Status
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Quoted Price</Label>
                    <Input
                      type="number"
                      placeholder="0.00"
                      value={quotedPrice}
                      onChange={(e) => setQuotedPrice(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>Currency</Label>
                    <Select value={quotedCurrency} onValueChange={setQuotedCurrency}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="TZS">TZS</SelectItem>
                        <SelectItem value="USD">USD</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label>Estimated Completion Date</Label>
                  <Input
                    type="date"
                    value={estimatedDate}
                    onChange={(e) => setEstimatedDate(e.target.value)}
                  />
                </div>

                <div>
                  <Label>Status</Label>
                  <Select value={status || request.status} onValueChange={setStatus}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="quoted">Quoted</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Provider Notes</Label>
                  <Textarea
                    placeholder="Add notes about this request..."
                    value={providerNotes}
                    onChange={(e) => setProviderNotes(e.target.value)}
                    rows={4}
                  />
                </div>

                <div className="flex gap-2">
                  <Button onClick={handleUpdateQuote} disabled={updateRequestMutation.isPending}>
                    Update Quote & Status
                  </Button>
                  <Button variant="outline" onClick={sendMessageToClient} disabled={!providerNotes}>
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Send Message to Client
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Upload Report */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Upload className="h-5 w-5" />
                  Upload Analysis Report
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {request.report_file_url && (
                  <div className="p-4 bg-muted rounded-lg">
                    <Label className="text-muted-foreground">Current Report</Label>
                    <a
                      href={request.report_file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline flex items-center gap-2"
                    >
                      <FileText className="h-4 w-4" />
                      View Report
                    </a>
                  </div>
                )}

                <div>
                  <Label>Upload New Report</Label>
                  <Input
                    type="file"
                    accept=".pdf,.doc,.docx"
                    onChange={(e) => setReportFile(e.target.files?.[0] || null)}
                  />
                </div>

                <Button onClick={handleUploadReport} disabled={!reportFile || uploadReportMutation.isPending}>
                  <Upload className="h-4 w-4 mr-2" />
                  Upload Report
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button
                  className="w-full"
                  variant="default"
                  onClick={handleMarkCompleted}
                  disabled={request.status === 'completed'}
                >
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Mark as Completed
                </Button>
                <Button className="w-full" variant="outline" onClick={() => navigate(`/listing/${request.listing_id}`)}>
                  View Listing
                </Button>
                <Button className="w-full" variant="outline" onClick={() => navigate(`/messages?listing=${request.listing_id}`)}>
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Go to Messages
                </Button>
              </CardContent>
            </Card>

            {request.provider && (
              <Card>
                <CardHeader>
                  <CardTitle>Service Provider</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="font-medium">{request.provider.company_name}</p>
                  {request.provider.contact_phone && (
                    <p className="text-sm text-muted-foreground">{request.provider.contact_phone}</p>
                  )}
                  <p className="text-sm text-muted-foreground">{request.provider.contact_email}</p>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <CardTitle>Timeline</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-start gap-2">
                  <Calendar className="h-4 w-4 mt-1 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Created</p>
                    <p className="text-xs text-muted-foreground">{format(new Date(request.created_at), 'PPP')}</p>
                  </div>
                </div>
                {request.updated_at !== request.created_at && (
                  <div className="flex items-start gap-2">
                    <Calendar className="h-4 w-4 mt-1 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">Last Updated</p>
                      <p className="text-xs text-muted-foreground">{format(new Date(request.updated_at), 'PPP')}</p>
                    </div>
                  </div>
                )}
                {request.actual_completion_date && (
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 mt-1 text-green-500" />
                    <div>
                      <p className="text-sm font-medium">Completed</p>
                      <p className="text-xs text-muted-foreground">{format(new Date(request.actual_completion_date), 'PPP')}</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
