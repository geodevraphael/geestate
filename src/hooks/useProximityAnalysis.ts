import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface UseProximityAnalysisProps {
  listingId: string;
  geojson?: any;
}

export const useProximityAnalysis = ({ listingId, geojson }: UseProximityAnalysisProps) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const calculateProximity = async () => {
    if (!listingId || !geojson) {
      return;
    }

    try {
      setLoading(true);
      setError(null);

      console.log('Triggering proximity analysis calculation...');

      const { data, error: functionError } = await supabase.functions.invoke(
        'calculate-proximity-analysis',
        {
          body: {
            listing_id: listingId,
            geojson: geojson,
          },
        }
      );

      if (functionError) {
        throw functionError;
      }

      console.log('Proximity analysis completed:', data);
    } catch (err) {
      console.error('Error calculating proximity analysis:', err);
      setError(err instanceof Error ? err.message : 'Failed to calculate proximity');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!listingId || !geojson) {
      return;
    }

    const checkAndCalculate = async () => {
      try {
        // Check if proximity analysis already exists
        const { data: existing } = await supabase
          .from('proximity_analysis')
          .select('id, calculated_at')
          .eq('listing_id', listingId)
          .maybeSingle();

        // Skip if analysis was done recently (within last 7 days)
        if (existing) {
          const calculatedAt = new Date(existing.calculated_at);
          const daysSince = (Date.now() - calculatedAt.getTime()) / (1000 * 60 * 60 * 24);
          
          if (daysSince < 7) {
            console.log('Proximity analysis is recent, skipping auto-calculation');
            return;
          }
        }

        // Delay execution to avoid overwhelming the server
        setTimeout(calculateProximity, 1000);
      } catch (err) {
        console.error('Error checking proximity analysis:', err);
      }
    };

    checkAndCalculate();
  }, [listingId, geojson]);

  return { loading, error, calculateProximity };
};
