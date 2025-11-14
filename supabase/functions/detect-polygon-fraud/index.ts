import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.81.1';
import * as turf from 'https://esm.sh/@turf/turf@7.2.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PolygonFraudRequest {
  listing_id: string;
  geojson: any;
  user_id: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { listing_id, geojson, user_id }: PolygonFraudRequest = await req.json();

    console.log('Checking polygon fraud for listing:', listing_id);

    // Validate input
    if (!listing_id || !geojson || !user_id) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get all existing polygons except the current one
    const { data: existingPolygons, error: fetchError } = await supabase
      .from('listing_polygons')
      .select('id, listing_id, geojson')
      .neq('listing_id', listing_id);

    if (fetchError) {
      console.error('Error fetching existing polygons:', fetchError);
      throw fetchError;
    }

    const fraudSignals = [];
    const newPolygon = turf.polygon(geojson.coordinates);

    // Check for self-intersecting polygon
    try {
      const kinks = turf.kinks(newPolygon);
      if (kinks.features.length > 0) {
        console.log('Self-intersecting polygon detected');
        fraudSignals.push({
          listing_id,
          user_id,
          signal_type: 'self_intersecting_polygon',
          signal_score: 15,
          details: 'Polygon intersects itself - invalid geometry',
        });
      }
    } catch (error) {
      console.error('Error checking self-intersection:', error);
    }

    // Check against existing polygons
    for (const existing of existingPolygons || []) {
      try {
        const existingPolygon = turf.polygon(existing.geojson.coordinates);

        // Check for exact duplicate
        const isEqual = turf.booleanEqual(newPolygon, existingPolygon);
        if (isEqual) {
          console.log('Exact duplicate polygon found:', existing.listing_id);
          fraudSignals.push({
            listing_id,
            user_id,
            signal_type: 'duplicate_polygon',
            signal_score: 20,
            details: `Exact duplicate of listing ${existing.listing_id}`,
          });
          continue;
        }

        // Check for overlap
        const intersection = turf.intersect(turf.featureCollection([newPolygon, existingPolygon]));
        if (intersection) {
          const newArea = turf.area(newPolygon);
          const intersectionArea = turf.area(intersection);
          const overlapPercentage = (intersectionArea / newArea) * 100;

          console.log(`Overlap with ${existing.listing_id}: ${overlapPercentage.toFixed(2)}%`);

          if (overlapPercentage > 80) {
            fraudSignals.push({
              listing_id,
              user_id,
              signal_type: 'similar_polygon',
              signal_score: 18,
              details: `${overlapPercentage.toFixed(1)}% overlap with listing ${existing.listing_id}`,
            });
          } else if (overlapPercentage > 20) {
            fraudSignals.push({
              listing_id,
              user_id,
              signal_type: 'similar_polygon',
              signal_score: 12,
              details: `${overlapPercentage.toFixed(1)}% overlap with listing ${existing.listing_id}`,
            });
          } else if (overlapPercentage > 5) {
            fraudSignals.push({
              listing_id,
              user_id,
              signal_type: 'similar_polygon',
              signal_score: 5,
              details: `${overlapPercentage.toFixed(1)}% overlap with listing ${existing.listing_id}`,
            });
          }
        }
      } catch (error) {
        console.error('Error comparing with polygon:', existing.id, error);
      }
    }

    // Insert fraud signals if any were detected
    if (fraudSignals.length > 0) {
      const { error: insertError } = await supabase
        .from('fraud_signals')
        .insert(fraudSignals);

      if (insertError) {
        console.error('Error inserting fraud signals:', insertError);
      } else {
        console.log(`Inserted ${fraudSignals.length} fraud signals`);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        signals_detected: fraudSignals.length,
        signals: fraudSignals,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in detect-polygon-fraud:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
