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
          name: string
          price: number
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
          name: string
          price?: number
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
          name?: string
          price?: number
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
          progress: number
          total_services: number
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_phone_blocked: { Args: { _phone: string }; Returns: boolean }
      lookup_customer_by_phone: {
        Args: { _phone: string }
        Returns: {
          customer_email: string
          customer_name: string
        }[]
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
