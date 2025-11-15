import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { CheckCircle, XCircle, ExternalLink } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

interface ReviewPaymentProofDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  proof: any;
  onUpdate: () => void;
}

export function ReviewPaymentProofDialog({
  open,
  onOpenChange,
  proof,
  onUpdate,
}: ReviewPaymentProofDialogProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [reviewNotes, setReviewNotes] = useState('');

  const formatCurrency = (amount: number, currency: string = 'TZS') => {
    return new Intl.NumberFormat('en-TZ', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const handleAccept = async () => {
    try {
      setLoading(true);

      // Update proof status to accepted
      const { error: proofError } = await supabase
        .from('geoinsight_payment_proofs')
        .update({
          status: 'accepted',
          admin_reviewed_by: user!.id,
          admin_review_notes: reviewNotes,
        })
        .eq('id', proof.id);

      if (proofError) throw proofError;

      // The trigger will automatically update the income record to 'paid'
      
      toast.success('Payment proof accepted and income record marked as paid');
      onUpdate();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error accepting proof:', error);
      toast.error('Failed to accept payment proof');
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async () => {
    if (!reviewNotes.trim()) {
      toast.error('Please provide a reason for rejection');
      return;
    }

    try {
      setLoading(true);

      // Update proof status to rejected
      const { error: proofError } = await supabase
        .from('geoinsight_payment_proofs')
        .update({
          status: 'rejected',
          admin_reviewed_by: user!.id,
          admin_review_notes: reviewNotes,
        })
        .eq('id', proof.id);

      if (proofError) throw proofError;

      // Reset income record back to pending
      const { error: incomeError } = await supabase
        .from('geoinsight_income_records')
        .update({ status: 'pending' })
        .eq('id', proof.income_record_id);

      if (incomeError) throw incomeError;

      toast.success('Payment proof rejected');
      onUpdate();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error rejecting proof:', error);
      toast.error('Failed to reject payment proof');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Review Payment Proof</DialogTitle>
          <DialogDescription>Verify and approve or reject this payment proof</DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Payer Info */}
          <Card>
            <CardContent className="pt-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Payer</p>
                  <p className="font-medium">{proof.payer?.full_name}</p>
                  <p className="text-sm text-muted-foreground">{proof.payer?.email}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Submitted</p>
                  <p>{new Date(proof.submitted_at).toLocaleString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Income Record Info */}
          <Card>
            <CardContent className="pt-6 space-y-3">
              <div>
                <p className="text-sm text-muted-foreground">Related Income</p>
                <p>{proof.income_record?.description}</p>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Amount Due</p>
                  <p className="text-xl font-bold">
                    {formatCurrency(proof.income_record?.amount_due)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Amount Paid (claimed)</p>
                  <p className="text-xl font-bold">
                    {proof.amount_paid ? formatCurrency(proof.amount_paid) : '-'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Payment Details */}
          <Card>
            <CardContent className="pt-6 space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Payment Channel</p>
                  {proof.payment_channel ? (
                    <Badge>{proof.payment_channel}</Badge>
                  ) : (
                    <p className="text-sm">-</p>
                  )}
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Transaction Reference</p>
                  <p className="font-mono text-sm">
                    {proof.transaction_reference || '-'}
                  </p>
                </div>
              </div>

              {proof.proof_text && (
                <div>
                  <p className="text-sm text-muted-foreground mb-2">SMS / Bank Text</p>
                  <pre className="bg-muted p-3 rounded text-sm whitespace-pre-wrap">
                    {proof.proof_text}
                  </pre>
                </div>
              )}

              {proof.proof_file_url && (
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Proof File</p>
                  <Button variant="outline" asChild>
                    <a href={proof.proof_file_url} target="_blank" rel="noopener noreferrer">
                      View Proof File
                      <ExternalLink className="w-4 h-4 ml-2" />
                    </a>
                  </Button>
                  
                  {/* If it's an image, show preview */}
                  {proof.proof_file_url.match(/\.(jpg|jpeg|png|gif|webp)$/i) && (
                    <div className="mt-3 border rounded-lg overflow-hidden">
                      <img 
                        src={proof.proof_file_url} 
                        alt="Payment proof" 
                        className="w-full h-auto"
                      />
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Review Notes */}
          <Card>
            <CardContent className="pt-6 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="review_notes">Admin Review Notes</Label>
                <Textarea
                  id="review_notes"
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  placeholder="Add notes about your review decision..."
                  rows={3}
                />
                <p className="text-xs text-muted-foreground">
                  Required when rejecting. Optional when accepting.
                </p>
              </div>

              <div className="flex justify-end gap-3">
                <Button
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  disabled={loading}
                >
                  Cancel
                </Button>
                
                <Button
                  variant="destructive"
                  onClick={handleReject}
                  disabled={loading}
                >
                  <XCircle className="w-4 h-4 mr-2" />
                  Reject
                </Button>
                
                <Button
                  onClick={handleAccept}
                  disabled={loading}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Accept & Mark Paid
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}
