import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
  DollarSign, MessageSquare, ArrowRight, AlertCircle, User
} from 'lucide-react';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';

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

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  pending: { label: 'Pending', color: 'bg-amber-500/10 text-amber-600 border-amber-500/20' },
  assigned: { label: 'Assigned', color: 'bg-blue-500/10 text-blue-600 border-blue-500/20' },
  quoted: { label: 'Quoted', color: 'bg-purple-500/10 text-purple-600 border-purple-500/20' },
  in_progress: { label: 'In Progress', color: 'bg-indigo-500/10 text-indigo-600 border-indigo-500/20' },
  completed: { label: 'Completed', color: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' },
  cancelled: { label: 'Cancelled', color: 'bg-red-500/10 text-red-600 border-red-500/20' },
};

export function ServiceRequests({ providerId }: ServiceRequestsProps) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [selectedRequest, setSelectedRequest] = useState<ServiceRequest | null>(null);
  const [quotedPrice, setQuotedPrice] = useState('');
  const [quotedCurrency, setQuotedCurrency] = useState('TZS');
  const [estimatedDate, setEstimatedDate] = useState('');
  const [providerNotes, setProviderNotes] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ['provider-service-requests', providerId],
    queryFn: async () => {
      // Query service requests with related data
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
    mutationFn: async (updates: any) => {
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
    setQuotedPrice('');
    setQuotedCurrency('TZS');
    setEstimatedDate('');
    setProviderNotes('');
  };

  const handleSubmitQuote = () => {
    if (!quotedPrice) {
      toast.error('Please enter a price');
      return;
    }

    const updates: any = {
      quoted_price: parseFloat(quotedPrice),
      quoted_currency: quotedCurrency,
      status: 'quoted',
    };

    if (estimatedDate) updates.estimated_completion_date = estimatedDate;
    if (providerNotes) updates.provider_notes = providerNotes;

    updateMutation.mutate(updates);
  };

  const handleStartWork = () => {
    updateMutation.mutate({ status: 'in_progress' });
  };

  const handleComplete = () => {
    updateMutation.mutate({ 
      status: 'completed',
      actual_completion_date: new Date().toISOString().split('T')[0]
    });
  };

  const filteredRequests = requests.filter(r => {
    if (statusFilter === 'all') return true;
    if (statusFilter === 'active') return ['assigned', 'quoted', 'in_progress'].includes(r.status);
    return r.status === statusFilter;
  });

  const stats = {
    total: requests.length,
    pending: requests.filter(r => r.status === 'assigned').length,
    quoted: requests.filter(r => r.status === 'quoted').length,
    inProgress: requests.filter(r => r.status === 'in_progress').length,
    completed: requests.filter(r => r.status === 'completed').length,
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
              Manage incoming service requests from clients
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex gap-2 text-sm">
              <Badge variant="outline">{stats.pending} New</Badge>
              <Badge variant="outline" className="bg-purple-500/10">{stats.quoted} Quoted</Badge>
              <Badge variant="outline" className="bg-indigo-500/10">{stats.inProgress} In Progress</Badge>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Filter" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="assigned">New</SelectItem>
                <SelectItem value="quoted">Quoted</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
              </SelectContent>
            </Select>
          </div>
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
                : `No ${statusFilter.replace('_', ' ')} requests found.`}
            </p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {filteredRequests.map((request) => {
              const config = STATUS_CONFIG[request.status] || STATUS_CONFIG.pending;

              return (
                <Card 
                  key={request.id} 
                  className="hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => {
                    setSelectedRequest(request);
                    if (request.quoted_price) setQuotedPrice(request.quoted_price.toString());
                    if (request.quoted_currency) setQuotedCurrency(request.quoted_currency);
                    if (request.estimated_completion_date) setEstimatedDate(request.estimated_completion_date);
                    if (request.provider_notes) setProviderNotes(request.provider_notes);
                  }}
                >
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-medium">{request.provider_services?.name || request.service_type.replace(/_/g, ' ')}</h4>
                        <p className="text-xs text-muted-foreground capitalize mt-0.5">
                          {request.provider_services?.category || request.service_category.replace(/_/g, ' ')}
                        </p>
                      </div>
                      <Badge variant="outline" className={config.color}>
                        {config.label}
                      </Badge>
                    </div>

                    {/* Service Price - Always show if available */}
                    {(request.service_price || request.provider_services?.price) && (
                      <div className="p-2 rounded-md bg-emerald-500/10 border border-emerald-500/20">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">Service Price</span>
                          <span className="font-semibold text-emerald-600">
                            TZS {(request.service_price || request.provider_services?.price || 0).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Requester Info */}
                    {request.requester && (
                      <div className="flex items-center gap-2 text-sm">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <div className="flex flex-col">
                          <span className="font-medium">{request.requester.full_name}</span>
                          <span className="text-xs text-muted-foreground">{request.requester.email}</span>
                        </div>
                      </div>
                    )}

                    {/* Listing Info */}
                    {request.listings && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <MapPin className="h-4 w-4" />
                        <span className="truncate">{request.listings.title}</span>
                      </div>
                    )}

                    {/* Request Notes */}
                    {request.request_notes && (
                      <div className="flex items-start gap-2 text-sm p-2 bg-muted/50 rounded-md">
                        <MessageSquare className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                        <span className="text-muted-foreground line-clamp-2">{request.request_notes}</span>
                      </div>
                    )}

                    {/* Quoted Price if provider already quoted */}
                    {request.quoted_price && (
                      <div className="flex items-center gap-2 text-sm font-medium text-purple-600">
                        <DollarSign className="h-4 w-4" />
                        <span>Your Quote: {request.quoted_currency || 'TZS'} {request.quoted_price.toLocaleString()}</span>
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-2 border-t text-sm">
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Calendar className="h-4 w-4" />
                        <span>{format(new Date(request.created_at), 'MMM d, yyyy')}</span>
                      </div>
                      <Button variant="ghost" size="sm" className="gap-1">
                        {request.status === 'pending' || request.status === 'assigned' ? 'Respond' : 'View'} 
                        <ArrowRight className="h-4 w-4" />
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
              <DialogTitle className="capitalize">
                {selectedRequest?.service_type.replace(/_/g, ' ')} Request
              </DialogTitle>
              <DialogDescription>
                Respond to this service request from {selectedRequest?.requester?.full_name}
              </DialogDescription>
            </DialogHeader>

            {selectedRequest && (
              <div className="space-y-4 py-4">
                {/* Request Info */}
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

                {/* Requester Contact */}
                {selectedRequest.requester && (
                  <div className="p-3 rounded-lg bg-blue-500/5 border border-blue-500/20">
                    <h4 className="font-medium text-sm mb-2">Client Contact</h4>
                    <p className="text-sm">{selectedRequest.requester.full_name}</p>
                    <p className="text-sm text-muted-foreground">{selectedRequest.requester.email}</p>
                    {selectedRequest.requester.phone && (
                      <p className="text-sm text-muted-foreground">{selectedRequest.requester.phone}</p>
                    )}
                  </div>
                )}

                {/* Quote Form */}
                {(selectedRequest.status === 'assigned' || selectedRequest.status === 'quoted') && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Quote Price *</Label>
                        <Input
                          type="number"
                          placeholder="Enter amount"
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
                      <Label>Response Notes</Label>
                      <Textarea
                        placeholder="Add notes for the client..."
                        value={providerNotes}
                        onChange={(e) => setProviderNotes(e.target.value)}
                        rows={3}
                      />
                    </div>

                    <Button 
                      className="w-full" 
                      onClick={handleSubmitQuote}
                      disabled={updateMutation.isPending}
                    >
                      {updateMutation.isPending ? 'Submitting...' : 'Submit Quote'}
                    </Button>
                  </div>
                )}

                {/* Actions for quoted requests */}
                {selectedRequest.status === 'quoted' && (
                  <Button 
                    className="w-full gap-2" 
                    variant="outline"
                    onClick={handleStartWork}
                    disabled={updateMutation.isPending}
                  >
                    <Clock className="h-4 w-4" />
                    Start Work
                  </Button>
                )}

                {/* Actions for in-progress requests */}
                {selectedRequest.status === 'in_progress' && (
                  <div className="space-y-3">
                    <div className="p-3 rounded-lg bg-indigo-500/10 border border-indigo-500/20">
                      <p className="text-sm text-indigo-700 flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        Work in progress
                      </p>
                    </div>
                    <Button 
                      className="w-full gap-2 bg-emerald-600 hover:bg-emerald-700" 
                      onClick={handleComplete}
                      disabled={updateMutation.isPending}
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      Mark as Completed
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => {
                        setSelectedRequest(null);
                        navigate(`/service-requests/${selectedRequest.id}`);
                      }}
                    >
                      Upload Report & Complete
                    </Button>
                  </div>
                )}

                {/* Completed status */}
                {selectedRequest.status === 'completed' && (
                  <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-center">
                    <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-emerald-600" />
                    <p className="font-medium text-emerald-700">Request Completed</p>
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
