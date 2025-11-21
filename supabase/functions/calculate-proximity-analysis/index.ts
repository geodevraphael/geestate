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

    // Radius for search (in meters)
    const searchRadius = 5000; // 5km

    // Query Overpass API for nearby amenities
    const overpassUrl = 'https://overpass-api.de/api/interpreter';
    
    // Build Overpass QL query for all amenities
    const query = `
      [out:json][timeout:25];
      (
        // Roads
        way["highway"](around:${searchRadius},${centerLat},${centerLng});
        // Hospitals
        node["amenity"="hospital"](around:${searchRadius},${centerLat},${centerLng});
        way["amenity"="hospital"](around:${searchRadius},${centerLat},${centerLng});
        // Schools
        node["amenity"="school"](around:${searchRadius},${centerLat},${centerLng});
        way["amenity"="school"](around:${searchRadius},${centerLat},${centerLng});
        node["amenity"="university"](around:${searchRadius},${centerLat},${centerLng});
        way["amenity"="university"](around:${searchRadius},${centerLat},${centerLng});
        // Marketplaces
        node["amenity"="marketplace"](around:${searchRadius},${centerLat},${centerLng});
        way["amenity"="marketplace"](around:${searchRadius},${centerLat},${centerLng});
        node["shop"="supermarket"](around:${searchRadius},${centerLat},${centerLng});
        way["shop"="supermarket"](around:${searchRadius},${centerLat},${centerLng});
        // Public transport
        node["public_transport"](around:1000,${centerLat},${centerLng});
      );
      out body;
      >;
      out skel qt;
    `;

    console.log('Querying Overpass API...');
    const overpassResponse = await fetch(overpassUrl, {
      method: 'POST',
      body: 'data=' + encodeURIComponent(query),
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });

    if (!overpassResponse.ok) {
      throw new Error(`Overpass API error: ${overpassResponse.statusText}`);
    }

    const overpassData = await overpassResponse.json();
    console.log('Received Overpass data, elements:', overpassData.elements?.length || 0);

    // Helper function to calculate distance
    const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
      const R = 6371e3; // Earth's radius in meters
      const φ1 = lat1 * Math.PI / 180;
      const φ2 = lat2 * Math.PI / 180;
      const Δφ = (lat2 - lat1) * Math.PI / 180;
      const Δλ = (lon2 - lon1) * Math.PI / 180;

      const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
                Math.cos(φ1) * Math.cos(φ2) *
                Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

      return R * c; // Distance in meters
    };

    // Process results
    const roads: ProximityItem[] = [];
    const hospitals: ProximityItem[] = [];
    const schools: ProximityItem[] = [];
    const marketplaces: ProximityItem[] = [];
    const publicTransport: ProximityItem[] = [];

    overpassData.elements.forEach((element: any) => {
      let lat, lon;
      
      if (element.type === 'node') {
        lat = element.lat;
        lon = element.lon;
      } else if (element.type === 'way' && element.center) {
        lat = element.center.lat;
        lon = element.center.lon;
      } else {
        return; // Skip if no coordinates
      }

      const distance = calculateDistance(centerLat, centerLng, lat, lon);
      const name = element.tags?.name || 'Unnamed';

      if (element.tags?.highway) {
        const roadType = element.tags.highway;
        roads.push({ name, distance, type: roadType });
      } else if (element.tags?.amenity === 'hospital') {
        hospitals.push({ name, distance, type: element.tags.healthcare || 'hospital' });
      } else if (element.tags?.amenity === 'school') {
        schools.push({ name, distance, type: 'school' });
      } else if (element.tags?.amenity === 'university') {
        schools.push({ name, distance, type: 'university' });
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

    // Find nearest major road (primary, secondary, tertiary)
    const majorRoads = roads.filter(r => 
      ['primary', 'secondary', 'tertiary', 'trunk', 'motorway'].includes(r.type || '')
    );

    // Store in database
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const proximityData = {
      listing_id,
      nearest_road_name: roads[0]?.name || null,
      nearest_road_distance_m: roads[0]?.distance || null,
      nearest_major_road_name: majorRoads[0]?.name || null,
      nearest_major_road_distance_m: majorRoads[0]?.distance || null,
      nearest_hospital_name: hospitals[0]?.name || null,
      nearest_hospital_distance_m: hospitals[0]?.distance || null,
      hospitals_within_5km: hospitals.slice(0, 10), // Top 10
      nearest_school_name: schools[0]?.name || null,
      nearest_school_distance_m: schools[0]?.distance || null,
      schools_within_5km: schools.slice(0, 10), // Top 10
      nearest_marketplace_name: marketplaces[0]?.name || null,
      nearest_marketplace_distance_m: marketplaces[0]?.distance || null,
      marketplaces_within_5km: marketplaces.slice(0, 10), // Top 10
      public_transport_nearby: publicTransport.slice(0, 10), // Top 10 within 1km
      calculated_at: new Date().toISOString(),
    };

    // Upsert (insert or update)
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