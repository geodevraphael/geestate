export type AppRole = 'buyer' | 'seller' | 'broker' | 'admin' | 'verification_officer' | 'compliance_officer';
export type ListingType = 'sale' | 'rent';
export type PropertyType = 'land' | 'house' | 'apartment' | 'commercial' | 'other';

export type PaymentProofStatus = 
  | 'pending_seller_confirmation'
  | 'pending_admin_review'
  | 'approved'
  | 'rejected';

export type DealClosureStatus =
  | 'pending_admin_validation'
  | 'closed'
  | 'disputed'
  | 'cancelled';

export type ComplianceFlagType =
  | 'payment_mismatch'
  | 'duplicate_polygon'
  | 'suspicious_listing'
  | 'buyer_seller_conflict'
  | 'other';

export type MessageType = 'text' | 'system';

export type NotificationType = 
  | 'new_message'
  | 'payment_proof_submitted'
  | 'payment_confirmed'
  | 'deal_approved'
  | 'deal_rejected'
  | 'compliance_flag'
  | 'subscription_expiring'
  | 'listing_verified';

export interface PaymentProof {
  id: string;
  listing_id: string;
  buyer_id: string;
  seller_id: string;
  amount_paid: number;
  payment_method: string;
  transaction_reference?: string;
  proof_file_url: string;
  proof_type: string;
  buyer_notes?: string;
  status: PaymentProofStatus;
  seller_notes?: string;
  admin_notes?: string;
  submitted_at: string;
  seller_confirmed_at?: string;
  admin_reviewed_at?: string;
  created_at: string;
  updated_at: string;
}

export interface DealClosure {
  id: string;
  listing_id: string;
  buyer_id: string;
  seller_id: string;
  payment_proof_id: string;
  final_price: number;
  closure_status: DealClosureStatus;
  admin_notes?: string;
  created_at: string;
  updated_at: string;
  closed_at?: string;
}

export interface ComplianceFlag {
  id: string;
  listing_id: string;
  payment_proof_id?: string;
  triggered_by: string;
  type: ComplianceFlagType;
  severity: number;
  notes: string;
  resolved: boolean;
  resolved_by?: string;
  resolved_at?: string;
  resolution_notes?: string;
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: string;
  listing_id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  timestamp: string;
  is_read: boolean;
  created_at: string;
  message_type: MessageType;
}

export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  message: string;
  link_url?: string;
  is_read: boolean;
  created_at: string;
}
export type VerificationStatus = 'unverified' | 'pending' | 'verified' | 'rejected';
export type ListingStatus = 'draft' | 'published' | 'archived' | 'closed';
export type MediaType = 'image' | 'document';

export interface Profile {
  id: string;
  full_name: string;
  phone: string | null;
  email: string;
  role: AppRole | null;
  national_id_number: string | null;
  organization_name: string | null;
  created_at: string;
  updated_at: string;
}

export interface Listing {
  id: string;
  owner_id: string;
  title: string;
  description: string | null;
  listing_type: ListingType;
  property_type: PropertyType;
  price: number | null;
  currency: string;
  location_label: string;
  region: string | null;
  district: string | null;
  ward: string | null;
  is_polygon_verified: boolean;
  verification_status: VerificationStatus;
  verification_notes: string | null;
  status: ListingStatus;
  created_at: string;
  updated_at: string;
}

export interface ListingPolygon {
  id: string;
  listing_id: string;
  geojson: any; // GeoJSON object
  area_m2: number | null;
  centroid_lat: number | null;
  centroid_lng: number | null;
  created_at: string;
  updated_at: string;
}

export interface ListingMedia {
  id: string;
  listing_id: string;
  file_url: string;
  media_type: MediaType;
  caption: string | null;
  created_at: string;
}

export interface ListingWithDetails extends Listing {
  polygon?: ListingPolygon;
  media?: ListingMedia[];
  owner?: Partial<Profile>;
}
