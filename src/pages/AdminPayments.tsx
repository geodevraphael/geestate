import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Navbar } from '@/components/Navbar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { CheckCircle2, XCircle, Eye, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { Navigate } from 'react-router-dom';

export default function AdminPayments() {
  const { profile, hasRole } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [paymentProofs, setPaymentProofs] = useState<any[]>([]);
  const [dealClosures, setDealClosures] = useState<any[]>([]);
  const [selectedItem, setSelectedItem] = useState<any | null>(null);
  const [actionDialog, setActionDialog] = useState<'approve_payment' | 'reject_payment' | 'approve_closure' | 'reject_closure' | null>(null);
  const [notes, setNotes] = useState('');
  const [processing, setProcessing] = useState(false);

  const isAdmin = hasRole('admin') || hasRole('verification_officer') || hasRole('compliance_officer');

  useEffect(() => {
    if (isAdmin) {
      fetchData();
    }
  }, [isAdmin]);

  const fetchData = async () => {
    try {
      // Fetch pending payment proofs
      const { data: proofsData } = await supabase
        .from('payment_proofs')
        .select(`
          *,
          listing:listings(*),
          buyer:profiles!payment_proofs_buyer_id_fkey(*),
          seller:profiles!payment_proofs_seller_id_fkey(*)
        `)
        .in('status', ['pending_admin_review'])
        .order('submitted_at', { ascending: false });

      // Fetch deal closures
      const { data: closuresData } = await supabase
        .from('deal_closures')
        .select(`
          *,
          listing:listings(*),
          buyer:profiles!deal_closures_buyer_id_fkey(*),
          seller:profiles!deal_closures_seller_id_fkey(*),
          payment_proof:payment_proofs(*)
        `)
        .order('created_at', { ascending: false });

      setPaymentProofs(proofsData || []);
      setDealClosures(closuresData || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprovePayment = async () => {
    if (!selectedItem) return;

    setProcessing(true);
    try {
      // Update payment proof
      const { error: proofError } = await supabase
        .from('payment_proofs')
        .update({
          status: 'approved',
          admin_notes: notes,
          admin_reviewed_at: new Date().toISOString(),
        })
        .eq('id', selectedItem.id);

      if (proofError) throw proofError;

      // Create deal closure
      const { error: closureError } = await supabase
        .from('deal_closures')
        .insert({
          listing_id: selectedItem.listing_id,
          buyer_id: selectedItem.buyer_id,
          seller_id: selectedItem.seller_id,
          payment_proof_id: selectedItem.id,
          final_price: selectedItem.amount_paid,
        });

      if (closureError) throw closureError;

      toast({
        title: 'Payment Approved',
        description: 'Payment proof approved and deal closure initiated.',
      });

      setActionDialog(null);
      setNotes('');
      fetchData();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setProcessing(false);
    }
  };

  const handleRejectPayment = async () => {
    if (!selectedItem || !notes.trim()) return;

    setProcessing(true);
    try {
      const { error } = await supabase
        .from('payment_proofs')
        .update({
          status: 'rejected',
          admin_notes: notes,
          admin_reviewed_at: new Date().toISOString(),
        })
        .eq('id', selectedItem.id);

      if (error) throw error;

      toast({
        title: 'Payment Rejected',
        description: 'Payment proof has been rejected.',
      });

      setActionDialog(null);
      setNotes('');
      fetchData();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setProcessing(false);
    }
  };

  const handleApproveClosure = async () => {
    if (!selectedItem) return;

    setProcessing(true);
    try {
      // Update deal closure
      const { error: closureError } = await supabase
        .from('deal_closures')
        .update({
          closure_status: 'closed',
          admin_notes: notes,
          closed_at: new Date().toISOString(),
        })
        .eq('id', selectedItem.id);

      if (closureError) throw closureError;

      // Update listing status to closed
      const { error: listingError } = await supabase
        .from('listings')
        .update({ status: 'closed' })
        .eq('id', selectedItem.listing_id);

      if (listingError) throw listingError;

      toast({
        title: 'Deal Closed',
        description: 'Deal has been successfully closed and listing marked as sold.',
      });

      setActionDialog(null);
      setNotes('');
      fetchData();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setProcessing(false);
    }
  };

  const handleRejectClosure = async () => {
    if (!selectedItem || !notes.trim()) return;

    setProcessing(true);
    try {
      const { error } = await supabase
        .from('deal_closures')
        .update({
          closure_status: 'disputed',
          admin_notes: notes,
        })
        .eq('id', selectedItem.id);

      if (error) throw error;

      toast({
        title: 'Deal Disputed',
        description: 'Deal closure has been marked as disputed.',
      });

      setActionDialog(null);
      setNotes('');
      fetchData();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setProcessing(false);
    }
  };

  if (!isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8">Payment Management</h1>

        <Tabs defaultValue="proofs" className="space-y-6">
          <TabsList>
            <TabsTrigger value="proofs">
              Payment Proofs ({paymentProofs.length})
            </TabsTrigger>
            <TabsTrigger value="closures">
              Deal Closures ({dealClosures.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="proofs" className="space-y-4">
            {paymentProofs.length === 0 ? (
              <Card>
                <CardContent className="p-12 text-center text-muted-foreground">
                  No pending payment proofs
                </CardContent>
              </Card>
            ) : (
              paymentProofs.map((proof) => (
                <Card key={proof.id}>
                  <CardHeader>
                    <CardTitle className="flex items-start justify-between">
                      <div>
                        <h3 className="text-lg">{proof.listing?.title}</h3>
                        <p className="text-sm font-normal text-muted-foreground mt-1">
                          Buyer: {proof.buyer?.full_name} → Seller: {proof.seller?.full_name}
                        </p>
                      </div>
                      <Badge className="bg-warning text-warning-foreground">Pending Review</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <p className="text-xs text-muted-foreground">Amount</p>
                        <p className="font-semibold">{proof.amount_paid.toLocaleString()} TZS</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Method</p>
                        <p className="font-semibold capitalize">{proof.payment_method.replace('_', ' ')}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Reference</p>
                        <p className="font-semibold">{proof.transaction_reference || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Submitted</p>
                        <p className="font-semibold">{format(new Date(proof.submitted_at), 'MMM dd, yyyy')}</p>
                      </div>
                    </div>

                    {proof.buyer_notes && (
                      <div className="p-3 bg-muted rounded">
                        <p className="text-xs text-muted-foreground mb-1">Buyer Notes:</p>
                        <p className="text-sm">{proof.buyer_notes}</p>
                      </div>
                    )}

                    {proof.seller_notes && (
                      <div className="p-3 bg-muted rounded">
                        <p className="text-xs text-muted-foreground mb-1">Seller Confirmation:</p>
                        <p className="text-sm">{proof.seller_notes}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Confirmed: {format(new Date(proof.seller_confirmed_at), 'MMM dd, yyyy HH:mm')}
                        </p>
                      </div>
                    )}

                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(proof.proof_file_url, '_blank')}
                      >
                        <Eye className="mr-2 h-4 w-4" />
                        View Proof
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => {
                          setSelectedItem(proof);
                          setActionDialog('approve_payment');
                        }}
                      >
                        <CheckCircle2 className="mr-2 h-4 w-4" />
                        Approve & Create Deal
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => {
                          setSelectedItem(proof);
                          setActionDialog('reject_payment');
                        }}
                      >
                        <XCircle className="mr-2 h-4 w-4" />
                        Reject
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          <TabsContent value="closures" className="space-y-4">
            {dealClosures.length === 0 ? (
              <Card>
                <CardContent className="p-12 text-center text-muted-foreground">
                  No deal closures yet
                </CardContent>
              </Card>
            ) : (
              dealClosures.map((closure) => (
                <Card key={closure.id}>
                  <CardHeader>
                    <CardTitle className="flex items-start justify-between">
                      <div>
                        <h3 className="text-lg">{closure.listing?.title}</h3>
                        <p className="text-sm font-normal text-muted-foreground mt-1">
                          Buyer: {closure.buyer?.full_name} → Seller: {closure.seller?.full_name}
                        </p>
                      </div>
                      <Badge className={
                        closure.closure_status === 'closed' ? 'bg-success text-success-foreground' :
                        closure.closure_status === 'disputed' ? 'bg-destructive text-destructive-foreground' :
                        'bg-warning text-warning-foreground'
                      }>
                        {closure.closure_status.replace('_', ' ')}
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      <div>
                        <p className="text-xs text-muted-foreground">Final Price</p>
                        <p className="font-semibold">{closure.final_price.toLocaleString()} TZS</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Created</p>
                        <p className="font-semibold">{format(new Date(closure.created_at), 'MMM dd, yyyy')}</p>
                      </div>
                      {closure.closed_at && (
                        <div>
                          <p className="text-xs text-muted-foreground">Closed</p>
                          <p className="font-semibold">{format(new Date(closure.closed_at), 'MMM dd, yyyy')}</p>
                        </div>
                      )}
                    </div>

                    {closure.closure_status === 'pending_admin_validation' && (
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => {
                            setSelectedItem(closure);
                            setActionDialog('approve_closure');
                          }}
                        >
                          <CheckCircle2 className="mr-2 h-4 w-4" />
                          Approve & Close Deal
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => {
                            setSelectedItem(closure);
                            setActionDialog('reject_closure');
                          }}
                        >
                          <AlertCircle className="mr-2 h-4 w-4" />
                          Dispute
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Dialogs */}
      <Dialog open={actionDialog === 'approve_payment'} onOpenChange={() => setActionDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve Payment Proof</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              This will approve the payment proof and create a deal closure record for final approval.
            </p>
            <div>
              <Label>Admin Notes (Optional)</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add any notes about this approval..."
                rows={3}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setActionDialog(null)}>Cancel</Button>
              <Button onClick={handleApprovePayment} disabled={processing}>
                {processing ? 'Approving...' : 'Approve'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={actionDialog === 'reject_payment'} onOpenChange={() => setActionDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Payment Proof</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Provide a reason for rejecting this payment proof.
            </p>
            <div>
              <Label>Reason for Rejection *</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Explain why this payment proof is being rejected..."
                rows={4}
                required
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setActionDialog(null)}>Cancel</Button>
              <Button
                variant="destructive"
                onClick={handleRejectPayment}
                disabled={processing || !notes.trim()}
              >
                {processing ? 'Rejecting...' : 'Reject'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={actionDialog === 'approve_closure'} onOpenChange={() => setActionDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve Deal Closure</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              This will finalize the deal and mark the listing as CLOSED. This action cannot be undone easily.
            </p>
            <div>
              <Label>Admin Notes (Optional)</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add any final notes about this deal..."
                rows={3}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setActionDialog(null)}>Cancel</Button>
              <Button onClick={handleApproveClosure} disabled={processing}>
                {processing ? 'Closing...' : 'Approve & Close Deal'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={actionDialog === 'reject_closure'} onOpenChange={() => setActionDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Dispute Deal Closure</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Mark this deal as disputed. Provide details about the issue.
            </p>
            <div>
              <Label>Reason for Dispute *</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Explain why this deal is being disputed..."
                rows={4}
                required
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setActionDialog(null)}>Cancel</Button>
              <Button
                variant="destructive"
                onClick={handleRejectClosure}
                disabled={processing || !notes.trim()}
              >
                {processing ? 'Marking as Disputed...' : 'Mark as Disputed'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
