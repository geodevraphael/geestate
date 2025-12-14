import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.81.1';
import * as turf from 'https://esm.sh/@turf/turf@7.2.0';
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface OverlapCheckRequest {
  geojson: any;
  exclude_listing_id?: string;
  listing_title?: string;
  uploader_id?: string;
}

interface OverlapResult {
  listing_id: string;
  listing_title: string;
  owner_name: string;
  owner_email: string;
  overlap_percentage: number;
  overlap_area_m2: number;
  geojson: any;
}

interface OwnerInfo {
  id: string;
  full_name: string;
  email: string;
}

// Send email using SMTP
async function sendEmail(to: string, subject: string, htmlContent: string) {
  const smtpHost = Deno.env.get("SMTP_HOST");
  const smtpPort = parseInt(Deno.env.get("SMTP_PORT") || "587");
  const smtpUser = Deno.env.get("SMTP_USER");
  const smtpPass = Deno.env.get("SMTP_PASS");
  const smtpFrom = Deno.env.get("SMTP_FROM");

  if (!smtpHost || !smtpUser || !smtpPass || !smtpFrom) {
    console.error("SMTP configuration is incomplete - email not sent");
    return false;
  }

  try {
    const client = new SMTPClient({
      connection: {
        hostname: smtpHost,
        port: smtpPort,
        tls: smtpPort === 465,
        auth: {
          username: smtpUser,
          password: smtpPass,
        },
      },
    });

    await client.send({
      from: smtpFrom,
      to: to,
      subject: subject,
      content: "Please view this email in an HTML-compatible email client.",
      html: htmlContent,
    });

    await client.close();
    console.log(`Email sent successfully to ${to}`);
    return true;
  } catch (error) {
    console.error(`Failed to send email to ${to}:`, error);
    return false;
  }
}

// Generate rejection email HTML
function generateRejectionEmail(
  uploaderName: string,
  listingTitle: string,
  overlapPercentage: number,
  existingPropertyTitle: string,
  existingPropertyOwner: string
): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #dc2626; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
        .content { background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; }
        .footer { background: #1f2937; color: #9ca3af; padding: 15px; border-radius: 0 0 8px 8px; font-size: 12px; }
        .alert { background: #fef2f2; border-left: 4px solid #dc2626; padding: 15px; margin: 15px 0; }
        .info-box { background: white; border: 1px solid #e5e7eb; padding: 15px; margin: 15px 0; border-radius: 6px; }
        .label { font-weight: bold; color: #6b7280; font-size: 12px; text-transform: uppercase; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1 style="margin:0;">⚠️ Property Listing Rejected</h1>
        </div>
        <div class="content">
          <p>Dear ${uploaderName},</p>
          
          <div class="alert">
            <strong>Your property listing has been automatically rejected due to significant boundary overlap.</strong>
          </div>
          
          <div class="info-box">
            <p class="label">Your Submitted Property</p>
            <p style="font-size: 18px; font-weight: bold; margin: 5px 0;">${listingTitle}</p>
          </div>
          
          <div class="info-box">
            <p class="label">Overlapping Property</p>
            <p style="font-size: 16px; font-weight: bold; margin: 5px 0;">${existingPropertyTitle}</p>
            <p style="margin: 5px 0; color: #6b7280;">Owner: ${existingPropertyOwner}</p>
          </div>
          
          <div class="info-box" style="background: #fef2f2;">
            <p class="label">Overlap Detected</p>
            <p style="font-size: 24px; font-weight: bold; color: #dc2626; margin: 5px 0;">${overlapPercentage.toFixed(1)}%</p>
            <p style="color: #6b7280; font-size: 14px;">Properties with more than 20% overlap are automatically rejected to prevent duplicate or fraudulent listings.</p>
          </div>
          
          <h3>What happened?</h3>
          <p>Our system detected that the property boundaries you submitted overlap significantly with an existing verified property in our database. This typically occurs when:</p>
          <ul>
            <li>The same property has already been listed</li>
            <li>Boundary coordinates were entered incorrectly</li>
            <li>Survey data is outdated or inaccurate</li>
          </ul>
          
          <h3>What can you do?</h3>
          <ol>
            <li><strong>Verify your boundaries</strong> - Check your survey plan and ensure coordinates are accurate</li>
            <li><strong>Contact support</strong> - If you believe this is an error, contact our team with your survey documents</li>
            <li><strong>Update and resubmit</strong> - Correct your property boundaries and submit a new listing</li>
          </ol>
          
          <p>If you have any questions or need assistance, please contact our support team.</p>
        </div>
        <div class="footer">
          <p>This is an automated message from GeoEstate Property Platform.</p>
          <p>© ${new Date().getFullYear()} GeoEstate. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

// Generate admin notification email
function generateAdminNotificationEmail(
  uploaderName: string,
  uploaderEmail: string,
  listingTitle: string,
  overlapPercentage: number,
  existingPropertyTitle: string,
  existingPropertyOwner: string,
  deletedListingId: string
): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #ea580c; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
        .content { background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; }
        .footer { background: #1f2937; color: #9ca3af; padding: 15px; border-radius: 0 0 8px 8px; font-size: 12px; }
        .info-box { background: white; border: 1px solid #e5e7eb; padding: 15px; margin: 15px 0; border-radius: 6px; }
        .label { font-weight: bold; color: #6b7280; font-size: 12px; text-transform: uppercase; }
        .stat { display: inline-block; background: #dc2626; color: white; padding: 5px 15px; border-radius: 20px; font-weight: bold; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1 style="margin:0;">🔔 Overlap Detection Alert</h1>
          <p style="margin: 10px 0 0 0; opacity: 0.9;">Automatic listing deletion occurred</p>
        </div>
        <div class="content">
          <p><span class="stat">${overlapPercentage.toFixed(1)}% Overlap</span></p>
          
          <div class="info-box">
            <p class="label">Deleted Listing (New Upload)</p>
            <p style="font-size: 16px; font-weight: bold; margin: 5px 0;">${listingTitle}</p>
            <p style="margin: 5px 0;">Uploader: ${uploaderName} (${uploaderEmail})</p>
            <p style="margin: 5px 0; color: #6b7280; font-size: 12px;">ID: ${deletedListingId}</p>
          </div>
          
          <div class="info-box">
            <p class="label">Existing Property (Preserved)</p>
            <p style="font-size: 16px; font-weight: bold; margin: 5px 0;">${existingPropertyTitle}</p>
            <p style="margin: 5px 0;">Owner: ${existingPropertyOwner}</p>
          </div>
          
          <h3>Action Taken</h3>
          <ul>
            <li>New listing has been <strong>permanently deleted</strong></li>
            <li>Uploader has been notified via email</li>
            <li>Audit log entry created</li>
          </ul>
          
          <p>Review this incident in the <a href="${Deno.env.get('SITE_URL') || 'https://app.geoestate.co.tz'}/admin/overlap-review">Overlap Review Dashboard</a>.</p>
        </div>
        <div class="footer">
          <p>GeoEstate Admin Notification System</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { geojson, exclude_listing_id, listing_title, uploader_id }: OverlapCheckRequest = await req.json();

    console.log('=== OVERLAP CHECK STARTED ===');
    console.log('Excluding listing:', exclude_listing_id || 'none');
    console.log('Listing title:', listing_title || 'unknown');
    console.log('Uploader ID:', uploader_id || 'unknown');

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

    // Get existing polygons with owner info
    let query = supabase
      .from('listing_polygons')
      .select(`
        id,
        listing_id,
        geojson,
        listings!inner (
          id,
          title,
          status,
          owner_id,
          profiles:owner_id (
            id,
            full_name,
            email
          )
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
    let worstOverlappingProperty: OverlapResult | null = null;

    for (const existing of existingPolygons || []) {
      try {
        if (!existing.geojson?.coordinates) continue;

        const existingPolygon = turf.polygon(existing.geojson.coordinates);
        const listingData = existing.listings as any;
        const ownerData = listingData?.profiles as OwnerInfo;
        
        // Check for EXACT duplicate first
        try {
          const isExactDuplicate = turf.booleanEqual(newPolygon, existingPolygon);
          if (isExactDuplicate) {
            console.log(`EXACT DUPLICATE detected with listing ${existing.listing_id}!`);
            const overlapResult: OverlapResult = {
              listing_id: existing.listing_id,
              listing_title: listingData?.title || 'Unknown Property',
              owner_name: ownerData?.full_name || 'Unknown',
              owner_email: ownerData?.email || '',
              overlap_percentage: 100,
              overlap_area_m2: Math.round(newArea),
              geojson: existing.geojson,
            };
            overlaps.push(overlapResult);
            hasBlockingOverlap = true;
            maxOverlap = 100;
            worstOverlappingProperty = overlapResult;
            continue;
          }
        } catch (e) {
          console.log('booleanEqual check failed, continuing with overlap check');
        }
        
        // Quick bounding box check
        const newBbox = turf.bbox(newPolygon);
        const existingBbox = turf.bbox(existingPolygon);
        
        if (newBbox[2] < existingBbox[0] || newBbox[0] > existingBbox[2] ||
            newBbox[3] < existingBbox[1] || newBbox[1] > existingBbox[3]) {
          continue;
        }

        // Check for actual intersection
        const intersection = turf.intersect(turf.featureCollection([newPolygon, existingPolygon]));
        
        if (intersection) {
          const intersectionArea = turf.area(intersection);
          const existingArea = turf.area(existingPolygon);
          const smallerArea = Math.min(newArea, existingArea);
          const overlapPercentage = (intersectionArea / smallerArea) * 100;

          console.log(`Overlap with ${existing.listing_id}: ${overlapPercentage.toFixed(2)}% (${intersectionArea.toFixed(2)} m²)`);

          if (overlapPercentage > 1) {
            const overlapResult: OverlapResult = {
              listing_id: existing.listing_id,
              listing_title: listingData?.title || 'Unknown Property',
              owner_name: ownerData?.full_name || 'Unknown',
              owner_email: ownerData?.email || '',
              overlap_percentage: Math.round(overlapPercentage * 10) / 10,
              overlap_area_m2: Math.round(intersectionArea),
              geojson: existing.geojson,
            };
            overlaps.push(overlapResult);

            if (overlapPercentage > maxOverlap) {
              maxOverlap = overlapPercentage;
              worstOverlappingProperty = overlapResult;
            }

            if (overlapPercentage > 20) {
              hasBlockingOverlap = true;
              console.log(`BLOCKING overlap detected: ${overlapPercentage.toFixed(2)}% > 20%`);
            }
          }
        }
      } catch (error) {
        console.error('Error comparing with polygon:', existing.id, error);
      }
    }

    // Sort overlaps by percentage descending
    overlaps.sort((a, b) => b.overlap_percentage - a.overlap_percentage);

    // If blocking overlap (>20%), handle auto-deletion and notifications
    if (hasBlockingOverlap && uploader_id && exclude_listing_id && worstOverlappingProperty) {
      console.log('=== AUTO-DELETE TRIGGERED ===');
      console.log(`Overlap of ${maxOverlap.toFixed(1)}% exceeds 20% threshold`);

      // Get uploader info
      const { data: uploaderProfile } = await supabase
        .from('profiles')
        .select('full_name, email')
        .eq('id', uploader_id)
        .single();

      const uploaderName = uploaderProfile?.full_name || 'User';
      const uploaderEmail = uploaderProfile?.email;

      // Delete the new listing and its polygon
      console.log('Deleting listing polygon...');
      await supabase.from('listing_polygons').delete().eq('listing_id', exclude_listing_id);
      
      console.log('Deleting listing media...');
      await supabase.from('listing_media').delete().eq('listing_id', exclude_listing_id);
      
      console.log('Deleting listing...');
      const { error: deleteError } = await supabase.from('listings').delete().eq('id', exclude_listing_id);

      if (deleteError) {
        console.error('Failed to delete listing:', deleteError);
      } else {
        console.log('Listing deleted successfully');

        // Create audit log
        await supabase.from('audit_logs').insert({
          action_type: 'AUTO_DELETE_OVERLAP',
          actor_id: uploader_id,
          action_details: {
            deleted_listing_id: exclude_listing_id,
            deleted_listing_title: listing_title || 'Unknown',
            overlap_percentage: maxOverlap,
            overlapping_listing_id: worstOverlappingProperty.listing_id,
            overlapping_listing_title: worstOverlappingProperty.listing_title,
            overlapping_owner: worstOverlappingProperty.owner_name,
            reason: 'Automatic deletion due to >20% polygon overlap'
          }
        });

        // Send email to uploader
        if (uploaderEmail) {
          const rejectionEmailHtml = generateRejectionEmail(
            uploaderName,
            listing_title || 'Your Property',
            maxOverlap,
            worstOverlappingProperty.listing_title,
            worstOverlappingProperty.owner_name
          );
          await sendEmail(uploaderEmail, '⚠️ Property Listing Rejected - Boundary Overlap Detected', rejectionEmailHtml);
        }

        // Create notification for uploader
        await supabase.from('notifications').insert({
          user_id: uploader_id,
          type: 'system',
          title: 'Listing Rejected: Boundary Overlap',
          message: `Your listing "${listing_title || 'Unknown'}" was automatically rejected due to ${maxOverlap.toFixed(1)}% overlap with "${worstOverlappingProperty.listing_title}".`,
          link_url: '/create-listing'
        });

        // Get all admins to notify
        const { data: admins } = await supabase
          .from('profiles')
          .select('id, email')
          .eq('role', 'admin');

        // Create notifications for all admins
        if (admins && admins.length > 0) {
          const adminNotifications = admins.map(admin => ({
            user_id: admin.id,
            type: 'system' as const,
            title: 'Overlap Detection: Listing Auto-Deleted',
            message: `A listing by ${uploaderName} was automatically deleted due to ${maxOverlap.toFixed(1)}% overlap with "${worstOverlappingProperty!.listing_title}".`,
            link_url: '/admin/overlap-review'
          }));

          await supabase.from('notifications').insert(adminNotifications);

          // Send email to first admin (or you could send to all)
          const adminWithEmail = admins.find(a => a.email);
          if (adminWithEmail?.email) {
            const adminEmailHtml = generateAdminNotificationEmail(
              uploaderName,
              uploaderEmail || 'N/A',
              listing_title || 'Unknown',
              maxOverlap,
              worstOverlappingProperty.listing_title,
              worstOverlappingProperty.owner_name,
              exclude_listing_id
            );
            await sendEmail(adminWithEmail.email, '🔔 GeoEstate: Overlap Detection Alert', adminEmailHtml);
          }
        }
      }
    }

    const response = {
      can_proceed: !hasBlockingOverlap,
      has_overlaps: overlaps.length > 0,
      max_overlap_percentage: Math.round(maxOverlap * 10) / 10,
      was_auto_deleted: hasBlockingOverlap && !!uploader_id && !!exclude_listing_id,
      overlapping_properties: overlaps.slice(0, 5).map(o => ({
        listing_id: o.listing_id,
        listing_title: o.listing_title,
        owner_name: o.owner_name,
        overlap_percentage: o.overlap_percentage,
        overlap_area_m2: o.overlap_area_m2,
        geojson: o.geojson,
      })),
      message: hasBlockingOverlap 
        ? `This property overlaps ${maxOverlap.toFixed(1)}% with "${worstOverlappingProperty?.listing_title || 'an existing listing'}". Properties cannot overlap more than 20%. The listing has been rejected.`
        : overlaps.length > 0
          ? `Warning: Minor overlap detected (${maxOverlap.toFixed(1)}%) with existing properties.`
          : 'No overlaps detected.',
    };

    console.log('=== OVERLAP CHECK COMPLETE ===');
    console.log('Result:', JSON.stringify(response, null, 2));

    return new Response(
      JSON.stringify(response),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in check-polygon-overlap:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage, can_proceed: false }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
