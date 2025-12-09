import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { MainLayout } from '@/components/layouts/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { 
  FileSearch, Clock, CheckCircle2, AlertCircle, XCircle,
  MapPin, Calendar, DollarSign, FileText, MessageSquare,
  ArrowRight, Sparkles, Download, Eye, Building2, User
} from 'lucide-react';
import { format } from 'date-fns';
import { Link, useNavigate } from 'react-router-dom';

interface ServiceRequest {
  id: string;
  listing_id: string | null;
  requester_id: string;
  service_provider_id: string | null;
  service_type: string;
  service_category: string;
  status: string;
  request_notes: string | null;
  provider_notes: string | null;
  quoted_price: number | null;
  quoted_currency: string | null;
  estimated_completion_date: string | null;
  actual_completion_date: string | null;
  report_file_url: string | null;
  created_at: string;
  updated_at: string;
  listings?: {
    title: string;
    location_label: string;
  } | null;
  service_provider_profiles?: {
    company_name: string;
    contact_phone: string | null;
    contact_email: string;
    logo_url: string | null;
  } | null;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType; progress: number }> = {
  pending: { 
    label: 'Pending Review', 
    color: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
    icon: Clock,
    progress: 15
  },
  assigned: { 
    label: 'Provider Assigned', 
    color: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
    icon: User,
    progress: 30
  },
  quoted: { 
    label: 'Quote Received', 
    color: 'bg-purple-500/10 text-purple-600 border-purple-500/20',
    icon: DollarSign,
    progress: 45
  },
  in_progress: { 
    label: 'In Progress', 
    color: 'bg-indigo-500/10 text-indigo-600 border-indigo-500/20',
    icon: FileSearch,
    progress: 65
  },
  completed: { 
    label: 'Completed', 
    color: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
    icon: CheckCircle2,
    progress: 100
  },
  cancelled: { 
    label: 'Cancelled', 
    color: 'bg-red-500/10 text-red-600 border-red-500/20',
    icon: XCircle,
    progress: 0
  },
};

const STEPS = [
  { key: 'pending', label: 'Request Submitted' },
  { key: 'assigned', label: 'Provider Assigned' },
  { key: 'quoted', label: 'Quote Received' },
  { key: 'in_progress', label: 'Work In Progress' },
  { key: 'completed', label: 'Completed' },
];

export default function MyServiceRequests() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [selectedRequest, setSelectedRequest] = useState<ServiceRequest | null>(null);
  const [activeTab, setActiveTab] = useState('all');

  const { data: requests = [], isLoading, refetch } = useQuery({
    queryKey: ['my-service-requests', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from('service_requests')
        .select(`
          *,
          listings (title, location_label)
        `)
        .eq('requester_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch provider details for each request
      const requestsWithProviders = await Promise.all(
        (data || []).map(async (request) => {
          if (request.service_provider_id) {
            const { data: provider } = await supabase
              .from('service_provider_profiles')
              .select('company_name, contact_phone, contact_email, logo_url')
              .eq('user_id', request.service_provider_id)
              .single();
            return { ...request, service_provider_profiles: provider };
          }
          return request;
        })
      );

      return requestsWithProviders as ServiceRequest[];
    },
    enabled: !!user?.id,
  });

  const filteredRequests = requests.filter(r => {
    if (activeTab === 'all') return true;
    if (activeTab === 'active') return ['pending', 'assigned', 'quoted', 'in_progress'].includes(r.status);
    if (activeTab === 'completed') return r.status === 'completed';
    return true;
  });

  const getStepIndex = (status: string) => {
    const index = STEPS.findIndex(s => s.key === status);
    return index >= 0 ? index : 0;
  };

  const stats = {
    total: requests.length,
    active: requests.filter(r => ['pending', 'assigned', 'quoted', 'in_progress'].includes(r.status)).length,
    completed: requests.filter(r => r.status === 'completed').length,
    pendingQuote: requests.filter(r => r.status === 'quoted').length,
  };

  return (
    <MainLayout>
      <div className="w-full px-4 md:px-6 lg:px-8 py-6 md:py-8">
        {/* Hero Header */}
        <div className="relative mb-8 p-6 md:p-8 rounded-2xl bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-primary/10 overflow-hidden">
          <div className="absolute inset-0 bg-grid-white/5 [mask-image:linear-gradient(0deg,transparent,black)]" />
          <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-3">
                <FileSearch className="h-8 w-8 text-primary" />
                My Service Requests
              </h1>
              <p className="text-muted-foreground mt-1">Track your geospatial and professional service requests</p>
            </div>
            <Link to="/service-providers">
              <Button className="gap-2 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg shadow-primary/25">
                <Sparkles className="h-4 w-4" />
                Find Providers
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card className="bg-gradient-to-br from-background to-muted/30">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <FileSearch className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.total}</p>
                  <p className="text-xs text-muted-foreground">Total Requests</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-background to-blue-500/5">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-500/10">
                  <Clock className="h-5 w-5 text-blue-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.active}</p>
                  <p className="text-xs text-muted-foreground">Active</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-background to-purple-500/5">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-purple-500/10">
                  <DollarSign className="h-5 w-5 text-purple-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.pendingQuote}</p>
                  <p className="text-xs text-muted-foreground">Awaiting Response</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-background to-emerald-500/5">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-emerald-500/10">
                  <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.completed}</p>
                  <p className="text-xs text-muted-foreground">Completed</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs and Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-4">
            <TabsTrigger value="all">All Requests</TabsTrigger>
            <TabsTrigger value="active">Active</TabsTrigger>
            <TabsTrigger value="completed">Completed</TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab}>
            {isLoading ? (
              <div className="grid gap-4 md:grid-cols-2">
                {[1, 2, 3].map((i) => (
                  <Card key={i} className="animate-pulse">
                    <CardContent className="p-6 space-y-4">
                      <div className="h-6 bg-muted rounded w-3/4" />
                      <div className="h-4 bg-muted rounded w-1/2" />
                      <div className="h-2 bg-muted rounded w-full" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : filteredRequests.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="text-center py-16">
                  <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-primary/10 flex items-center justify-center">
                    <FileSearch className="h-10 w-10 text-primary" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">No service requests yet</h3>
                  <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
                    Request professional services like land surveys, valuations, and legal assistance for your properties.
                  </p>
                  <Link to="/service-providers">
                    <Button size="lg" className="gap-2">
                      <Sparkles className="h-4 w-4" />
                      Browse Service Providers
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {filteredRequests.map((request) => {
                  const config = STATUS_CONFIG[request.status] || STATUS_CONFIG.pending;
                  const StatusIcon = config.icon;
                  const currentStep = getStepIndex(request.status);

                  return (
                    <Card 
                      key={request.id} 
                      className="group overflow-hidden hover:shadow-lg transition-all duration-300 hover:border-primary/30 cursor-pointer"
                      onClick={() => setSelectedRequest(request)}
                    >
                      <CardContent className="p-5 space-y-4">
                        {/* Header */}
                        <div className="flex items-start justify-between">
                          <div className="space-y-1 flex-1 min-w-0">
                            <h3 className="font-semibold text-lg capitalize">
                              {request.service_type.replace(/_/g, ' ')}
                            </h3>
                            <p className="text-sm text-muted-foreground capitalize">
                              {request.service_category.replace(/_/g, ' ')}
                            </p>
                          </div>
                          <Badge variant="outline" className={`${config.color} shrink-0 gap-1`}>
                            <StatusIcon className="h-3 w-3" />
                            {config.label}
                          </Badge>
                        </div>

                        {/* Progress Bar */}
                        {request.status !== 'cancelled' && (
                          <div className="space-y-2">
                            <div className="flex justify-between text-xs text-muted-foreground">
                              <span>Progress</span>
                              <span>{config.progress}%</span>
                            </div>
                            <Progress value={config.progress} className="h-2" />
                          </div>
                        )}

                        {/* Provider Info */}
                        {request.service_provider_profiles && (
                          <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
                            <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
                            <span className="text-sm truncate">{request.service_provider_profiles.company_name}</span>
                          </div>
                        )}

                        {/* Property Info */}
                        {request.listings && (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <MapPin className="h-4 w-4 shrink-0" />
                            <span className="truncate">{request.listings.title}</span>
                          </div>
                        )}

                        {/* Quote Info */}
                        {request.quoted_price && (
                          <div className="flex items-center justify-between p-2 rounded-lg bg-purple-500/10">
                            <span className="text-sm text-purple-700">Quoted Price</span>
                            <span className="font-bold text-purple-700">
                              {request.quoted_currency || 'TZS'} {request.quoted_price.toLocaleString()}
                            </span>
                          </div>
                        )}

                        {/* Footer */}
                        <div className="flex items-center justify-between pt-3 border-t text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            <span>{format(new Date(request.created_at), 'MMM d, yyyy')}</span>
                          </div>
                          <Button variant="ghost" size="sm" className="gap-1 text-primary">
                            View Details
                            <ArrowRight className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Request Detail Dialog */}
        <Dialog open={!!selectedRequest} onOpenChange={() => setSelectedRequest(null)}>
          <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 capitalize">
                <FileSearch className="h-5 w-5 text-primary" />
                {selectedRequest?.service_type.replace(/_/g, ' ')} Request
              </DialogTitle>
            </DialogHeader>
            
            {selectedRequest && (
              <div className="space-y-6 py-4">
                {/* Status Badge */}
                <div className="flex items-center justify-between">
                  <Badge variant="outline" className={`${STATUS_CONFIG[selectedRequest.status]?.color || ''} gap-1`}>
                    {STATUS_CONFIG[selectedRequest.status]?.label || selectedRequest.status}
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    Created {format(new Date(selectedRequest.created_at), 'PPP')}
                  </span>
                </div>

                {/* Progress Steps */}
                {selectedRequest.status !== 'cancelled' && (
                  <div className="p-4 rounded-lg bg-muted/30 border">
                    <h4 className="font-medium mb-4">Request Progress</h4>
                    <div className="flex items-center justify-between">
                      {STEPS.map((step, index) => {
                        const currentStep = getStepIndex(selectedRequest.status);
                        const isCompleted = index <= currentStep;
                        const isCurrent = index === currentStep;
                        
                        return (
                          <div key={step.key} className="flex flex-col items-center flex-1">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                              isCompleted 
                                ? 'bg-primary text-primary-foreground' 
                                : 'bg-muted text-muted-foreground'
                            } ${isCurrent ? 'ring-2 ring-primary ring-offset-2' : ''}`}>
                              {isCompleted ? <CheckCircle2 className="h-4 w-4" /> : index + 1}
                            </div>
                            <span className={`text-xs mt-2 text-center ${isCompleted ? 'text-primary font-medium' : 'text-muted-foreground'}`}>
                              {step.label}
                            </span>
                            {index < STEPS.length - 1 && (
                              <div className={`absolute h-0.5 w-full mt-4 ${isCompleted ? 'bg-primary' : 'bg-muted'}`} />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Property Info */}
                {selectedRequest.listings && (
                  <div className="p-4 rounded-lg bg-muted/30 border">
                    <h4 className="font-medium mb-2 flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      Related Property
                    </h4>
                    <p className="text-sm">{selectedRequest.listings.title}</p>
                    <p className="text-sm text-muted-foreground">{selectedRequest.listings.location_label}</p>
                    <Link to={`/listings/${selectedRequest.listing_id}`}>
                      <Button variant="outline" size="sm" className="mt-2 gap-1">
                        <Eye className="h-4 w-4" />
                        View Property
                      </Button>
                    </Link>
                  </div>
                )}

                {/* Provider Info */}
                {selectedRequest.service_provider_profiles && (
                  <div className="p-4 rounded-lg bg-muted/30 border">
                    <h4 className="font-medium mb-2 flex items-center gap-2">
                      <Building2 className="h-4 w-4" />
                      Assigned Provider
                    </h4>
                    <p className="font-medium">{selectedRequest.service_provider_profiles.company_name}</p>
                    <p className="text-sm text-muted-foreground">{selectedRequest.service_provider_profiles.contact_email}</p>
                    {selectedRequest.service_provider_profiles.contact_phone && (
                      <p className="text-sm text-muted-foreground">{selectedRequest.service_provider_profiles.contact_phone}</p>
                    )}
                  </div>
                )}

                {/* Quote Details */}
                {selectedRequest.quoted_price && (
                  <div className="p-4 rounded-lg bg-purple-500/10 border border-purple-500/20">
                    <h4 className="font-medium mb-2 flex items-center gap-2 text-purple-700">
                      <DollarSign className="h-4 w-4" />
                      Quote Details
                    </h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Quoted Price</p>
                        <p className="text-lg font-bold text-purple-700">
                          {selectedRequest.quoted_currency || 'TZS'} {selectedRequest.quoted_price.toLocaleString()}
                        </p>
                      </div>
                      {selectedRequest.estimated_completion_date && (
                        <div>
                          <p className="text-sm text-muted-foreground">Est. Completion</p>
                          <p className="font-medium">{format(new Date(selectedRequest.estimated_completion_date), 'PPP')}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Request Notes */}
                {selectedRequest.request_notes && (
                  <div className="p-4 rounded-lg bg-muted/30 border">
                    <h4 className="font-medium mb-2 flex items-center gap-2">
                      <MessageSquare className="h-4 w-4" />
                      Your Notes
                    </h4>
                    <p className="text-sm">{selectedRequest.request_notes}</p>
                  </div>
                )}

                {/* Provider Notes */}
                {selectedRequest.provider_notes && (
                  <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/20">
                    <h4 className="font-medium mb-2 flex items-center gap-2 text-blue-700">
                      <MessageSquare className="h-4 w-4" />
                      Provider Response
                    </h4>
                    <p className="text-sm">{selectedRequest.provider_notes}</p>
                  </div>
                )}

                {/* Report Download */}
                {selectedRequest.report_file_url && (
                  <div className="p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                    <h4 className="font-medium mb-2 flex items-center gap-2 text-emerald-700">
                      <FileText className="h-4 w-4" />
                      Completed Report
                    </h4>
                    <a 
                      href={selectedRequest.report_file_url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                    >
                      <Button className="gap-2 bg-emerald-600 hover:bg-emerald-700">
                        <Download className="h-4 w-4" />
                        Download Report
                      </Button>
                    </a>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-3 pt-4 border-t">
                  <Button 
                    variant="outline" 
                    className="flex-1"
                    onClick={() => setSelectedRequest(null)}
                  >
                    Close
                  </Button>
                  <Button 
                    className="flex-1 gap-2"
                    onClick={() => {
                      setSelectedRequest(null);
                      navigate(`/service-requests/${selectedRequest.id}`);
                    }}
                  >
                    <Eye className="h-4 w-4" />
                    Full Details
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}
