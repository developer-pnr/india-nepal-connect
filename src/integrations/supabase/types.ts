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
      account_movements: {
        Row: {
          account_id: string
          amount: number
          counter_account_id: string | null
          created_at: string
          created_by: string | null
          id: string
          kind: Database["public"]["Enums"]["account_movement_kind"]
          notes: string | null
          occurred_on: string
          reference: string | null
          transaction_id: string | null
        }
        Insert: {
          account_id: string
          amount: number
          counter_account_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          kind: Database["public"]["Enums"]["account_movement_kind"]
          notes?: string | null
          occurred_on?: string
          reference?: string | null
          transaction_id?: string | null
        }
        Update: {
          account_id?: string
          amount?: number
          counter_account_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          kind?: Database["public"]["Enums"]["account_movement_kind"]
          notes?: string | null
          occurred_on?: string
          reference?: string | null
          transaction_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "account_movements_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "my_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "account_movements_counter_account_id_fkey"
            columns: ["counter_account_id"]
            isOneToOne: false
            referencedRelation: "my_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
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
      events: {
        Row: {
          budget_npr: number | null
          color: string | null
          created_at: string
          description: string | null
          ends_on: string | null
          id: string
          is_active: boolean
          name: string
          starts_on: string | null
          updated_at: string
        }
        Insert: {
          budget_npr?: number | null
          color?: string | null
          created_at?: string
          description?: string | null
          ends_on?: string | null
          id?: string
          is_active?: boolean
          name: string
          starts_on?: string | null
          updated_at?: string
        }
        Update: {
          budget_npr?: number | null
          color?: string | null
          created_at?: string
          description?: string | null
          ends_on?: string | null
          id?: string
          is_active?: boolean
          name?: string
          starts_on?: string | null
          updated_at?: string
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
      my_accounts: {
        Row: {
          created_at: string
          currency: Database["public"]["Enums"]["my_account_currency"]
          id: string
          identifier: string | null
          is_active: boolean
          kind: Database["public"]["Enums"]["my_account_kind"]
          name: string
          notes: string | null
          opening_balance: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          currency?: Database["public"]["Enums"]["my_account_currency"]
          id?: string
          identifier?: string | null
          is_active?: boolean
          kind?: Database["public"]["Enums"]["my_account_kind"]
          name: string
          notes?: string | null
          opening_balance?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          currency?: Database["public"]["Enums"]["my_account_currency"]
          id?: string
          identifier?: string | null
          is_active?: boolean
          kind?: Database["public"]["Enums"]["my_account_kind"]
          name?: string
          notes?: string | null
          opening_balance?: number
          updated_at?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          id: string
          is_read: boolean
          link: string | null
          title: string
          user_id: string | null
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          link?: string | null
          title: string
          user_id?: string | null
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          link?: string | null
          title?: string
          user_id?: string | null
        }
        Relationships: []
      }
      payer_wallets: {
        Row: {
          balance_npr: number
          channel: Database["public"]["Enums"]["payment_method"]
          id: string
          payer_id: string
          updated_at: string
        }
        Insert: {
          balance_npr?: number
          channel: Database["public"]["Enums"]["payment_method"]
          id?: string
          payer_id: string
          updated_at?: string
        }
        Update: {
          balance_npr?: number
          channel?: Database["public"]["Enums"]["payment_method"]
          id?: string
          payer_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payer_wallets_payer_id_fkey"
            columns: ["payer_id"]
            isOneToOne: false
            referencedRelation: "payers"
            referencedColumns: ["id"]
          },
        ]
      }
      payers: {
        Row: {
          address: string | null
          created_at: string
          district: string | null
          id: string
          is_active: boolean
          name: string
          notes: string | null
          phone: string | null
          shop_name: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          district?: string | null
          id?: string
          is_active?: boolean
          name: string
          notes?: string | null
          phone?: string | null
          shop_name?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          created_at?: string
          district?: string | null
          id?: string
          is_active?: boolean
          name?: string
          notes?: string | null
          phone?: string | null
          shop_name?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      payment_installments: {
        Row: {
          amount_npr: number
          channel: Database["public"]["Enums"]["payment_method"]
          created_at: string
          created_by: string | null
          id: string
          notes: string | null
          paid_on: string
          payer_id: string | null
          reference: string | null
          transaction_id: string
          updated_at: string
        }
        Insert: {
          amount_npr: number
          channel?: Database["public"]["Enums"]["payment_method"]
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          paid_on?: string
          payer_id?: string | null
          reference?: string | null
          transaction_id: string
          updated_at?: string
        }
        Update: {
          amount_npr?: number
          channel?: Database["public"]["Enums"]["payment_method"]
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          paid_on?: string
          payer_id?: string | null
          reference?: string | null
          transaction_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_installments_payer_id_fkey"
            columns: ["payer_id"]
            isOneToOne: false
            referencedRelation: "payers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_installments_transaction_id_fkey"
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
      settlement_allocations: {
        Row: {
          amount_npr: number
          created_at: string
          id: string
          settlement_id: string
          transaction_id: string
        }
        Insert: {
          amount_npr: number
          created_at?: string
          id?: string
          settlement_id: string
          transaction_id: string
        }
        Update: {
          amount_npr?: number
          created_at?: string
          id?: string
          settlement_id?: string
          transaction_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "settlement_allocations_settlement_id_fkey"
            columns: ["settlement_id"]
            isOneToOne: false
            referencedRelation: "settlements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "settlement_allocations_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      settlements: {
        Row: {
          amount_npr: number
          channel: Database["public"]["Enums"]["payment_method"] | null
          created_at: string
          created_by: string | null
          id: string
          kind: Database["public"]["Enums"]["settlement_kind"]
          notes: string | null
          occurred_on: string
          party_id: string
          party_kind: Database["public"]["Enums"]["party_kind"]
          reference: string | null
          updated_at: string
        }
        Insert: {
          amount_npr: number
          channel?: Database["public"]["Enums"]["payment_method"] | null
          created_at?: string
          created_by?: string | null
          id?: string
          kind: Database["public"]["Enums"]["settlement_kind"]
          notes?: string | null
          occurred_on?: string
          party_id: string
          party_kind: Database["public"]["Enums"]["party_kind"]
          reference?: string | null
          updated_at?: string
        }
        Update: {
          amount_npr?: number
          channel?: Database["public"]["Enums"]["payment_method"] | null
          created_at?: string
          created_by?: string | null
          id?: string
          kind?: Database["public"]["Enums"]["settlement_kind"]
          notes?: string | null
          occurred_on?: string
          party_id?: string
          party_kind?: Database["public"]["Enums"]["party_kind"]
          reference?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      transaction_activity: {
        Row: {
          actor_id: string | null
          created_at: string
          event_type: string
          id: string
          message: string | null
          payload: Json | null
          transaction_id: string
        }
        Insert: {
          actor_id?: string | null
          created_at?: string
          event_type: string
          id?: string
          message?: string | null
          payload?: Json | null
          transaction_id: string
        }
        Update: {
          actor_id?: string | null
          created_at?: string
          event_type?: string
          id?: string
          message?: string | null
          payload?: Json | null
          transaction_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transaction_activity_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          amount_inr: number
          amount_npr: number
          commission: number
          commission_npr: number
          created_at: string
          created_by: string | null
          edit_reason: string | null
          event_id: string | null
          exchange_rate: number
          id: string
          notes: string | null
          paid_amount_npr: number
          payer_id: string | null
          payment_method: Database["public"]["Enums"]["payment_method"]
          receiver_id: string
          sender_id: string
          slip_number: string | null
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
          edit_reason?: string | null
          event_id?: string | null
          exchange_rate: number
          id?: string
          notes?: string | null
          paid_amount_npr?: number
          payer_id?: string | null
          payment_method?: Database["public"]["Enums"]["payment_method"]
          receiver_id: string
          sender_id: string
          slip_number?: string | null
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
          edit_reason?: string | null
          event_id?: string | null
          exchange_rate?: number
          id?: string
          notes?: string | null
          paid_amount_npr?: number
          payer_id?: string | null
          payment_method?: Database["public"]["Enums"]["payment_method"]
          receiver_id?: string
          sender_id?: string
          slip_number?: string | null
          status?: Database["public"]["Enums"]["transaction_status"]
          transaction_date?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_payer_id_fkey"
            columns: ["payer_id"]
            isOneToOne: false
            referencedRelation: "payers"
            referencedColumns: ["id"]
          },
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
      party_balances: {
        Row: {
          outstanding_npr: number | null
          party_id: string | null
          party_kind: Database["public"]["Enums"]["party_kind"] | null
          total_paid: number | null
          total_payable: number | null
        }
        Relationships: []
      }
      v_monthly_analytics: {
        Row: {
          commission_total: number | null
          inr_total: number | null
          month: string | null
          npr_total: number | null
          outstanding_total: number | null
          paid_total: number | null
          tx_count: number | null
        }
        Relationships: []
      }
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
      account_movement_kind:
        | "deposit"
        | "withdrawal"
        | "transfer_in"
        | "transfer_out"
        | "txn_inflow"
        | "txn_outflow"
        | "adjustment"
        | "opening"
      app_role: "admin" | "operator" | "viewer"
      ledger_account:
        | "indian_bank"
        | "cash_npr"
        | "bank_npr"
        | "esewa_pool"
        | "khalti_pool"
        | "ime_pool"
        | "commission"
        | "sender_advance"
        | "receiver_advance"
        | "payer_float"
      my_account_currency: "INR" | "NPR"
      my_account_kind: "bank" | "cash" | "wallet" | "other"
      party_kind: "sender" | "payer" | "receiver"
      payment_method:
        | "cash"
        | "bank_transfer"
        | "esewa"
        | "khalti"
        | "ime"
        | "other"
      settlement_kind: "advance_in" | "advance_out" | "adjustment" | "refund"
      transaction_status: "pending" | "paid" | "cancelled" | "partially_paid"
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
      account_movement_kind: [
        "deposit",
        "withdrawal",
        "transfer_in",
        "transfer_out",
        "txn_inflow",
        "txn_outflow",
        "adjustment",
        "opening",
      ],
      app_role: ["admin", "operator", "viewer"],
      ledger_account: [
        "indian_bank",
        "cash_npr",
        "bank_npr",
        "esewa_pool",
        "khalti_pool",
        "ime_pool",
        "commission",
        "sender_advance",
        "receiver_advance",
        "payer_float",
      ],
      my_account_currency: ["INR", "NPR"],
      my_account_kind: ["bank", "cash", "wallet", "other"],
      party_kind: ["sender", "payer", "receiver"],
      payment_method: [
        "cash",
        "bank_transfer",
        "esewa",
        "khalti",
        "ime",
        "other",
      ],
      settlement_kind: ["advance_in", "advance_out", "adjustment", "refund"],
      transaction_status: ["pending", "paid", "cancelled", "partially_paid"],
    },
  },
} as const
