import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { 
  FileSearch, Clock, CheckCircle2, MapPin, Calendar, 
  DollarSign, MessageSquare, ArrowRight, User, Phone, Mail, 
  CreditCard, AlertCircle, Upload, FileText, Download, X
} from 'lucide-react';
import { format } from 'date-fns';

interface ServiceRequest {
  id: string;
  listing_id: string | null;
  requester_id: string;
  service_type: string;
  service_category: string;
  status: string;
  request_notes: string | null;
  provider_notes: string | null;
  quoted_price: number | null;
  quoted_currency: string | null;
  estimated_completion_date: string | null;
  created_at: string;
  service_price: number | null;
  selected_service_id: string | null;
  payment_confirmed_at: string | null;
  payment_amount: number | null;
  client_payment_reference: string | null;
  report_file_url: string | null;
  listings?: {
    title: string;
    location_label: string;
  } | null;
  requester?: {
    full_name: string;
    email: string;
    phone: string | null;
  } | null;
  provider_services?: {
    name: string;
    price: number;
    description: string | null;
    category: string | null;
  } | null;
}

interface ServiceRequestsProps {
  providerId: string;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; step: number }> = {
  pending: { label: 'New Request', color: 'bg-amber-500/10 text-amber-600 border-amber-500/20', step: 1 },
  accepted: { label: 'Accepted', color: 'bg-blue-500/10 text-blue-600 border-blue-500/20', step: 2 },
  completed: { label: 'Completed', color: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20', step: 3 },
  cancelled: { label: 'Cancelled', color: 'bg-red-500/10 text-red-600 border-red-500/20', step: 0 },
  // Legacy statuses mapped to new flow
  assigned: { label: 'New Request', color: 'bg-amber-500/10 text-amber-600 border-amber-500/20', step: 1 },
  quoted: { label: 'Accepted', color: 'bg-blue-500/10 text-blue-600 border-blue-500/20', step: 2 },
  in_progress: { label: 'Accepted', color: 'bg-blue-500/10 text-blue-600 border-blue-500/20', step: 2 },
};

export function ServiceRequests({ providerId }: ServiceRequestsProps) {
  const queryClient = useQueryClient();
  const [selectedRequest, setSelectedRequest] = useState<ServiceRequest | null>(null);
  const [providerNotes, setProviderNotes] = useState('');
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentReference, setPaymentReference] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [uploadingReport, setUploadingReport] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ['provider-service-requests', providerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('service_requests')
        .select(`
          *,
          listings (title, location_label),
          provider_services:selected_service_id (name, price, description, category)
        `)
        .eq('service_provider_id', providerId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch requester details
      const requestsWithRequester = await Promise.all(
        (data || []).map(async (request) => {
          const { data: requester } = await supabase
            .from('profiles')
            .select('full_name, email, phone')
            .eq('id', request.requester_id)
            .single();
          return { ...request, requester };
        })
      );

      return requestsWithRequester as ServiceRequest[];
    },
    enabled: !!providerId,
  });

  const updateMutation = useMutation({
    mutationFn: async (updates: Record<string, unknown>) => {
      const { error } = await supabase
        .from('service_requests')
        .update(updates)
        .eq('id', selectedRequest?.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['provider-service-requests'] });
      toast.success('Request updated successfully');
      setSelectedRequest(null);
      resetForm();
    },
    onError: (error) => {
      toast.error('Failed to update: ' + error.message);
    },
  });

  const resetForm = () => {
    setProviderNotes('');
    setPaymentAmount('');
    setPaymentReference('');
  };

  const handleUploadReport = async (file: File) => {
    if (!selectedRequest) return;
    
    setUploadingReport(true);
    try {
      const fileExt = file.name.split('.').pop();
      const filePath = `${selectedRequest.id}/${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('survey-plans')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('survey-plans')
        .getPublicUrl(filePath);

      // Update the request with the report URL
      const { error: updateError } = await supabase
        .from('service_requests')
        .update({ report_file_url: publicUrl })
        .eq('id', selectedRequest.id);

      if (updateError) throw updateError;

      toast.success('Report uploaded successfully');
      queryClient.invalidateQueries({ queryKey: ['provider-service-requests'] });
      setSelectedRequest(prev => prev ? { ...prev, report_file_url: publicUrl } as ServiceRequest : null);
    } catch (error: any) {
      toast.error('Failed to upload report: ' + error.message);
    } finally {
      setUploadingReport(false);
    }
  };

  const handleAccept = () => {
    updateMutation.mutate({ 
      status: 'accepted',
      provider_notes: providerNotes || null
    });
  };

  const handleConfirmPaymentAndComplete = () => {
    const amount = parseFloat(paymentAmount);
    if (!amount || amount <= 0) {
      toast.error('Please enter the payment amount received');
      return;
    }

    updateMutation.mutate({ 
      status: 'completed',
      payment_confirmed_at: new Date().toISOString(),
      payment_amount: amount,
      client_payment_reference: paymentReference || null,
      actual_completion_date: new Date().toISOString().split('T')[0]
    });
  };

  const handleDecline = () => {
    updateMutation.mutate({ 
      status: 'cancelled',
      provider_notes: providerNotes || 'Declined by provider'
    });
  };

  const filteredRequests = requests.filter(r => {
    if (statusFilter === 'all') return true;
    if (statusFilter === 'active') return ['pending', 'accepted', 'assigned', 'quoted', 'in_progress'].includes(r.status);
    return r.status === statusFilter;
  });

  const stats = {
    total: requests.length,
    pending: requests.filter(r => ['pending', 'assigned'].includes(r.status)).length,
    accepted: requests.filter(r => ['accepted', 'quoted', 'in_progress'].includes(r.status)).length,
    completed: requests.filter(r => r.status === 'completed').length,
  };

  const getServicePrice = (request: ServiceRequest) => {
    return request.service_price || request.provider_services?.price || 0;
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-6 bg-muted rounded w-1/4" />
            <div className="h-32 bg-muted rounded" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <FileSearch className="h-5 w-5" />
              Service Requests
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Manage incoming service requests
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="bg-amber-500/10 text-amber-600">
              {stats.pending} New
            </Badge>
            <Badge variant="outline" className="bg-blue-500/10 text-blue-600">
              {stats.accepted} In Progress
            </Badge>
            <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600">
              {stats.completed} Completed
            </Badge>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-1 mt-4 p-1 bg-muted rounded-lg w-fit">
          {[
            { value: 'all', label: 'All' },
            { value: 'active', label: 'Active' },
            { value: 'completed', label: 'Completed' },
          ].map((tab) => (
            <Button
              key={tab.value}
              variant={statusFilter === tab.value ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setStatusFilter(tab.value)}
              className="h-8"
            >
              {tab.label}
            </Button>
          ))}
        </div>
      </CardHeader>

      <CardContent>
        {filteredRequests.length === 0 ? (
          <div className="text-center py-12">
            <FileSearch className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold">No service requests</h3>
            <p className="text-muted-foreground">
              {statusFilter === 'all' 
                ? "You haven't received any service requests yet."
                : `No ${statusFilter} requests found.`}
            </p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {filteredRequests.map((request) => {
              const config = STATUS_CONFIG[request.status] || STATUS_CONFIG.pending;
              const price = getServicePrice(request);

              return (
                <Card 
                  key={request.id} 
                  className="hover:shadow-md transition-shadow cursor-pointer border-l-4"
                  style={{ borderLeftColor: request.status === 'pending' || request.status === 'assigned' ? '#f59e0b' : 
                           request.status === 'completed' ? '#10b981' : '#3b82f6' }}
                  onClick={() => {
                    setSelectedRequest(request);
                    if (request.payment_amount) setPaymentAmount(request.payment_amount.toString());
                    else if (price) setPaymentAmount(price.toString());
                    if (request.provider_notes) setProviderNotes(request.provider_notes);
                  }}
                >
                  <CardContent className="p-4 space-y-3">
                    {/* Header */}
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="font-semibold text-base">
                          {request.provider_services?.name || request.service_type}
                        </h4>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {request.provider_services?.category || request.service_category.replace(/_/g, ' ')}
                        </p>
                      </div>
                      <Badge variant="outline" className={config.color}>
                        {config.label}
                      </Badge>
                    </div>

                    {/* Price */}
                    {price > 0 && (
                      <div className="flex items-center justify-between p-2 rounded-md bg-emerald-500/10 border border-emerald-500/20">
                        <span className="text-xs text-muted-foreground">Service Price</span>
                        <span className="font-bold text-emerald-600">
                          TZS {price.toLocaleString()}
                        </span>
                      </div>
                    )}

                    {/* Client Info */}
                    {request.requester && (
                      <div className="flex items-center gap-3 p-2 bg-muted/50 rounded-md">
                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                          <User className="h-4 w-4 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{request.requester.full_name}</p>
                          <p className="text-xs text-muted-foreground truncate">{request.requester.email}</p>
                        </div>
                      </div>
                    )}

                    {/* Listing if any */}
                    {request.listings && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <MapPin className="h-4 w-4 shrink-0" />
                        <span className="truncate">{request.listings.title}</span>
                      </div>
                    )}

                    {/* Client payment submitted indicator */}
                    {request.client_payment_reference && !request.payment_confirmed_at && (
                      <div className="flex items-center gap-2 text-sm text-blue-600 bg-blue-500/10 p-2 rounded-md border border-blue-500/20">
                        <AlertCircle className="h-4 w-4" />
                        <span>Client confirmed payment - verify & complete</span>
                      </div>
                    )}

                    {/* Payment confirmed indicator */}
                    {request.payment_confirmed_at && (
                      <div className="flex items-center gap-2 text-sm text-emerald-600 bg-emerald-500/10 p-2 rounded-md">
                        <CreditCard className="h-4 w-4" />
                        <span>Payment confirmed: TZS {request.payment_amount?.toLocaleString()}</span>
                      </div>
                    )}

                    {/* Footer */}
                    <div className="flex items-center justify-between pt-2 border-t">
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Calendar className="h-3.5 w-3.5" />
                        <span>{format(new Date(request.created_at), 'MMM d, yyyy')}</span>
                      </div>
                      <Button variant="ghost" size="sm" className="gap-1 h-7 text-xs">
                        {['pending', 'assigned'].includes(request.status) ? 'Respond' : 
                         ['accepted', 'quoted', 'in_progress'].includes(request.status) ? 'Complete' : 'View'}
                        <ArrowRight className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Response Dialog */}
        <Dialog open={!!selectedRequest} onOpenChange={() => { setSelectedRequest(null); resetForm(); }}>
          <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {selectedRequest?.provider_services?.name || selectedRequest?.service_type}
              </DialogTitle>
              <DialogDescription>
                {['pending', 'assigned'].includes(selectedRequest?.status || '') 
                  ? 'Review and respond to this service request'
                  : ['accepted', 'quoted', 'in_progress'].includes(selectedRequest?.status || '')
                  ? 'Confirm payment and complete this request'
                  : 'Service request details'}
              </DialogDescription>
            </DialogHeader>

            {selectedRequest && (
              <div className="space-y-4 py-4">
                {/* Progress Steps */}
                <div className="flex items-center justify-between mb-6">
                  {[
                    { step: 1, label: 'Request', status: 'pending' },
                    { step: 2, label: 'Accepted', status: 'accepted' },
                    { step: 3, label: 'Completed', status: 'completed' },
                  ].map((s, i) => {
                    const currentStep = STATUS_CONFIG[selectedRequest.status]?.step || 1;
                    const isActive = s.step <= currentStep;
                    const isCurrent = s.step === currentStep;
                    
                    return (
                      <div key={s.step} className="flex items-center">
                        <div className={`flex flex-col items-center ${i > 0 ? 'ml-2' : ''}`}>
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                            isActive ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                          } ${isCurrent ? 'ring-2 ring-primary ring-offset-2' : ''}`}>
                            {s.step === 3 && isActive ? <CheckCircle2 className="h-4 w-4" /> : s.step}
                          </div>
                          <span className={`text-xs mt-1 ${isActive ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>
                            {s.label}
                          </span>
                        </div>
                        {i < 2 && (
                          <div className={`h-0.5 w-12 mx-2 ${s.step < currentStep ? 'bg-primary' : 'bg-muted'}`} />
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Service Price Display */}
                {getServicePrice(selectedRequest) > 0 && (
                  <div className="p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Service Price</span>
                      <span className="text-xl font-bold text-emerald-600">
                        TZS {getServicePrice(selectedRequest).toLocaleString()}
                      </span>
                    </div>
                  </div>
                )}

                {/* Request Details */}
                <div className="p-3 rounded-lg bg-muted/50 space-y-2">
                  {selectedRequest.listings && (
                    <div className="flex items-center gap-2 text-sm">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <span>{selectedRequest.listings.title}</span>
                    </div>
                  )}
                  {selectedRequest.request_notes && (
                    <div className="flex items-start gap-2 text-sm">
                      <MessageSquare className="h-4 w-4 text-muted-foreground mt-0.5" />
                      <span>{selectedRequest.request_notes}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    <span>Requested {format(new Date(selectedRequest.created_at), 'PPP')}</span>
                  </div>
                </div>

                {/* Client Contact */}
                {selectedRequest.requester && (
                  <div className="p-3 rounded-lg bg-blue-500/5 border border-blue-500/20">
                    <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
                      <User className="h-4 w-4" />
                      Client Contact
                    </h4>
                    <div className="space-y-1">
                      <p className="text-sm font-medium">{selectedRequest.requester.full_name}</p>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Mail className="h-3.5 w-3.5" />
                        <a href={`mailto:${selectedRequest.requester.email}`} className="hover:underline">
                          {selectedRequest.requester.email}
                        </a>
                      </div>
                      {selectedRequest.requester.phone && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Phone className="h-3.5 w-3.5" />
                          <a href={`tel:${selectedRequest.requester.phone}`} className="hover:underline">
                            {selectedRequest.requester.phone}
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* PENDING: Accept or Decline */}
                {['pending', 'assigned'].includes(selectedRequest.status) && (
                  <div className="space-y-4 pt-2">
                    <div>
                      <Label>Response Notes (Optional)</Label>
                      <Textarea
                        placeholder="Add notes for the client..."
                        value={providerNotes}
                        onChange={(e) => setProviderNotes(e.target.value)}
                        rows={2}
                      />
                    </div>
                    
                    <div className="flex gap-3">
                      <Button 
                        variant="outline"
                        className="flex-1 border-red-500/30 text-red-600 hover:bg-red-500/10"
                        onClick={handleDecline}
                        disabled={updateMutation.isPending}
                      >
                        Decline
                      </Button>
                      <Button 
                        className="flex-1"
                        onClick={handleAccept}
                        disabled={updateMutation.isPending}
                      >
                        {updateMutation.isPending ? 'Processing...' : 'Accept Request'}
                      </Button>
                    </div>
                  </div>
                )}

                {/* ACCEPTED: Confirm Payment & Complete */}
                {['accepted', 'quoted', 'in_progress'].includes(selectedRequest.status) && (
                  <div className="space-y-4 pt-2">
                    {/* Show client's payment reference if submitted */}
                    {selectedRequest.client_payment_reference && (
                      <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                        <div className="flex items-start gap-2">
                          <CheckCircle2 className="h-4 w-4 text-emerald-600 mt-0.5" />
                          <div className="text-sm">
                            <p className="font-medium text-emerald-700">Client Confirmed Payment</p>
                            <p className="text-emerald-600 text-xs mt-0.5">
                              Reference: <span className="font-mono">{selectedRequest.client_payment_reference}</span>
                            </p>
                            <p className="text-muted-foreground text-xs mt-1">
                              Verify payment received, then confirm below to complete the service.
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {!selectedRequest.client_payment_reference && (
                      <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                        <div className="flex items-start gap-2">
                          <Clock className="h-4 w-4 text-amber-600 mt-0.5" />
                          <div className="text-sm">
                            <p className="font-medium text-amber-700">Awaiting Client Payment</p>
                            <p className="text-amber-600 text-xs mt-0.5">
                              The client has been notified to pay you directly. Once you receive payment, confirm it below.
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="space-y-3">
                      <div>
                        <Label>Payment Amount Received (TZS) *</Label>
                        <Input
                          type="number"
                          placeholder="Enter amount received from client"
                          value={paymentAmount}
                          onChange={(e) => setPaymentAmount(e.target.value)}
                        />
                      </div>
                      <div>
                        <Label>Payment Reference (Optional)</Label>
                        <Input
                          placeholder="Transaction ID, M-Pesa code, etc."
                          value={paymentReference}
                          onChange={(e) => setPaymentReference(e.target.value)}
                        />
                      </div>
                    </div>

                    {paymentAmount && parseFloat(paymentAmount) > 0 && (
                      <div className="p-3 rounded-lg bg-muted/50 space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Payment received</span>
                          <span>TZS {parseFloat(paymentAmount).toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between text-amber-600">
                          <span>Platform fee (2%)</span>
                          <span>TZS {(parseFloat(paymentAmount) * 0.02).toLocaleString()}</span>
                        </div>
                      </div>
                    )}

                    <Button 
                      className="w-full gap-2 bg-emerald-600 hover:bg-emerald-700"
                      onClick={handleConfirmPaymentAndComplete}
                      disabled={updateMutation.isPending || !paymentAmount}
                    >
                      <CreditCard className="h-4 w-4" />
                      {updateMutation.isPending ? 'Processing...' : 'Confirm Payment & Complete'}
                    </Button>
                  </div>
                )}

                {/* COMPLETED */}
                {selectedRequest.status === 'completed' && (
                  <div className="space-y-4">
                    <div className="p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-center">
                      <CheckCircle2 className="h-10 w-10 mx-auto mb-2 text-emerald-600" />
                      <p className="font-medium text-emerald-700">Service Completed</p>
                      {selectedRequest.payment_confirmed_at && (
                        <p className="text-sm text-emerald-600 mt-1">
                          Payment of TZS {selectedRequest.payment_amount?.toLocaleString()} confirmed
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* CANCELLED */}
                {selectedRequest.status === 'cancelled' && (
                  <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-center">
                    <AlertCircle className="h-10 w-10 mx-auto mb-2 text-red-600" />
                    <p className="font-medium text-red-700">Request Cancelled</p>
                    {selectedRequest.provider_notes && (
                      <p className="text-sm text-red-600 mt-1">{selectedRequest.provider_notes}</p>
                    )}
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
