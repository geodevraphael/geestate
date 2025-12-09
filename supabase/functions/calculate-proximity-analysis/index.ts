import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.81.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ProximityItem {
  name: string;
  distance: number;
  type?: string;
}

// Retry logic with exponential backoff
async function fetchWithRetry(url: string, options: RequestInit, maxRetries = 3): Promise<Response> {
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 20000); // 20s timeout
      
      const response = await fetch(url, {
        ...options,
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (response.ok) {
        return response;
      }
      
      // If rate limited (429) or server error (5xx), retry
      if (response.status === 429 || response.status >= 500) {
        const waitTime = Math.pow(2, attempt) * 1000; // Exponential backoff
        console.log(`Attempt ${attempt + 1} failed with status ${response.status}, retrying in ${waitTime}ms...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        continue;
      }
      
      throw new Error(`API error: ${response.status} ${response.statusText}`);
    } catch (error) {
      lastError = error as Error;
      if ((error as Error).name === 'AbortError') {
        console.log(`Attempt ${attempt + 1} timed out, retrying...`);
      } else {
        console.log(`Attempt ${attempt + 1} failed:`, (error as Error).message);
      }
      
      if (attempt < maxRetries - 1) {
        const waitTime = Math.pow(2, attempt) * 1000;
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }
  }
  
  throw lastError || new Error('All retry attempts failed');
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { listing_id, geojson } = await req.json();

    if (!listing_id || !geojson) {
      throw new Error('Missing required parameters: listing_id and geojson');
    }

    console.log('Calculating proximity analysis for listing:', listing_id);

    // Parse GeoJSON to get center point
    const coordinates = geojson.coordinates[0];
    const lats = coordinates.map((c: number[]) => c[1]);
    const lngs = coordinates.map((c: number[]) => c[0]);
    const centerLat = (Math.max(...lats) + Math.min(...lats)) / 2;
    const centerLng = (Math.max(...lngs) + Math.min(...lngs)) / 2;

    console.log('Center coordinates:', { centerLat, centerLng });

    // Reduced radius for faster queries (3km instead of 5km)
    const searchRadius = 3000;

    // Use multiple Overpass API endpoints for redundancy
    const overpassUrls = [
      'https://overpass-api.de/api/interpreter',
      'https://overpass.kumi.systems/api/interpreter',
      'https://maps.mail.ru/osm/tools/overpass/api/interpreter'
    ];
    
    // Simplified query with shorter timeout and limited results
    const query = `
      [out:json][timeout:15];
      (
        way["highway"~"primary|secondary|tertiary|trunk|motorway"](around:${searchRadius},${centerLat},${centerLng});
        node["amenity"="hospital"](around:${searchRadius},${centerLat},${centerLng});
        node["amenity"="school"](around:${searchRadius},${centerLat},${centerLng});
        node["amenity"="marketplace"](around:${searchRadius},${centerLat},${centerLng});
        node["shop"="supermarket"](around:${searchRadius},${centerLat},${centerLng});
        node["public_transport"](around:1000,${centerLat},${centerLng});
      );
      out center 100;
    `;

    let overpassData: any = null;
    let lastError: Error | null = null;

    // Try each Overpass endpoint
    for (const overpassUrl of overpassUrls) {
      try {
        console.log(`Trying Overpass API: ${overpassUrl}`);
        const response = await fetchWithRetry(overpassUrl, {
          method: 'POST',
          body: 'data=' + encodeURIComponent(query),
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        }, 2);

        overpassData = await response.json();
        console.log('Received Overpass data, elements:', overpassData.elements?.length || 0);
        break; // Success, exit loop
      } catch (error) {
        lastError = error as Error;
        console.log(`Failed with ${overpassUrl}:`, (error as Error).message);
      }
    }

    // If all endpoints failed, return a partial/empty result instead of error
    if (!overpassData) {
      console.log('All Overpass endpoints failed, returning empty analysis');
      
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      );

      const emptyProximityData = {
        listing_id,
        nearest_road_name: null,
        nearest_road_distance_m: null,
        nearest_major_road_name: null,
        nearest_major_road_distance_m: null,
        nearest_hospital_name: null,
        nearest_hospital_distance_m: null,
        hospitals_within_5km: [],
        nearest_school_name: null,
        nearest_school_distance_m: null,
        schools_within_5km: [],
        nearest_marketplace_name: null,
        nearest_marketplace_distance_m: null,
        marketplaces_within_5km: [],
        public_transport_nearby: [],
        calculated_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from('proximity_analysis')
        .upsert(emptyProximityData, { 
          onConflict: 'listing_id',
          ignoreDuplicates: false 
        })
        .select()
        .single();

      if (error) throw error;

      return new Response(
        JSON.stringify({ 
          success: true, 
          analysis: data, 
          warning: 'External API unavailable, analysis incomplete' 
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      );
    }

    // Helper function to calculate distance
    const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
      const R = 6371e3;
      const φ1 = lat1 * Math.PI / 180;
      const φ2 = lat2 * Math.PI / 180;
      const Δφ = (lat2 - lat1) * Math.PI / 180;
      const Δλ = (lon2 - lon1) * Math.PI / 180;

      const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
                Math.cos(φ1) * Math.cos(φ2) *
                Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

      return R * c;
    };

    // Process results
    const roads: ProximityItem[] = [];
    const hospitals: ProximityItem[] = [];
    const schools: ProximityItem[] = [];
    const marketplaces: ProximityItem[] = [];
    const publicTransport: ProximityItem[] = [];

    (overpassData.elements || []).forEach((element: any) => {
      let lat, lon;
      
      if (element.type === 'node') {
        lat = element.lat;
        lon = element.lon;
      } else if (element.type === 'way' && element.center) {
        lat = element.center.lat;
        lon = element.center.lon;
      } else {
        return;
      }

      const distance = calculateDistance(centerLat, centerLng, lat, lon);
      const name = element.tags?.name || 'Unnamed';

      if (element.tags?.highway) {
        roads.push({ name, distance, type: element.tags.highway });
      } else if (element.tags?.amenity === 'hospital') {
        hospitals.push({ name, distance, type: element.tags.healthcare || 'hospital' });
      } else if (element.tags?.amenity === 'school') {
        schools.push({ name, distance, type: 'school' });
      } else if (element.tags?.amenity === 'marketplace' || element.tags?.shop === 'supermarket') {
        marketplaces.push({ name, distance, type: element.tags.shop || 'marketplace' });
      } else if (element.tags?.public_transport) {
        publicTransport.push({ name, distance, type: element.tags.public_transport });
      }
    });

    // Sort by distance
    roads.sort((a, b) => a.distance - b.distance);
    hospitals.sort((a, b) => a.distance - b.distance);
    schools.sort((a, b) => a.distance - b.distance);
    marketplaces.sort((a, b) => a.distance - b.distance);
    publicTransport.sort((a, b) => a.distance - b.distance);

    console.log('Processed amenities:', {
      roads: roads.length,
      hospitals: hospitals.length,
      schools: schools.length,
      marketplaces: marketplaces.length,
      publicTransport: publicTransport.length
    });

    // Store in database
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const proximityData = {
      listing_id,
      nearest_road_name: roads[0]?.name || null,
      nearest_road_distance_m: roads[0]?.distance || null,
      nearest_major_road_name: roads[0]?.name || null,
      nearest_major_road_distance_m: roads[0]?.distance || null,
      nearest_hospital_name: hospitals[0]?.name || null,
      nearest_hospital_distance_m: hospitals[0]?.distance || null,
      hospitals_within_5km: hospitals.slice(0, 10),
      nearest_school_name: schools[0]?.name || null,
      nearest_school_distance_m: schools[0]?.distance || null,
      schools_within_5km: schools.slice(0, 10),
      nearest_marketplace_name: marketplaces[0]?.name || null,
      nearest_marketplace_distance_m: marketplaces[0]?.distance || null,
      marketplaces_within_5km: marketplaces.slice(0, 10),
      public_transport_nearby: publicTransport.slice(0, 10),
      calculated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('proximity_analysis')
      .upsert(proximityData, { 
        onConflict: 'listing_id',
        ignoreDuplicates: false 
      })
      .select()
      .single();

    if (error) {
      console.error('Database error:', error);
      throw error;
    }

    console.log('Proximity analysis saved successfully');

    return new Response(
      JSON.stringify({ success: true, analysis: data }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('Error in calculate-proximity-analysis:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});
