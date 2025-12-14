import { supabase } from '@/integrations/supabase/client';

interface PolygonFraudCheck {
  listing_id: string;
  geojson: any;
  user_id: string;
}

interface MultiAccountCheck {
  user_id: string;
  phone?: string;
  listing_id?: string;
}

interface PriceAnomalyCheck {
  listing_id: string;
  user_id: string;
  current_price: number;
  property_type: string;
  region?: string;
}

interface OverlapCheckResult {
  can_proceed: boolean;
  has_overlaps: boolean;
  max_overlap_percentage: number;
  overlapping_properties: Array<{
    listing_id: string;
    listing_title: string;
    overlap_percentage: number;
    overlap_area_m2: number;
  }>;
  message: string;
}

/**
 * Check if a polygon overlaps with existing properties
 * Returns whether the listing can proceed (blocks if overlap > 20%)
 */
export async function checkPolygonOverlap(
  geojson: any, 
  excludeListingId?: string
): Promise<OverlapCheckResult> {
  console.log('=== OVERLAP CHECK STARTED ===');
  console.log('GeoJSON:', JSON.stringify(geojson));
  console.log('Exclude listing ID:', excludeListingId);
  
  try {
    const { data: result, error } = await supabase.functions.invoke('check-polygon-overlap', {
      body: { geojson, exclude_listing_id: excludeListingId },
    });

    console.log('Overlap check response:', result, 'Error:', error);

    if (error) {
      console.error('Error checking polygon overlap:', error);
      // CRITICAL: Block on error to prevent duplicates from slipping through
      return { 
        can_proceed: false, 
        has_overlaps: false, 
        max_overlap_percentage: 0, 
        overlapping_properties: [],
        message: `Overlap check failed: ${error.message || 'Unknown error'}. Please try again.` 
      };
    }

    if (!result) {
      console.error('Empty result from overlap check');
      return { 
        can_proceed: false, 
        has_overlaps: false, 
        max_overlap_percentage: 0, 
        overlapping_properties: [],
        message: 'Overlap check returned no data. Please try again.' 
      };
    }

    console.log('Polygon overlap check result:', result);
    return result;
  } catch (error) {
    console.error('Exception in checkPolygonOverlap:', error);
    // CRITICAL: Block on exception to prevent duplicates
    return { 
      can_proceed: false, 
      has_overlaps: false, 
      max_overlap_percentage: 0, 
      overlapping_properties: [],
      message: `Overlap verification failed: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again.` 
    };
  }
}

export async function checkPolygonFraud(data: PolygonFraudCheck) {
  try {
    const { data: result, error } = await supabase.functions.invoke('detect-polygon-fraud', {
      body: data,
    });

    if (error) {
      console.error('Error checking polygon fraud:', error);
      return { success: false, error };
    }

    console.log('Polygon fraud check completed:', result);
    return result;
  } catch (error) {
    console.error('Exception in checkPolygonFraud:', error);
    return { success: false, error };
  }
}

export async function checkMultiAccount(data: MultiAccountCheck) {
  try {
    const { data: result, error } = await supabase.functions.invoke('detect-multi-account', {
      body: data,
    });

    if (error) {
      console.error('Error checking multi-account:', error);
      return { success: false, error };
    }

    console.log('Multi-account check completed:', result);
    return result;
  } catch (error) {
    console.error('Exception in checkMultiAccount:', error);
    return { success: false, error };
  }
}

export async function checkPriceAnomaly(data: PriceAnomalyCheck) {
  try {
    const { data: result, error } = await supabase.functions.invoke('detect-price-anomaly', {
      body: data,
    });

    if (error) {
      console.error('Error checking price anomaly:', error);
      return { success: false, error };
    }

    console.log('Price anomaly check completed:', result);
    return result;
  } catch (error) {
    console.error('Exception in checkPriceAnomaly:', error);
    return { success: false, error };
  }
}

/**
 * Run all fraud detection checks for a listing
 * This should be called after a listing is created or significantly updated
 */
export async function runFullFraudDetection(
  listing_id: string,
  user_id: string,
  geojson: any,
  price: number,
  property_type: string,
  region?: string,
  phone?: string
) {
  console.log('Running full fraud detection for listing:', listing_id);

  const results = await Promise.allSettled([
    checkPolygonFraud({ listing_id, geojson, user_id }),
    checkMultiAccount({ user_id, phone, listing_id }),
    checkPriceAnomaly({ listing_id, user_id, current_price: price, property_type, region }),
  ]);

  const summary = {
    polygon_check: results[0].status === 'fulfilled' ? results[0].value : { success: false },
    multi_account_check: results[1].status === 'fulfilled' ? results[1].value : { success: false },
    price_check: results[2].status === 'fulfilled' ? results[2].value : { success: false },
    total_signals: 0,
  };

  // Calculate total signals detected
  if (summary.polygon_check.signals_detected) {
    summary.total_signals += summary.polygon_check.signals_detected;
  }
  if (summary.multi_account_check.signals_detected) {
    summary.total_signals += summary.multi_account_check.signals_detected;
  }
  if (summary.price_check.signals_detected) {
    summary.total_signals += summary.price_check.signals_detected;
  }

  console.log('Fraud detection summary:', summary);
  return summary;
}
