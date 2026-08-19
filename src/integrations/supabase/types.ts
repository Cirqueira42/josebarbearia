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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      app_settings: {
        Row: {
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string
          value?: Json
        }
        Update: {
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      appointments: {
        Row: {
          appointment_date: string
          appointment_number: number | null
          appointment_time: string
          barber_id: string | null
          barber_name: string | null
          created_at: string
          customer_email: string | null
          customer_name: string
          customer_phone: string
          id: string
          reminder_sent: boolean
          seen_by_admin: boolean
          service_id: string | null
          service_name: string
          status: Database["public"]["Enums"]["appointment_status"]
        }
        Insert: {
          appointment_date: string
          appointment_number?: number | null
          appointment_time: string
          barber_id?: string | null
          barber_name?: string | null
          created_at?: string
          customer_email?: string | null
          customer_name: string
          customer_phone: string
          id?: string
          reminder_sent?: boolean
          seen_by_admin?: boolean
          service_id?: string | null
          service_name: string
          status?: Database["public"]["Enums"]["appointment_status"]
        }
        Update: {
          appointment_date?: string
          appointment_number?: number | null
          appointment_time?: string
          barber_id?: string | null
          barber_name?: string | null
          created_at?: string
          customer_email?: string | null
          customer_name?: string
          customer_phone?: string
          id?: string
          reminder_sent?: boolean
          seen_by_admin?: boolean
          service_id?: string | null
          service_name?: string
          status?: Database["public"]["Enums"]["appointment_status"]
        }
        Relationships: [
          {
            foreignKeyName: "appointments_barber_id_fkey"
            columns: ["barber_id"]
            isOneToOne: false
            referencedRelation: "barbers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      barbers: {
        Row: {
          commission_percent: number
          created_at: string
          enabled: boolean
          id: string
          name: string
        }
        Insert: {
          commission_percent?: number
          created_at?: string
          enabled?: boolean
          id?: string
          name: string
        }
        Update: {
          commission_percent?: number
          created_at?: string
          enabled?: boolean
          id?: string
          name?: string
        }
        Relationships: []
      }
      blocked_customers: {
        Row: {
          created_at: string
          customer_name: string | null
          customer_phone: string
          id: string
          reason: string | null
        }
        Insert: {
          created_at?: string
          customer_name?: string | null
          customer_phone: string
          id?: string
          reason?: string | null
        }
        Update: {
          created_at?: string
          customer_name?: string | null
          customer_phone?: string
          id?: string
          reason?: string | null
        }
        Relationships: []
      }
      blocked_slots: {
        Row: {
          blocked_date: string
          blocked_time: string | null
          created_at: string
          id: string
          reason: string | null
        }
        Insert: {
          blocked_date: string
          blocked_time?: string | null
          created_at?: string
          id?: string
          reason?: string | null
        }
        Update: {
          blocked_date?: string
          blocked_time?: string | null
          created_at?: string
          id?: string
          reason?: string | null
        }
        Relationships: []
      }
      cash_entries: {
        Row: {
          amount: number
          appointment_id: string | null
          category: string
          created_at: string
          description: string
          entry_date: string
          id: string
          investment_amount: number
          kind: string
          payment_method: string | null
          updated_at: string
        }
        Insert: {
          amount?: number
          appointment_id?: string | null
          category?: string
          created_at?: string
          description: string
          entry_date?: string
          id?: string
          investment_amount?: number
          kind?: string
          payment_method?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          appointment_id?: string | null
          category?: string
          created_at?: string
          description?: string
          entry_date?: string
          id?: string
          investment_amount?: number
          kind?: string
          payment_method?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      coupons: {
        Row: {
          active: boolean
          code: string
          created_at: string
          discount_percent: number
          id: string
          max_uses: number | null
          uses_count: number
          valid_until: string | null
        }
        Insert: {
          active?: boolean
          code: string
          created_at?: string
          discount_percent?: number
          id?: string
          max_uses?: number | null
          uses_count?: number
          valid_until?: string | null
        }
        Update: {
          active?: boolean
          code?: string
          created_at?: string
          discount_percent?: number
          id?: string
          max_uses?: number | null
          uses_count?: number
          valid_until?: string | null
        }
        Relationships: []
      }
      customers: {
        Row: {
          created_at: string
          email: string | null
          id: string
          last_appointment_date: string | null
          name: string
          notes: string | null
          phone: string
          total_appointments: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: string
          last_appointment_date?: string | null
          name: string
          notes?: string | null
          phone: string
          total_appointments?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          last_appointment_date?: string | null
          name?: string
          notes?: string | null
          phone?: string
          total_appointments?: number
          updated_at?: string
        }
        Relationships: []
      }
      daily_closures: {
        Row: {
          appointments_closed: number
          closure_date: string
          created_at: string
          id: string
          investment_total: number
          net_total: number
          total_in: number
          total_out: number
        }
        Insert: {
          appointments_closed?: number
          closure_date: string
          created_at?: string
          id?: string
          investment_total?: number
          net_total?: number
          total_in?: number
          total_out?: number
        }
        Update: {
          appointments_closed?: number
          closure_date?: string
          created_at?: string
          id?: string
          investment_total?: number
          net_total?: number
          total_in?: number
          total_out?: number
        }
        Relationships: []
      }
      expenses: {
        Row: {
          amount: number
          category: string
          created_at: string
          description: string
          expense_date: string
          id: string
        }
        Insert: {
          amount: number
          category?: string
          created_at?: string
          description: string
          expense_date?: string
          id?: string
        }
        Update: {
          amount?: number
          category?: string
          created_at?: string
          description?: string
          expense_date?: string
          id?: string
        }
        Relationships: []
      }
      gallery_photos: {
        Row: {
          caption: string | null
          created_at: string
          display_order: number
          id: string
          storage_path: string
        }
        Insert: {
          caption?: string | null
          created_at?: string
          display_order?: number
          id?: string
          storage_path: string
        }
        Update: {
          caption?: string | null
          created_at?: string
          display_order?: number
          id?: string
          storage_path?: string
        }
        Relationships: []
      }
      hero_backgrounds: {
        Row: {
          created_at: string
          display_order: number
          id: string
          storage_path: string
        }
        Insert: {
          created_at?: string
          display_order?: number
          id?: string
          storage_path: string
        }
        Update: {
          created_at?: string
          display_order?: number
          id?: string
          storage_path?: string
        }
        Relationships: []
      }
      loyalty: {
        Row: {
          created_at: string
          customer_name: string
          customer_phone: string
          free_services_earned: number
          free_services_redeemed: number
          id: string
          total_services: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          customer_name: string
          customer_phone: string
          free_services_earned?: number
          free_services_redeemed?: number
          id?: string
          total_services?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          customer_name?: string
          customer_phone?: string
          free_services_earned?: number
          free_services_redeemed?: number
          id?: string
          total_services?: number
          updated_at?: string
        }
        Relationships: []
      }
      loyalty_rewards: {
        Row: {
          code: string
          created_at: string
          customer_name: string | null
          customer_phone: string
          discount_amount: number
          id: string
          milestone: number
          reserved_appointment_id: string | null
          status: string
          updated_at: string
          used_appointment_id: string | null
          used_at: string | null
        }
        Insert: {
          code: string
          created_at?: string
          customer_name?: string | null
          customer_phone: string
          discount_amount?: number
          id?: string
          milestone?: number
          reserved_appointment_id?: string | null
          status?: string
          updated_at?: string
          used_appointment_id?: string | null
          used_at?: string | null
        }
        Update: {
          code?: string
          created_at?: string
          customer_name?: string | null
          customer_phone?: string
          discount_amount?: number
          id?: string
          milestone?: number
          reserved_appointment_id?: string | null
          status?: string
          updated_at?: string
          used_appointment_id?: string | null
          used_at?: string | null
        }
        Relationships: []
      }
      monthly_summaries: {
        Row: {
          appointments_count: number
          goal: number
          gross_total: number
          id: string
          manual_count: number
          month: number
          out_total: number
          products_qty: number
          products_total: number
          services_total: number
          ticket_avg: number
          top_product: string | null
          top_service: string | null
          unique_clients: number
          updated_at: string
          visits: number
          year: number
        }
        Insert: {
          appointments_count?: number
          goal?: number
          gross_total?: number
          id?: string
          manual_count?: number
          month: number
          out_total?: number
          products_qty?: number
          products_total?: number
          services_total?: number
          ticket_avg?: number
          top_product?: string | null
          top_service?: string | null
          unique_clients?: number
          updated_at?: string
          visits?: number
          year: number
        }
        Update: {
          appointments_count?: number
          goal?: number
          gross_total?: number
          id?: string
          manual_count?: number
          month?: number
          out_total?: number
          products_qty?: number
          products_total?: number
          services_total?: number
          ticket_avg?: number
          top_product?: string | null
          top_service?: string | null
          unique_clients?: number
          updated_at?: string
          visits?: number
          year?: number
        }
        Relationships: []
      }
      product_sales: {
        Row: {
          brand: string | null
          cash_entry_id: string | null
          created_at: string
          id: string
          product_id: string | null
          product_name: string
          qty: number
          sale_date: string
          total: number
          unit_price: number
        }
        Insert: {
          brand?: string | null
          cash_entry_id?: string | null
          created_at?: string
          id?: string
          product_id?: string | null
          product_name: string
          qty?: number
          sale_date?: string
          total?: number
          unit_price?: number
        }
        Update: {
          brand?: string | null
          cash_entry_id?: string | null
          created_at?: string
          id?: string
          product_id?: string | null
          product_name?: string
          qty?: number
          sale_date?: string
          total?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "product_sales_cash_entry_id_fkey"
            columns: ["cash_entry_id"]
            isOneToOne: false
            referencedRelation: "cash_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_sales_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          brand: string
          created_at: string
          description: string | null
          display_order: number
          highlight: string | null
          id: string
          image_path: string | null
          in_stock: boolean
          min_stock: number
          name: string
          price: number
          stock_qty: number
          updated_at: string
        }
        Insert: {
          brand: string
          created_at?: string
          description?: string | null
          display_order?: number
          highlight?: string | null
          id?: string
          image_path?: string | null
          in_stock?: boolean
          min_stock?: number
          name: string
          price?: number
          stock_qty?: number
          updated_at?: string
        }
        Update: {
          brand?: string
          created_at?: string
          description?: string | null
          display_order?: number
          highlight?: string | null
          id?: string
          image_path?: string | null
          in_stock?: boolean
          min_stock?: number
          name?: string
          price?: number
          stock_qty?: number
          updated_at?: string
        }
        Relationships: []
      }
      reviews: {
        Row: {
          appointment_id: string | null
          approved: boolean
          comment: string | null
          created_at: string
          customer_name: string
          customer_phone: string | null
          id: string
          rating: number
        }
        Insert: {
          appointment_id?: string | null
          approved?: boolean
          comment?: string | null
          created_at?: string
          customer_name: string
          customer_phone?: string | null
          id?: string
          rating: number
        }
        Update: {
          appointment_id?: string | null
          approved?: boolean
          comment?: string | null
          created_at?: string
          customer_name?: string
          customer_phone?: string | null
          id?: string
          rating?: number
        }
        Relationships: [
          {
            foreignKeyName: "reviews_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
        ]
      }
      services: {
        Row: {
          created_at: string
          description: string | null
          duration_minutes: number
          icon: string | null
          id: string
          image_path: string | null
          name: string
          price: number
        }
        Insert: {
          created_at?: string
          description?: string | null
          duration_minutes?: number
          icon?: string | null
          id?: string
          image_path?: string | null
          name: string
          price?: number
        }
        Update: {
          created_at?: string
          description?: string | null
          duration_minutes?: number
          icon?: string | null
          id?: string
          image_path?: string | null
          name?: string
          price?: number
        }
        Relationships: []
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
      consume_loyalty_reward: {
        Args: { _appointment_id: string }
        Returns: {
          code: string
          consumed: boolean
          discount_amount: number
        }[]
      }
      create_appointment: {
        Args: {
          _appointment_date: string
          _appointment_time: string
          _barber_id?: string
          _barber_name?: string
          _customer_email?: string
          _customer_name: string
          _customer_phone: string
          _service_id: string
          _service_name: string
        }
        Returns: {
          appointment_id: string
          appointment_number: number
          barber_name: string
        }[]
      }
      get_active_reward: {
        Args: { _phone: string }
        Returns: {
          code: string
          discount_amount: number
        }[]
      }
      get_appointment_reward: {
        Args: { _appointment_id: string }
        Returns: {
          code: string
          discount_amount: number
          status: string
        }[]
      }
      get_booked_slots: {
        Args: { _date: string }
        Returns: {
          appointment_time: string
          barber_id: string
          service_name: string
        }[]
      }
      get_loyalty_progress: {
        Args: { _phone: string }
        Returns: {
          available: number
          free_services_earned: number
          free_services_redeemed: number
          goal: number
          has_reward: boolean
          progress: number
          total_services: number
        }[]
      }
      get_reward_by_code: {
        Args: { _code: string; _phone: string }
        Returns: {
          code: string
          discount_amount: number
          status: string
        }[]
      }
      get_top_product: {
        Args: never
        Returns: {
          product_id: string
          product_name: string
          total_qty: number
        }[]
      }
      handle_loyalty_change: {
        Args: { _appointment_id: string; _delta: number }
        Returns: number
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_phone_blocked: { Args: { _phone: string }; Returns: boolean }
      issue_loyalty_rewards: {
        Args: { _name?: string; _phone: string }
        Returns: number
      }
      lookup_customer_by_phone: {
        Args: { _phone: string }
        Returns: {
          customer_email: string
          customer_name: string
        }[]
      }
      redeem_loyalty_code: {
        Args: { _code: string; _phone: string }
        Returns: {
          message: string
          valid: boolean
        }[]
      }
      release_loyalty_reward: {
        Args: { _appointment_id: string }
        Returns: boolean
      }
      reserve_loyalty_reward: {
        Args: { _appointment_id: string; _code: string; _phone: string }
        Returns: {
          message: string
          valid: boolean
        }[]
      }
      upsert_customer: {
        Args: { _date?: string; _email?: string; _name: string; _phone: string }
        Returns: undefined
      }
      validate_coupon: {
        Args: { _code: string }
        Returns: {
          discount_percent: number
          message: string
          valid: boolean
        }[]
      }
    }
    Enums: {
      app_role: "admin" | "user"
      appointment_status: "pending" | "confirmed" | "cancelled" | "completed"
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
      app_role: ["admin", "user"],
      appointment_status: ["pending", "confirmed", "cancelled", "completed"],
    },
  },
} as const
