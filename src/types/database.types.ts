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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      admin_profile: {
        Row: {
          created_at: string
          email: string
          first_name: string
          is_active: boolean
          last_name: string
          last_sign_in_at: string | null
          phone_num: string | null
          profile_img: string | null
          role: Database["public"]["Enums"]["admin_role"]
          updated_at: string
          uuid: string
          wallet_account: string | null
        }
        Insert: {
          created_at?: string
          email: string
          first_name: string
          is_active?: boolean
          last_name: string
          last_sign_in_at?: string | null
          phone_num?: string | null
          profile_img?: string | null
          role?: Database["public"]["Enums"]["admin_role"]
          updated_at?: string
          uuid: string
          wallet_account?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          first_name?: string
          is_active?: boolean
          last_name?: string
          last_sign_in_at?: string | null
          phone_num?: string | null
          profile_img?: string | null
          role?: Database["public"]["Enums"]["admin_role"]
          updated_at?: string
          uuid?: string
          wallet_account?: string | null
        }
        Relationships: []
      }
      driver_profile: {
        Row: {
          account_name: string | null
          address: string | null
          admin_verify: boolean
          bank_name: string | null
          budpay_customer_code: string | null
          check1: boolean
          check2: boolean
          city: string | null
          created_at: string
          email: string
          experience: string | null
          expo_push_token: string | null
          first_name: string
          health_status: string
          health_yes: string | null
          is_online: boolean
          last_name: string
          license_upload: string | null
          location_lat: number | null
          location_lng: number | null
          nin: string | null
          payout_account_name: string | null
          payout_account_number: string | null
          payout_bank_code: string | null
          payout_bank_name: string | null
          phone_num: string
          phone_verified: boolean
          profile_img: string | null
          push_notification: boolean
          push_token_updated_at: string | null
          state: string | null
          transfer_pin: string | null
          updated_at: string
          uuid: string
          vehicle_type: string | null
          wallet_account: string | null
          wallet_balance: number
        }
        Insert: {
          account_name?: string | null
          address?: string | null
          admin_verify?: boolean
          bank_name?: string | null
          budpay_customer_code?: string | null
          check1?: boolean
          check2?: boolean
          city?: string | null
          created_at?: string
          email: string
          experience?: string | null
          expo_push_token?: string | null
          first_name: string
          health_status?: string
          health_yes?: string | null
          is_online?: boolean
          last_name: string
          license_upload?: string | null
          location_lat?: number | null
          location_lng?: number | null
          nin?: string | null
          payout_account_name?: string | null
          payout_account_number?: string | null
          payout_bank_code?: string | null
          payout_bank_name?: string | null
          phone_num: string
          phone_verified?: boolean
          profile_img?: string | null
          push_notification?: boolean
          push_token_updated_at?: string | null
          state?: string | null
          transfer_pin?: string | null
          updated_at?: string
          uuid: string
          vehicle_type?: string | null
          wallet_account?: string | null
          wallet_balance?: number
        }
        Update: {
          account_name?: string | null
          address?: string | null
          admin_verify?: boolean
          bank_name?: string | null
          budpay_customer_code?: string | null
          check1?: boolean
          check2?: boolean
          city?: string | null
          created_at?: string
          email?: string
          experience?: string | null
          expo_push_token?: string | null
          first_name?: string
          health_status?: string
          health_yes?: string | null
          is_online?: boolean
          last_name?: string
          license_upload?: string | null
          location_lat?: number | null
          location_lng?: number | null
          nin?: string | null
          payout_account_name?: string | null
          payout_account_number?: string | null
          payout_bank_code?: string | null
          payout_bank_name?: string | null
          phone_num?: string
          phone_verified?: boolean
          profile_img?: string | null
          push_notification?: boolean
          push_token_updated_at?: string | null
          state?: string | null
          transfer_pin?: string | null
          updated_at?: string
          uuid?: string
          vehicle_type?: string | null
          wallet_account?: string | null
          wallet_balance?: number
        }
        Relationships: []
      }
      driver_transaction: {
        Row: {
          account_name: string | null
          account_number: string | null
          amount: number
          bank_code: string | null
          bank_name: string | null
          channel: string | null
          created_at: string
          currency: string
          driver_uuid: string
          fee: number
          gateway: string | null
          id: string
          narration: string | null
          paid_at: string | null
          raw_payload: Json | null
          reference: string
          requested_amount: number | null
          sender_account: string | null
          sender_name: string | null
          status: string
          type: string
        }
        Insert: {
          account_name?: string | null
          account_number?: string | null
          amount: number
          bank_code?: string | null
          bank_name?: string | null
          channel?: string | null
          created_at?: string
          currency?: string
          driver_uuid: string
          fee?: number
          gateway?: string | null
          id?: string
          narration?: string | null
          paid_at?: string | null
          raw_payload?: Json | null
          reference: string
          requested_amount?: number | null
          sender_account?: string | null
          sender_name?: string | null
          status?: string
          type: string
        }
        Update: {
          account_name?: string | null
          account_number?: string | null
          amount?: number
          bank_code?: string | null
          bank_name?: string | null
          channel?: string | null
          created_at?: string
          currency?: string
          driver_uuid?: string
          fee?: number
          gateway?: string | null
          id?: string
          narration?: string | null
          paid_at?: string | null
          raw_payload?: Json | null
          reference?: string
          requested_amount?: number | null
          sender_account?: string | null
          sender_name?: string | null
          status?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "driver_transaction_driver_uuid_fkey"
            columns: ["driver_uuid"]
            isOneToOne: false
            referencedRelation: "driver_profile"
            referencedColumns: ["uuid"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string
          created_at: string
          data: Json | null
          id: string
          is_read: boolean
          read_at: string | null
          recipient_id: string
          recipient_role: string
          title: string
          type: string
        }
        Insert: {
          body: string
          created_at?: string
          data?: Json | null
          id?: string
          is_read?: boolean
          read_at?: string | null
          recipient_id: string
          recipient_role: string
          title: string
          type?: string
        }
        Update: {
          body?: string
          created_at?: string
          data?: Json | null
          id?: string
          is_read?: boolean
          read_at?: string | null
          recipient_id?: string
          recipient_role?: string
          title?: string
          type?: string
        }
        Relationships: []
      }
      ride_chat_message: {
        Row: {
          booking_id: string
          created_at: string
          id: string
          message: string
          sender_role: string
          sender_uuid: string
        }
        Insert: {
          booking_id: string
          created_at?: string
          id?: string
          message: string
          sender_role: string
          sender_uuid: string
        }
        Update: {
          booking_id?: string
          created_at?: string
          id?: string
          message?: string
          sender_role?: string
          sender_uuid?: string
        }
        Relationships: [
          {
            foreignKeyName: "ride_chat_message_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "rider_booking"
            referencedColumns: ["id"]
          },
        ]
      }
      rider_booking: {
        Row: {
          add_stop: string | null
          addstop_lat: number | null
          addstop_lng: number | null
          amount: number
          assigned_driver: string | null
          base_fare: number
          created_at: string
          delay_fare: number
          distance_fare: number
          driver_arrived_at: string | null
          drop_lat: number
          drop_lng: number
          drop_off: string
          guest_rider: boolean
          guest_rider_name: string | null
          guest_rider_number: string | null
          id: string
          payment_method: string
          pick_up: string
          pickup_lat: number
          pickup_lng: number
          pricing_id: string | null
          ride_status: string
          rider_id: string
          state_levy: number
          time_fare: number
          total_fare: number
          total_km: number | null
          total_time: number | null
          trip_completed_at: string | null
          trip_started_at: string | null
          updated_at: string
          vat_amount: number
          vehicle_type: string
        }
        Insert: {
          add_stop?: string | null
          addstop_lat?: number | null
          addstop_lng?: number | null
          amount?: number
          assigned_driver?: string | null
          base_fare?: number
          created_at?: string
          delay_fare?: number
          distance_fare?: number
          driver_arrived_at?: string | null
          drop_lat: number
          drop_lng: number
          drop_off: string
          guest_rider?: boolean
          guest_rider_name?: string | null
          guest_rider_number?: string | null
          id?: string
          payment_method: string
          pick_up: string
          pickup_lat: number
          pickup_lng: number
          pricing_id?: string | null
          ride_status?: string
          rider_id: string
          state_levy?: number
          time_fare?: number
          total_fare?: number
          total_km?: number | null
          total_time?: number | null
          trip_completed_at?: string | null
          trip_started_at?: string | null
          updated_at?: string
          vat_amount?: number
          vehicle_type: string
        }
        Update: {
          add_stop?: string | null
          addstop_lat?: number | null
          addstop_lng?: number | null
          amount?: number
          assigned_driver?: string | null
          base_fare?: number
          created_at?: string
          delay_fare?: number
          distance_fare?: number
          driver_arrived_at?: string | null
          drop_lat?: number
          drop_lng?: number
          drop_off?: string
          guest_rider?: boolean
          guest_rider_name?: string | null
          guest_rider_number?: string | null
          id?: string
          payment_method?: string
          pick_up?: string
          pickup_lat?: number
          pickup_lng?: number
          pricing_id?: string | null
          ride_status?: string
          rider_id?: string
          state_levy?: number
          time_fare?: number
          total_fare?: number
          total_km?: number | null
          total_time?: number | null
          trip_completed_at?: string | null
          trip_started_at?: string | null
          updated_at?: string
          vat_amount?: number
          vehicle_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "rider_booking_pricing_id_fkey"
            columns: ["pricing_id"]
            isOneToOne: false
            referencedRelation: "vehicle_pricing"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rider_booking_rider_id_fkey"
            columns: ["rider_id"]
            isOneToOne: false
            referencedRelation: "rider_profile"
            referencedColumns: ["uuid"]
          },
        ]
      }
      rider_profile: {
        Row: {
          account_name: string | null
          bank_name: string | null
          budpay_customer_code: string | null
          city: string | null
          created_at: string
          email: string
          first_name: string
          last_name: string
          location_lat: number | null
          location_lng: number | null
          phone_num: string
          phone_verified: boolean
          profile_img: string | null
          push_notification: boolean
          state: string | null
          updated_at: string
          uuid: string
          wallet_account: string | null
          wallet_balance: number
        }
        Insert: {
          account_name?: string | null
          bank_name?: string | null
          budpay_customer_code?: string | null
          city?: string | null
          created_at?: string
          email: string
          first_name: string
          last_name: string
          location_lat?: number | null
          location_lng?: number | null
          phone_num: string
          phone_verified?: boolean
          profile_img?: string | null
          push_notification?: boolean
          state?: string | null
          updated_at?: string
          uuid: string
          wallet_account?: string | null
          wallet_balance?: number
        }
        Update: {
          account_name?: string | null
          bank_name?: string | null
          budpay_customer_code?: string | null
          city?: string | null
          created_at?: string
          email?: string
          first_name?: string
          last_name?: string
          location_lat?: number | null
          location_lng?: number | null
          phone_num?: string
          phone_verified?: boolean
          profile_img?: string | null
          push_notification?: boolean
          state?: string | null
          updated_at?: string
          uuid?: string
          wallet_account?: string | null
          wallet_balance?: number
        }
        Relationships: []
      }
      rider_transaction: {
        Row: {
          amount: number
          channel: string | null
          created_at: string
          currency: string
          fees: number
          gateway: string | null
          id: string
          narration: string | null
          paid_at: string | null
          raw_payload: Json | null
          reference: string
          requested_amount: number | null
          rider_uuid: string
          sender_account: string | null
          sender_name: string | null
          status: string
          type: string
        }
        Insert: {
          amount: number
          channel?: string | null
          created_at?: string
          currency?: string
          fees?: number
          gateway?: string | null
          id?: string
          narration?: string | null
          paid_at?: string | null
          raw_payload?: Json | null
          reference: string
          requested_amount?: number | null
          rider_uuid: string
          sender_account?: string | null
          sender_name?: string | null
          status?: string
          type?: string
        }
        Update: {
          amount?: number
          channel?: string | null
          created_at?: string
          currency?: string
          fees?: number
          gateway?: string | null
          id?: string
          narration?: string | null
          paid_at?: string | null
          raw_payload?: Json | null
          reference?: string
          requested_amount?: number | null
          rider_uuid?: string
          sender_account?: string | null
          sender_name?: string | null
          status?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "rider_transaction_rider_uuid_fkey"
            columns: ["rider_uuid"]
            isOneToOne: false
            referencedRelation: "rider_profile"
            referencedColumns: ["uuid"]
          },
        ]
      }
      schedule_booking: {
        Row: {
          add_stop: string | null
          addstop_lat: number | null
          addstop_lng: number | null
          amount: number
          assigned_driver: string | null
          base_fare: number
          booking_status: string
          converted_rider_booking_id: string | null
          created_at: string
          delay_fare: number
          distance_fare: number
          drop_lat: number | null
          drop_lng: number | null
          drop_off: string | null
          guest_rider: boolean
          guest_rider_name: string | null
          guest_rider_number: string | null
          id: string
          passenger_num: number
          payment_method: string | null
          pick_up: string
          pickup_lat: number | null
          pickup_lng: number | null
          pickup_time: string
          pricing_id: string | null
          rider_id: string
          schedule_date: string
          schedule_type: string
          state_levy: number
          time_fare: number
          total_fare: number
          updated_at: string
          vat_amount: number
          vehicle_type: string | null
        }
        Insert: {
          add_stop?: string | null
          addstop_lat?: number | null
          addstop_lng?: number | null
          amount?: number
          assigned_driver?: string | null
          base_fare?: number
          booking_status?: string
          converted_rider_booking_id?: string | null
          created_at?: string
          delay_fare?: number
          distance_fare?: number
          drop_lat?: number | null
          drop_lng?: number | null
          drop_off?: string | null
          guest_rider?: boolean
          guest_rider_name?: string | null
          guest_rider_number?: string | null
          id?: string
          passenger_num?: number
          payment_method?: string | null
          pick_up: string
          pickup_lat?: number | null
          pickup_lng?: number | null
          pickup_time: string
          pricing_id?: string | null
          rider_id: string
          schedule_date: string
          schedule_type?: string
          state_levy?: number
          time_fare?: number
          total_fare?: number
          updated_at?: string
          vat_amount?: number
          vehicle_type?: string | null
        }
        Update: {
          add_stop?: string | null
          addstop_lat?: number | null
          addstop_lng?: number | null
          amount?: number
          assigned_driver?: string | null
          base_fare?: number
          booking_status?: string
          converted_rider_booking_id?: string | null
          created_at?: string
          delay_fare?: number
          distance_fare?: number
          drop_lat?: number | null
          drop_lng?: number | null
          drop_off?: string | null
          guest_rider?: boolean
          guest_rider_name?: string | null
          guest_rider_number?: string | null
          id?: string
          passenger_num?: number
          payment_method?: string | null
          pick_up?: string
          pickup_lat?: number | null
          pickup_lng?: number | null
          pickup_time?: string
          pricing_id?: string | null
          rider_id?: string
          schedule_date?: string
          schedule_type?: string
          state_levy?: number
          time_fare?: number
          total_fare?: number
          updated_at?: string
          vat_amount?: number
          vehicle_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "schedule_booking_converted_rider_booking_id_fkey"
            columns: ["converted_rider_booking_id"]
            isOneToOne: false
            referencedRelation: "rider_booking"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedule_booking_pricing_id_fkey"
            columns: ["pricing_id"]
            isOneToOne: false
            referencedRelation: "vehicle_pricing"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedule_booking_rider_id_fkey"
            columns: ["rider_id"]
            isOneToOne: false
            referencedRelation: "rider_profile"
            referencedColumns: ["uuid"]
          },
        ]
      }
      vehicle_management: {
        Row: {
          access: string | null
          access_duration: string | null
          assigned: string | null
          assigned_date: string | null
          created_at: string
          id: string
          updated_at: string
          vehicle_model: string | null
          vehicle_num: string | null
          vehicle_type: string | null
        }
        Insert: {
          access?: string | null
          access_duration?: string | null
          assigned?: string | null
          assigned_date?: string | null
          created_at?: string
          id?: string
          updated_at?: string
          vehicle_model?: string | null
          vehicle_num?: string | null
          vehicle_type?: string | null
        }
        Update: {
          access?: string | null
          access_duration?: string | null
          assigned?: string | null
          assigned_date?: string | null
          created_at?: string
          id?: string
          updated_at?: string
          vehicle_model?: string | null
          vehicle_num?: string | null
          vehicle_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vehicle_management_assigned_fkey"
            columns: ["assigned"]
            isOneToOne: false
            referencedRelation: "driver_profile"
            referencedColumns: ["uuid"]
          },
        ]
      }
      vehicle_pricing: {
        Row: {
          base_fare: number
          created_at: string
          delay_price_per_min: number
          free_delay_mins: number
          id: string
          is_active: boolean
          max_delay_mins: number
          price_per_km: number
          price_per_min: number
          state_levy: number
          vat_percentage: number
          vehicle_type: string
        }
        Insert: {
          base_fare: number
          created_at?: string
          delay_price_per_min: number
          free_delay_mins?: number
          id?: string
          is_active?: boolean
          max_delay_mins?: number
          price_per_km: number
          price_per_min: number
          state_levy?: number
          vat_percentage?: number
          vehicle_type: string
        }
        Update: {
          base_fare?: number
          created_at?: string
          delay_price_per_min?: number
          free_delay_mins?: number
          id?: string
          is_active?: boolean
          max_delay_mins?: number
          price_per_km?: number
          price_per_min?: number
          state_levy?: number
          vat_percentage?: number
          vehicle_type?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      calculate_trip_fare: {
        Args: {
          p_booking_id: string
          p_distance_km: number
          p_duration_min: number
        }
        Returns: {
          base_fare: number
          delay_fare: number
          distance_fare: number
          state_levy: number
          subtotal: number
          time_fare: number
          total_fare: number
          vat_amount: number
        }[]
      }
      can_rider_view_assigned_driver_profile: {
        Args: { p_driver_uuid: string }
        Returns: boolean
      }
      current_admin_role: {
        Args: never
        Returns: Database["public"]["Enums"]["admin_role"]
      }
      decrement_driver_wallet_balance_if_sufficient: {
        Args: { p_amount: number; p_driver_uuid: string }
        Returns: boolean
      }
      driver_has_transfer_pin: { Args: never; Returns: boolean }
      increment_driver_wallet_balance: {
        Args: { p_amount: number; p_driver_uuid: string }
        Returns: undefined
      }
      increment_wallet_balance: {
        Args: { p_amount: number; p_rider_uuid: string }
        Returns: undefined
      }
      is_active_admin: { Args: never; Returns: boolean }
      send_ride_chat_message: {
        Args: { p_booking_id: string; p_message: string }
        Returns: {
          booking_id: string
          created_at: string
          id: string
          message: string
          sender_role: string
          sender_uuid: string
        }
        SetofOptions: {
          from: "*"
          to: "ride_chat_message"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      set_driver_transfer_pin: {
        Args: { p_driver_uuid: string; p_pin: string }
        Returns: undefined
      }
      touch_admin_last_sign_in: { Args: never; Returns: undefined }
      verify_driver_transfer_pin: {
        Args: { p_driver_uuid: string; p_pin: string }
        Returns: boolean
      }
    }
    Enums: {
      admin_role:
        | "super-admin"
        | "finance"
        | "marketing"
        | "manager"
        | "support"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      admin_role: ["super-admin", "finance", "marketing", "manager", "support"],
    },
  },
} as const
