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
      interessenten: {
        Row: {
          ansprechpartner: string
          call_notwendig: string
          call_notwendig_grund: string | null
          created_at: string
          email: string
          id: string
          mobilfunknummer: string | null
          nische: string
          status: string
          telefonnummer: string
          unternehmensname: string
          updated_at: string
          user_id: string
        }
        Insert: {
          ansprechpartner: string
          call_notwendig?: string
          call_notwendig_grund?: string | null
          created_at?: string
          email: string
          id?: string
          mobilfunknummer?: string | null
          nische: string
          status?: string
          telefonnummer: string
          unternehmensname: string
          updated_at?: string
          user_id: string
        }
        Update: {
          ansprechpartner?: string
          call_notwendig?: string
          call_notwendig_grund?: string | null
          created_at?: string
          email?: string
          id?: string
          mobilfunknummer?: string | null
          nische?: string
          status?: string
          telefonnummer?: string
          unternehmensname?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      interessenten_calls: {
        Row: {
          created_at: string
          id: string
          interessent_id: string
          notiz: string | null
          typ: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          interessent_id: string
          notiz?: string | null
          typ?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          interessent_id?: string
          notiz?: string | null
          typ?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "interessenten_calls_interessent_id_fkey"
            columns: ["interessent_id"]
            isOneToOne: false
            referencedRelation: "interessenten"
            referencedColumns: ["id"]
          },
        ]
      }
      interessenten_email_verlauf: {
        Row: {
          created_at: string
          id: string
          interessent_id: string
          screenshot_path: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          interessent_id: string
          screenshot_path: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          interessent_id?: string
          screenshot_path?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "interessenten_email_verlauf_interessent_id_fkey"
            columns: ["interessent_id"]
            isOneToOne: false
            referencedRelation: "interessenten"
            referencedColumns: ["id"]
          },
        ]
      }
      interessenten_notizen: {
        Row: {
          created_at: string
          id: string
          interessent_id: string
          notiz: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          interessent_id: string
          notiz: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          interessent_id?: string
          notiz?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "interessenten_notizen_interessent_id_fkey"
            columns: ["interessent_id"]
            isOneToOne: false
            referencedRelation: "interessenten"
            referencedColumns: ["id"]
          },
        ]
      }
      nischen: {
        Row: {
          bestandsliste_path: string | null
          created_at: string
          empfaenger: number
          id: string
          insolventes_unternehmen: string | null
          kanzlei: string | null
          nische: string
          pkw_dropbox_url: string | null
          transporter_dropbox_url: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          bestandsliste_path?: string | null
          created_at?: string
          empfaenger: number
          id?: string
          insolventes_unternehmen?: string | null
          kanzlei?: string | null
          nische: string
          pkw_dropbox_url?: string | null
          transporter_dropbox_url?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          bestandsliste_path?: string | null
          created_at?: string
          empfaenger?: number
          id?: string
          insolventes_unternehmen?: string | null
          kanzlei?: string | null
          nische?: string
          pkw_dropbox_url?: string | null
          transporter_dropbox_url?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_status_colors: {
        Row: {
          color: string
          created_at: string
          id: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          color: string
          created_at?: string
          id?: string
          status: string
          updated_at?: string
          user_id: string
        }
        Update: {
          color?: string
          created_at?: string
          id?: string
          status?: string
          updated_at?: string
          user_id?: string
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
