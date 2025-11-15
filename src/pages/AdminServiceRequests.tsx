import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { MainLayout } from '@/components/layouts/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { useNavigate } from 'react-router-dom';
import { Search, FileText, Calendar, DollarSign } from 'lucide-react';
import { format } from 'date-fns';

export default function AdminServiceRequests() {
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [serviceTypeFilter, setServiceTypeFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const { data: requests, isLoading } = useQuery({
    queryKey: ['admin-service-requests', statusFilter, serviceTypeFilter],
    queryFn: async () => {
      let query = supabase
        .from('service_requests')
        .select(`
          *,
          listings!inner(title, location_label),
          service_providers(company_name)
        `)
        .order('created_at', { ascending: false });

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      if (serviceTypeFilter !== 'all') {
        query = query.eq('service_type', serviceTypeFilter);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Fetch requester profiles separately
      const requestsWithProfiles = await Promise.all(
        (data || []).map(async (request) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name, email')
            .eq('id', request.requester_id)
            .single();
          
          return {
            ...request,
            listing: request.listings,
            requester: profile,
            provider: request.service_providers
          };
        })
      );

      return requestsWithProfiles;
    },
  });

  const filteredRequests = requests?.filter(request => {
    if (!searchQuery) return true;
    const searchLower = searchQuery.toLowerCase();
    return (
      request.listing?.title?.toLowerCase().includes(searchLower) ||
      request.requester?.full_name?.toLowerCase().includes(searchLower) ||
      request.service_type?.toLowerCase().includes(searchLower)
    );
  });

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
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Service Requests Management</h1>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search requests..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="quoted">Quoted</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>

              <Select value={serviceTypeFilter} onValueChange={setServiceTypeFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by service" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Services</SelectItem>
                  <SelectItem value="land_survey">Land Survey</SelectItem>
                  <SelectItem value="soil_testing">Soil Testing</SelectItem>
                  <SelectItem value="valuation">Property Valuation</SelectItem>
                  <SelectItem value="legal_verification">Legal Verification</SelectItem>
                  <SelectItem value="environmental_assessment">Environmental Assessment</SelectItem>
                  <SelectItem value="boundary_survey">Boundary Survey</SelectItem>
                  <SelectItem value="topographic_survey">Topographic Survey</SelectItem>
                </SelectContent>
              </Select>

              <div className="text-sm text-muted-foreground flex items-center">
                Total: {filteredRequests?.length || 0} requests
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Requests List */}
        {isLoading ? (
          <div className="text-center py-12">Loading...</div>
        ) : (
          <div className="space-y-4">
            {filteredRequests?.map((request) => (
              <Card 
                key={request.id} 
                className="hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => navigate(`/admin/service-requests/${request.id}`)}
              >
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-lg">
                          {request.service_type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </CardTitle>
                        <Badge className={getStatusColor(request.status)}>
                          {request.status.replace(/_/g, ' ')}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Listing: {request.listing?.title} - {request.listing?.location_label}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Requested by: {request.requester?.full_name} ({request.requester?.email})
                      </p>
                    </div>
                    <Button variant="outline" size="sm">
                      View Details
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-muted-foreground">Created</p>
                        <p className="font-medium">{format(new Date(request.created_at), 'MMM d, yyyy')}</p>
                      </div>
                    </div>
                    
                    {request.quoted_price && (
                      <div className="flex items-center gap-2">
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-muted-foreground">Quote</p>
                          <p className="font-medium">{request.quoted_currency} {request.quoted_price.toLocaleString()}</p>
                        </div>
                      </div>
                    )}
                    
                    {request.provider && (
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-muted-foreground">Provider</p>
                          <p className="font-medium">{request.provider.company_name}</p>
                        </div>
                      </div>
                    )}
                    
                    {request.estimated_completion_date && (
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-muted-foreground">Est. Completion</p>
                          <p className="font-medium">{format(new Date(request.estimated_completion_date), 'MMM d, yyyy')}</p>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {request.request_notes && (
                    <div className="mt-4 pt-4 border-t">
                      <p className="text-sm text-muted-foreground">Notes: {request.request_notes}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
            
            {filteredRequests?.length === 0 && (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  No service requests found matching your filters.
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
    </MainLayout>
  );
}
