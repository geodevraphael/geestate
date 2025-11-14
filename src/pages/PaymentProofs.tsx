import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { MainLayout } from '@/components/layouts/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { CheckCircle2, XCircle, Clock, Eye, FileText } from 'lucide-react';
import { PaymentProof } from '@/types/database';
import { format } from 'date-fns';

export default function PaymentProofs() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [sellerProofs, setSellerProofs] = useState<any[]>([]);
  const [buyerProofs, setBuyerProofs] = useState<any[]>([]);
  const [selectedProof, setSelectedProof] = useState<any | null>(null);
  const [actionDialog, setActionDialog] = useState<'confirm' | 'reject' | null>(null);
  const [notes, setNotes] = useState('');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (profile) {
      fetchPaymentProofs();
    }
  }, [profile]);

  const fetchPaymentProofs = async () => {
    try {
      // Fetch proofs where user is seller
      const { data: sellerData } = await supabase
        .from('payment_proofs')
        .select(`
          *,
          listing:listings(*),
          buyer:profiles!payment_proofs_buyer_id_fkey(*)
        `)
        .eq('seller_id', profile?.id);

      // Fetch proofs where user is buyer
      const { data: buyerData } = await supabase
        .from('payment_proofs')
        .select(`
          *,
          listing:listings(*),
          seller:profiles!payment_proofs_seller_id_fkey(*)
        `)
        .eq('buyer_id', profile?.id);

      setSellerProofs(sellerData || []);
      setBuyerProofs(buyerData || []);
    } catch (error) {
      console.error('Error fetching payment proofs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmPayment = async () => {
    if (!selectedProof) return;

    setProcessing(true);
    try {
      const { error } = await supabase
        .from('payment_proofs')
        .update({
          status: 'pending_admin_review',
          seller_notes: notes,
          seller_confirmed_at: new Date().toISOString(),
        })
        .eq('id', selectedProof.id);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Payment confirmed. Admin will review the transaction.',
      });

      setActionDialog(null);
      setNotes('');
      fetchPaymentProofs();
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
    if (!selectedProof) return;

    setProcessing(true);
    try {
      const { error } = await supabase
        .from('payment_proofs')
        .update({
          status: 'rejected',
          seller_notes: notes,
        })
        .eq('id', selectedProof.id);

      if (error) throw error;

      toast({
        title: 'Payment Rejected',
        description: 'The buyer has been notified of the rejection.',
      });

      setActionDialog(null);
      setNotes('');
      fetchPaymentProofs();
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

  const getStatusBadge = (status: string) => {
    const config: Record<string, { label: string; className: string }> = {
      pending_seller_confirmation: { label: 'Pending Seller', className: 'bg-warning text-warning-foreground' },
      pending_admin_review: { label: 'Pending Admin', className: 'bg-info text-info-foreground' },
      approved: { label: 'Approved', className: 'bg-success text-success-foreground' },
      rejected: { label: 'Rejected', className: 'bg-destructive text-destructive-foreground' },
    };

    const c = config[status] || config.pending_seller_confirmation;
    return <Badge className={c.className}>{c.label}</Badge>;
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading...</p>
            </div>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8">Payment Proofs</h1>

        <Tabs defaultValue="seller" className="space-y-6">
          <TabsList>
            <TabsTrigger value="seller">
              As Seller ({sellerProofs.length})
            </TabsTrigger>
            <TabsTrigger value="buyer">
              As Buyer ({buyerProofs.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="seller" className="space-y-4">
            {sellerProofs.length === 0 ? (
              <Card>
                <CardContent className="p-12 text-center text-muted-foreground">
                  No payment proofs received yet
                </CardContent>
              </Card>
            ) : (
              sellerProofs.map((proof) => (
                <Card key={proof.id}>
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="font-semibold text-lg">{proof.listing?.title}</h3>
                        <p className="text-sm text-muted-foreground">
                          Buyer: {proof.buyer?.full_name}
                        </p>
                      </div>
                      {getStatusBadge(proof.status)}
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
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
                      <div className="mb-4 p-3 bg-muted rounded">
                        <p className="text-xs text-muted-foreground mb-1">Buyer Notes:</p>
                        <p className="text-sm">{proof.buyer_notes}</p>
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

                      {proof.status === 'pending_seller_confirmation' && (
                        <>
                          <Button
                            size="sm"
                            onClick={() => {
                              setSelectedProof(proof);
                              setActionDialog('confirm');
                            }}
                          >
                            <CheckCircle2 className="mr-2 h-4 w-4" />
                            Confirm Payment
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => {
                              setSelectedProof(proof);
                              setActionDialog('reject');
                            }}
                          >
                            <XCircle className="mr-2 h-4 w-4" />
                            Reject
                          </Button>
                        </>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          <TabsContent value="buyer" className="space-y-4">
            {buyerProofs.length === 0 ? (
              <Card>
                <CardContent className="p-12 text-center text-muted-foreground">
                  No payment proofs submitted yet
                </CardContent>
              </Card>
            ) : (
              buyerProofs.map((proof) => (
                <Card key={proof.id}>
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="font-semibold text-lg">{proof.listing?.title}</h3>
                        <p className="text-sm text-muted-foreground">
                          Seller: {proof.seller?.full_name}
                        </p>
                      </div>
                      {getStatusBadge(proof.status)}
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
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

                    {proof.seller_notes && (
                      <div className="mb-4 p-3 bg-muted rounded">
                        <p className="text-xs text-muted-foreground mb-1">Seller Response:</p>
                        <p className="text-sm">{proof.seller_notes}</p>
                      </div>
                    )}

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(proof.proof_file_url, '_blank')}
                    >
                      <FileText className="mr-2 h-4 w-4" />
                      View My Proof
                    </Button>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>
        </Tabs>

        {/* Confirm Payment Dialog */}
        <Dialog open={actionDialog === 'confirm'} onOpenChange={() => setActionDialog(null)}>
          <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Payment Received</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              By confirming, you acknowledge that you have received the payment from the buyer.
              This will move the transaction to admin review for final approval.
            </p>
            <div>
              <Label htmlFor="confirm_notes">Notes (Optional)</Label>
              <Textarea
                id="confirm_notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add any notes about this payment confirmation..."
                rows={3}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setActionDialog(null)}>
                Cancel
              </Button>
              <Button onClick={handleConfirmPayment} disabled={processing}>
                {processing ? 'Confirming...' : 'Confirm Payment'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Reject Payment Dialog */}
      <Dialog open={actionDialog === 'reject'} onOpenChange={() => setActionDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Payment Proof</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Please provide a reason for rejecting this payment proof. The buyer will be notified.
            </p>
            <div>
              <Label htmlFor="reject_notes">Reason for Rejection *</Label>
              <Textarea
                id="reject_notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Explain why you are rejecting this payment proof..."
                rows={4}
                required
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setActionDialog(null)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleRejectPayment}
                disabled={processing || !notes.trim()}
              >
                {processing ? 'Rejecting...' : 'Reject Payment'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
    </MainLayout>
  );
}
