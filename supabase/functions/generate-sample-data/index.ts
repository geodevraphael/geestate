import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data: { user } } = await supabaseClient.auth.getUser(token);

    if (!user) {
      throw new Error('Unauthorized');
    }

    // Check if user is admin
    const { data: roles } = await supabaseClient
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id);

    const isAdmin = roles?.some(r => r.role === 'admin');
    if (!isAdmin) {
      throw new Error('Only admins can generate sample data');
    }

    // Sample listings data
    const sampleListings = [
      {
        id: '10000000-0000-0000-0000-000000000001',
        owner_id: user.id,
        title: 'Prime Residential Plot in Mikocheni',
        title_sw: 'Kiwanja cha Makazi Mikocheni',
        description: 'Beautiful 1200 sqm plot in Mikocheni, Dar es Salaam. Perfect for building a family home. Clear title deed, all utilities available.',
        description_sw: 'Kiwanja kizuri cha mita za mraba 1200 huko Mikocheni, Dar es Salaam. Pazuri kwa kujenga nyumba ya familia. Hati halisi, huduma zote zinapatikana.',
        property_type: 'residential',
        listing_type: 'sale',
        status: 'published',
        verification_status: 'verified',
        price: 450000000,
        currency: 'TZS',
        location_label: 'Mikocheni, Kinondoni',
        region: 'Dar es Salaam',
        district: 'Kinondoni',
        ward: 'Mikocheni'
      },
      {
        id: '10000000-0000-0000-0000-000000000002',
        owner_id: user.id,
        title: 'Commercial Plot Near Arusha City Center',
        title_sw: 'Kiwanja cha Biashara Karibu na Mji wa Arusha',
        description: '800 sqm commercial plot located 2km from Arusha city center. Excellent for retail or office development. Main road access.',
        description_sw: 'Kiwanja cha biashara cha mita za mraba 800 kilometa 2 kutoka katikati ya mji wa Arusha. Pazuri kwa maduka au ofisi. Barabara kuu.',
        property_type: 'commercial',
        listing_type: 'sale',
        status: 'published',
        verification_status: 'verified',
        price: 320000000,
        currency: 'TZS',
        location_label: 'Arusha City',
        region: 'Arusha',
        district: 'Arusha City',
        ward: 'Kaloleni'
      },
      {
        id: '10000000-0000-0000-0000-000000000003',
        owner_id: user.id,
        title: 'Agricultural Land with Lake View',
        title_sw: 'Ardhi ya Kilimo na Mtazamo wa Ziwa',
        description: '5 acre agricultural plot near Lake Victoria. Fertile soil, suitable for farming and livestock. Access to water.',
        description_sw: 'Ekari 5 za ardhi ya kilimo karibu na Ziwa Victoria. Udongo wenye rutuba, unafaa kwa kilimo na mifugo. Upatikanaji wa maji.',
        property_type: 'agricultural',
        listing_type: 'sale',
        status: 'published',
        verification_status: 'pending',
        price: 180000000,
        currency: 'TZS',
        location_label: 'Mwanza Rural',
        region: 'Mwanza',
        district: 'Ilemela',
        ward: 'Nyakato'
      },
      {
        id: '10000000-0000-0000-0000-000000000004',
        owner_id: user.id,
        title: 'Mixed-Use Development Plot in Dodoma',
        title_sw: 'Kiwanja cha Maendeleo ya Matumizi Mbalimbali Dodoma',
        description: '1500 sqm plot suitable for mixed-use development. Central location, near government offices. Ideal for apartments and shops.',
        description_sw: 'Kiwanja cha mita za mraba 1500 kinachofaa kwa maendeleo ya matumizi mbalimbali. Mahali pa katikati, karibu na ofisi za serikali.',
        property_type: 'mixed_use',
        listing_type: 'sale',
        status: 'published',
        verification_status: 'verified',
        price: 550000000,
        currency: 'TZS',
        location_label: 'Dodoma City',
        region: 'Dodoma',
        district: 'Dodoma Urban',
        ward: 'Kikuyu'
      },
      {
        id: '10000000-0000-0000-0000-000000000005',
        owner_id: user.id,
        title: 'Beachfront Plot in Nungwi, Zanzibar',
        title_sw: 'Kiwanja cha Pwani Nungwi, Zanzibar',
        description: '600 sqm beachfront plot in Nungwi. Perfect for hotel or villa development. Stunning ocean views, white sand beach access.',
        description_sw: 'Kiwanja cha mita za mraba 600 pwani ya Nungwi. Pazuri kwa hoteli au nyumba za kifahari. Mandhari ya bahari, ufikiaji wa uchanga mweupe.',
        property_type: 'commercial',
        listing_type: 'sale',
        status: 'published',
        verification_status: 'verified',
        price: 850000000,
        currency: 'TZS',
        location_label: 'Nungwi, North Unguja',
        region: 'Zanzibar',
        district: 'Kaskazini A',
        ward: 'Nungwi'
      }
    ];

    // Insert listings
    for (const listing of sampleListings) {
      await supabaseClient.from('listings').upsert(listing, { onConflict: 'id' });
    }

    // Sample polygon data
    const samplePolygons = [
      {
        id: '20000000-0000-0000-0000-000000000001',
        listing_id: '10000000-0000-0000-0000-000000000001',
        geojson: {
          type: "Polygon",
          coordinates: [[
            [39.2681, -6.7654],
            [39.2691, -6.7654],
            [39.2691, -6.7664],
            [39.2681, -6.7664],
            [39.2681, -6.7654]
          ]]
        },
        area_m2: 1200,
        centroid_lat: -6.7659,
        centroid_lng: 39.2686
      },
      {
        id: '20000000-0000-0000-0000-000000000002',
        listing_id: '10000000-0000-0000-0000-000000000002',
        geojson: {
          type: "Polygon",
          coordinates: [[
            [36.6820, -3.3674],
            [36.6830, -3.3674],
            [36.6830, -3.3684],
            [36.6820, -3.3684],
            [36.6820, -3.3674]
          ]]
        },
        area_m2: 800,
        centroid_lat: -3.3679,
        centroid_lng: 36.6825
      },
      {
        id: '20000000-0000-0000-0000-000000000003',
        listing_id: '10000000-0000-0000-0000-000000000003',
        geojson: {
          type: "Polygon",
          coordinates: [[
            [32.9000, -2.5150],
            [32.9070, -2.5150],
            [32.9070, -2.5200],
            [32.9000, -2.5200],
            [32.9000, -2.5150]
          ]]
        },
        area_m2: 20234,
        centroid_lat: -2.5175,
        centroid_lng: 32.9035
      },
      {
        id: '20000000-0000-0000-0000-000000000004',
        listing_id: '10000000-0000-0000-0000-000000000004',
        geojson: {
          type: "Polygon",
          coordinates: [[
            [35.7520, -6.1720],
            [35.7535, -6.1720],
            [35.7535, -6.1735],
            [35.7520, -6.1735],
            [35.7520, -6.1720]
          ]]
        },
        area_m2: 1500,
        centroid_lat: -6.1728,
        centroid_lng: 35.7528
      },
      {
        id: '20000000-0000-0000-0000-000000000005',
        listing_id: '10000000-0000-0000-0000-000000000005',
        geojson: {
          type: "Polygon",
          coordinates: [[
            [39.2900, -5.7250],
            [39.2912, -5.7250],
            [39.2912, -5.7260],
            [39.2900, -5.7260],
            [39.2900, -5.7250]
          ]]
        },
        area_m2: 600,
        centroid_lat: -5.7255,
        centroid_lng: 39.2906
      }
    ];

    // Insert polygons
    for (const polygon of samplePolygons) {
      await supabaseClient.from('listing_polygons').upsert(polygon, { onConflict: 'id' });
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: '5 sample listings created successfully',
        listings_created: sampleListings.length
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    );
  }
});
