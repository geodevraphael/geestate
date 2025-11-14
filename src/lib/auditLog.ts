import { supabase } from '@/integrations/supabase/client';

/**
 * Log an action to the audit trail
 * This utility ensures all critical actions are tracked for security and compliance
 */
export async function logAuditAction(
  action_type: string,
  actor_id?: string,
  listing_id?: string,
  action_details?: any,
  ip_address?: string,
  user_agent?: string
) {
  try {
    // Get user agent from browser if not provided
    const ua = user_agent || navigator.userAgent;

    const { error } = await supabase.from('audit_logs').insert({
      actor_id: actor_id || (await supabase.auth.getUser()).data.user?.id,
      listing_id,
      action_type,
      action_details: action_details ? JSON.stringify(action_details) : null,
      ip_address,
      user_agent: ua,
    });

    if (error) {
      console.error('Failed to log audit action:', error);
      // Don't throw - audit logging failure shouldn't break user operations
    } else {
      console.log(`Audit log created: ${action_type}`);
    }
  } catch (error) {
    console.error('Exception in logAuditAction:', error);
  }
}

// Common audit action types for consistency
export const AUDIT_ACTIONS = {
  // Listing actions
  CREATE_LISTING: 'CREATE_LISTING',
  UPDATE_LISTING: 'UPDATE_LISTING',
  DELETE_LISTING: 'DELETE_LISTING',
  PUBLISH_LISTING: 'PUBLISH_LISTING',
  ARCHIVE_LISTING: 'ARCHIVE_LISTING',
  
  // Polygon actions
  UPLOAD_POLYGON: 'UPLOAD_POLYGON',
  UPDATE_POLYGON: 'UPDATE_POLYGON',
  
  // Verification actions
  VERIFY_LISTING: 'VERIFY_LISTING',
  REJECT_LISTING: 'REJECT_LISTING',
  
  // Payment actions
  SUBMIT_PAYMENT_PROOF: 'SUBMIT_PAYMENT_PROOF',
  CONFIRM_PAYMENT: 'CONFIRM_PAYMENT',
  REJECT_PAYMENT: 'REJECT_PAYMENT',
  
  // Deal closure actions
  CLOSE_DEAL: 'CLOSE_DEAL',
  CANCEL_DEAL: 'CANCEL_DEAL',
  DISPUTE_DEAL: 'DISPUTE_DEAL',
  
  // User actions
  CHANGE_ROLE: 'CHANGE_ROLE',
  UPDATE_PROFILE: 'UPDATE_PROFILE',
  
  // Subscription actions
  CREATE_SUBSCRIPTION: 'CREATE_SUBSCRIPTION',
  UPDATE_SUBSCRIPTION: 'UPDATE_SUBSCRIPTION',
  CANCEL_SUBSCRIPTION: 'CANCEL_SUBSCRIPTION',
  
  // Institutional actions
  APPLY_INSTITUTIONAL_SELLER: 'APPLY_INSTITUTIONAL_SELLER',
  APPROVE_INSTITUTIONAL_SELLER: 'APPROVE_INSTITUTIONAL_SELLER',
  REJECT_INSTITUTIONAL_SELLER: 'REJECT_INSTITUTIONAL_SELLER',
  
  // Visit actions
  REQUEST_VISIT: 'REQUEST_VISIT',
  ACCEPT_VISIT: 'ACCEPT_VISIT',
  REJECT_VISIT: 'REJECT_VISIT',
  COMPLETE_VISIT: 'COMPLETE_VISIT',
  CANCEL_VISIT: 'CANCEL_VISIT',
  
  // Compliance actions
  CREATE_COMPLIANCE_FLAG: 'CREATE_COMPLIANCE_FLAG',
  RESOLVE_COMPLIANCE_FLAG: 'RESOLVE_COMPLIANCE_FLAG',
  CREATE_FRAUD_SIGNAL: 'CREATE_FRAUD_SIGNAL',
} as const;
