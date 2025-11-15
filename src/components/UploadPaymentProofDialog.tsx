import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Upload, Loader2 } from 'lucide-react';
import { IncomeRecordWithDetails, PaymentChannel } from '@/types/geoinsight-income';

interface UploadPaymentProofDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  incomeRecord: IncomeRecordWithDetails;
  onSuccess: () => void;
}

const PAYMENT_CHANNELS: { value: PaymentChannel; label: string }[] = [
  { value: 'mpesa', label: 'M-Pesa' },
  { value: 'tigo_pesa', label: 'Tigo Pesa' },
  { value: 'airtel_money', label: 'Airtel Money' },
  { value: 'nmb', label: 'NMB Bank' },
  { value: 'crdb', label: 'CRDB Bank' },
  { value: 'cash', label: 'Cash' },
  { value: 'other', label: 'Other' },
];

export function UploadPaymentProofDialog({
  open,
  onOpenChange,
  incomeRecord,
  onSuccess,
}: UploadPaymentProofDialogProps) {
  const [loading, setLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [formData, setFormData] = useState({
    payment_channel: '' as PaymentChannel,
    transaction_reference: '',
    amount_paid: incomeRecord.amount_due.toString(),
    proof_text: '',
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      
      // 10MB limit
      if (file.size > 10 * 1024 * 1024) {
        toast.error('File size must be less than 10MB');
        return;
      }
      
      setSelectedFile(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.payment_channel) {
      toast.error('Please select a payment channel');
      return;
    }

    if (!selectedFile && !formData.proof_text) {
      toast.error('Please upload a proof file or provide SMS/bank text');
      return;
    }

    try {
      setLoading(true);
      
      let proofFileUrl = null;
      
      // Upload file if provided
      if (selectedFile) {
        const fileExt = selectedFile.name.split('.').pop();
        const fileName = `${incomeRecord.id}_${Date.now()}.${fileExt}`;
        const filePath = `geoinsight-proofs/${fileName}`;
        
        const { error: uploadError, data } = await supabase.storage
          .from('payment-proofs')
          .upload(filePath, selectedFile);

        if (uploadError) throw uploadError;
        
        const { data: { publicUrl } } = supabase.storage
          .from('payment-proofs')
          .getPublicUrl(filePath);
        
        proofFileUrl = publicUrl;
      }

      // Create payment proof record
      const { error: insertError } = await supabase
        .from('geoinsight_payment_proofs')
        .insert({
          income_record_id: incomeRecord.id,
          payer_id: incomeRecord.user_id,
          proof_file_url: proofFileUrl,
          proof_text: formData.proof_text || null,
          payment_channel: formData.payment_channel,
          transaction_reference: formData.transaction_reference || null,
          amount_paid: parseFloat(formData.amount_paid),
          status: 'submitted',
        });

      if (insertError) throw insertError;

      // Update income record status
      const { error: updateError } = await supabase
        .from('geoinsight_income_records')
        .update({ status: 'awaiting_review' })
        .eq('id', incomeRecord.id);

      if (updateError) throw updateError;

      toast.success('Payment proof submitted successfully!');
      onOpenChange(false);
      onSuccess();
      
      // Reset form
      setSelectedFile(null);
      setFormData({
        payment_channel: '' as PaymentChannel,
        transaction_reference: '',
        amount_paid: '',
        proof_text: '',
      });
    } catch (error: any) {
      console.error('Error uploading payment proof:', error);
      toast.error('Failed to upload payment proof');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Upload Payment Proof</DialogTitle>
          <DialogDescription>
            Submit proof that you've paid {new Intl.NumberFormat('en-TZ', {
              style: 'currency',
              currency: incomeRecord.currency,
              minimumFractionDigits: 0,
            }).format(incomeRecord.amount_due)} to GeoInsight
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="payment_channel">Payment Channel *</Label>
            <Select
              value={formData.payment_channel}
              onValueChange={(value) => setFormData({ ...formData, payment_channel: value as PaymentChannel })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select payment method" />
              </SelectTrigger>
              <SelectContent>
                {PAYMENT_CHANNELS.map((channel) => (
                  <SelectItem key={channel.value} value={channel.value}>
                    {channel.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="amount_paid">Amount Paid</Label>
            <Input
              id="amount_paid"
              type="number"
              step="0.01"
              value={formData.amount_paid}
              onChange={(e) => setFormData({ ...formData, amount_paid: e.target.value })}
              placeholder="Enter amount"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="transaction_reference">Transaction Reference / Receipt Number</Label>
            <Input
              id="transaction_reference"
              value={formData.transaction_reference}
              onChange={(e) => setFormData({ ...formData, transaction_reference: e.target.value })}
              placeholder="e.g., ABC123456789"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="proof_file">Upload Screenshot / Photo / PDF</Label>
            <Input
              id="proof_file"
              type="file"
              accept="image/*,application/pdf"
              onChange={handleFileChange}
            />
            {selectedFile && (
              <p className="text-sm text-muted-foreground">
                Selected: {selectedFile.name}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="proof_text">SMS / Bank Text (Optional)</Label>
            <Textarea
              id="proof_text"
              value={formData.proof_text}
              onChange={(e) => setFormData({ ...formData, proof_text: e.target.value })}
              placeholder="Paste SMS confirmation or bank message here..."
              rows={4}
            />
            <p className="text-xs text-muted-foreground">
              You can paste mobile money SMS or bank confirmation message
            </p>
          </div>

          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  Submit Proof
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
