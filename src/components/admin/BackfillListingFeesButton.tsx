import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { DollarSign, Loader2 } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

export function BackfillListingFeesButton() {
  const [loading, setLoading] = useState(false);

  const handleBackfill = async () => {
    try {
      setLoading(true);
      toast.info('Processing listing fees...');

      const { data, error } = await supabase.functions.invoke('backfill-listing-fees', {
        body: {}
      });

      if (error) throw error;

      toast.success(
        `Successfully grouped listing fees for ${data.records_created} users`,
        {
          description: data.records_created === 1 
            ? 'Listing fees have been consolidated into a single payment.'
            : 'All listing fees have been consolidated into grouped payments per user.'
        }
      );

      // Refresh the page to show new records
      setTimeout(() => window.location.reload(), 2000);
      
    } catch (error: any) {
      console.error('Error backfilling listing fees:', error);
      toast.error('Failed to backfill listing fees', {
        description: error.message
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="outline" disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <DollarSign className="w-4 h-4 mr-2" />
              Backfill Listing Fees
            </>
          )}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Backfill Listing Fees</AlertDialogTitle>
          <AlertDialogDescription>
            This will consolidate all listing fees into grouped payment records (one per user).
            Each user will have a single payment showing the total for all their published listings.
            The fee is 50,000 TZS per listing with a 14-day payment deadline.
            <br /><br />
            <strong>Note:</strong> This will delete any existing pending individual listing fee records 
            and replace them with grouped records.
            <br /><br />
            Are you sure you want to proceed?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleBackfill}>
            Yes, Backfill Fees
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}