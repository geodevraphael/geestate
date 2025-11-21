import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ResponsiveModal } from "@/components/ResponsiveModal";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Star } from "lucide-react";
import { Switch } from "@/components/ui/switch";

interface TransactionReviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dealClosureId: string;
  listingId: string;
  reviewedUserId: string;
  reviewedUserName: string;
  reviewerRole: "buyer" | "seller";
}

export function TransactionReviewDialog({
  open,
  onOpenChange,
  dealClosureId,
  listingId,
  reviewedUserId,
  reviewedUserName,
  reviewerRole,
}: TransactionReviewDialogProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    rating: 0,
    communication_score: 0,
    reliability_score: 0,
    honesty_score: 0,
    review_text: "",
    would_transact_again: true,
  });

  const handleStarClick = (field: keyof typeof formData, value: number) => {
    setFormData({ ...formData, [field]: value });
  };

  const renderStars = (field: keyof typeof formData, label: string) => {
    const value = formData[field] as number;
    return (
      <div>
        <Label>{label}</Label>
        <div className="flex gap-1 mt-1">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              onClick={() => handleStarClick(field, star)}
              className="focus:outline-none"
            >
              <Star
                className={`h-6 w-6 ${
                  star <= value
                    ? "fill-yellow-400 text-yellow-400"
                    : "text-muted-foreground"
                }`}
              />
            </button>
          ))}
        </div>
      </div>
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.rating === 0) {
      toast.error("Please provide an overall rating");
      return;
    }

    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase.from("transaction_reviews").insert([
        {
          deal_closure_id: dealClosureId,
          listing_id: listingId,
          reviewer_id: user.id,
          reviewed_user_id: reviewedUserId,
          reviewer_role: reviewerRole,
          ...formData,
        },
      ]);

      if (error) throw error;

      toast.success("Review submitted successfully");
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ResponsiveModal
      open={open}
      onOpenChange={onOpenChange}
      title={`Rate ${reviewedUserName}`}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
          {renderStars("rating", "Overall Rating")}
          {renderStars("communication_score", "Communication")}
          {renderStars("reliability_score", "Reliability")}
          {renderStars("honesty_score", "Honesty")}

          <div>
            <Label htmlFor="review_text">Review (Optional)</Label>
            <Textarea
              id="review_text"
              value={formData.review_text}
              onChange={(e) =>
                setFormData({ ...formData, review_text: e.target.value })
              }
              rows={4}
              placeholder="Share your experience..."
            />
          </div>

          <div className="flex items-center gap-2">
            <Switch
              checked={formData.would_transact_again}
              onCheckedChange={(checked) =>
                setFormData({ ...formData, would_transact_again: checked })
              }
            />
            <Label>Would transact with them again</Label>
          </div>

          <div className="flex gap-2">
            <Button type="submit" disabled={loading} className="flex-1">
              {loading ? "Submitting..." : "Submit Review"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
        </div>
      </form>
    </ResponsiveModal>
  );
}