import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { Upload, Copy, CheckCircle } from "lucide-react";

interface PaymentAccount {
  id: string;
  account_name: string;
  account_number: string;
  bank_name: string;
  swift_code: string | null;
  currency: string;
  instructions: string | null;
}

interface SubscriptionPaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  planType: "basic" | "pro" | "enterprise";
  amount: number;
}

const PLAN_PRICES = {
  basic: 50000,
  pro: 150000,
  enterprise: 500000,
};

export function SubscriptionPaymentDialog({
  open,
  onOpenChange,
  planType,
  amount,
}: SubscriptionPaymentDialogProps) {
  const [accounts, setAccounts] = useState<PaymentAccount[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    amount_paid: amount,
    payment_method: "Bank Transfer",
    transaction_reference: "",
    buyer_notes: "",
  });

  useEffect(() => {
    if (open) {
      fetchPaymentAccounts();
    }
  }, [open]);

  const fetchPaymentAccounts = async () => {
    try {
      const { data, error } = await supabase
        .from("payment_account_settings")
        .select("*")
        .eq("is_active", true);

      if (error) throw error;
      setAccounts(data || []);
    } catch (error: any) {
      toast.error("Failed to load payment accounts");
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 5 * 1024 * 1024) {
        toast.error("File size should be less than 5MB");
        return;
      }
      setSelectedFile(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedFile) {
      toast.error("Please upload proof of payment");
      return;
    }

    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Upload proof file
      const fileExt = selectedFile.name.split(".").pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("payment-proofs")
        .upload(fileName, selectedFile);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("payment-proofs")
        .getPublicUrl(fileName);

      // Insert payment proof
      const { error: insertError } = await supabase
        .from("subscription_payment_proofs")
        .insert([{
          user_id: user.id,
          plan_type: planType,
          amount_paid: formData.amount_paid,
          payment_method: formData.payment_method,
          transaction_reference: formData.transaction_reference,
          proof_file_url: publicUrl,
          buyer_notes: formData.buyer_notes,
        }]);

      if (insertError) throw insertError;

      toast.success("Payment proof submitted successfully. Awaiting admin review.");
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Subscribe to {planType.charAt(0).toUpperCase() + planType.slice(1)} Plan</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <Card className="p-4 bg-primary/5">
            <h3 className="font-semibold mb-2">Amount to Pay</h3>
            <p className="text-2xl font-bold">{amount.toLocaleString()} TZS</p>
          </Card>

          {accounts.map((account) => (
            <Card key={account.id} className="p-4">
              <h3 className="font-semibold mb-3">{account.bank_name}</h3>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Account Name:</span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono">{account.account_name}</span>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => copyToClipboard(account.account_name)}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Account Number:</span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono">{account.account_number}</span>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => copyToClipboard(account.account_number)}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
                {account.swift_code && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">SWIFT Code:</span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono">{account.swift_code}</span>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => copyToClipboard(account.swift_code!)}
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
              {account.instructions && (
                <div className="mt-3 p-3 bg-muted rounded-md">
                  <p className="text-sm whitespace-pre-wrap">{account.instructions}</p>
                </div>
              )}
            </Card>
          ))}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="amount_paid">Amount Paid (TZS)</Label>
              <Input
                id="amount_paid"
                type="number"
                value={formData.amount_paid}
                onChange={(e) => setFormData({ ...formData, amount_paid: Number(e.target.value) })}
                required
              />
            </div>

            <div>
              <Label htmlFor="transaction_reference">Transaction Reference (Optional)</Label>
              <Input
                id="transaction_reference"
                value={formData.transaction_reference}
                onChange={(e) => setFormData({ ...formData, transaction_reference: e.target.value })}
              />
            </div>

            <div>
              <Label htmlFor="proof_file">Upload Proof of Payment</Label>
              <Input
                id="proof_file"
                type="file"
                accept="image/*,.pdf"
                onChange={handleFileChange}
                required
              />
              {selectedFile && (
                <p className="text-sm text-muted-foreground mt-1">
                  <CheckCircle className="inline h-3 w-3 mr-1" />
                  {selectedFile.name}
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="buyer_notes">Notes (Optional)</Label>
              <Textarea
                id="buyer_notes"
                value={formData.buyer_notes}
                onChange={(e) => setFormData({ ...formData, buyer_notes: e.target.value })}
                rows={3}
              />
            </div>

            <div className="flex gap-2">
              <Button type="submit" disabled={loading} className="flex-1">
                {loading ? "Submitting..." : "Submit Payment Proof"}
              </Button>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}