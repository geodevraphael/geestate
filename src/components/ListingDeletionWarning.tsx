import { AlertCircle, RefreshCw } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useState } from "react";
import { formatDistanceToNow } from "date-fns";

interface ListingDeletionWarningProps {
  listingId: string;
  listingTitle: string;
  deletionWarningSentAt: string | null;
  republishRequestedAt: string | null;
  pendingDeletion: boolean;
  onRepublish?: () => void;
}

export const ListingDeletionWarning = ({
  listingId,
  listingTitle,
  deletionWarningSentAt,
  republishRequestedAt,
  pendingDeletion,
  onRepublish,
}: ListingDeletionWarningProps) => {
  const [loading, setLoading] = useState(false);

  if (!pendingDeletion) return null;

  const handleRepublish = async () => {
    setLoading(true);
    try {
      // Mark as republish requested
      const { error: updateError } = await supabase
        .from("listings")
        .update({
          republish_requested_at: new Date().toISOString(),
        })
        .eq("id", listingId);

      if (updateError) throw updateError;

      // Create listing fee for republish
      const { data: feeDefinition } = await supabase
        .from("geoinsight_fee_definitions")
        .select("*")
        .eq("code", "LISTING_FEE")
        .eq("is_active", true)
        .single();

      if (feeDefinition) {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (user) {
          await supabase.from("geoinsight_income_records").insert({
            user_id: user.id,
            related_listing_id: listingId,
            fee_definition_id: feeDefinition.id,
            description: `Republish fee for listing: ${listingTitle}`,
            amount_due: feeDefinition.fixed_amount,
            currency: feeDefinition.currency,
            status: "pending",
            due_date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(), // 5 days
          });
        }
      }

      toast.success("Republish requested! Please pay the listing fee within 5 days to keep your property.");
      onRepublish?.();
    } catch (error) {
      console.error("Error requesting republish:", error);
      toast.error("Failed to request republish. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const timeLeft = republishRequestedAt
    ? formatDistanceToNow(new Date(republishRequestedAt), { addSuffix: true })
    : deletionWarningSentAt
    ? formatDistanceToNow(new Date(deletionWarningSentAt), { addSuffix: true })
    : null;

  return (
    <Alert variant="destructive" className="mb-4">
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>Property Scheduled for Deletion</AlertTitle>
      <AlertDescription className="mt-2">
        {republishRequestedAt ? (
          <>
            You requested to republish this property {timeLeft}. Please pay the
            listing fee within 5 days or this property will be permanently
            deleted.
          </>
        ) : (
          <>
            This property has been in the system for over 1 year and is
            scheduled for deletion. Warning sent {timeLeft}. You can republish
            it by paying the listing fee again.
          </>
        )}
        <div className="mt-3">
          <Button
            onClick={handleRepublish}
            disabled={loading || !!republishRequestedAt}
            size="sm"
            variant="outline"
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            {republishRequestedAt ? "Republish Requested" : "Republish Property"}
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  );
};
