import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { MainLayout } from '@/components/layouts/MainLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, Check, X, MapPin } from 'lucide-react';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { VisitRequest } from '@/types/database';
import { useToast } from '@/hooks/use-toast';
import { sendEmailNotification } from '@/lib/emailNotifications';

export default function VisitRequests() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [visits, setVisits] = useState<VisitRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchVisits();
    }
  }, [user]);

  const fetchVisits = async () => {
    const { data, error } = await supabase
      .from('visit_requests')
      .select(
        `
        *,
        listings(title, location_label),
        buyer:profiles!visit_requests_buyer_id_fkey(full_name, phone),
        seller:profiles!visit_requests_seller_id_fkey(full_name, phone)
      `
      )
      .or(`buyer_id.eq.${user?.id},seller_id.eq.${user?.id}`)
      .order('requested_date', { ascending: true });

    if (error) {
      console.error('Error fetching visit requests:', error);
    } else if (data) {
      setVisits(data);
    }
    setLoading(false);
  };

  const handleAccept = async (id: string) => {
    const visit = visits.find(v => v.id === id);
    const { error } = await supabase
      .from('visit_requests')
      .update({ status: 'accepted' })
      .eq('id', id);

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to accept visit request',
        variant: 'destructive',
      });
    } else {
      // Send email to buyer
      if (visit?.buyer_id) {
        sendEmailNotification({
          userId: visit.buyer_id,
          subject: 'Visit Request Accepted',
          title: 'Your Visit Request Has Been Accepted',
          message: `Your visit request for "${(visit as any).listings?.title}" on ${format(new Date(visit.requested_date), 'MMMM dd, yyyy')} has been accepted by the seller.`,
          linkUrl: '/visits',
          linkText: 'View Visit Details',
        }).catch(err => console.error('Email notification failed:', err));
      }
      toast({
        title: 'Accepted',
        description: 'Visit request has been accepted',
      });
      fetchVisits();
    }
  };

  const handleReject = async (id: string) => {
    const visit = visits.find(v => v.id === id);
    const { error } = await supabase
      .from('visit_requests')
      .update({ status: 'rejected' })
      .eq('id', id);

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to reject visit request',
        variant: 'destructive',
      });
    } else {
      // Send email to buyer
      if (visit?.buyer_id) {
        sendEmailNotification({
          userId: visit.buyer_id,
          subject: 'Visit Request Update',
          title: 'Your Visit Request Status',
          message: `Your visit request for "${(visit as any).listings?.title}" on ${format(new Date(visit.requested_date), 'MMMM dd, yyyy')} was not accepted. Please try requesting a different date.`,
          linkUrl: '/visits',
          linkText: 'Request New Visit',
        }).catch(err => console.error('Email notification failed:', err));
      }
      toast({
        title: 'Rejected',
        description: 'Visit request has been rejected',
      });
      fetchVisits();
    }
  };

  const handleComplete = async (id: string) => {
    const { error } = await supabase
      .from('visit_requests')
      .update({ status: 'completed' })
      .eq('id', id);

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to mark visit as completed',
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Completed',
        description: 'Visit has been marked as completed',
      });
      fetchVisits();
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      pending: 'secondary',
      accepted: 'default',
      rejected: 'destructive',
      completed: 'outline',
      cancelled: 'outline',
    };
    return <Badge variant={variants[status] || 'outline'}>{status.toUpperCase()}</Badge>;
  };

  if (loading) {
    return <MainLayout><div className="container mx-auto p-6">Loading...</div></MainLayout>;
  }

  return (
    <MainLayout>
      <div className="container mx-auto p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Calendar className="h-8 w-8" />
            Visit Requests
          </h1>
          <p className="text-muted-foreground">Manage property site visit schedules</p>
        </div>

        <div className="grid gap-6">
        {visits.length === 0 ? (
          <Card>
            <CardContent className="text-center py-8">
              <p className="text-muted-foreground">No visit requests</p>
            </CardContent>
          </Card>
        ) : (
          visits.map((visit) => {
            const isSeller = visit.seller_id === user?.id;
            const isBuyer = visit.buyer_id === user?.id;

            return (
              <Card key={visit.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <MapPin className="h-5 w-5" />
                        {(visit as any).listings?.title}
                      </CardTitle>
                      <CardDescription>
                        {(visit as any).listings?.location_label}
                      </CardDescription>
                    </div>
                    {getStatusBadge(visit.status)}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <h4 className="font-semibold mb-2">Visit Details</h4>
                      <div className="space-y-1 text-sm">
                        <p>
                          <span className="text-muted-foreground">Date:</span>{' '}
                          {format(new Date(visit.requested_date), 'MMMM dd, yyyy')}
                        </p>
                        <p>
                          <span className="text-muted-foreground">Time:</span>{' '}
                          {visit.requested_time_slot}
                        </p>
                        <p>
                          <span className="text-muted-foreground">
                            {isSeller ? 'Buyer' : 'Seller'}:
                          </span>{' '}
                          {isSeller
                            ? (visit as any).buyer?.full_name
                            : (visit as any).seller?.full_name}
                        </p>
                      </div>
                    </div>
                    <div>
                      <h4 className="font-semibold mb-2">Notes</h4>
                      <div className="space-y-2 text-sm">
                        {visit.buyer_notes && (
                          <p className="p-2 bg-muted rounded">
                            <span className="font-semibold">Buyer:</span> {visit.buyer_notes}
                          </p>
                        )}
                        {visit.seller_notes && (
                          <p className="p-2 bg-muted rounded">
                            <span className="font-semibold">Seller:</span> {visit.seller_notes}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  {isSeller && visit.status === 'pending' && (
                    <div className="flex gap-2">
                      <Button onClick={() => handleAccept(visit.id)} className="flex items-center gap-2">
                        <Check className="h-4 w-4" />
                        Accept
                      </Button>
                      <Button
                        variant="destructive"
                        onClick={() => handleReject(visit.id)}
                        className="flex items-center gap-2"
                      >
                        <X className="h-4 w-4" />
                        Reject
                      </Button>
                    </div>
                  )}

                  {(isSeller || isBuyer) && visit.status === 'accepted' && (
                    <Button onClick={() => handleComplete(visit.id)} variant="outline">
                      Mark as Completed
                    </Button>
                  )}

                  <Button
                    variant="outline"
                    onClick={() => navigate(`/listings/${visit.listing_id}`)}
                  >
                    View Listing
                  </Button>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
    </MainLayout>
  );
}
