export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      audit_logs: {
        Row: {
          action_details: Json | null
          action_type: string
          actor_id: string | null
          created_at: string
          id: string
          ip_address: string | null
          listing_id: string | null
          user_agent: string | null
        }
        Insert: {
          action_details?: Json | null
          action_type: string
          actor_id?: string | null
          created_at?: string
          id?: string
          ip_address?: string | null
          listing_id?: string | null
          user_agent?: string | null
        }
        Update: {
          action_details?: Json | null
          action_type?: string
          actor_id?: string | null
          created_at?: string
          id?: string
          ip_address?: string | null
          listing_id?: string | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_logs_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
      compliance_flags: {
        Row: {
          created_at: string
          id: string
          listing_id: string
          notes: string
          payment_proof_id: string | null
          resolution_notes: string | null
          resolved: boolean
          resolved_at: string | null
          resolved_by: string | null
          severity: number
          triggered_by: string
          type: Database["public"]["Enums"]["compliance_flag_type"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          listing_id: string
          notes: string
          payment_proof_id?: string | null
          resolution_notes?: string | null
          resolved?: boolean
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: number
          triggered_by: string
          type: Database["public"]["Enums"]["compliance_flag_type"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          listing_id?: string
          notes?: string
          payment_proof_id?: string | null
          resolution_notes?: string | null
          resolved?: boolean
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: number
          triggered_by?: string
          type?: Database["public"]["Enums"]["compliance_flag_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "compliance_flags_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "compliance_flags_payment_proof_id_fkey"
            columns: ["payment_proof_id"]
            isOneToOne: false
            referencedRelation: "payment_proofs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "compliance_flags_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "compliance_flags_triggered_by_fkey"
            columns: ["triggered_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_tasks: {
        Row: {
          created_at: string
          description: string | null
          due_date: string | null
          id: string
          lead_id: string | null
          seller_id: string
          status: Database["public"]["Enums"]["crm_task_status"]
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          lead_id?: string | null
          seller_id: string
          status?: Database["public"]["Enums"]["crm_task_status"]
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          lead_id?: string | null
          seller_id?: string
          status?: Database["public"]["Enums"]["crm_task_status"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_tasks_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_tasks_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      deal_closures: {
        Row: {
          admin_notes: string | null
          buyer_id: string
          closed_at: string | null
          closure_status: Database["public"]["Enums"]["deal_closure_status"]
          created_at: string
          final_price: number
          id: string
          listing_id: string
          payment_proof_id: string
          seller_id: string
          updated_at: string
        }
        Insert: {
          admin_notes?: string | null
          buyer_id: string
          closed_at?: string | null
          closure_status?: Database["public"]["Enums"]["deal_closure_status"]
          created_at?: string
          final_price: number
          id?: string
          listing_id: string
          payment_proof_id: string
          seller_id: string
          updated_at?: string
        }
        Update: {
          admin_notes?: string | null
          buyer_id?: string
          closed_at?: string | null
          closure_status?: Database["public"]["Enums"]["deal_closure_status"]
          created_at?: string
          final_price?: number
          id?: string
          listing_id?: string
          payment_proof_id?: string
          seller_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "deal_closures_buyer_id_fkey"
            columns: ["buyer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deal_closures_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deal_closures_payment_proof_id_fkey"
            columns: ["payment_proof_id"]
            isOneToOne: false
            referencedRelation: "payment_proofs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deal_closures_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      disputes: {
        Row: {
          admin_notes: string | null
          buyer_id: string | null
          created_at: string
          description: string
          dispute_type: Database["public"]["Enums"]["dispute_type"]
          id: string
          listing_id: string
          opened_by: string
          resolution_notes: string | null
          resolved_at: string | null
          resolved_by: string | null
          seller_id: string | null
          status: Database["public"]["Enums"]["dispute_status"]
          updated_at: string
        }
        Insert: {
          admin_notes?: string | null
          buyer_id?: string | null
          created_at?: string
          description: string
          dispute_type: Database["public"]["Enums"]["dispute_type"]
          id?: string
          listing_id: string
          opened_by: string
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          seller_id?: string | null
          status?: Database["public"]["Enums"]["dispute_status"]
          updated_at?: string
        }
        Update: {
          admin_notes?: string | null
          buyer_id?: string | null
          created_at?: string
          description?: string
          dispute_type?: Database["public"]["Enums"]["dispute_type"]
          id?: string
          listing_id?: string
          opened_by?: string
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          seller_id?: string | null
          status?: Database["public"]["Enums"]["dispute_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "disputes_buyer_id_fkey"
            columns: ["buyer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "disputes_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "disputes_opened_by_fkey"
            columns: ["opened_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "disputes_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "disputes_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      districts: {
        Row: {
          code: string | null
          created_at: string
          geometry: Json | null
          id: string
          name: string
          region_id: string
        }
        Insert: {
          code?: string | null
          created_at?: string
          geometry?: Json | null
          id?: string
          name: string
          region_id: string
        }
        Update: {
          code?: string | null
          created_at?: string
          geometry?: Json | null
          id?: string
          name?: string
          region_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "districts_region_id_fkey"
            columns: ["region_id"]
            isOneToOne: false
            referencedRelation: "regions"
            referencedColumns: ["id"]
          },
        ]
      }
      fraud_signals: {
        Row: {
          created_at: string
          details: string | null
          id: string
          listing_id: string | null
          signal_score: number
          signal_type: Database["public"]["Enums"]["fraud_signal_type"]
          user_id: string
        }
        Insert: {
          created_at?: string
          details?: string | null
          id?: string
          listing_id?: string | null
          signal_score: number
          signal_type: Database["public"]["Enums"]["fraud_signal_type"]
          user_id: string
        }
        Update: {
          created_at?: string
          details?: string | null
          id?: string
          listing_id?: string | null
          signal_score?: number
          signal_type?: Database["public"]["Enums"]["fraud_signal_type"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fraud_signals_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fraud_signals_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      geoinsight_fee_definitions: {
        Row: {
          code: string
          created_at: string | null
          currency: string | null
          description: string | null
          fee_type: string
          fixed_amount: number | null
          id: string
          is_active: boolean | null
          name: string
          percentage_rate: number | null
          updated_at: string | null
        }
        Insert: {
          code: string
          created_at?: string | null
          currency?: string | null
          description?: string | null
          fee_type: string
          fixed_amount?: number | null
          id?: string
          is_active?: boolean | null
          name: string
          percentage_rate?: number | null
          updated_at?: string | null
        }
        Update: {
          code?: string
          created_at?: string | null
          currency?: string | null
          description?: string | null
          fee_type?: string
          fixed_amount?: number | null
          id?: string
          is_active?: boolean | null
          name?: string
          percentage_rate?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      geoinsight_income_records: {
        Row: {
          admin_notes: string | null
          admin_verified_by: string | null
          amount_due: number
          created_at: string | null
          currency: string | null
          description: string
          due_date: string | null
          fee_definition_id: string
          id: string
          paid_at: string | null
          related_listing_id: string | null
          related_subscription_id: string | null
          status: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          admin_notes?: string | null
          admin_verified_by?: string | null
          amount_due: number
          created_at?: string | null
          currency?: string | null
          description: string
          due_date?: string | null
          fee_definition_id: string
          id?: string
          paid_at?: string | null
          related_listing_id?: string | null
          related_subscription_id?: string | null
          status?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          admin_notes?: string | null
          admin_verified_by?: string | null
          amount_due?: number
          created_at?: string | null
          currency?: string | null
          description?: string
          due_date?: string | null
          fee_definition_id?: string
          id?: string
          paid_at?: string | null
          related_listing_id?: string | null
          related_subscription_id?: string | null
          status?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "geoinsight_income_records_admin_verified_by_fkey"
            columns: ["admin_verified_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "geoinsight_income_records_fee_definition_id_fkey"
            columns: ["fee_definition_id"]
            isOneToOne: false
            referencedRelation: "geoinsight_fee_definitions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "geoinsight_income_records_related_listing_id_fkey"
            columns: ["related_listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "geoinsight_income_records_related_subscription_id_fkey"
            columns: ["related_subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "geoinsight_income_records_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      geoinsight_invoices: {
        Row: {
          created_at: string | null
          id: string
          income_record_id: string
          invoice_number: string
          issued_at: string | null
          pdf_url: string | null
          sent_at: string | null
          status: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          income_record_id: string
          invoice_number: string
          issued_at?: string | null
          pdf_url?: string | null
          sent_at?: string | null
          status?: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          income_record_id?: string
          invoice_number?: string
          issued_at?: string | null
          pdf_url?: string | null
          sent_at?: string | null
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "geoinsight_invoices_income_record_id_fkey"
            columns: ["income_record_id"]
            isOneToOne: true
            referencedRelation: "geoinsight_income_records"
            referencedColumns: ["id"]
          },
        ]
      }
      geoinsight_payment_proofs: {
        Row: {
          admin_review_notes: string | null
          admin_reviewed_by: string | null
          amount_paid: number | null
          created_at: string | null
          id: string
          income_record_id: string
          payer_id: string
          payment_channel: string | null
          proof_file_url: string | null
          proof_text: string | null
          status: string
          submitted_at: string | null
          transaction_reference: string | null
          updated_at: string | null
        }
        Insert: {
          admin_review_notes?: string | null
          admin_reviewed_by?: string | null
          amount_paid?: number | null
          created_at?: string | null
          id?: string
          income_record_id: string
          payer_id: string
          payment_channel?: string | null
          proof_file_url?: string | null
          proof_text?: string | null
          status?: string
          submitted_at?: string | null
          transaction_reference?: string | null
          updated_at?: string | null
        }
        Update: {
          admin_review_notes?: string | null
          admin_reviewed_by?: string | null
          amount_paid?: number | null
          created_at?: string | null
          id?: string
          income_record_id?: string
          payer_id?: string
          payment_channel?: string | null
          proof_file_url?: string | null
          proof_text?: string | null
          status?: string
          submitted_at?: string | null
          transaction_reference?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "geoinsight_payment_proofs_admin_reviewed_by_fkey"
            columns: ["admin_reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "geoinsight_payment_proofs_income_record_id_fkey"
            columns: ["income_record_id"]
            isOneToOne: false
            referencedRelation: "geoinsight_income_records"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "geoinsight_payment_proofs_payer_id_fkey"
            columns: ["payer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      institutional_sellers: {
        Row: {
          about_company: string | null
          approved_at: string | null
          approved_by_admin_id: string | null
          certifications: string[] | null
          contact_email: string
          contact_person: string
          contact_phone: string | null
          cover_image_url: string | null
          created_at: string
          id: string
          institution_name: string
          institution_type: Database["public"]["Enums"]["institution_type"]
          is_approved: boolean | null
          logo_url: string | null
          mission_statement: string | null
          notes: string | null
          profile_id: string
          service_areas: string[] | null
          slug: string | null
          social_media: Json | null
          total_employees: number | null
          updated_at: string
          website_url: string | null
          year_established: number | null
        }
        Insert: {
          about_company?: string | null
          approved_at?: string | null
          approved_by_admin_id?: string | null
          certifications?: string[] | null
          contact_email: string
          contact_person: string
          contact_phone?: string | null
          cover_image_url?: string | null
          created_at?: string
          id?: string
          institution_name: string
          institution_type: Database["public"]["Enums"]["institution_type"]
          is_approved?: boolean | null
          logo_url?: string | null
          mission_statement?: string | null
          notes?: string | null
          profile_id: string
          service_areas?: string[] | null
          slug?: string | null
          social_media?: Json | null
          total_employees?: number | null
          updated_at?: string
          website_url?: string | null
          year_established?: number | null
        }
        Update: {
          about_company?: string | null
          approved_at?: string | null
          approved_by_admin_id?: string | null
          certifications?: string[] | null
          contact_email?: string
          contact_person?: string
          contact_phone?: string | null
          cover_image_url?: string | null
          created_at?: string
          id?: string
          institution_name?: string
          institution_type?: Database["public"]["Enums"]["institution_type"]
          is_approved?: boolean | null
          logo_url?: string | null
          mission_statement?: string | null
          notes?: string | null
          profile_id?: string
          service_areas?: string[] | null
          slug?: string | null
          social_media?: Json | null
          total_employees?: number | null
          updated_at?: string
          website_url?: string | null
          year_established?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "institutional_sellers_approved_by_admin_id_fkey"
            columns: ["approved_by_admin_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "institutional_sellers_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      land_use_profiles: {
        Row: {
          allowed_uses: string[] | null
          calculated_at: string
          created_at: string
          dominant_land_use: string
          id: string
          land_use_conflict: boolean | null
          listing_id: string
          notes: string | null
          updated_at: string
          zoning_code: string | null
        }
        Insert: {
          allowed_uses?: string[] | null
          calculated_at?: string
          created_at?: string
          dominant_land_use: string
          id?: string
          land_use_conflict?: boolean | null
          listing_id: string
          notes?: string | null
          updated_at?: string
          zoning_code?: string | null
        }
        Update: {
          allowed_uses?: string[] | null
          calculated_at?: string
          created_at?: string
          dominant_land_use?: string
          id?: string
          land_use_conflict?: boolean | null
          listing_id?: string
          notes?: string | null
          updated_at?: string
          zoning_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "land_use_profiles_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: true
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          buyer_id: string | null
          created_at: string
          id: string
          listing_id: string
          notes: string | null
          seller_id: string
          source: Database["public"]["Enums"]["lead_source"]
          status: Database["public"]["Enums"]["lead_status"]
          updated_at: string
        }
        Insert: {
          buyer_id?: string | null
          created_at?: string
          id?: string
          listing_id: string
          notes?: string | null
          seller_id: string
          source: Database["public"]["Enums"]["lead_source"]
          status?: Database["public"]["Enums"]["lead_status"]
          updated_at?: string
        }
        Update: {
          buyer_id?: string | null
          created_at?: string
          id?: string
          listing_id?: string
          notes?: string | null
          seller_id?: string
          source?: Database["public"]["Enums"]["lead_source"]
          status?: Database["public"]["Enums"]["lead_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "leads_buyer_id_fkey"
            columns: ["buyer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      listing_media: {
        Row: {
          caption: string | null
          created_at: string
          file_url: string
          id: string
          listing_id: string
          media_type: Database["public"]["Enums"]["media_type"]
        }
        Insert: {
          caption?: string | null
          created_at?: string
          file_url: string
          id?: string
          listing_id: string
          media_type: Database["public"]["Enums"]["media_type"]
        }
        Update: {
          caption?: string | null
          created_at?: string
          file_url?: string
          id?: string
          listing_id?: string
          media_type?: Database["public"]["Enums"]["media_type"]
        }
        Relationships: [
          {
            foreignKeyName: "listing_media_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
      listing_polygons: {
        Row: {
          area_m2: number | null
          centroid_lat: number | null
          centroid_lng: number | null
          created_at: string
          geojson: Json
          id: string
          listing_id: string
          updated_at: string
        }
        Insert: {
          area_m2?: number | null
          centroid_lat?: number | null
          centroid_lng?: number | null
          created_at?: string
          geojson: Json
          id?: string
          listing_id: string
          updated_at?: string
        }
        Update: {
          area_m2?: number | null
          centroid_lat?: number | null
          centroid_lng?: number | null
          created_at?: string
          geojson?: Json
          id?: string
          listing_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "listing_polygons_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: true
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
      listings: {
        Row: {
          block_number: string | null
          created_at: string
          currency: string | null
          description: string | null
          description_sw: string | null
          district: string | null
          district_id: string | null
          has_title: boolean | null
          id: string
          is_polygon_verified: boolean | null
          listing_type: Database["public"]["Enums"]["listing_type"]
          location_label: string
          owner_id: string
          planned_use: string | null
          plot_number: string | null
          price: number | null
          property_type: Database["public"]["Enums"]["property_type"]
          region: string | null
          region_id: string | null
          status: Database["public"]["Enums"]["listing_status"] | null
          street_name: string | null
          street_village_id: string | null
          title: string
          title_sw: string | null
          updated_at: string
          verification_notes: string | null
          verification_status:
            | Database["public"]["Enums"]["verification_status"]
            | null
          ward: string | null
          ward_id: string | null
        }
        Insert: {
          block_number?: string | null
          created_at?: string
          currency?: string | null
          description?: string | null
          description_sw?: string | null
          district?: string | null
          district_id?: string | null
          has_title?: boolean | null
          id?: string
          is_polygon_verified?: boolean | null
          listing_type: Database["public"]["Enums"]["listing_type"]
          location_label: string
          owner_id: string
          planned_use?: string | null
          plot_number?: string | null
          price?: number | null
          property_type: Database["public"]["Enums"]["property_type"]
          region?: string | null
          region_id?: string | null
          status?: Database["public"]["Enums"]["listing_status"] | null
          street_name?: string | null
          street_village_id?: string | null
          title: string
          title_sw?: string | null
          updated_at?: string
          verification_notes?: string | null
          verification_status?:
            | Database["public"]["Enums"]["verification_status"]
            | null
          ward?: string | null
          ward_id?: string | null
        }
        Update: {
          block_number?: string | null
          created_at?: string
          currency?: string | null
          description?: string | null
          description_sw?: string | null
          district?: string | null
          district_id?: string | null
          has_title?: boolean | null
          id?: string
          is_polygon_verified?: boolean | null
          listing_type?: Database["public"]["Enums"]["listing_type"]
          location_label?: string
          owner_id?: string
          planned_use?: string | null
          plot_number?: string | null
          price?: number | null
          property_type?: Database["public"]["Enums"]["property_type"]
          region?: string | null
          region_id?: string | null
          status?: Database["public"]["Enums"]["listing_status"] | null
          street_name?: string | null
          street_village_id?: string | null
          title?: string
          title_sw?: string | null
          updated_at?: string
          verification_notes?: string | null
          verification_status?:
            | Database["public"]["Enums"]["verification_status"]
            | null
          ward?: string | null
          ward_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "listings_district_id_fkey"
            columns: ["district_id"]
            isOneToOne: false
            referencedRelation: "districts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "listings_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "listings_region_id_fkey"
            columns: ["region_id"]
            isOneToOne: false
            referencedRelation: "regions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "listings_street_village_id_fkey"
            columns: ["street_village_id"]
            isOneToOne: false
            referencedRelation: "streets_villages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "listings_ward_id_fkey"
            columns: ["ward_id"]
            isOneToOne: false
            referencedRelation: "wards"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          content: string
          created_at: string
          id: string
          is_read: boolean
          listing_id: string | null
          message_type: Database["public"]["Enums"]["message_type"]
          receiver_id: string
          sender_id: string
          timestamp: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          is_read?: boolean
          listing_id?: string | null
          message_type?: Database["public"]["Enums"]["message_type"]
          receiver_id: string
          sender_id: string
          timestamp?: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          is_read?: boolean
          listing_id?: string | null
          message_type?: Database["public"]["Enums"]["message_type"]
          receiver_id?: string
          sender_id?: string
          timestamp?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_receiver_id_fkey"
            columns: ["receiver_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          link_url: string | null
          message: string
          title: string
          type: Database["public"]["Enums"]["notification_type"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          link_url?: string | null
          message: string
          title: string
          type: Database["public"]["Enums"]["notification_type"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          link_url?: string | null
          message?: string
          title?: string
          type?: Database["public"]["Enums"]["notification_type"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_account_settings: {
        Row: {
          account_name: string
          account_number: string
          bank_name: string
          created_at: string
          currency: string
          id: string
          instructions: string | null
          is_active: boolean
          swift_code: string | null
          updated_at: string
        }
        Insert: {
          account_name: string
          account_number: string
          bank_name: string
          created_at?: string
          currency?: string
          id?: string
          instructions?: string | null
          is_active?: boolean
          swift_code?: string | null
          updated_at?: string
        }
        Update: {
          account_name?: string
          account_number?: string
          bank_name?: string
          created_at?: string
          currency?: string
          id?: string
          instructions?: string | null
          is_active?: boolean
          swift_code?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      payment_proofs: {
        Row: {
          admin_notes: string | null
          admin_reviewed_at: string | null
          amount_paid: number
          buyer_id: string
          buyer_notes: string | null
          created_at: string
          id: string
          listing_id: string
          payment_method: string
          proof_file_url: string
          proof_type: string
          seller_confirmed_at: string | null
          seller_id: string
          seller_notes: string | null
          status: Database["public"]["Enums"]["payment_proof_status"]
          submitted_at: string
          transaction_reference: string | null
          updated_at: string
        }
        Insert: {
          admin_notes?: string | null
          admin_reviewed_at?: string | null
          amount_paid: number
          buyer_id: string
          buyer_notes?: string | null
          created_at?: string
          id?: string
          listing_id: string
          payment_method: string
          proof_file_url: string
          proof_type: string
          seller_confirmed_at?: string | null
          seller_id: string
          seller_notes?: string | null
          status?: Database["public"]["Enums"]["payment_proof_status"]
          submitted_at?: string
          transaction_reference?: string | null
          updated_at?: string
        }
        Update: {
          admin_notes?: string | null
          admin_reviewed_at?: string | null
          amount_paid?: number
          buyer_id?: string
          buyer_notes?: string | null
          created_at?: string
          id?: string
          listing_id?: string
          payment_method?: string
          proof_file_url?: string
          proof_type?: string
          seller_confirmed_at?: string | null
          seller_id?: string
          seller_notes?: string | null
          status?: Database["public"]["Enums"]["payment_proof_status"]
          submitted_at?: string
          transaction_reference?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_proofs_buyer_id_fkey"
            columns: ["buyer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_proofs_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_proofs_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          address: string | null
          bio: string | null
          created_at: string
          district_id: string | null
          email: string
          full_name: string
          id: string
          national_id_number: string | null
          organization_name: string | null
          phone: string | null
          preferred_locale: string | null
          profile_photo_url: string | null
          region_id: string | null
          role: Database["public"]["Enums"]["app_role"] | null
          social_links: Json | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          bio?: string | null
          created_at?: string
          district_id?: string | null
          email: string
          full_name: string
          id: string
          national_id_number?: string | null
          organization_name?: string | null
          phone?: string | null
          preferred_locale?: string | null
          profile_photo_url?: string | null
          region_id?: string | null
          role?: Database["public"]["Enums"]["app_role"] | null
          social_links?: Json | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          bio?: string | null
          created_at?: string
          district_id?: string | null
          email?: string
          full_name?: string
          id?: string
          national_id_number?: string | null
          organization_name?: string | null
          phone?: string | null
          preferred_locale?: string | null
          profile_photo_url?: string | null
          region_id?: string | null
          role?: Database["public"]["Enums"]["app_role"] | null
          social_links?: Json | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_district_id_fkey"
            columns: ["district_id"]
            isOneToOne: false
            referencedRelation: "districts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_region_id_fkey"
            columns: ["region_id"]
            isOneToOne: false
            referencedRelation: "regions"
            referencedColumns: ["id"]
          },
        ]
      }
      proximity_analysis: {
        Row: {
          calculated_at: string | null
          created_at: string | null
          hospitals_within_5km: Json | null
          id: string
          listing_id: string
          marketplaces_within_5km: Json | null
          nearest_hospital_distance_m: number | null
          nearest_hospital_name: string | null
          nearest_major_road_distance_m: number | null
          nearest_major_road_name: string | null
          nearest_marketplace_distance_m: number | null
          nearest_marketplace_name: string | null
          nearest_road_distance_m: number | null
          nearest_road_name: string | null
          nearest_school_distance_m: number | null
          nearest_school_name: string | null
          public_transport_nearby: Json | null
          schools_within_5km: Json | null
          updated_at: string | null
        }
        Insert: {
          calculated_at?: string | null
          created_at?: string | null
          hospitals_within_5km?: Json | null
          id?: string
          listing_id: string
          marketplaces_within_5km?: Json | null
          nearest_hospital_distance_m?: number | null
          nearest_hospital_name?: string | null
          nearest_major_road_distance_m?: number | null
          nearest_major_road_name?: string | null
          nearest_marketplace_distance_m?: number | null
          nearest_marketplace_name?: string | null
          nearest_road_distance_m?: number | null
          nearest_road_name?: string | null
          nearest_school_distance_m?: number | null
          nearest_school_name?: string | null
          public_transport_nearby?: Json | null
          schools_within_5km?: Json | null
          updated_at?: string | null
        }
        Update: {
          calculated_at?: string | null
          created_at?: string | null
          hospitals_within_5km?: Json | null
          id?: string
          listing_id?: string
          marketplaces_within_5km?: Json | null
          nearest_hospital_distance_m?: number | null
          nearest_hospital_name?: string | null
          nearest_major_road_distance_m?: number | null
          nearest_major_road_name?: string | null
          nearest_marketplace_distance_m?: number | null
          nearest_marketplace_name?: string | null
          nearest_road_distance_m?: number | null
          nearest_road_name?: string | null
          nearest_school_distance_m?: number | null
          nearest_school_name?: string | null
          public_transport_nearby?: Json | null
          schools_within_5km?: Json | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "proximity_analysis_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: true
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
      regions: {
        Row: {
          code: string | null
          created_at: string
          geometry: Json | null
          id: string
          name: string
        }
        Insert: {
          code?: string | null
          created_at?: string
          geometry?: Json | null
          id?: string
          name: string
        }
        Update: {
          code?: string | null
          created_at?: string
          geometry?: Json | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      reputation_scores: {
        Row: {
          communication_score: number
          created_at: string
          deals_closed_count: number
          fraud_flags_count: number
          honesty_score: number
          id: string
          last_updated: string
          reliability_score: number
          total_score: number
          user_id: string
        }
        Insert: {
          communication_score?: number
          created_at?: string
          deals_closed_count?: number
          fraud_flags_count?: number
          honesty_score?: number
          id?: string
          last_updated?: string
          reliability_score?: number
          total_score?: number
          user_id: string
        }
        Update: {
          communication_score?: number
          created_at?: string
          deals_closed_count?: number
          fraud_flags_count?: number
          honesty_score?: number
          id?: string
          last_updated?: string
          reliability_score?: number
          total_score?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reputation_scores_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      role_requests: {
        Row: {
          business_name: string | null
          created_at: string | null
          experience_years: number | null
          id: string
          license_number: string | null
          notes: string | null
          portfolio_url: string | null
          reason: string | null
          rejection_reason: string | null
          requested_role: Database["public"]["Enums"]["app_role"]
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          user_id: string
        }
        Insert: {
          business_name?: string | null
          created_at?: string | null
          experience_years?: number | null
          id?: string
          license_number?: string | null
          notes?: string | null
          portfolio_url?: string | null
          reason?: string | null
          rejection_reason?: string | null
          requested_role: Database["public"]["Enums"]["app_role"]
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          user_id: string
        }
        Update: {
          business_name?: string | null
          created_at?: string | null
          experience_years?: number | null
          id?: string
          license_number?: string | null
          notes?: string | null
          portfolio_url?: string | null
          reason?: string | null
          rejection_reason?: string | null
          requested_role?: Database["public"]["Enums"]["app_role"]
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "role_requests_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      service_providers: {
        Row: {
          average_turnaround_days: number | null
          company_address: string | null
          company_name: string
          company_type: string
          completed_projects: number | null
          contact_email: string
          contact_person: string
          contact_phone: string | null
          created_at: string
          description: string | null
          id: string
          is_active: boolean | null
          is_verified: boolean | null
          license_number: string | null
          logo_url: string | null
          rating: number | null
          services_offered: string[]
          total_reviews: number | null
          updated_at: string
          website_url: string | null
          years_in_business: number | null
        }
        Insert: {
          average_turnaround_days?: number | null
          company_address?: string | null
          company_name: string
          company_type: string
          completed_projects?: number | null
          contact_email: string
          contact_person: string
          contact_phone?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_verified?: boolean | null
          license_number?: string | null
          logo_url?: string | null
          rating?: number | null
          services_offered?: string[]
          total_reviews?: number | null
          updated_at?: string
          website_url?: string | null
          years_in_business?: number | null
        }
        Update: {
          average_turnaround_days?: number | null
          company_address?: string | null
          company_name?: string
          company_type?: string
          completed_projects?: number | null
          contact_email?: string
          contact_person?: string
          contact_phone?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_verified?: boolean | null
          license_number?: string | null
          logo_url?: string | null
          rating?: number | null
          services_offered?: string[]
          total_reviews?: number | null
          updated_at?: string
          website_url?: string | null
          years_in_business?: number | null
        }
        Relationships: []
      }
      service_requests: {
        Row: {
          actual_completion_date: string | null
          created_at: string
          estimated_completion_date: string | null
          id: string
          listing_id: string
          provider_notes: string | null
          quoted_currency: string | null
          quoted_price: number | null
          report_file_url: string | null
          request_notes: string | null
          requester_id: string
          service_category: string
          service_provider_id: string | null
          service_type: string
          status: string
          updated_at: string
        }
        Insert: {
          actual_completion_date?: string | null
          created_at?: string
          estimated_completion_date?: string | null
          id?: string
          listing_id: string
          provider_notes?: string | null
          quoted_currency?: string | null
          quoted_price?: number | null
          report_file_url?: string | null
          request_notes?: string | null
          requester_id: string
          service_category: string
          service_provider_id?: string | null
          service_type: string
          status?: string
          updated_at?: string
        }
        Update: {
          actual_completion_date?: string | null
          created_at?: string
          estimated_completion_date?: string | null
          id?: string
          listing_id?: string
          provider_notes?: string | null
          quoted_currency?: string | null
          quoted_price?: number | null
          report_file_url?: string | null
          request_notes?: string | null
          requester_id?: string
          service_category?: string
          service_provider_id?: string | null
          service_type?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_requests_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_requests_service_provider_id_fkey"
            columns: ["service_provider_id"]
            isOneToOne: false
            referencedRelation: "service_providers"
            referencedColumns: ["id"]
          },
        ]
      }
      service_reviews: {
        Row: {
          created_at: string
          id: string
          professionalism_score: number | null
          quality_score: number | null
          rating: number
          review_text: string | null
          reviewer_id: string
          service_provider_id: string
          service_request_id: string
          timeliness_score: number | null
          would_recommend: boolean | null
        }
        Insert: {
          created_at?: string
          id?: string
          professionalism_score?: number | null
          quality_score?: number | null
          rating: number
          review_text?: string | null
          reviewer_id: string
          service_provider_id: string
          service_request_id: string
          timeliness_score?: number | null
          would_recommend?: boolean | null
        }
        Update: {
          created_at?: string
          id?: string
          professionalism_score?: number | null
          quality_score?: number | null
          rating?: number
          review_text?: string | null
          reviewer_id?: string
          service_provider_id?: string
          service_request_id?: string
          timeliness_score?: number | null
          would_recommend?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "service_reviews_service_provider_id_fkey"
            columns: ["service_provider_id"]
            isOneToOne: false
            referencedRelation: "service_providers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_reviews_service_request_id_fkey"
            columns: ["service_request_id"]
            isOneToOne: false
            referencedRelation: "service_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      spatial_risk_profiles: {
        Row: {
          calculated_at: string
          created_at: string
          distance_to_river_m: number | null
          elevation_m: number | null
          environmental_notes: string | null
          flood_risk_level: string
          flood_risk_score: number
          id: string
          listing_id: string
          near_river: boolean | null
          slope_percent: number | null
          updated_at: string
        }
        Insert: {
          calculated_at?: string
          created_at?: string
          distance_to_river_m?: number | null
          elevation_m?: number | null
          environmental_notes?: string | null
          flood_risk_level: string
          flood_risk_score: number
          id?: string
          listing_id: string
          near_river?: boolean | null
          slope_percent?: number | null
          updated_at?: string
        }
        Update: {
          calculated_at?: string
          created_at?: string
          distance_to_river_m?: number | null
          elevation_m?: number | null
          environmental_notes?: string | null
          flood_risk_level?: string
          flood_risk_score?: number
          id?: string
          listing_id?: string
          near_river?: boolean | null
          slope_percent?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "spatial_risk_profiles_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: true
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
      streets_villages: {
        Row: {
          code: string | null
          created_at: string
          geometry: Json | null
          id: string
          name: string
          ward_id: string
        }
        Insert: {
          code?: string | null
          created_at?: string
          geometry?: Json | null
          id?: string
          name: string
          ward_id: string
        }
        Update: {
          code?: string | null
          created_at?: string
          geometry?: Json | null
          id?: string
          name?: string
          ward_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "streets_villages_ward_id_fkey"
            columns: ["ward_id"]
            isOneToOne: false
            referencedRelation: "wards"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_payment_proofs: {
        Row: {
          admin_notes: string | null
          amount_paid: number
          buyer_notes: string | null
          created_at: string
          id: string
          payment_method: string
          plan_type: Database["public"]["Enums"]["subscription_plan"]
          proof_file_url: string
          reviewed_at: string | null
          status: string
          submitted_at: string
          subscription_id: string | null
          transaction_reference: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_notes?: string | null
          amount_paid: number
          buyer_notes?: string | null
          created_at?: string
          id?: string
          payment_method: string
          plan_type: Database["public"]["Enums"]["subscription_plan"]
          proof_file_url: string
          reviewed_at?: string | null
          status?: string
          submitted_at?: string
          subscription_id?: string | null
          transaction_reference?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_notes?: string | null
          amount_paid?: number
          buyer_notes?: string | null
          created_at?: string
          id?: string
          payment_method?: string
          plan_type?: Database["public"]["Enums"]["subscription_plan"]
          proof_file_url?: string
          reviewed_at?: string | null
          status?: string
          submitted_at?: string
          subscription_id?: string | null
          transaction_reference?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscription_payment_proofs_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscription_payment_proofs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          amount_paid: number | null
          created_at: string
          end_date: string
          id: string
          invoice_url: string | null
          is_active: boolean
          plan_type: Database["public"]["Enums"]["subscription_plan"]
          start_date: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount_paid?: number | null
          created_at?: string
          end_date: string
          id?: string
          invoice_url?: string | null
          is_active?: boolean
          plan_type: Database["public"]["Enums"]["subscription_plan"]
          start_date?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount_paid?: number | null
          created_at?: string
          end_date?: string
          id?: string
          invoice_url?: string | null
          is_active?: boolean
          plan_type?: Database["public"]["Enums"]["subscription_plan"]
          start_date?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      system_errors: {
        Row: {
          context: string
          created_at: string
          details: Json | null
          id: string
          message: string
          stack_trace: string | null
        }
        Insert: {
          context: string
          created_at?: string
          details?: Json | null
          id?: string
          message: string
          stack_trace?: string | null
        }
        Update: {
          context?: string
          created_at?: string
          details?: Json | null
          id?: string
          message?: string
          stack_trace?: string | null
        }
        Relationships: []
      }
      transaction_reviews: {
        Row: {
          communication_score: number | null
          created_at: string
          deal_closure_id: string
          honesty_score: number | null
          id: string
          listing_id: string
          rating: number
          reliability_score: number | null
          review_text: string | null
          reviewed_user_id: string
          reviewer_id: string
          reviewer_role: string
          updated_at: string
          would_transact_again: boolean | null
        }
        Insert: {
          communication_score?: number | null
          created_at?: string
          deal_closure_id: string
          honesty_score?: number | null
          id?: string
          listing_id: string
          rating: number
          reliability_score?: number | null
          review_text?: string | null
          reviewed_user_id: string
          reviewer_id: string
          reviewer_role: string
          updated_at?: string
          would_transact_again?: boolean | null
        }
        Update: {
          communication_score?: number | null
          created_at?: string
          deal_closure_id?: string
          honesty_score?: number | null
          id?: string
          listing_id?: string
          rating?: number
          reliability_score?: number | null
          review_text?: string | null
          reviewed_user_id?: string
          reviewer_id?: string
          reviewer_role?: string
          updated_at?: string
          would_transact_again?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "transaction_reviews_deal_closure_id_fkey"
            columns: ["deal_closure_id"]
            isOneToOne: false
            referencedRelation: "deal_closures"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transaction_reviews_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transaction_reviews_reviewed_user_id_fkey"
            columns: ["reviewed_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transaction_reviews_reviewer_id_fkey"
            columns: ["reviewer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          assigned_at: string | null
          assigned_by: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          assigned_at?: string | null
          assigned_by?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          assigned_at?: string | null
          assigned_by?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      valuation_estimates: {
        Row: {
          confidence_score: number | null
          created_at: string
          estimated_value: number
          estimation_currency: string | null
          estimation_method: Database["public"]["Enums"]["estimation_method"]
          id: string
          listing_id: string
          notes: string | null
          updated_at: string
        }
        Insert: {
          confidence_score?: number | null
          created_at?: string
          estimated_value: number
          estimation_currency?: string | null
          estimation_method?: Database["public"]["Enums"]["estimation_method"]
          id?: string
          listing_id: string
          notes?: string | null
          updated_at?: string
        }
        Update: {
          confidence_score?: number | null
          created_at?: string
          estimated_value?: number
          estimation_currency?: string | null
          estimation_method?: Database["public"]["Enums"]["estimation_method"]
          id?: string
          listing_id?: string
          notes?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "valuation_estimates_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: true
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
      visit_requests: {
        Row: {
          buyer_id: string
          buyer_notes: string | null
          created_at: string
          id: string
          listing_id: string
          requested_date: string
          requested_time_slot: string
          seller_id: string
          seller_notes: string | null
          status: Database["public"]["Enums"]["visit_status"]
          updated_at: string
        }
        Insert: {
          buyer_id: string
          buyer_notes?: string | null
          created_at?: string
          id?: string
          listing_id: string
          requested_date: string
          requested_time_slot: string
          seller_id: string
          seller_notes?: string | null
          status?: Database["public"]["Enums"]["visit_status"]
          updated_at?: string
        }
        Update: {
          buyer_id?: string
          buyer_notes?: string | null
          created_at?: string
          id?: string
          listing_id?: string
          requested_date?: string
          requested_time_slot?: string
          seller_id?: string
          seller_notes?: string | null
          status?: Database["public"]["Enums"]["visit_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "visit_requests_buyer_id_fkey"
            columns: ["buyer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visit_requests_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visit_requests_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      wards: {
        Row: {
          code: string | null
          created_at: string
          district_id: string
          geometry: Json | null
          id: string
          name: string
        }
        Insert: {
          code?: string | null
          created_at?: string
          district_id: string
          geometry?: Json | null
          id?: string
          name: string
        }
        Update: {
          code?: string | null
          created_at?: string
          district_id?: string
          geometry?: Json | null
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "wards_district_id_fkey"
            columns: ["district_id"]
            isOneToOne: false
            referencedRelation: "districts"
            referencedColumns: ["id"]
          },
        ]
      }
      webhook_deliveries: {
        Row: {
          created_at: string
          error_message: string | null
          event_type: Database["public"]["Enums"]["webhook_event_type"]
          id: string
          payload: Json
          response_body: string | null
          response_status: number | null
          subscription_id: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          event_type: Database["public"]["Enums"]["webhook_event_type"]
          id?: string
          payload: Json
          response_body?: string | null
          response_status?: number | null
          subscription_id: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          event_type?: Database["public"]["Enums"]["webhook_event_type"]
          id?: string
          payload?: Json
          response_body?: string | null
          response_status?: number | null
          subscription_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "webhook_deliveries_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "webhook_subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      webhook_subscriptions: {
        Row: {
          created_at: string
          event_type: Database["public"]["Enums"]["webhook_event_type"]
          id: string
          is_active: boolean
          last_delivery_at: string | null
          last_delivery_status: string | null
          owner_id: string
          secret_token: string
          target_url: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          event_type: Database["public"]["Enums"]["webhook_event_type"]
          id?: string
          is_active?: boolean
          last_delivery_at?: string | null
          last_delivery_status?: string | null
          owner_id: string
          secret_token: string
          target_url: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          event_type?: Database["public"]["Enums"]["webhook_event_type"]
          id?: string
          is_active?: boolean
          last_delivery_at?: string | null
          last_delivery_status?: string | null
          owner_id?: string
          secret_token?: string
          target_url?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "webhook_subscriptions_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      approve_role_request: { Args: { request_id: string }; Returns: undefined }
      backfill_listing_fees: {
        Args: never
        Returns: {
          amount_due: number
          income_record_id: string
          listing_id: string
          listing_title: string
          user_id: string
        }[]
      }
      create_notification: {
        Args: {
          p_link_url?: string
          p_message: string
          p_title: string
          p_type: Database["public"]["Enums"]["notification_type"]
          p_user_id: string
        }
        Returns: string
      }
      generate_institution_slug: {
        Args: { institution_name: string }
        Returns: string
      }
      get_primary_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      reject_role_request: {
        Args: { reason: string; request_id: string }
        Returns: undefined
      }
      update_overdue_tasks: { Args: never; Returns: undefined }
    }
    Enums: {
      app_role:
        | "buyer"
        | "seller"
        | "broker"
        | "admin"
        | "verification_officer"
        | "compliance_officer"
        | "spatial_analyst"
        | "customer_success"
        | "staff"
      compliance_flag_type:
        | "payment_mismatch"
        | "duplicate_polygon"
        | "suspicious_listing"
        | "buyer_seller_conflict"
        | "other"
      crm_task_status: "pending" | "done" | "overdue"
      deal_closure_status:
        | "pending_admin_validation"
        | "closed"
        | "disputed"
        | "cancelled"
      dispute_status: "open" | "in_review" | "resolved" | "rejected"
      dispute_type:
        | "payment_issue"
        | "fraud_suspicion"
        | "misrepresentation"
        | "unverified_documents"
        | "visit_issue"
        | "other"
      estimation_method: "rule_based_v1" | "ml_model_v1" | "external_api"
      fraud_signal_type:
        | "duplicate_polygon"
        | "similar_polygon"
        | "cross_boundary_error"
        | "fake_payment"
        | "self_intersecting_polygon"
        | "rapid_price_drop"
        | "multiple_accounts_same_phone"
        | "immediate_closure_attempt"
      institution_type: "government" | "municipal" | "authority" | "company"
      lead_source: "message" | "visit_request" | "direct_contact" | "import"
      lead_status:
        | "new"
        | "contacted"
        | "interested"
        | "not_interested"
        | "under_offer"
        | "closed"
        | "lost"
      listing_status: "draft" | "published" | "archived" | "closed"
      listing_type: "sale" | "rent"
      media_type: "image" | "document"
      message_type: "text" | "system"
      notification_type:
        | "new_message"
        | "payment_proof_submitted"
        | "payment_confirmed"
        | "deal_approved"
        | "deal_rejected"
        | "compliance_flag"
        | "subscription_expiring"
        | "listing_verified"
        | "visit_requested"
      payment_proof_status:
        | "pending_seller_confirmation"
        | "pending_admin_review"
        | "approved"
        | "rejected"
      property_type: "land" | "house" | "apartment" | "commercial" | "other"
      subscription_plan: "basic" | "pro" | "enterprise"
      verification_status: "unverified" | "pending" | "verified" | "rejected"
      visit_status:
        | "pending"
        | "accepted"
        | "rejected"
        | "completed"
        | "cancelled"
      webhook_event_type:
        | "listing_created"
        | "listing_closed"
        | "payment_proof_submitted"
        | "deal_closed"
        | "dispute_opened"
        | "visit_requested"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: [
        "buyer",
        "seller",
        "broker",
        "admin",
        "verification_officer",
        "compliance_officer",
        "spatial_analyst",
        "customer_success",
        "staff",
      ],
      compliance_flag_type: [
        "payment_mismatch",
        "duplicate_polygon",
        "suspicious_listing",
        "buyer_seller_conflict",
        "other",
      ],
      crm_task_status: ["pending", "done", "overdue"],
      deal_closure_status: [
        "pending_admin_validation",
        "closed",
        "disputed",
        "cancelled",
      ],
      dispute_status: ["open", "in_review", "resolved", "rejected"],
      dispute_type: [
        "payment_issue",
        "fraud_suspicion",
        "misrepresentation",
        "unverified_documents",
        "visit_issue",
        "other",
      ],
      estimation_method: ["rule_based_v1", "ml_model_v1", "external_api"],
      fraud_signal_type: [
        "duplicate_polygon",
        "similar_polygon",
        "cross_boundary_error",
        "fake_payment",
        "self_intersecting_polygon",
        "rapid_price_drop",
        "multiple_accounts_same_phone",
        "immediate_closure_attempt",
      ],
      institution_type: ["government", "municipal", "authority", "company"],
      lead_source: ["message", "visit_request", "direct_contact", "import"],
      lead_status: [
        "new",
        "contacted",
        "interested",
        "not_interested",
        "under_offer",
        "closed",
        "lost",
      ],
      listing_status: ["draft", "published", "archived", "closed"],
      listing_type: ["sale", "rent"],
      media_type: ["image", "document"],
      message_type: ["text", "system"],
      notification_type: [
        "new_message",
        "payment_proof_submitted",
        "payment_confirmed",
        "deal_approved",
        "deal_rejected",
        "compliance_flag",
        "subscription_expiring",
        "listing_verified",
        "visit_requested",
      ],
      payment_proof_status: [
        "pending_seller_confirmation",
        "pending_admin_review",
        "approved",
        "rejected",
      ],
      property_type: ["land", "house", "apartment", "commercial", "other"],
      subscription_plan: ["basic", "pro", "enterprise"],
      verification_status: ["unverified", "pending", "verified", "rejected"],
      visit_status: [
        "pending",
        "accepted",
        "rejected",
        "completed",
        "cancelled",
      ],
      webhook_event_type: [
        "listing_created",
        "listing_closed",
        "payment_proof_submitted",
        "deal_closed",
        "dispute_opened",
        "visit_requested",
      ],
    },
  },
} as const
