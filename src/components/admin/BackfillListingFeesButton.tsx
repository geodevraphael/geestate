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
        `Successfully created ${data.records_created} listing fee records`,
        {
          description: 'All published listings without fees now have pending payment records.'
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
            This will create listing fee records for all published listings that don't have one yet.
            Each listing will be charged 50,000 TZS with a 14-day payment deadline. Users will be notified.
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