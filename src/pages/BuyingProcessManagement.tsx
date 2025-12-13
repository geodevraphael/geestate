import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { MainLayout } from '@/components/layouts/MainLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { 
  Search, Filter, UserPlus, MessageCircle, Eye, Users, 
  CheckCircle, Clock, AlertTriangle, DollarSign, MapPin,
  Calendar, ArrowRight, RefreshCw, TrendingUp, Target, Phone
} from 'lucide-react';

interface BuyingProcess {
  id: string;
  listing_id: string;
  buyer_id: string;
  seller_id: string;
  process_status: string;
  current_step: number;
  visit_completed: boolean;
  title_verification_completed: boolean;
  registry_search_completed: boolean;
  sale_agreement_completed: boolean;
  payment_completed: boolean;
  transfer_completed: boolean;
  created_at: string;
  updated_at: string;
  assigned_staff_id: string | null;
  assigned_at: string | null;
  commission_rate: number;
  commission_paid: boolean;
  commission_amount: number | null;
  staff_notes: string | null;
  final_price?: number | null;
  listing?: {
    id: string;
    title: string;
    location_label: string;
    price: number;
  };
  buyer?: {
    id: string;
    full_name: string;
    email: string;
    phone: string | null;
  };
  seller?: {
    id: string;
    full_name: string;
    email: string;
    phone: string | null;
  };
  assigned_staff?: {
    id: string;
    full_name: string;
    email: string;
  };
  visit_request?: {
    id: string;
    requested_date: string;
    status: string;
  };
}

interface StaffStats {
  id: string;
  full_name: string;
  assigned_count: number;
  completed_count: number;
  total_commission: number;
}

export default function BuyingProcessManagement() {
  const { user, hasRole } = useAuth();
  const navigate = useNavigate();
  const [processes, setProcesses] = useState<BuyingProcess[]>([]);
  const [visitRequests, setVisitRequests] = useState<any[]>([]);
  const [staffStats, setStaffStats] = useState<StaffStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [assignmentFilter, setAssignmentFilter] = useState('all');
  const [stepFilter, setStepFilter] = useState('all');
  const [activeTab, setActiveTab] = useState('processes');

  const isAdmin = hasRole('admin');
  const isStaff = hasRole('admin') || hasRole('verification_officer') || 
                  hasRole('compliance_officer') || hasRole('spatial_analyst') || 
                  hasRole('customer_success');

  useEffect(() => {
    if (isStaff) {
      fetchData();
    }
  }, [isStaff]);

  const fetchData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchBuyingProcesses(),
        fetchVisitRequests(),
        isAdmin && fetchStaffStats()
      ]);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const fetchBuyingProcesses = async () => {
    const { data, error } = await supabase
      .from('buying_process_tracker')
      .select(`
        *,
        listing:listings(id, title, location_label, price),
        buyer:profiles!buying_process_tracker_buyer_id_fkey(id, full_name, email, phone),
        seller:profiles!buying_process_tracker_seller_id_fkey(id, full_name, email, phone)
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Fetch assigned staff separately for each process
    const processesWithStaff = await Promise.all(
      (data || []).map(async (process: any) => {
        if (process.assigned_staff_id) {
          const { data: staffData } = await supabase
            .from('profiles')
            .select('id, full_name, email')
            .eq('id', process.assigned_staff_id)
            .single();
          return { ...process, assigned_staff: staffData };
        }
        return process;
      })
    );

    setProcesses(processesWithStaff);
  };

  const fetchVisitRequests = async () => {
    const { data, error } = await supabase
      .from('visit_requests')
      .select(`
        *,
        listing:listings(id, title, location_label, price),
        buyer:profiles!visit_requests_buyer_id_fkey(id, full_name, email, phone),
        seller:profiles!visit_requests_seller_id_fkey(id, full_name, email, phone)
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;
    setVisitRequests(data || []);
  };

  const fetchStaffStats = async () => {
    // Get all staff users
    const { data: staffData, error: staffError } = await supabase
      .from('user_roles')
      .select('user_id')
      .in('role', ['admin', 'verification_officer', 'compliance_officer', 'spatial_analyst', 'customer_success']);

    if (staffError) throw staffError;

    const staffIds = [...new Set((staffData || []).map(s => s.user_id))];
    
    if (staffIds.length === 0) {
      setStaffStats([]);
      return;
    }

    // Get profiles and stats
    const { data: profiles, error: profileError } = await supabase
      .from('profiles')
      .select('id, full_name')
      .in('id', staffIds);

    if (profileError) throw profileError;

    // Calculate stats for each staff
    const stats: StaffStats[] = await Promise.all(
      (profiles || []).map(async (profile) => {
        const { count: assignedCount } = await supabase
          .from('buying_process_tracker')
          .select('*', { count: 'exact', head: true })
          .eq('assigned_staff_id', profile.id);

        const { data: completedData } = await supabase
          .from('buying_process_tracker')
          .select('commission_amount')
          .eq('assigned_staff_id', profile.id)
          .eq('process_status', 'completed');

        const completedCount = completedData?.length || 0;
        const totalCommission = completedData?.reduce((sum, p) => sum + (p.commission_amount || 0), 0) || 0;

        return {
          id: profile.id,
          full_name: profile.full_name,
          assigned_count: assignedCount || 0,
          completed_count: completedCount,
          total_commission: totalCommission
        };
      })
    );

    setStaffStats(stats.sort((a, b) => b.completed_count - a.completed_count));
  };

  const handleAssignToMe = async (processId: string) => {
    if (!user) return;

    const { error } = await supabase
      .from('buying_process_tracker')
      .update({ 
        assigned_staff_id: user.id,
        assigned_at: new Date().toISOString()
      })
      .eq('id', processId);

    if (error) {
      toast.error('Failed to assign process');
      return;
    }

    toast.success('Process assigned to you');
    fetchBuyingProcesses();
  };

  const handleUnassign = async (processId: string) => {
    const { error } = await supabase
      .from('buying_process_tracker')
      .update({ 
        assigned_staff_id: null,
        assigned_at: null
      })
      .eq('id', processId);

    if (error) {
      toast.error('Failed to unassign process');
      return;
    }

    toast.success('Process unassigned');
    fetchBuyingProcesses();
  };

  const handleMessageUser = (userId: string, listingId: string) => {
    navigate(`/messages?recipient=${userId}&listing=${listingId}`);
  };

  const calculateProgress = (process: BuyingProcess): number => {
    const steps = [
      process.visit_completed,
      process.title_verification_completed,
      process.registry_search_completed,
      process.sale_agreement_completed,
      process.payment_completed,
      process.transfer_completed
    ];
    const completed = steps.filter(Boolean).length;
    return Math.round((completed / steps.length) * 100);
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      'in_progress': 'default',
      'completed': 'secondary',
      'cancelled': 'destructive',
      'on_hold': 'outline'
    };
    return <Badge variant={variants[status] || 'default'}>{status.replace('_', ' ')}</Badge>;
  };

  const getVisitStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      'pending': 'bg-yellow-500/20 text-yellow-600',
      'accepted': 'bg-green-500/20 text-green-600',
      'rejected': 'bg-red-500/20 text-red-600',
      'completed': 'bg-blue-500/20 text-blue-600'
    };
    return <Badge className={colors[status] || 'bg-muted'}>{status}</Badge>;
  };

  const filteredProcesses = processes.filter(process => {
    const matchesSearch = 
      process.listing?.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      process.buyer?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      process.seller?.full_name?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || process.process_status === statusFilter;
    
    const matchesAssignment = 
      assignmentFilter === 'all' ||
      (assignmentFilter === 'unassigned' && !process.assigned_staff_id) ||
      (assignmentFilter === 'mine' && process.assigned_staff_id === user?.id) ||
      (assignmentFilter === 'assigned' && process.assigned_staff_id);
    
    const matchesStep = 
      stepFilter === 'all' ||
      (stepFilter === 'visit' && !process.visit_completed) ||
      (stepFilter === 'verification' && process.visit_completed && !process.title_verification_completed) ||
      (stepFilter === 'registry' && process.title_verification_completed && !process.registry_search_completed) ||
      (stepFilter === 'agreement' && process.registry_search_completed && !process.sale_agreement_completed) ||
      (stepFilter === 'payment' && process.sale_agreement_completed && !process.payment_completed) ||
      (stepFilter === 'transfer' && process.payment_completed && !process.transfer_completed);
    
    return matchesSearch && matchesStatus && matchesAssignment && matchesStep;
  });

  const filteredVisitRequests = visitRequests.filter(request => {
    const matchesSearch = 
      request.listing?.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      request.buyer?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      request.seller?.full_name?.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesSearch;
  });

  if (!isStaff) {
    return (
      <MainLayout>
        <div className="container mx-auto py-8">
          <Card>
            <CardContent className="py-12 text-center">
              <AlertTriangle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
              <p className="text-muted-foreground">This page is only accessible to staff members.</p>
            </CardContent>
          </Card>
        </div>
      </MainLayout>
    );
  }

  // Calculate summary stats
  const totalProcesses = processes.length;
  const unassignedProcesses = processes.filter(p => !p.assigned_staff_id).length;
  const myProcesses = processes.filter(p => p.assigned_staff_id === user?.id).length;
  const completedProcesses = processes.filter(p => p.process_status === 'completed').length;
  const pendingVisits = visitRequests.filter(v => v.status === 'pending').length;

  return (
    <MainLayout>
      <div className="container mx-auto py-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Buying Process Management</h1>
            <p className="text-muted-foreground">Track and support all buying processes in the system</p>
          </div>
          <Button onClick={fetchData} variant="outline" className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <Target className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-2xl font-bold">{totalProcesses}</p>
                  <p className="text-xs text-muted-foreground">Total Processes</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <UserPlus className="h-5 w-5 text-orange-500" />
                <div>
                  <p className="text-2xl font-bold">{unassignedProcesses}</p>
                  <p className="text-xs text-muted-foreground">Unassigned</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-blue-500" />
                <div>
                  <p className="text-2xl font-bold">{myProcesses}</p>
                  <p className="text-xs text-muted-foreground">My Processes</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-500" />
                <div>
                  <p className="text-2xl font-bold">{completedProcesses}</p>
                  <p className="text-xs text-muted-foreground">Completed</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-yellow-500" />
                <div>
                  <p className="text-2xl font-bold">{pendingVisits}</p>
                  <p className="text-xs text-muted-foreground">Pending Visits</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="processes">Active Processes</TabsTrigger>
            <TabsTrigger value="visits">Visit Requests</TabsTrigger>
            {isAdmin && <TabsTrigger value="staff">Staff Performance</TabsTrigger>}
          </TabsList>

          {/* Filters */}
          <Card className="mt-4">
            <CardContent className="pt-4">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by listing, buyer, or seller..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                {activeTab === 'processes' && (
                  <>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger className="w-40">
                        <SelectValue placeholder="Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="in_progress">In Progress</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                        <SelectItem value="on_hold">On Hold</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select value={assignmentFilter} onValueChange={setAssignmentFilter}>
                      <SelectTrigger className="w-40">
                        <SelectValue placeholder="Assignment" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All</SelectItem>
                        <SelectItem value="unassigned">Unassigned</SelectItem>
                        <SelectItem value="mine">My Processes</SelectItem>
                        <SelectItem value="assigned">Assigned</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select value={stepFilter} onValueChange={setStepFilter}>
                      <SelectTrigger className="w-40">
                        <SelectValue placeholder="Current Step" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Steps</SelectItem>
                        <SelectItem value="visit">At Visit</SelectItem>
                        <SelectItem value="verification">At Verification</SelectItem>
                        <SelectItem value="registry">At Registry</SelectItem>
                        <SelectItem value="agreement">At Agreement</SelectItem>
                        <SelectItem value="payment">At Payment</SelectItem>
                        <SelectItem value="transfer">At Transfer</SelectItem>
                      </SelectContent>
                    </Select>
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Active Processes Tab */}
          <TabsContent value="processes" className="space-y-4">
            {loading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <Card key={i}>
                    <CardContent className="py-4">
                      <Skeleton className="h-20 w-full" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : filteredProcesses.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Target className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No buying processes found</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {filteredProcesses.map((process) => (
                  <Card key={process.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="py-4">
                      <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                        {/* Listing Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start gap-3">
                            <div className="flex-1 min-w-0">
                              <h3 className="font-semibold truncate">
                                {process.listing?.title || 'Unknown Listing'}
                              </h3>
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <MapPin className="h-3 w-3" />
                                <span className="truncate">{process.listing?.location_label}</span>
                              </div>
                              <p className="text-sm font-medium text-primary mt-1">
                                TZS {process.listing?.price?.toLocaleString()}
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Progress */}
                        <div className="w-full lg:w-48">
                          <div className="flex items-center justify-between text-sm mb-1">
                            <span>Progress</span>
                            <span className="font-medium">{calculateProgress(process)}%</span>
                          </div>
                          <Progress value={calculateProgress(process)} className="h-2" />
                        </div>

                        {/* Buyer & Seller */}
                        <div className="flex gap-6 text-sm">
                          <div>
                            <p className="text-muted-foreground text-xs">Buyer</p>
                            <p className="font-medium">{process.buyer?.full_name}</p>
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Phone className="h-3 w-3" />
                              <a href={`tel:${process.buyer?.phone}`} className="hover:text-primary">
                                {process.buyer?.phone || 'No phone'}
                              </a>
                            </div>
                          </div>
                          <div>
                            <p className="text-muted-foreground text-xs">Seller</p>
                            <p className="font-medium">{process.seller?.full_name}</p>
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Phone className="h-3 w-3" />
                              <a href={`tel:${process.seller?.phone}`} className="hover:text-primary">
                                {process.seller?.phone || 'No phone'}
                              </a>
                            </div>
                          </div>
                        </div>

                        {/* Assignment & Status */}
                        <div className="flex items-center gap-4">
                          {process.assigned_staff_id ? (
                            <div className="flex items-center gap-2">
                              <Avatar className="h-8 w-8">
                                <AvatarFallback className="text-xs">
                                  {process.assigned_staff?.full_name?.charAt(0) || '?'}
                                </AvatarFallback>
                              </Avatar>
                              <div className="text-sm">
                                <p className="font-medium">{process.assigned_staff?.full_name}</p>
                                <p className="text-xs text-muted-foreground">Assigned</p>
                              </div>
                            </div>
                          ) : (
                            <Badge variant="outline" className="text-orange-500 border-orange-500">
                              Unassigned
                            </Badge>
                          )}
                          {getStatusBadge(process.process_status)}
                        </div>

                        {/* Actions */}
                        <div className="flex gap-2">
                          {!process.assigned_staff_id && (
                            <Button 
                              size="sm" 
                              onClick={() => handleAssignToMe(process.id)}
                              className="gap-1"
                            >
                              <UserPlus className="h-4 w-4" />
                              Take
                            </Button>
                          )}
                          {process.assigned_staff_id === user?.id && (
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => handleUnassign(process.id)}
                            >
                              Release
                            </Button>
                          )}
                          {isAdmin && process.assigned_staff_id && process.assigned_staff_id !== user?.id && (
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => handleUnassign(process.id)}
                            >
                              Reassign
                            </Button>
                          )}
                          <Button 
                            size="sm" 
                            variant="ghost"
                            onClick={() => handleMessageUser(process.buyer_id, process.listing_id)}
                            title="Message Buyer"
                          >
                            <MessageCircle className="h-4 w-4" />
                          </Button>
                          <Button 
                            size="sm" 
                            variant="ghost"
                            onClick={() => handleMessageUser(process.seller_id, process.listing_id)}
                            title="Message Seller"
                          >
                            <MessageCircle className="h-4 w-4 text-green-600" />
                          </Button>
                          <Button 
                            size="sm" 
                            variant="ghost"
                            onClick={() => navigate(`/buying-process/${process.id}`)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>

                      {/* Commission Info for Completed */}
                      {process.process_status === 'completed' && (
                        <div className="mt-3 pt-3 border-t flex items-center gap-4 text-sm">
                          <DollarSign className="h-4 w-4 text-green-500" />
                          <span className="text-muted-foreground">GIE Fee (2%): TZS {((process.listing?.price || 0) * 0.02).toLocaleString()}</span>
                          <ArrowRight className="h-3 w-3" />
                          <span className="font-medium">Staff Commission (5% of fee): TZS {((process.listing?.price || 0) * 0.001).toLocaleString()}</span>
                          <Badge variant={process.commission_paid ? 'secondary' : 'outline'}>
                            {process.commission_paid ? 'Paid' : 'Pending'}
                          </Badge>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Visit Requests Tab */}
          <TabsContent value="visits" className="space-y-4">
            {loading ? (
              <Card><CardContent className="py-4"><Skeleton className="h-40 w-full" /></CardContent></Card>
            ) : filteredVisitRequests.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No visit requests found</p>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Listing</TableHead>
                      <TableHead>Buyer</TableHead>
                      <TableHead>Seller</TableHead>
                      <TableHead>Requested Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredVisitRequests.map((request) => (
                      <TableRow key={request.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{request.listing?.title}</p>
                            <p className="text-xs text-muted-foreground">{request.listing?.location_label}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{request.buyer?.full_name}</p>
                            <p className="text-xs text-muted-foreground">{request.buyer?.email}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{request.seller?.full_name}</p>
                            <p className="text-xs text-muted-foreground">{request.seller?.phone}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          {format(new Date(request.requested_date), 'PP')}
                          <p className="text-xs text-muted-foreground">{request.requested_time_slot}</p>
                        </TableCell>
                        <TableCell>{getVisitStatusBadge(request.status)}</TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button 
                              size="sm" 
                              variant="ghost"
                              onClick={() => handleMessageUser(request.buyer_id, request.listing_id)}
                              title="Message Buyer"
                            >
                              <MessageCircle className="h-4 w-4" />
                            </Button>
                            <Button 
                              size="sm" 
                              variant="ghost"
                              onClick={() => handleMessageUser(request.seller_id, request.listing_id)}
                              title="Message Seller"
                            >
                              <MessageCircle className="h-4 w-4 text-green-600" />
                            </Button>
                            <Button 
                              size="sm" 
                              variant="ghost"
                              onClick={() => navigate(`/listings/${request.listing_id}`)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Card>
            )}
          </TabsContent>

          {/* Staff Performance Tab (Admin Only) */}
          {isAdmin && (
            <TabsContent value="staff" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Staff Performance & Assignments</CardTitle>
                  <CardDescription>View which staff members are handling buying processes</CardDescription>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <Skeleton className="h-40 w-full" />
                  ) : staffStats.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">No staff data available</p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Staff Member</TableHead>
                          <TableHead className="text-center">Active Processes</TableHead>
                          <TableHead className="text-center">Completed</TableHead>
                          <TableHead className="text-right">Total Commission</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {staffStats.map((staff) => (
                          <TableRow key={staff.id}>
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <Avatar>
                                  <AvatarFallback>{staff.full_name?.charAt(0)}</AvatarFallback>
                                </Avatar>
                                <span className="font-medium">{staff.full_name}</span>
                              </div>
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge variant="outline">{staff.assigned_count}</Badge>
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge variant="secondary">{staff.completed_count}</Badge>
                            </TableCell>
                            <TableCell className="text-right font-medium text-green-600">
                              TZS {staff.total_commission.toLocaleString()}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          )}
        </Tabs>
      </div>
    </MainLayout>
  );
}
