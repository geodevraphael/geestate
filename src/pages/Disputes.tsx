import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Navbar } from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { AlertCircle, MessageSquare } from 'lucide-react';
import { format } from 'date-fns';

interface Dispute {
  id: string;
  listing_id: string;
  dispute_type: string;
  description: string;
  status: string;
  created_at: string;
  listings: {
    title: string;
  };
  opened_by_profile: {
    full_name: string;
  };
}

export default function Disputes() {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [disputes, setDisputes] = useState<Dispute[]>([]);

  const isAdmin = profile?.role && ['admin', 'compliance_officer'].includes(profile.role);

  useEffect(() => {
    if (user) {
      fetchDisputes();
    }
  }, [user]);

  const fetchDisputes = async () => {
    try {
      let query = supabase
        .from('disputes')
        .select(`
          *,
          listings(title),
          opened_by_profile:profiles!disputes_opened_by_fkey(full_name)
        `)
        .order('created_at', { ascending: false });

      const { data, error } = await query;

      if (error) throw error;
      setDisputes(data || []);
    } catch (error) {
      console.error('Error fetching disputes:', error);
      toast({
        title: 'Error',
        description: 'Failed to load disputes',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, any> = {
      open: <Badge variant="destructive">Open</Badge>,
      in_review: <Badge variant="default">In Review</Badge>,
      resolved: <Badge variant="default" className="bg-success">Resolved</Badge>,
      rejected: <Badge variant="secondary">Rejected</Badge>,
    };
    return variants[status] || <Badge>{status}</Badge>;
  };

  const getDisputeTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      payment_issue: 'Payment Issue',
      fraud_suspicion: 'Fraud Suspicion',
      misrepresentation: 'Misrepresentation',
      unverified_documents: 'Unverified Documents',
      visit_issue: 'Visit Issue',
      other: 'Other',
    };
    return labels[type] || type;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto p-6">Loading disputes...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <div className="container mx-auto p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <AlertCircle className="h-8 w-8" />
            Dispute Center
          </h1>
          <p className="text-muted-foreground">Manage and resolve disputes</p>
        </div>

        <Tabs defaultValue="open" className="space-y-6">
          <TabsList>
            <TabsTrigger value="open">
              Open ({disputes.filter(d => d.status === 'open').length})
            </TabsTrigger>
            <TabsTrigger value="in_review">
              In Review ({disputes.filter(d => d.status === 'in_review').length})
            </TabsTrigger>
            <TabsTrigger value="resolved">
              Resolved ({disputes.filter(d => d.status === 'resolved').length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="open" className="space-y-4">
            {disputes.filter(d => d.status === 'open').length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  No open disputes
                </CardContent>
              </Card>
            ) : (
              disputes
                .filter(d => d.status === 'open')
                .map(dispute => (
                  <Card key={dispute.id}>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle>{dispute.listings.title}</CardTitle>
                          <CardDescription className="mt-1">
                            Opened by {dispute.opened_by_profile.full_name} on{' '}
                            {format(new Date(dispute.created_at), 'MMM dd, yyyy')}
                          </CardDescription>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{getDisputeTypeLabel(dispute.dispute_type)}</Badge>
                          {getStatusBadge(dispute.status)}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm mb-4">{dispute.description}</p>
                      {isAdmin && (
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline">
                            <MessageSquare className="h-4 w-4 mr-2" />
                            Review
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))
            )}
          </TabsContent>

          <TabsContent value="in_review" className="space-y-4">
            {disputes.filter(d => d.status === 'in_review').length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  No disputes in review
                </CardContent>
              </Card>
            ) : (
              disputes
                .filter(d => d.status === 'in_review')
                .map(dispute => (
                  <Card key={dispute.id}>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle>{dispute.listings.title}</CardTitle>
                          <CardDescription className="mt-1">
                            Opened by {dispute.opened_by_profile.full_name} on{' '}
                            {format(new Date(dispute.created_at), 'MMM dd, yyyy')}
                          </CardDescription>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{getDisputeTypeLabel(dispute.dispute_type)}</Badge>
                          {getStatusBadge(dispute.status)}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm">{dispute.description}</p>
                    </CardContent>
                  </Card>
                ))
            )}
          </TabsContent>

          <TabsContent value="resolved" className="space-y-4">
            {disputes.filter(d => d.status === 'resolved').length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  No resolved disputes
                </CardContent>
              </Card>
            ) : (
              disputes
                .filter(d => d.status === 'resolved')
                .map(dispute => (
                  <Card key={dispute.id}>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle>{dispute.listings.title}</CardTitle>
                          <CardDescription className="mt-1">
                            Opened by {dispute.opened_by_profile.full_name} on{' '}
                            {format(new Date(dispute.created_at), 'MMM dd, yyyy')}
                          </CardDescription>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{getDisputeTypeLabel(dispute.dispute_type)}</Badge>
                          {getStatusBadge(dispute.status)}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm">{dispute.description}</p>
                    </CardContent>
                  </Card>
                ))
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
