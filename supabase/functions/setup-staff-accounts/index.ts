import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.81.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface StaffAccount {
  email: string;
  password: string;
  full_name: string;
  role: string;
  phone?: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    
    // Verify the caller is authenticated and is an admin
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: 'Authorization required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      );
    }

    // Create client with caller's token to verify their identity
    const userSupabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });
    
    const { data: { user }, error: authError } = await userSupabase.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid authentication' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      );
    }

    // Check if user has admin role
    const { data: adminRole } = await userSupabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .single();
    
    if (!adminRole) {
      console.log(`Unauthorized access attempt by user ${user.id}`);
      return new Response(
        JSON.stringify({ success: false, error: 'Admin access required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 }
      );
    }

    console.log(`Admin ${user.id} initiating staff account creation...`);
    
    // Use service role client for admin operations
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('Starting GeoInsight staff account creation...');

    const staffAccounts: StaffAccount[] = [
      // Admin Team
      {
        email: 'john.mwamba@geoestate.tz',
        password: 'TEST123',
        full_name: 'John Mwamba',
        role: 'admin',
        phone: '+255712345001',
      },
      {
        email: 'sarah.kimaro@geoestate.tz',
        password: 'TEST123',
        full_name: 'Sarah Kimaro',
        role: 'admin',
        phone: '+255712345002',
      },

      // Verification Team
      {
        email: 'michael.ngowi@geoestate.tz',
        password: 'TEST123',
        full_name: 'Michael Ngowi',
        role: 'verification_officer',
        phone: '+255712345003',
      },
      {
        email: 'grace.mollel@geoestate.tz',
        password: 'TEST123',
        full_name: 'Grace Mollel',
        role: 'verification_officer',
        phone: '+255712345004',
      },
      {
        email: 'joseph.moshi@geoestate.tz',
        password: 'TEST123',
        full_name: 'Joseph Moshi',
        role: 'verification_officer',
        phone: '+255712345005',
      },

      // Compliance Team
      {
        email: 'amina.hassan@geoestate.tz',
        password: 'TEST123',
        full_name: 'Amina Hassan',
        role: 'compliance_officer',
        phone: '+255712345006',
      },
      {
        email: 'david.nyerere@geoestate.tz',
        password: 'TEST123',
        full_name: 'David Nyerere',
        role: 'compliance_officer',
        phone: '+255712345007',
      },

      // Spatial Analyst Team
      {
        email: 'peter.makori@geoestate.tz',
        password: 'TEST123',
        full_name: 'Peter Makori',
        role: 'spatial_analyst',
        phone: '+255712345008',
      },
      {
        email: 'fatuma.juma@geoestate.tz',
        password: 'TEST123',
        full_name: 'Fatuma Juma',
        role: 'spatial_analyst',
        phone: '+255712345009',
      },

      // Customer Success Team
      {
        email: 'rose.mwakasege@geoestate.tz',
        password: 'TEST123',
        full_name: 'Rose Mwakasege',
        role: 'customer_success',
        phone: '+255712345010',
      },
      {
        email: 'ibrahim.said@geoestate.tz',
        password: 'TEST123',
        full_name: 'Ibrahim Said',
        role: 'customer_success',
        phone: '+255712345011',
      },

      // General Staff
      {
        email: 'lucy.mtui@geoestate.tz',
        password: 'TEST123',
        full_name: 'Lucy Mtui',
        role: 'staff',
        phone: '+255712345012',
      },
      {
        email: 'james.kapinga@geoestate.tz',
        password: 'TEST123',
        full_name: 'James Kapinga',
        role: 'staff',
        phone: '+255712345013',
      },
    ];

    const results = {
      success: [] as string[],
      failed: [] as { email: string; error: string }[],
      existing: [] as string[],
    };

    for (const account of staffAccounts) {
      try {
        console.log(`Creating account for ${account.full_name} (${account.email})...`);

        // Check if user already exists
        const { data: existingUser } = await supabase.auth.admin.listUsers();
        const userExists = existingUser?.users?.some(u => u.email === account.email);

        if (userExists) {
          console.log(`User ${account.email} already exists, skipping...`);
          results.existing.push(account.email);
          continue;
        }

        // Create auth user
        const { data: authData, error: authError } = await supabase.auth.admin.createUser({
          email: account.email,
          password: account.password,
          email_confirm: true, // Auto-confirm email for staff accounts
          user_metadata: {
            full_name: account.full_name,
          },
        });

        if (authError) {
          throw authError;
        }

        if (!authData.user) {
          throw new Error('User creation failed - no user data returned');
        }

        console.log(`Auth user created: ${authData.user.id}`);

        // Update profile with role and additional data
        const { error: profileError } = await supabase
          .from('profiles')
          .update({
            full_name: account.full_name,
            role: account.role,
            phone: account.phone,
          })
          .eq('id', authData.user.id);

        if (profileError) {
          console.error(`Profile update error for ${account.email}:`, profileError);
          throw profileError;
        }

        console.log(`✓ Successfully created ${account.full_name} as ${account.role}`);
        results.success.push(account.email);

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error(`Failed to create ${account.email}:`, errorMessage);
        results.failed.push({
          email: account.email,
          error: errorMessage,
        });
      }
    }

    console.log('Staff account creation completed');
    console.log(`Success: ${results.success.length}`);
    console.log(`Failed: ${results.failed.length}`);
    console.log(`Already existed: ${results.existing.length}`);

    return new Response(
      JSON.stringify({
        success: true,
        summary: {
          created: results.success.length,
          failed: results.failed.length,
          existing: results.existing.length,
          total: staffAccounts.length,
        },
        details: results,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Error in setup-staff-accounts:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});