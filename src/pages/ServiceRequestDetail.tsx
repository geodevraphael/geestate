import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { MainLayout } from '@/components/layouts/MainLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { 
  ArrowLeft, Upload, MessageSquare, DollarSign, Calendar, FileText, 
  CheckCircle2, MapPin, Building2, User, Clock, Download, Eye,
  AlertCircle, Phone, Mail
} from 'lucide-react';
import { format } from 'date-fns';

const STATUS_CONFIG: Record<string, { label: string; color: string; progress: number }> = {
  pending: { label: 'Pending Review', color: 'bg-amber-500', progress: 15 },
  assigned: { label: 'Provider Assigned', color: 'bg-blue-500', progress: 30 },
  quoted: { label: 'Quote Received', color: 'bg-purple-500', progress: 45 },
  in_progress: { label: 'In Progress', color: 'bg-indigo-500', progress: 65 },
  completed: { label: 'Completed', color: 'bg-emerald-500', progress: 100 },
  cancelled: { label: 'Cancelled', color: 'bg-red-500', progress: 0 },
};

const STEPS = [
  { key: 'pending', label: 'Submitted' },
  { key: 'assigned', label: 'Assigned' },
  { key: 'quoted', label: 'Quoted' },
  { key: 'in_progress', label: 'In Progress' },
  { key: 'completed', label: 'Completed' },
];

export default function ServiceRequestDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
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
          listings(title, location_label, owner_id)
        `)
        .eq('id', id)
        .single();

      if (error) throw error;

      // Fetch requester profile
      const { data: requesterProfile } = await supabase
        .from('profiles')
        .select('full_name, email, phone')
        .eq('id', data.requester_id)
        .single();

      // Fetch provider profile if assigned
      let providerProfile = null;
      if (data.service_provider_id) {
        const { data: provider } = await supabase
          .from('service_provider_profiles')
          .select('company_name, contact_phone, contact_email, logo_url')
          .eq('user_id', data.service_provider_id)
          .single();
        providerProfile = provider;
      }

      return {
        ...data,
        listing: data.listings,
        requester: requesterProfile,
        provider: providerProfile
      };
    },
  });

  // Determine user role in this request
  const isRequester = user?.id === request?.requester_id;
  const isProvider = user?.id === request?.service_provider_id;
  const isAdmin = !isRequester && !isProvider;

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
      queryClient.invalidateQueries({ queryKey: ['my-service-requests'] });
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
        .update({ 
          report_file_url: publicUrl,
          status: 'completed',
          actual_completion_date: new Date().toISOString().split('T')[0]
        })
        .eq('id', id);

      if (updateError) throw updateError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service-request', id] });
      toast.success('Report uploaded and request marked as completed');
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

    // Auto-set status to quoted if price is set
    if (quotedPrice && !status) {
      updates.status = 'quoted';
    }

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

  const handleStartWork = () => {
    updateRequestMutation.mutate({ status: 'in_progress' });
  };

  const getStepIndex = (status: string) => {
    const index = STEPS.findIndex(s => s.key === status);
    return index >= 0 ? index : 0;
  };

  if (isLoading) {
    return (
      <MainLayout>
        <div className="container mx-auto p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-muted rounded w-1/4" />
            <div className="h-64 bg-muted rounded" />
          </div>
        </div>
      </MainLayout>
    );
  }

  if (!request) {
    return (
      <MainLayout>
        <div className="container mx-auto p-6">
          <Card className="border-dashed">
            <CardContent className="text-center py-16">
              <AlertCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold">Request not found</h3>
              <p className="text-muted-foreground">This service request doesn't exist or you don't have access.</p>
              <Button className="mt-4" onClick={() => navigate(-1)}>Go Back</Button>
            </CardContent>
          </Card>
        </div>
      </MainLayout>
    );
  }

  const currentStep = getStepIndex(request.status);
  const statusConfig = STATUS_CONFIG[request.status] || STATUS_CONFIG.pending;

  return (
    <MainLayout>
      <div className="container mx-auto p-4 md:p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl md:text-3xl font-bold capitalize">
              {request.service_type.replace(/_/g, ' ')} Request
            </h1>
            <p className="text-muted-foreground capitalize">
              {request.service_category.replace(/_/g, ' ')}
            </p>
          </div>
          <Badge className={`${statusConfig.color} text-white`}>
            {statusConfig.label}
          </Badge>
        </div>

        {/* Progress Tracker */}
        {request.status !== 'cancelled' && (
          <Card>
            <CardContent className="p-6">
              <div className="mb-4">
                <div className="flex justify-between text-sm mb-2">
                  <span className="font-medium">Request Progress</span>
                  <span className="text-muted-foreground">{statusConfig.progress}%</span>
                </div>
                <Progress value={statusConfig.progress} className="h-2" />
              </div>
              
              <div className="flex justify-between relative">
                {STEPS.map((step, index) => {
                  const isCompleted = index <= currentStep;
                  const isCurrent = index === currentStep;
                  
                  return (
                    <div key={step.key} className="flex flex-col items-center z-10">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium border-2 transition-all ${
                        isCompleted 
                          ? 'bg-primary text-primary-foreground border-primary' 
                          : 'bg-background text-muted-foreground border-muted'
                      } ${isCurrent ? 'ring-2 ring-primary ring-offset-2' : ''}`}>
                        {isCompleted && index < currentStep ? (
                          <CheckCircle2 className="h-4 w-4" />
                        ) : (
                          index + 1
                        )}
                      </div>
                      <span className={`text-xs mt-2 text-center hidden md:block ${isCompleted ? 'text-primary font-medium' : 'text-muted-foreground'}`}>
                        {step.label}
                      </span>
                    </div>
                  );
                })}
                {/* Progress line */}
                <div className="absolute top-4 left-0 right-0 h-0.5 bg-muted -z-0">
                  <div 
                    className="h-full bg-primary transition-all" 
                    style={{ width: `${(currentStep / (STEPS.length - 1)) * 100}%` }} 
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Request Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Request Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {request.listing && (
                  <div className="p-4 rounded-lg bg-muted/50 border">
                    <Label className="text-muted-foreground text-xs uppercase">Property</Label>
                    <p className="font-medium">{request.listing.title}</p>
                    <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                      <MapPin className="h-3 w-3" />
                      {request.listing.location_label}
                    </p>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="mt-2 gap-1"
                      onClick={() => navigate(`/listings/${request.listing_id}`)}
                    >
                      <Eye className="h-4 w-4" />
                      View Property
                    </Button>
                  </div>
                )}
                
                {request.request_notes && (
                  <div className="p-4 rounded-lg bg-muted/50 border">
                    <Label className="text-muted-foreground text-xs uppercase">Request Notes</Label>
                    <p className="text-sm mt-1">{request.request_notes}</p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 rounded-lg bg-muted/30">
                    <Label className="text-muted-foreground text-xs uppercase">Created</Label>
                    <p className="text-sm font-medium flex items-center gap-1 mt-1">
                      <Calendar className="h-3 w-3" />
                      {format(new Date(request.created_at), 'PPP')}
                    </p>
                  </div>
                  {request.estimated_completion_date && (
                    <div className="p-3 rounded-lg bg-muted/30">
                      <Label className="text-muted-foreground text-xs uppercase">Est. Completion</Label>
                      <p className="text-sm font-medium flex items-center gap-1 mt-1">
                        <Clock className="h-3 w-3" />
                        {format(new Date(request.estimated_completion_date), 'PPP')}
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Quote Information (visible to all) */}
            {request.quoted_price && (
              <Card className="border-purple-500/20 bg-purple-500/5">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-purple-700">
                    <DollarSign className="h-5 w-5" />
                    Quote Details
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-muted-foreground text-xs uppercase">Quoted Price</Label>
                      <p className="text-2xl font-bold text-purple-700">
                        {request.quoted_currency || 'TZS'} {request.quoted_price.toLocaleString()}
                      </p>
                    </div>
                    {request.estimated_completion_date && (
                      <div>
                        <Label className="text-muted-foreground text-xs uppercase">Est. Completion</Label>
                        <p className="font-medium">{format(new Date(request.estimated_completion_date), 'PPP')}</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Provider Notes (visible to all) */}
            {request.provider_notes && (
              <Card className="border-blue-500/20 bg-blue-500/5">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-blue-700">
                    <MessageSquare className="h-5 w-5" />
                    Provider Response
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm">{request.provider_notes}</p>
                </CardContent>
              </Card>
            )}

            {/* Report Download (visible to all when completed) */}
            {request.report_file_url && (
              <Card className="border-emerald-500/20 bg-emerald-500/5">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-emerald-700">
                    <FileText className="h-5 w-5" />
                    Completed Report
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <a 
                    href={request.report_file_url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                  >
                    <Button className="gap-2 bg-emerald-600 hover:bg-emerald-700">
                      <Download className="h-4 w-4" />
                      Download Report
                    </Button>
                  </a>
                </CardContent>
              </Card>
            )}

            {/* Provider/Admin Controls */}
            {(isProvider || isAdmin) && request.status !== 'completed' && request.status !== 'cancelled' && (
              <>
                {/* Update Quote & Status */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <DollarSign className="h-5 w-5" />
                      Update Quote & Status
                    </CardTitle>
                    <CardDescription>
                      Update the quote, estimated completion, and status for this request
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Quoted Price</Label>
                        <Input
                          type="number"
                          placeholder={request.quoted_price?.toString() || "0.00"}
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
                        placeholder="Add notes for the requester..."
                        value={providerNotes}
                        onChange={(e) => setProviderNotes(e.target.value)}
                        rows={3}
                      />
                    </div>

                    <Button onClick={handleUpdateQuote} disabled={updateRequestMutation.isPending} className="w-full">
                      {updateRequestMutation.isPending ? 'Updating...' : 'Update Request'}
                    </Button>
                  </CardContent>
                </Card>

                {/* Upload Report */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Upload className="h-5 w-5" />
                      Upload Final Report
                    </CardTitle>
                    <CardDescription>
                      Upload the completed analysis report to mark this request as completed
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label>Report File (PDF, DOC)</Label>
                      <Input
                        type="file"
                        accept=".pdf,.doc,.docx"
                        onChange={(e) => setReportFile(e.target.files?.[0] || null)}
                        className="mt-1"
                      />
                    </div>

                    <Button 
                      onClick={handleUploadReport} 
                      disabled={!reportFile || uploadReportMutation.isPending}
                      className="w-full gap-2"
                    >
                      <Upload className="h-4 w-4" />
                      {uploadReportMutation.isPending ? 'Uploading...' : 'Upload & Complete'}
                    </Button>
                  </CardContent>
                </Card>
              </>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Quick Actions */}
            {(isProvider || isAdmin) && (
              <Card>
                <CardHeader>
                  <CardTitle>Quick Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {request.status === 'quoted' && (
                    <Button
                      className="w-full gap-2"
                      onClick={handleStartWork}
                      disabled={updateRequestMutation.isPending}
                    >
                      <Clock className="h-4 w-4" />
                      Start Work
                    </Button>
                  )}
                  {request.status === 'in_progress' && (
                    <Button
                      className="w-full gap-2 bg-emerald-600 hover:bg-emerald-700"
                      onClick={handleMarkCompleted}
                      disabled={updateRequestMutation.isPending}
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      Mark Completed
                    </Button>
                  )}
                  <Button 
                    className="w-full" 
                    variant="outline" 
                    onClick={() => navigate(`/messages`)}
                  >
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Go to Messages
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Requester Info (visible to provider/admin) */}
            {(isProvider || isAdmin) && request.requester && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5" />
                    Requester
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <p className="font-medium">{request.requester.full_name}</p>
                  <p className="text-sm text-muted-foreground flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    {request.requester.email}
                  </p>
                  {request.requester.phone && (
                    <p className="text-sm text-muted-foreground flex items-center gap-2">
                      <Phone className="h-4 w-4" />
                      {request.requester.phone}
                    </p>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Provider Info (visible to requester) */}
            {request.provider && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="h-5 w-5" />
                    Service Provider
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <p className="font-medium">{request.provider.company_name}</p>
                  <p className="text-sm text-muted-foreground flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    {request.provider.contact_email}
                  </p>
                  {request.provider.contact_phone && (
                    <p className="text-sm text-muted-foreground flex items-center gap-2">
                      <Phone className="h-4 w-4" />
                      {request.provider.contact_phone}
                    </p>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Timeline */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Timeline
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 rounded-full bg-primary mt-2" />
                  <div>
                    <p className="text-sm font-medium">Request Created</p>
                    <p className="text-xs text-muted-foreground">{format(new Date(request.created_at), 'PPP p')}</p>
                  </div>
                </div>
                {request.updated_at !== request.created_at && (
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 rounded-full bg-blue-500 mt-2" />
                    <div>
                      <p className="text-sm font-medium">Last Updated</p>
                      <p className="text-xs text-muted-foreground">{format(new Date(request.updated_at), 'PPP p')}</p>
                    </div>
                  </div>
                )}
                {request.actual_completion_date && (
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 mt-2" />
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
