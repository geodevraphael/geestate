import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { format } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ExternalLink } from "lucide-react";

interface SubscriptionPaymentProof {
  id: string;
  user_id: string;
  plan_type: string;
  amount_paid: number;
  payment_method: string;
  transaction_reference: string | null;
  proof_file_url: string;
  buyer_notes: string | null;
  admin_notes: string | null;
  status: string;
  submitted_at: string;
  profiles: {
    full_name: string;
    email: string;
  };
}

export default function AdminSubscriptionPayments() {
  const { profile } = useAuth();
  const [proofs, setProofs] = useState<SubscriptionPaymentProof[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProof, setSelectedProof] = useState<SubscriptionPaymentProof | null>(null);
  const [actionDialog, setActionDialog] = useState<"approve" | "reject" | null>(null);
  const [adminNotes, setAdminNotes] = useState("");
  const [processing, setProcessing] = useState(false);

  const isAdmin = profile?.role === "admin" || profile?.role === "verification_officer";

  useEffect(() => {
    if (isAdmin) {
      fetchProofs();
    }
  }, [isAdmin]);

  const fetchProofs = async () => {
    try {
      const { data, error } = await supabase
        .from("subscription_payment_proofs")
        .select(`
          *,
          profiles:user_id(full_name, email)
        `)
        .order("submitted_at", { ascending: false });

      if (error) throw error;
      setProofs(data || []);
    } catch (error: any) {
      toast.error("Failed to load payment proofs");
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!selectedProof) return;
    setProcessing(true);

    try {
      // Calculate subscription end date (1 year from now)
      const endDate = new Date();
      endDate.setFullYear(endDate.getFullYear() + 1);

      // Create or update subscription
      const { error: subError } = await supabase
        .from("subscriptions")
        .upsert({
          user_id: selectedProof.user_id,
          plan_type: selectedProof.plan_type as "basic" | "pro" | "enterprise",
          amount_paid: selectedProof.amount_paid,
          is_active: true,
          start_date: new Date().toISOString(),
          end_date: endDate.toISOString(),
        }, { onConflict: "user_id" });

      if (subError) throw subError;

      // Update payment proof status
      const { error: proofError } = await supabase
        .from("subscription_payment_proofs")
        .update({
          status: "approved",
          admin_notes: adminNotes,
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", selectedProof.id);

      if (proofError) throw proofError;

      toast.success("Subscription activated");
      setActionDialog(null);
      setSelectedProof(null);
      setAdminNotes("");
      fetchProofs();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!selectedProof || !adminNotes) {
      toast.error("Please provide a reason for rejection");
      return;
    }

    setProcessing(true);

    try {
      const { error } = await supabase
        .from("subscription_payment_proofs")
        .update({
          status: "rejected",
          admin_notes: adminNotes,
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", selectedProof.id);

      if (error) throw error;

      toast.success("Payment proof rejected");
      setActionDialog(null);
      setSelectedProof(null);
      setAdminNotes("");
      fetchProofs();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setProcessing(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive"> = {
      pending_review: "secondary",
      approved: "default",
      rejected: "destructive",
    };
    return <Badge variant={variants[status] || "default"}>{status.replace(/_/g, " ")}</Badge>;
  };

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-8">
          <p>Access denied. Admin only.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-8">
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-6">Subscription Payment Proofs</h1>

        <div className="grid gap-4">
          {proofs.map((proof) => (
            <Card key={proof.id} className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="font-semibold">{proof.profiles.full_name}</h3>
                  <p className="text-sm text-muted-foreground">{proof.profiles.email}</p>
                </div>
                {getStatusBadge(proof.status)}
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Plan:</span>
                  <p className="font-medium">{proof.plan_type}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Amount:</span>
                  <p className="font-medium">{proof.amount_paid.toLocaleString()} TZS</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Method:</span>
                  <p>{proof.payment_method}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Submitted:</span>
                  <p>{format(new Date(proof.submitted_at), "PPp")}</p>
                </div>
              </div>

              {proof.transaction_reference && (
                <p className="text-sm mt-2">
                  <span className="text-muted-foreground">Ref:</span> {proof.transaction_reference}
                </p>
              )}

              {proof.buyer_notes && (
                <p className="text-sm mt-2 p-2 bg-muted rounded">
                  <span className="text-muted-foreground">Notes:</span> {proof.buyer_notes}
                </p>
              )}

              <div className="flex gap-2 mt-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open(proof.proof_file_url, "_blank")}
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  View Proof
                </Button>

                {proof.status === "pending_review" && (
                  <>
                    <Button
                      size="sm"
                      onClick={() => {
                        setSelectedProof(proof);
                        setActionDialog("approve");
                      }}
                    >
                      Approve
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => {
                        setSelectedProof(proof);
                        setActionDialog("reject");
                      }}
                    >
                      Reject
                    </Button>
                  </>
                )}
              </div>
            </Card>
          ))}
        </div>

        <Dialog open={actionDialog === "approve"} onOpenChange={() => setActionDialog(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Approve Subscription Payment</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p>This will activate the subscription for the user.</p>
              <Textarea
                placeholder="Admin notes (optional)"
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
              />
              <div className="flex gap-2">
                <Button onClick={handleApprove} disabled={processing}>
                  {processing ? "Processing..." : "Confirm Approval"}
                </Button>
                <Button variant="outline" onClick={() => setActionDialog(null)}>
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={actionDialog === "reject"} onOpenChange={() => setActionDialog(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Reject Payment Proof</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <Textarea
                placeholder="Reason for rejection (required)"
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                required
              />
              <div className="flex gap-2">
                <Button
                  variant="destructive"
                  onClick={handleReject}
                  disabled={processing || !adminNotes}
                >
                  {processing ? "Processing..." : "Confirm Rejection"}
                </Button>
                <Button variant="outline" onClick={() => setActionDialog(null)}>
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}