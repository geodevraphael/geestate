export type WebhookEventType =
  | 'listing_created'
  | 'listing_closed'
  | 'payment_proof_submitted'
  | 'deal_closed'
  | 'dispute_opened'
  | 'visit_requested';

export interface WebhookSubscription {
  id: string;
  owner_id: string;
  target_url: string;
  secret_token: string;
  event_type: WebhookEventType;
  is_active: boolean;
  last_delivery_at: string | null;
  last_delivery_status: string | null;
  created_at: string;
  updated_at: string;
}

export interface WebhookDelivery {
  id: string;
  subscription_id: string;
  event_type: WebhookEventType;
  payload: any;
  response_status: number | null;
  response_body: string | null;
  error_message: string | null;
  created_at: string;
}
