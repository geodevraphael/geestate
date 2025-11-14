import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface UseListingCalculationsProps {
  listingId: string;
  propertyType: string;
  region?: string;
  district?: string;
  geojson: any;
}

/**
 * Hook to automatically trigger STEP 4 calculations for a listing
 * Calls edge functions for spatial risk, land use, and valuation
 */
export function useListingCalculations({
  listingId,
  propertyType,
  region,
  district,
  geojson,
}: UseListingCalculationsProps) {
  useEffect(() => {
    if (!listingId || !propertyType || !geojson) return;

    const runCalculations = async () => {
      try {
        // Run all calculations in parallel
        await Promise.all([
          // Calculate spatial risk (flood risk, environmental factors)
          supabase.functions.invoke('calculate-spatial-risk', {
            body: {
              listing_id: listingId,
              property_type: propertyType,
              region,
              district,
              geojson,
            },
          }),
          
          // Calculate land use profile
          supabase.functions.invoke('calculate-land-use', {
            body: {
              listing_id: listingId,
              property_type: propertyType,
              region,
              district,
              geojson,
            },
          }),
          
          // Calculate valuation estimate
          supabase.functions.invoke('calculate-valuation', {
            body: {
              listing_id: listingId,
              property_type: propertyType,
              region,
              district,
              geojson,
            },
          }),
        ]);

        console.log('STEP 4 calculations completed for listing:', listingId);
      } catch (error) {
        console.error('Error running STEP 4 calculations:', error);
      }
    };

    runCalculations();
  }, [listingId, propertyType, region, district, geojson]);
}
