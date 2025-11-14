import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Database } from 'lucide-react';

export function GenerateSampleDataButton() {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const generateSampleData = async () => {
    try {
      setLoading(true);
      
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Not authenticated');
      }

      const response = await fetch(
        'https://msziurxcplegxqwooawk.supabase.co/functions/v1/generate-sample-data',
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to generate sample data');
      }

      toast({
        title: 'Success',
        description: result.message,
      });

      // Reload the page to show new data
      setTimeout(() => window.location.reload(), 1500);

    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button 
      onClick={generateSampleData} 
      disabled={loading}
      variant="outline"
      className="gap-2"
    >
      <Database className="h-4 w-4" />
      {loading ? 'Generating...' : 'Generate Sample Listings'}
    </Button>
  );
}
