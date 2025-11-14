export type AppRole = 'buyer' | 'seller' | 'broker' | 'admin' | 'verification_officer' | 'compliance_officer';
export type ListingType = 'sale' | 'rent';
export type PropertyType = 'land' | 'house' | 'apartment' | 'commercial' | 'other';
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
