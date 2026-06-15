export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      hr_alerts: {
        Row: {
          alert_type: string
          created_at: string
          employee_id: string
          id: string
          sent_at: string | null
          status: string
          trigger_date: string
        }
        Insert: {
          alert_type: string
          created_at?: string
          employee_id: string
          id?: string
          sent_at?: string | null
          status?: string
          trigger_date: string
        }
        Update: {
          alert_type?: string
          created_at?: string
          employee_id?: string
          id?: string
          sent_at?: string | null
          status?: string
          trigger_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "hr_alerts_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "hr_employees"
            referencedColumns: ["id"]
          },
        ]
      }
      hr_attendance: {
        Row: {
          check_in_at: string
          check_in_location: Json | null
          check_out_at: string | null
          created_at: string
          employee_id: string
          id: string
          is_late: boolean
          work_hours: number | null
        }
        Insert: {
          check_in_at: string
          check_in_location?: Json | null
          check_out_at?: string | null
          created_at?: string
          employee_id: string
          id?: string
          is_late?: boolean
          work_hours?: number | null
        }
        Update: {
          check_in_at?: string
          check_in_location?: Json | null
          check_out_at?: string | null
          created_at?: string
          employee_id?: string
          id?: string
          is_late?: boolean
          work_hours?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "hr_attendance_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "hr_employees"
            referencedColumns: ["id"]
          },
        ]
      }
      hr_employees: {
        Row: {
          contract_start: string | null
          contract_type: string | null
          created_at: string
          date_of_birth: string | null
          department: string | null
          email: string | null
          employee_code: string | null
          housing_allowance: number | null
          id: string
          line_user_id: string | null
          name: string
          pay_type: string
          phone: string | null
          position: string | null
          probation_end: string | null
          role: string
          salary: number | null
          status: string
          updated_at: string
          visa_expiry: string | null
          work_permit_expiry: string | null
        }
        Insert: {
          contract_start?: string | null
          contract_type?: string | null
          created_at?: string
          date_of_birth?: string | null
          department?: string | null
          email?: string | null
          employee_code?: string | null
          housing_allowance?: number | null
          id?: string
          line_user_id?: string | null
          name: string
          pay_type?: string
          phone?: string | null
          position?: string | null
          probation_end?: string | null
          role?: string
          salary?: number | null
          status?: string
          updated_at?: string
          visa_expiry?: string | null
          work_permit_expiry?: string | null
        }
        Update: {
          contract_start?: string | null
          contract_type?: string | null
          created_at?: string
          date_of_birth?: string | null
          department?: string | null
          email?: string | null
          employee_code?: string | null
          housing_allowance?: number | null
          id?: string
          line_user_id?: string | null
          name?: string
          pay_type?: string
          phone?: string | null
          position?: string | null
          probation_end?: string | null
          role?: string
          salary?: number | null
          status?: string
          updated_at?: string
          visa_expiry?: string | null
          work_permit_expiry?: string | null
        }
        Relationships: []
      }
      hr_payroll_config: {
        Row: {
          key: string
          updated_at: string
          value: string
        }
        Insert: {
          key: string
          updated_at?: string
          value: string
        }
        Update: {
          key?: string
          updated_at?: string
          value?: string
        }
        Relationships: []
      }
      hr_leave_balances: {
        Row: {
          employee_id: string
          leave_type: string
          total_days: number
          updated_at: string
          used_days: number
        }
        Insert: {
          employee_id: string
          leave_type: string
          total_days?: number
          updated_at?: string
          used_days?: number
        }
        Update: {
          employee_id?: string
          leave_type?: string
          total_days?: number
          updated_at?: string
          used_days?: number
        }
        Relationships: [
          {
            foreignKeyName: "hr_leave_balances_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "hr_employees"
            referencedColumns: ["id"]
          },
        ]
      }
      hr_leave_policy_defaults: {
        Row: {
          annual_days: number
          leave_type: string
          updated_at: string
        }
        Insert: {
          annual_days?: number
          leave_type: string
          updated_at?: string
        }
        Update: {
          annual_days?: number
          leave_type?: string
          updated_at?: string
        }
        Relationships: []
      }
      hr_leaves: {
        Row: {
          approved_by: string | null
          attachment_url: string | null
          created_at: string
          employee_id: string
          end_date: string
          id: string
          reason: string | null
          start_date: string
          status: string
          type: string
          updated_at: string
        }
        Insert: {
          approved_by?: string | null
          attachment_url?: string | null
          created_at?: string
          employee_id: string
          end_date: string
          id?: string
          reason?: string | null
          start_date: string
          status?: string
          type: string
          updated_at?: string
        }
        Update: {
          approved_by?: string | null
          attachment_url?: string | null
          created_at?: string
          employee_id?: string
          end_date?: string
          id?: string
          reason?: string | null
          start_date?: string
          status?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "hr_leaves_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "hr_employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hr_leaves_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "hr_employees"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      hr_employee_id: { Args: never; Returns: string }
      hr_is_hr_admin: { Args: never; Returns: boolean }
      hr_line_user_id: { Args: never; Returns: string }
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const
