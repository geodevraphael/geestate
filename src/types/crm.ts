export type LeadSource = 'message' | 'visit_request' | 'direct_contact' | 'import';

export type LeadStatus = 
  | 'new' 
  | 'contacted' 
  | 'interested' 
  | 'not_interested' 
  | 'under_offer' 
  | 'closed' 
  | 'lost';

export type CrmTaskStatus = 'pending' | 'done' | 'overdue';

export interface Lead {
  id: string;
  listing_id: string;
  seller_id: string;
  buyer_id: string | null;
  source: LeadSource;
  status: LeadStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
  // Joined data
  listing?: {
    id: string;
    title: string;
    location_label: string;
    price: number;
  };
  buyer?: {
    id: string;
    full_name: string;
    email: string;
    phone: string | null;
  };
}

export interface CrmTask {
  id: string;
  seller_id: string;
  lead_id: string | null;
  title: string;
  description: string | null;
  due_date: string | null;
  status: CrmTaskStatus;
  created_at: string;
  updated_at: string;
  // Joined data
  lead?: Lead;
}
