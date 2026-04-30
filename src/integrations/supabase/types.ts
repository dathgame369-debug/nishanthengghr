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
      advances: {
        Row: {
          advance_amount: number
          advance_date: string
          created_at: string
          deduction_history: Json
          deduction_type: string
          employee_id: string
          employee_name: string
          id: string
          monthly_deduction_amount: number
          notes: string
          remaining_balance: number
          status: string
          total_deducted: number
        }
        Insert: {
          advance_amount?: number
          advance_date?: string
          created_at?: string
          deduction_history?: Json
          deduction_type?: string
          employee_id: string
          employee_name: string
          id: string
          monthly_deduction_amount?: number
          notes?: string
          remaining_balance?: number
          status?: string
          total_deducted?: number
        }
        Update: {
          advance_amount?: number
          advance_date?: string
          created_at?: string
          deduction_history?: Json
          deduction_type?: string
          employee_id?: string
          employee_name?: string
          id?: string
          monthly_deduction_amount?: number
          notes?: string
          remaining_balance?: number
          status?: string
          total_deducted?: number
        }
        Relationships: []
      }
      departments: {
        Row: {
          created_at: string
          id: string
          name: string
          status: string
        }
        Insert: {
          created_at?: string
          id: string
          name: string
          status?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          status?: string
        }
        Relationships: []
      }
      employees: {
        Row: {
          created_at: string
          date_of_joining: string
          department: string
          designation: string
          fixed_salary: number
          id: string
          name: string
          phone: string
          status: string
        }
        Insert: {
          created_at?: string
          date_of_joining?: string
          department?: string
          designation?: string
          fixed_salary?: number
          id: string
          name: string
          phone?: string
          status?: string
        }
        Update: {
          created_at?: string
          date_of_joining?: string
          department?: string
          designation?: string
          fixed_salary?: number
          id?: string
          name?: string
          phone?: string
          status?: string
        }
        Relationships: []
      }
      payroll: {
        Row: {
          advance_deduction: number
          bonus: number
          created_at: string
          date: string
          employee_id: string
          employee_name: string
          holiday_amount: number
          holidays: number
          id: string
          month: string
          monthly_salary: number
          net_payable: number
          ot_amount: number
          ot_hours: number
          present_amount: number
          present_days: number
          welfare_amount: number
          year: number
        }
        Insert: {
          advance_deduction?: number
          bonus?: number
          created_at?: string
          date?: string
          employee_id: string
          employee_name: string
          holiday_amount?: number
          holidays?: number
          id: string
          month?: string
          monthly_salary?: number
          net_payable?: number
          ot_amount?: number
          ot_hours?: number
          present_amount?: number
          present_days?: number
          welfare_amount?: number
          year?: number
        }
        Update: {
          advance_deduction?: number
          bonus?: number
          created_at?: string
          date?: string
          employee_id?: string
          employee_name?: string
          holiday_amount?: number
          holidays?: number
          id?: string
          month?: string
          monthly_salary?: number
          net_payable?: number
          ot_amount?: number
          ot_hours?: number
          present_amount?: number
          present_days?: number
          welfare_amount?: number
          year?: number
        }
        Relationships: []
      }
      roles: {
        Row: {
          created_at: string
          department: string
          id: string
          name: string
          status: string
        }
        Insert: {
          created_at?: string
          department?: string
          id: string
          name: string
          status?: string
        }
        Update: {
          created_at?: string
          department?: string
          id?: string
          name?: string
          status?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
