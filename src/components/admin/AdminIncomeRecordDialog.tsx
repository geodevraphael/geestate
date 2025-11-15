import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { CheckCircle, XCircle, Save, ExternalLink } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { IncomeStatus } from '@/types/geoinsight-income';

interface AdminIncomeRecordDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  record: any;
  onUpdate: () => void;
}

export function AdminIncomeRecordDialog({
  open,
  onOpenChange,
  record,
  onUpdate,
}: AdminIncomeRecordDialogProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<IncomeStatus>(record.status);
  const [adminNotes, setAdminNotes] = useState(record.admin_notes || '');

  const formatCurrency = (amount: number, currency: string = 'TZS') => {
    return new Intl.NumberFormat('en-TZ', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const handleMarkAsPaid = async () => {
    try {
      setLoading(true);

      const { error } = await supabase
        .from('geoinsight_income_records')
        .update({
          status: 'paid',
          paid_at: new Date().toISOString(),
          admin_verified_by: user!.id,
          admin_notes: adminNotes,
        })
        .eq('id', record.id);

      if (error) throw error;

      toast.success('Income record marked as paid');
      onUpdate();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error marking as paid:', error);
      toast.error('Failed to mark as paid');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async () => {
    try {
      setLoading(true);

      const { error } = await supabase
        .from('geoinsight_income_records')
        .update({
          status,
          admin_notes: adminNotes,
        })
        .eq('id', record.id);

      if (error) throw error;

      toast.success('Status updated successfully');
      onUpdate();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error updating status:', error);
      toast.error('Failed to update status');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Income Record Details</DialogTitle>
          <DialogDescription>View and manage this income record</DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Record Details */}
          <Card>
            <CardContent className="pt-6 space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Payer</p>
                  <p className="font-medium">{record.payer?.full_name}</p>
                  <p className="text-sm text-muted-foreground">{record.payer?.email}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Amount Due</p>
                  <p className="text-2xl font-bold">{formatCurrency(record.amount_due, record.currency)}</p>
                </div>
              </div>

              <div>
                <p className="text-sm text-muted-foreground">Description</p>
                <p>{record.description}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Fee Type</p>
                  <Badge>{record.fee_definition?.name}</Badge>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Current Status</p>
                  <Badge>{record.status}</Badge>
                </div>
              </div>

              {record.listing && (
                <div>
                  <p className="text-sm text-muted-foreground">Related Listing</p>
                  <Button variant="link" className="p-0 h-auto" asChild>
                    <a href={`/listing/${record.listing.id}`} target="_blank" rel="noopener noreferrer">
                      {record.listing.title}
                      <ExternalLink className="w-3 h-3 ml-1" />
                    </a>
                  </Button>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Created</p>
                  <p>{new Date(record.created_at).toLocaleString()}</p>
                </div>
                {record.due_date && (
                  <div>
                    <p className="text-sm text-muted-foreground">Due Date</p>
                    <p>{new Date(record.due_date).toLocaleDateString()}</p>
                  </div>
                )}
              </div>

              {record.paid_at && (
                <div>
                  <p className="text-sm text-muted-foreground">Paid At</p>
                  <p>{new Date(record.paid_at).toLocaleString()}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Payment Proofs */}
          {record.payment_proofs && record.payment_proofs.length > 0 && (
            <Card>
              <CardContent className="pt-6">
                <h3 className="font-semibold mb-3">Payment Proofs ({record.payment_proofs.length})</h3>
                <div className="space-y-3">
                  {record.payment_proofs.map((proof: any) => (
                    <div key={proof.id} className="border rounded-lg p-3 space-y-2">
                      <div className="flex justify-between items-start">
                        <div>
                          <Badge>{proof.status}</Badge>
                          {proof.payment_channel && (
                            <Badge variant="outline" className="ml-2">{proof.payment_channel}</Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {new Date(proof.submitted_at).toLocaleDateString()}
                        </p>
                      </div>
                      
                      {proof.transaction_reference && (
                        <p className="text-sm">
                          <span className="text-muted-foreground">Ref:</span> {proof.transaction_reference}
                        </p>
                      )}
                      
                      {proof.amount_paid && (
                        <p className="text-sm">
                          <span className="text-muted-foreground">Amount:</span>{' '}
                          {formatCurrency(proof.amount_paid)}
                        </p>
                      )}
                      
                      {proof.proof_text && (
                        <div className="text-sm">
                          <p className="text-muted-foreground">SMS/Text:</p>
                          <pre className="bg-muted p-2 rounded mt-1 text-xs whitespace-pre-wrap">
                            {proof.proof_text}
                          </pre>
                        </div>
                      )}
                      
                      {proof.proof_file_url && (
                        <Button variant="outline" size="sm" asChild>
                          <a href={proof.proof_file_url} target="_blank" rel="noopener noreferrer">
                            View Proof File
                            <ExternalLink className="w-3 h-3 ml-1" />
                          </a>
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Admin Actions */}
          <Card>
            <CardContent className="pt-6 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="status">Update Status</Label>
                <Select value={status} onValueChange={(value: any) => setStatus(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="awaiting_review">Awaiting Review</SelectItem>
                    <SelectItem value="paid">Paid</SelectItem>
                    <SelectItem value="overdue">Overdue</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="admin_notes">Admin Notes</Label>
                <Textarea
                  id="admin_notes"
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="Add notes about this record..."
                  rows={3}
                />
              </div>

              <div className="flex justify-end gap-3">
                {record.status !== 'paid' && (
                  <Button
                    onClick={handleMarkAsPaid}
                    disabled={loading}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Mark as Paid
                  </Button>
                )}
                
                <Button onClick={handleUpdateStatus} disabled={loading}>
                  <Save className="w-4 h-4 mr-2" />
                  Update Status
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}
