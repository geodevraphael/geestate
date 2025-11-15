// GeoInsight Income Model Types

export type FeeType = 'percentage' | 'fixed';
export type IncomeStatus = 'pending' | 'awaiting_review' | 'paid' | 'overdue' | 'cancelled';
export type PaymentProofStatus = 'submitted' | 'under_review' | 'accepted' | 'rejected';
export type InvoiceStatus = 'draft' | 'issued' | 'sent' | 'paid' | 'cancelled';
export type PaymentChannel = 'mpesa' | 'tigo_pesa' | 'airtel_money' | 'nmb' | 'crdb' | 'cash' | 'other';

export interface FeeDefinition {
  id: string;
  code: string;
  name: string;
  description?: string;
  fee_type: FeeType;
  percentage_rate?: number;
  fixed_amount?: number;
  currency: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface IncomeRecord {
  id: string;
  user_id: string;
  related_listing_id?: string;
  related_subscription_id?: string;
  fee_definition_id: string;
  description: string;
  amount_due: number;
  currency: string;
  status: IncomeStatus;
  due_date?: string;
  paid_at?: string;
  admin_verified_by?: string;
  admin_notes?: string;
  created_at: string;
  updated_at: string;
}

export interface PaymentProof {
  id: string;
  income_record_id: string;
  payer_id: string;
  proof_file_url?: string;
  proof_text?: string;
  payment_channel?: string;
  transaction_reference?: string;
  amount_paid?: number;
  submitted_at: string;
  status: PaymentProofStatus;
  admin_reviewed_by?: string;
  admin_review_notes?: string;
  created_at: string;
  updated_at: string;
}

export interface Invoice {
  id: string;
  income_record_id: string;
  invoice_number: string;
  pdf_url?: string;
  status: InvoiceStatus;
  issued_at?: string;
  sent_at?: string;
  created_at: string;
  updated_at: string;
}

export interface IncomeRecordWithDetails extends IncomeRecord {
  fee_definition?: FeeDefinition;
  payment_proofs?: PaymentProof[];
  invoice?: Invoice;
  payer?: {
    id: string;
    full_name: string;
    email: string;
    role?: string;
  };
  listing?: {
    id: string;
    title: string;
  };
}
