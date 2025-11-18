import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Building2, Check, X } from 'lucide-react';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { InstitutionalSeller } from '@/types/database';
import { useToast } from '@/hooks/use-toast';

export default function InstitutionalSellers() {
  const { user, hasRole, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [sellers, setSellers] = useState<InstitutionalSeller[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Wait for auth to load
    if (authLoading) return;
    
    if (!user) {
      navigate('/auth');
      return;
    }

    if (hasRole('admin')) {
      fetchSellers();
    } else {
      toast({
        title: 'Access Denied',
        description: 'You need admin privileges to access this page.',
        variant: 'destructive',
      });
      navigate('/dashboard');
    }
  }, [user, hasRole, authLoading]);

  const fetchSellers = async () => {
    try {
      const { data, error } = await supabase
        .from('institutional_sellers')
        .select('*, profiles(full_name, email)')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching institutional sellers:', error);
        toast({
          title: 'Error Loading Data',
          description: error.message || 'Failed to fetch institutional sellers',
          variant: 'destructive',
        });
      } else if (data) {
        setSellers(data);
      }
    } catch (error) {
      console.error('Unexpected error:', error);
      toast({
        title: 'Error',
        description: 'An unexpected error occurred',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id: string) => {
    try {
      const { error } = await supabase
        .from('institutional_sellers')
        .update({
          is_approved: true,
          approved_by_admin_id: user?.id,
          approved_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Institution approved successfully. Notification sent to the applicant.',
      });
      fetchSellers();
    } catch (error) {
      console.error('Error approving institution:', error);
      toast({
        title: 'Error',
        description: 'Failed to approve institutional seller. Please check RLS policies.',
        variant: 'destructive',
      });
    }
  };

  const handleReject = async (id: string) => {
    const rejectionReason = prompt('Please provide a reason for rejection (optional):');
    
    try {
      const { error } = await supabase
        .from('institutional_sellers')
        .update({
          is_approved: false,
          notes: rejectionReason || 'Rejected by admin',
        })
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Rejected',
        description: 'Institution has been rejected',
      });
      fetchSellers();
    } catch (error) {
      console.error('Error rejecting institution:', error);
      toast({
        title: 'Error',
        description: 'Failed to reject institutional seller',
        variant: 'destructive',
      });
    }
  };

  if (authLoading || loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center space-y-4">
            <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto" />
            <p className="text-muted-foreground">Loading institutional sellers...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Building2 className="h-8 w-8" />
          Institutional Sellers
        </h1>
        <p className="text-muted-foreground">
          Manage government and municipal seller applications
        </p>
      </div>

      <div className="grid gap-6">
        {sellers.length === 0 ? (
          <Card>
            <CardContent className="text-center py-8">
              <p className="text-muted-foreground">No institutional seller applications</p>
            </CardContent>
          </Card>
        ) : (
          sellers.map((seller) => (
            <Card key={seller.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      {seller.institution_name}
                      {seller.is_approved ? (
                        <Badge variant="default">Approved</Badge>
                      ) : (
                        <Badge variant="secondary">Pending</Badge>
                      )}
                    </CardTitle>
                    <CardDescription>
                      {seller.institution_type.charAt(0).toUpperCase() +
                        seller.institution_type.slice(1)}
                    </CardDescription>
                  </div>
                  {!seller.is_approved && (
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleApprove(seller.id)}
                        className="flex items-center gap-2"
                      >
                        <Check className="h-4 w-4" />
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleReject(seller.id)}
                        className="flex items-center gap-2"
                      >
                        <X className="h-4 w-4" />
                        Reject
                      </Button>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <h4 className="font-semibold mb-2">Contact Information</h4>
                    <div className="space-y-1 text-sm">
                      <p>
                        <span className="text-muted-foreground">Contact Person:</span>{' '}
                        {seller.contact_person}
                      </p>
                      <p>
                        <span className="text-muted-foreground">Email:</span> {seller.contact_email}
                      </p>
                      {seller.contact_phone && (
                        <p>
                          <span className="text-muted-foreground">Phone:</span>{' '}
                          {seller.contact_phone}
                        </p>
                      )}
                    </div>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2">Profile & Timeline</h4>
                    <div className="space-y-1 text-sm">
                      <p>
                        <span className="text-muted-foreground">User:</span>{' '}
                        {(seller as any).profiles?.full_name}
                      </p>
                      <p>
                        <span className="text-muted-foreground">Applied:</span>{' '}
                        {format(new Date(seller.created_at), 'MMM dd, yyyy')}
                      </p>
                      {seller.approved_at && (
                        <p>
                          <span className="text-muted-foreground">Approved:</span>{' '}
                          {format(new Date(seller.approved_at), 'MMM dd, yyyy')}
                        </p>
                      )}
                      {seller.slug && seller.is_approved && (
                        <p>
                          <span className="text-muted-foreground">Landing Page:</span>{' '}
                          <a 
                            href={`/institution/${seller.slug}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary hover:underline"
                          >
                            View Page
                          </a>
                        </p>
                      )}
                    </div>
                  </div>
                </div>
                {seller.notes && (
                  <div className="mt-4 p-3 bg-muted rounded-lg">
                    <p className="text-sm">
                      <span className="font-semibold">Notes:</span> {seller.notes}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
