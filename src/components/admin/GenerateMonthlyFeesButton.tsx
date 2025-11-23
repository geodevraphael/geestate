import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Calendar, Loader2 } from 'lucide-react';

export function GenerateMonthlyFeesButton() {
  const [loading, setLoading] = useState(false);

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-monthly-fees', {
        body: {},
      });

      if (error) throw error;

      toast.success('Monthly fees generated successfully');
    } catch (error: any) {
      console.error('Error generating monthly fees:', error);
      toast.error('Failed to generate monthly fees: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      onClick={handleGenerate}
      disabled={loading}
      variant="outline"
    >
      {loading ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Generating...
        </>
      ) : (
        <>
          <Calendar className="mr-2 h-4 w-4" />
          Generate Monthly Fees
        </>
      )}
    </Button>
  );
}