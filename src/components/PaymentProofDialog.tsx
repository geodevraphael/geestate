import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Upload, DollarSign } from 'lucide-react';
import { ListingWithDetails } from '@/types/database';

interface PaymentProofDialogProps {
  listing: ListingWithDetails;
  onSuccess?: () => void;
}

export function PaymentProofDialog({ listing, onSuccess }: PaymentProofDialogProps) {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [formData, setFormData] = useState({
    amount_paid: listing.price || 0,
    payment_method: 'mpesa',
    transaction_reference: '',
    buyer_notes: '',
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      const maxSize = 10 * 1024 * 1024; // 10MB
      
      if (selectedFile.size > maxSize) {
        toast({
          title: 'Error',
          description: 'File size must be less than 10MB',
          variant: 'destructive',
        });
        return;
      }

      const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
      if (!allowedTypes.includes(selectedFile.type)) {
        toast({
          title: 'Error',
          description: 'Only JPG, PNG, and PDF files are allowed',
          variant: 'destructive',
        });
        return;
      }

      setFile(selectedFile);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!profile) {
      toast({
        title: 'Error',
        description: 'You must be logged in to submit payment proof',
        variant: 'destructive',
      });
      return;
    }

    if (!file) {
      toast({
        title: 'Error',
        description: 'Please upload payment proof file',
        variant: 'destructive',
      });
      return;
    }

    if (formData.amount_paid <= 0) {
      toast({
        title: 'Error',
        description: 'Please enter a valid payment amount',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);

    try {
      // Upload file to storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${profile.id}/${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('payment-proofs')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('payment-proofs')
        .getPublicUrl(fileName);

      // Insert payment proof record
      const { error: insertError } = await supabase
        .from('payment_proofs')
        .insert({
          listing_id: listing.id,
          buyer_id: profile.id,
          seller_id: listing.owner_id,
          amount_paid: formData.amount_paid,
          payment_method: formData.payment_method,
          transaction_reference: formData.transaction_reference || null,
          proof_file_url: publicUrl,
          proof_type: file.type,
          buyer_notes: formData.buyer_notes || null,
        });

      if (insertError) throw insertError;

      toast({
        title: 'Success',
        description: 'Payment proof submitted successfully. The seller will be notified.',
      });

      setOpen(false);
      onSuccess?.();
    } catch (error: any) {
      console.error('Error submitting payment proof:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to submit payment proof',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="w-full" size="lg">
          <DollarSign className="mr-2 h-5 w-5" />
          I Have Paid the Seller
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Submit Payment Proof</DialogTitle>
          <DialogDescription>
            Upload proof of payment to the seller. This can be a mobile money screenshot, bank receipt, or any payment confirmation.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <Label htmlFor="amount">Amount Paid ({listing.currency})</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              value={formData.amount_paid}
              onChange={(e) => setFormData({ ...formData, amount_paid: parseFloat(e.target.value) })}
              required
            />
          </div>

          <div>
            <Label htmlFor="payment_method">Payment Method</Label>
            <Select
              value={formData.payment_method}
              onValueChange={(value) => setFormData({ ...formData, payment_method: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="mpesa">M-Pesa</SelectItem>
                <SelectItem value="tigo_pesa">Tigo Pesa</SelectItem>
                <SelectItem value="airtel_money">Airtel Money</SelectItem>
                <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                <SelectItem value="cash">Cash</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="transaction_ref">Transaction Reference (Optional)</Label>
            <Input
              id="transaction_ref"
              value={formData.transaction_reference}
              onChange={(e) => setFormData({ ...formData, transaction_reference: e.target.value })}
              placeholder="e.g., Transaction ID, Receipt Number"
            />
          </div>

          <div>
            <Label htmlFor="proof_file">Upload Payment Proof *</Label>
            <div className="mt-2">
              <Input
                id="proof_file"
                type="file"
                accept="image/jpeg,image/png,image/jpg,application/pdf"
                onChange={handleFileChange}
                required
              />
              {file && (
                <p className="text-sm text-muted-foreground mt-2">
                  Selected: {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
                </p>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Max 10MB. Accepted formats: JPG, PNG, PDF
            </p>
          </div>

          <div>
            <Label htmlFor="notes">Additional Notes (Optional)</Label>
            <Textarea
              id="notes"
              value={formData.buyer_notes}
              onChange={(e) => setFormData({ ...formData, buyer_notes: e.target.value })}
              placeholder="Any additional information about this payment..."
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Submitting...' : 'Submit Payment Proof'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
