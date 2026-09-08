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
      AAA2_contacts: {
        Row: {
          avatar_url: string | null
          created_at: string
          id: string
          nome: string
          telefono: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          id?: string
          nome: string
          telefono: string
          user_id?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          id?: string
          nome?: string
          telefono?: string
          user_id?: string
        }
        Relationships: []
      }
      AAA3_chat_messages: {
        Row: {
          body: string | null
          created_at: string
          id: string
          image_paths: string[]
          room_id: string
          sender_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          image_paths?: string[]
          room_id: string
          sender_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          image_paths?: string[]
          room_id?: string
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "AAA3_chat_messages_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "AAA3_rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "AAA3_chat_messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "AAA3_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      AAA3_profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          id: string
          username: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          id: string
          username: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          id?: string
          username?: string
        }
        Relationships: []
      }
      AAA3_push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          p256dh: string
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          p256dh: string
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          p256dh?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "AAA3_push_subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "AAA3_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      AAA3_room_invites: {
        Row: {
          code: string
          created_at: string
          created_by: string
          expires_at: string | null
          id: string
          max_uses: number | null
          revoked_at: string | null
          room_id: string
          uses_count: number
        }
        Insert: {
          code?: string
          created_at?: string
          created_by: string
          expires_at?: string | null
          id?: string
          max_uses?: number | null
          revoked_at?: string | null
          room_id: string
          uses_count?: number
        }
        Update: {
          code?: string
          created_at?: string
          created_by?: string
          expires_at?: string | null
          id?: string
          max_uses?: number | null
          revoked_at?: string | null
          room_id?: string
          uses_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "AAA3_room_invites_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "AAA3_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "AAA3_room_invites_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "AAA3_rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      AAA3_room_members: {
        Row: {
          joined_at: string
          role: string
          room_id: string
          user_id: string
        }
        Insert: {
          joined_at?: string
          role: string
          room_id: string
          user_id: string
        }
        Update: {
          joined_at?: string
          role?: string
          room_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "AAA3_room_members_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "AAA3_rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "AAA3_room_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "AAA3_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      AAA3_rooms: {
        Row: {
          created_at: string
          founder_id: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          founder_id: string
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          founder_id?: string
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "AAA3_rooms_founder_id_fkey"
            columns: ["founder_id"]
            isOneToOne: false
            referencedRelation: "AAA3_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      AAA3_translation_memory: {
        Row: {
          corrected_by: string | null
          corrected_by_user: boolean
          created_at: string
          id: string
          provider: string
          source_lang: string
          source_text: string
          source_text_normalized: string | null
          target_lang: string
          translated_text: string
          updated_at: string
        }
        Insert: {
          corrected_by?: string | null
          corrected_by_user?: boolean
          created_at?: string
          id?: string
          provider: string
          source_lang: string
          source_text: string
          source_text_normalized?: string | null
          target_lang: string
          translated_text: string
          updated_at?: string
        }
        Update: {
          corrected_by?: string | null
          corrected_by_user?: boolean
          created_at?: string
          id?: string
          provider?: string
          source_lang?: string
          source_text?: string
          source_text_normalized?: string | null
          target_lang?: string
          translated_text?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "AAA3_translation_memory_corrected_by_fkey"
            columns: ["corrected_by"]
            isOneToOne: false
            referencedRelation: "AAA3_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          content: string | null
          created_at: string
          device_name: string | null
          id: string
          image_path: string | null
          sender_endpoint: string | null
          user_id: string
        }
        Insert: {
          content?: string | null
          created_at?: string
          device_name?: string | null
          id?: string
          image_path?: string | null
          sender_endpoint?: string | null
          user_id?: string
        }
        Update: {
          content?: string | null
          created_at?: string
          device_name?: string | null
          id?: string
          image_path?: string | null
          sender_endpoint?: string | null
          user_id?: string
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          device_name: string | null
          endpoint: string
          id: string
          p256dh: string
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          device_name?: string | null
          endpoint: string
          id?: string
          p256dh: string
          user_id?: string
        }
        Update: {
          auth?: string
          created_at?: string
          device_name?: string | null
          endpoint?: string
          id?: string
          p256dh?: string
          user_id?: string
        }
        Relationships: []
      }
      todos: {
        Row: {
          created_at: string
          id: string
          task: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          task: string
          user_id?: string
        }
        Update: {
          created_at?: string
          id?: string
          task?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      accept_room_invite: {
        Args: { invite_code: string }
        Returns: {
          created_at: string
          founder_id: string
          id: string
          name: string
        }
        SetofOptions: {
          from: "*"
          to: "AAA3_rooms"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      create_room: {
        Args: { room_name: string }
        Returns: {
          created_at: string
          founder_id: string
          id: string
          name: string
        }
        SetofOptions: {
          from: "*"
          to: "AAA3_rooms"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      is_room_founder: { Args: { p_room_id: string }; Returns: boolean }
      is_room_member: { Args: { p_room_id: string }; Returns: boolean }
      revoke_room_invite: { Args: { invite_id: string }; Returns: undefined }
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const
