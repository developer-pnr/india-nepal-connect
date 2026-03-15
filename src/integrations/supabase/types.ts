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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      audit_logs: {
        Row: {
          action: string
          created_at: string
          entity: string
          entity_id: string | null
          id: string
          payload: Json | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          entity: string
          entity_id?: string | null
          id?: string
          payload?: Json | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          entity?: string
          entity_id?: string | null
          id?: string
          payload?: Json | null
          user_id?: string | null
        }
        Relationships: []
      }
      daily_rates: {
        Row: {
          commission_rate_npr_per_1000: number
          created_at: string
          id: string
          inr_to_npr: number
          rate_date: string
          set_by: string | null
        }
        Insert: {
          commission_rate_npr_per_1000?: number
          created_at?: string
          id?: string
          inr_to_npr: number
          rate_date: string
          set_by?: string | null
        }
        Update: {
          commission_rate_npr_per_1000?: number
          created_at?: string
          id?: string
          inr_to_npr?: number
          rate_date?: string
          set_by?: string | null
        }
        Relationships: []
      }
      ledger_entries: {
        Row: {
          account: Database["public"]["Enums"]["ledger_account"]
          created_at: string
          credit: number
          debit: number
          description: string | null
          id: string
          transaction_id: string | null
        }
        Insert: {
          account: Database["public"]["Enums"]["ledger_account"]
          created_at?: string
          credit?: number
          debit?: number
          description?: string | null
          id?: string
          transaction_id?: string | null
        }
        Update: {
          account?: Database["public"]["Enums"]["ledger_account"]
          created_at?: string
          credit?: number
          debit?: number
          description?: string | null
          id?: string
          transaction_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ledger_entries_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      receivers: {
        Row: {
          address: string | null
          bank_details: string | null
          created_at: string
          district: string | null
          id: string
          name: string
          payment_mode: Database["public"]["Enums"]["payment_method"]
          phone: string | null
          relationship: string | null
          sender_id: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          bank_details?: string | null
          created_at?: string
          district?: string | null
          id?: string
          name: string
          payment_mode?: Database["public"]["Enums"]["payment_method"]
          phone?: string | null
          relationship?: string | null
          sender_id?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          bank_details?: string | null
          created_at?: string
          district?: string | null
          id?: string
          name?: string
          payment_mode?: Database["public"]["Enums"]["payment_method"]
          phone?: string | null
          relationship?: string | null
          sender_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "receivers_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "senders"
            referencedColumns: ["id"]
          },
        ]
      }
      senders: {
        Row: {
          address: string | null
          bank_account: string | null
          created_at: string
          id: string
          name: string
          notes: string | null
          phone: string | null
          updated_at: string
          worker_id: string | null
        }
        Insert: {
          address?: string | null
          bank_account?: string | null
          created_at?: string
          id?: string
          name: string
          notes?: string | null
          phone?: string | null
          updated_at?: string
          worker_id?: string | null
        }
        Update: {
          address?: string | null
          bank_account?: string | null
          created_at?: string
          id?: string
          name?: string
          notes?: string | null
          phone?: string | null
          updated_at?: string
          worker_id?: string | null
        }
        Relationships: []
      }
      transactions: {
        Row: {
          amount_inr: number
          amount_npr: number
          commission: number
          commission_npr: number
          created_at: string
          created_by: string | null
          exchange_rate: number
          id: string
          notes: string | null
          payment_method: Database["public"]["Enums"]["payment_method"]
          receiver_id: string
          sender_id: string
          status: Database["public"]["Enums"]["transaction_status"]
          transaction_date: string
          updated_at: string
        }
        Insert: {
          amount_inr: number
          amount_npr: number
          commission?: number
          commission_npr?: number
          created_at?: string
          created_by?: string | null
          exchange_rate: number
          id?: string
          notes?: string | null
          payment_method?: Database["public"]["Enums"]["payment_method"]
          receiver_id: string
          sender_id: string
          status?: Database["public"]["Enums"]["transaction_status"]
          transaction_date?: string
          updated_at?: string
        }
        Update: {
          amount_inr?: number
          amount_npr?: number
          commission?: number
          commission_npr?: number
          created_at?: string
          created_by?: string | null
          exchange_rate?: number
          id?: string
          notes?: string | null
          payment_method?: Database["public"]["Enums"]["payment_method"]
          receiver_id?: string
          sender_id?: string
          status?: Database["public"]["Enums"]["transaction_status"]
          transaction_date?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_receiver_id_fkey"
            columns: ["receiver_id"]
            isOneToOne: false
            referencedRelation: "receivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "senders"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_any_role: { Args: { _user_id: string }; Returns: boolean }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "operator" | "viewer"
      ledger_account:
        | "indian_bank"
        | "cash_npr"
        | "bank_npr"
        | "esewa_pool"
        | "khalti_pool"
        | "ime_pool"
        | "commission"
      payment_method:
        | "cash"
        | "bank_transfer"
        | "esewa"
        | "khalti"
        | "ime"
        | "other"
      transaction_status: "pending" | "paid" | "cancelled"
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
      app_role: ["admin", "operator", "viewer"],
      ledger_account: [
        "indian_bank",
        "cash_npr",
        "bank_npr",
        "esewa_pool",
        "khalti_pool",
        "ime_pool",
        "commission",
      ],
      payment_method: [
        "cash",
        "bank_transfer",
        "esewa",
        "khalti",
        "ime",
        "other",
      ],
      transaction_status: ["pending", "paid", "cancelled"],
    },
  },
} as const
