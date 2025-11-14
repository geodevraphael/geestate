import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { Navbar } from '@/components/Navbar';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from 'react-i18next';
import { Loader2, Users, CheckCircle2, Clock, XCircle, Plus } from 'lucide-react';
import type { Lead, CrmTask, LeadStatus } from '@/types/crm';

export default function CRMDashboard() {
  return (
    <ProtectedRoute requireRole={['seller', 'broker', 'admin']}>
      <CRMDashboardContent />
    </ProtectedRoute>
  );
}

function CRMDashboardContent() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { t } = useTranslation();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [tasks, setTasks] = useState<CrmTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStatus, setSelectedStatus] = useState<LeadStatus | 'all'>('all');

  useEffect(() => {
    if (user) {
      fetchCRMData();
    }
  }, [user]);

  const fetchCRMData = async () => {
    try {
      setLoading(true);

      // Fetch leads
      const { data: leadsData, error: leadsError } = await supabase
        .from('leads')
        .select(`
          *,
          listing:listings(id, title, location_label, price),
          buyer:profiles!leads_buyer_id_fkey(id, full_name, email, phone)
        `)
        .eq('seller_id', user!.id)
        .order('created_at', { ascending: false });

      if (leadsError) throw leadsError;

      // Fetch tasks
      const { data: tasksData, error: tasksError } = await supabase
        .from('crm_tasks')
        .select(`
          *,
          lead:leads(id, listing:listings(title))
        `)
        .eq('seller_id', user!.id)
        .order('due_date', { ascending: true, nullsFirst: false });

      if (tasksError) throw tasksError;

      setLeads(leadsData as any);
      setTasks(tasksData as any);
    } catch (error) {
      console.error('Error fetching CRM data:', error);
      toast({
        title: t('common.error'),
        description: 'Failed to load CRM data',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const updateLeadStatus = async (leadId: string, status: LeadStatus) => {
    try {
      const { error } = await supabase
        .from('leads')
        .update({ status })
        .eq('id', leadId);

      if (error) throw error;

      setLeads(leads.map(l => l.id === leadId ? { ...l, status } : l));
      toast({
        title: t('common.success'),
        description: 'Lead status updated',
      });
    } catch (error) {
      console.error('Error updating lead:', error);
      toast({
        title: t('common.error'),
        description: 'Failed to update lead status',
        variant: 'destructive',
      });
    }
  };

  const getStatusColor = (status: LeadStatus) => {
    switch (status) {
      case 'new': return 'bg-blue-500';
      case 'contacted': return 'bg-purple-500';
      case 'interested': return 'bg-green-500';
      case 'under_offer': return 'bg-yellow-500';
      case 'closed': return 'bg-emerald-600';
      case 'lost': return 'bg-red-500';
      case 'not_interested': return 'bg-gray-500';
      default: return 'bg-gray-500';
    }
  };

  const filteredLeads = selectedStatus === 'all' 
    ? leads 
    : leads.filter(l => l.status === selectedStatus);

  const statusCounts = {
    all: leads.length,
    new: leads.filter(l => l.status === 'new').length,
    contacted: leads.filter(l => l.status === 'contacted').length,
    interested: leads.filter(l => l.status === 'interested').length,
    under_offer: leads.filter(l => l.status === 'under_offer').length,
    closed: leads.filter(l => l.status === 'closed').length,
  };

  const pendingTasks = tasks.filter(t => t.status === 'pending');
  const overdueTasks = tasks.filter(t => t.status === 'overdue');

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="container mx-auto py-8 flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <div className="container mx-auto py-8 px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">{t('nav.crm')}</h1>
          <p className="text-muted-foreground">Manage your leads and follow-up tasks</p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Users className="h-4 w-4" />
                Total Leads
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{leads.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                Closed
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{statusCounts.closed}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Clock className="h-4 w-4 text-blue-500" />
                Pending Tasks
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{pendingTasks.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <XCircle className="h-4 w-4 text-red-500" />
                Overdue Tasks
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{overdueTasks.length}</div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="leads" className="space-y-4">
          <TabsList>
            <TabsTrigger value="leads">{t('crm.leads')}</TabsTrigger>
            <TabsTrigger value="tasks">{t('crm.tasks')}</TabsTrigger>
          </TabsList>

          <TabsContent value="leads" className="space-y-4">
            {/* Status Filter */}
            <div className="flex gap-2 flex-wrap">
              {['all', 'new', 'contacted', 'interested', 'under_offer', 'closed'].map(status => (
                <Button
                  key={status}
                  variant={selectedStatus === status ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedStatus(status as any)}
                >
                  {t(`crm.statuses.${status}` as any) || status.replace('_', ' ')}
                  <span className="ml-2 text-xs">({statusCounts[status as keyof typeof statusCounts]})</span>
                </Button>
              ))}
            </div>

            {/* Leads Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredLeads.map(lead => (
                <Card key={lead.id}>
                  <CardHeader>
                    <CardTitle className="text-base">{lead.listing?.title}</CardTitle>
                    <CardDescription>
                      {lead.buyer?.full_name || 'Unknown Buyer'}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">{t('crm.leadStatus')}</span>
                        <Badge className={getStatusColor(lead.status)}>
                          {t(`crm.statuses.${lead.status}` as any)}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">{t('crm.leadSource')}</span>
                        <Badge variant="outline">
                          {t(`crm.sources.${lead.source}` as any)}
                        </Badge>
                      </div>
                      {lead.buyer?.email && (
                        <div className="text-sm text-muted-foreground truncate">
                          {lead.buyer.email}
                        </div>
                      )}
                      <div className="pt-2">
                        <select
                          value={lead.status}
                          onChange={(e) => updateLeadStatus(lead.id, e.target.value as LeadStatus)}
                          className="w-full text-sm border rounded p-2"
                        >
                          <option value="new">{t('crm.statuses.new')}</option>
                          <option value="contacted">{t('crm.statuses.contacted')}</option>
                          <option value="interested">{t('crm.statuses.interested')}</option>
                          <option value="not_interested">{t('crm.statuses.not_interested')}</option>
                          <option value="under_offer">{t('crm.statuses.under_offer')}</option>
                          <option value="closed">{t('crm.statuses.closed')}</option>
                          <option value="lost">{t('crm.statuses.lost')}</option>
                        </select>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {filteredLeads.length === 0 && (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  No leads found for this status
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="tasks" className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Your Tasks</h3>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                {t('crm.addTask')}
              </Button>
            </div>

            <div className="space-y-2">
              {tasks.map(task => (
                <Card key={task.id}>
                  <CardContent className="py-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="font-medium">{task.title}</h4>
                        {task.description && (
                          <p className="text-sm text-muted-foreground mt-1">{task.description}</p>
                        )}
                        {task.due_date && (
                          <p className="text-xs text-muted-foreground mt-2">
                            Due: {new Date(task.due_date).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                      <Badge
                        variant={task.status === 'overdue' ? 'destructive' : 'default'}
                      >
                        {t(`crm.taskStatuses.${task.status}` as any)}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}

              {tasks.length === 0 && (
                <Card>
                  <CardContent className="py-8 text-center text-muted-foreground">
                    No tasks yet. Create one to get started!
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}
