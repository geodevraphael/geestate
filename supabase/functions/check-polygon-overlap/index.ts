import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.81.1';
import * as turf from 'https://esm.sh/@turf/turf@7.2.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface OverlapCheckRequest {
  geojson: any;
  exclude_listing_id?: string; // For edits - exclude the listing being edited
}

interface OverlapResult {
  listing_id: string;
  listing_title: string;
  overlap_percentage: number;
  overlap_area_m2: number;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { geojson, exclude_listing_id }: OverlapCheckRequest = await req.json();

    console.log('Checking polygon overlap, excluding:', exclude_listing_id || 'none');

    // Validate input
    if (!geojson || !geojson.coordinates) {
      return new Response(
        JSON.stringify({ error: 'Invalid GeoJSON provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let newPolygon;
    try {
      newPolygon = turf.polygon(geojson.coordinates);
    } catch (error) {
      console.error('Invalid polygon geometry:', error);
      return new Response(
        JSON.stringify({ error: 'Invalid polygon geometry', can_proceed: false }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const newArea = turf.area(newPolygon);
    console.log('New polygon area:', newArea, 'm²');

    // Get centroid to limit search to nearby polygons
    const centroid = turf.centroid(newPolygon);
    const [lng, lat] = centroid.geometry.coordinates;

    // Get existing polygons (only published listings) within a reasonable distance
    let query = supabase
      .from('listing_polygons')
      .select(`
        id,
        listing_id,
        geojson,
        listings!inner (
          id,
          title,
          status
        )
      `)
      .not('listings.status', 'in', '("draft","archived")');

    if (exclude_listing_id) {
      query = query.neq('listing_id', exclude_listing_id);
    }

    const { data: existingPolygons, error: fetchError } = await query;

    if (fetchError) {
      console.error('Error fetching existing polygons:', fetchError);
      throw fetchError;
    }

    console.log(`Found ${existingPolygons?.length || 0} existing polygons to check`);

    const overlaps: OverlapResult[] = [];
    let hasBlockingOverlap = false;
    let maxOverlap = 0;

    for (const existing of existingPolygons || []) {
      try {
        if (!existing.geojson?.coordinates) continue;

        const existingPolygon = turf.polygon(existing.geojson.coordinates);
        
        // Quick bounding box check first
        const newBbox = turf.bbox(newPolygon);
        const existingBbox = turf.bbox(existingPolygon);
        
        // Skip if bounding boxes don't overlap
        if (newBbox[2] < existingBbox[0] || newBbox[0] > existingBbox[2] ||
            newBbox[3] < existingBbox[1] || newBbox[1] > existingBbox[3]) {
          continue;
        }

        // Check for actual intersection
        const intersection = turf.intersect(turf.featureCollection([newPolygon, existingPolygon]));
        
        if (intersection) {
          const intersectionArea = turf.area(intersection);
          const overlapPercentage = (intersectionArea / newArea) * 100;

          console.log(`Overlap with ${existing.listing_id}: ${overlapPercentage.toFixed(2)}% (${intersectionArea.toFixed(2)} m²)`);

          if (overlapPercentage > 1) { // Only report overlaps > 1%
            const listingData = existing.listings as any;
            overlaps.push({
              listing_id: existing.listing_id,
              listing_title: listingData?.title || 'Unknown Property',
              overlap_percentage: Math.round(overlapPercentage * 10) / 10,
              overlap_area_m2: Math.round(intersectionArea),
            });

            if (overlapPercentage > maxOverlap) {
              maxOverlap = overlapPercentage;
            }

            // Block if overlap > 20%
            if (overlapPercentage > 20) {
              hasBlockingOverlap = true;
            }
          }
        }
      } catch (error) {
        console.error('Error comparing with polygon:', existing.id, error);
      }
    }

    // Sort by overlap percentage descending
    overlaps.sort((a, b) => b.overlap_percentage - a.overlap_percentage);

    const response = {
      can_proceed: !hasBlockingOverlap,
      has_overlaps: overlaps.length > 0,
      max_overlap_percentage: Math.round(maxOverlap * 10) / 10,
      overlapping_properties: overlaps.slice(0, 5), // Return top 5 overlaps
      message: hasBlockingOverlap 
        ? `This property overlaps ${maxOverlap.toFixed(1)}% with an existing listing. Properties cannot overlap more than 20%.`
        : overlaps.length > 0
          ? `Warning: Minor overlap detected (${maxOverlap.toFixed(1)}%) with existing properties.`
          : 'No overlaps detected.',
    };

    console.log('Overlap check result:', response);

    return new Response(
      JSON.stringify(response),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in check-polygon-overlap:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage, can_proceed: true }), // Allow on error to not block users
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
