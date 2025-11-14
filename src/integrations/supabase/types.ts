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
          created_at: string
          currency: string | null
          description: string | null
          district: string | null
          id: string
          is_polygon_verified: boolean | null
          listing_type: Database["public"]["Enums"]["listing_type"]
          location_label: string
          owner_id: string
          price: number | null
          property_type: Database["public"]["Enums"]["property_type"]
          region: string | null
          status: Database["public"]["Enums"]["listing_status"] | null
          title: string
          updated_at: string
          verification_notes: string | null
          verification_status:
            | Database["public"]["Enums"]["verification_status"]
            | null
          ward: string | null
        }
        Insert: {
          created_at?: string
          currency?: string | null
          description?: string | null
          district?: string | null
          id?: string
          is_polygon_verified?: boolean | null
          listing_type: Database["public"]["Enums"]["listing_type"]
          location_label: string
          owner_id: string
          price?: number | null
          property_type: Database["public"]["Enums"]["property_type"]
          region?: string | null
          status?: Database["public"]["Enums"]["listing_status"] | null
          title: string
          updated_at?: string
          verification_notes?: string | null
          verification_status?:
            | Database["public"]["Enums"]["verification_status"]
            | null
          ward?: string | null
        }
        Update: {
          created_at?: string
          currency?: string | null
          description?: string | null
          district?: string | null
          id?: string
          is_polygon_verified?: boolean | null
          listing_type?: Database["public"]["Enums"]["listing_type"]
          location_label?: string
          owner_id?: string
          price?: number | null
          property_type?: Database["public"]["Enums"]["property_type"]
          region?: string | null
          status?: Database["public"]["Enums"]["listing_status"] | null
          title?: string
          updated_at?: string
          verification_notes?: string | null
          verification_status?:
            | Database["public"]["Enums"]["verification_status"]
            | null
          ward?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "listings_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
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
          listing_id: string
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
          listing_id: string
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
          listing_id?: string
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
          created_at: string
          email: string
          full_name: string
          id: string
          national_id_number: string | null
          organization_name: string | null
          phone: string | null
          role: Database["public"]["Enums"]["app_role"] | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          full_name: string
          id: string
          national_id_number?: string | null
          organization_name?: string | null
          phone?: string | null
          role?: Database["public"]["Enums"]["app_role"] | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          national_id_number?: string | null
          organization_name?: string | null
          phone?: string | null
          role?: Database["public"]["Enums"]["app_role"] | null
          updated_at?: string
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
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
    }
    Enums: {
      app_role:
        | "buyer"
        | "seller"
        | "broker"
        | "admin"
        | "verification_officer"
        | "compliance_officer"
      compliance_flag_type:
        | "payment_mismatch"
        | "duplicate_polygon"
        | "suspicious_listing"
        | "buyer_seller_conflict"
        | "other"
      deal_closure_status:
        | "pending_admin_validation"
        | "closed"
        | "disputed"
        | "cancelled"
      fraud_signal_type:
        | "duplicate_polygon"
        | "similar_polygon"
        | "cross_boundary_error"
        | "fake_payment"
        | "self_intersecting_polygon"
        | "rapid_price_drop"
        | "multiple_accounts_same_phone"
        | "immediate_closure_attempt"
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
      payment_proof_status:
        | "pending_seller_confirmation"
        | "pending_admin_review"
        | "approved"
        | "rejected"
      property_type: "land" | "house" | "apartment" | "commercial" | "other"
      subscription_plan: "basic" | "pro" | "enterprise"
      verification_status: "unverified" | "pending" | "verified" | "rejected"
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
      ],
      compliance_flag_type: [
        "payment_mismatch",
        "duplicate_polygon",
        "suspicious_listing",
        "buyer_seller_conflict",
        "other",
      ],
      deal_closure_status: [
        "pending_admin_validation",
        "closed",
        "disputed",
        "cancelled",
      ],
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
    },
  },
} as const
