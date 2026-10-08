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
      AAA3_fcm_tokens: {
        Row: {
          created_at: string
          id: string
          token: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          token: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          token?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "AAA3_fcm_tokens_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "AAA3_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      AAA3_friend_codes: {
        Row: {
          code: string
          created_at: string
          user_id: string
        }
        Insert: {
          code: string
          created_at?: string
          user_id: string
        }
        Update: {
          code?: string
          created_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "AAA3_friend_codes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "AAA3_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      AAA3_friend_requests: {
        Row: {
          created_at: string
          from_user: string
          id: string
          to_user: string
        }
        Insert: {
          created_at?: string
          from_user: string
          id?: string
          to_user: string
        }
        Update: {
          created_at?: string
          from_user?: string
          id?: string
          to_user?: string
        }
        Relationships: [
          {
            foreignKeyName: "AAA3_friend_requests_from_user_fkey"
            columns: ["from_user"]
            isOneToOne: false
            referencedRelation: "AAA3_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "AAA3_friend_requests_to_user_fkey"
            columns: ["to_user"]
            isOneToOne: false
            referencedRelation: "AAA3_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      AAA3_friendships: {
        Row: {
          created_at: string
          user_a: string
          user_b: string
        }
        Insert: {
          created_at?: string
          user_a: string
          user_b: string
        }
        Update: {
          created_at?: string
          user_a?: string
          user_b?: string
        }
        Relationships: [
          {
            foreignKeyName: "AAA3_friendships_user_a_fkey"
            columns: ["user_a"]
            isOneToOne: false
            referencedRelation: "AAA3_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "AAA3_friendships_user_b_fkey"
            columns: ["user_b"]
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
          tutorial_seen_at: string | null
          username: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          id: string
          tutorial_seen_at?: string | null
          username: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          id?: string
          tutorial_seen_at?: string | null
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
          last_read_at: string
          notifications_muted: boolean
          role: string
          room_id: string
          translation_enabled: boolean
          user_id: string
        }
        Insert: {
          joined_at?: string
          last_read_at?: string
          notifications_muted?: boolean
          role: string
          room_id: string
          translation_enabled?: boolean
          user_id: string
        }
        Update: {
          joined_at?: string
          last_read_at?: string
          notifications_muted?: boolean
          role?: string
          room_id?: string
          translation_enabled?: boolean
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
          direct_key: string | null
          founder_id: string
          id: string
          kind: string
          name: string
        }
        Insert: {
          created_at?: string
          direct_key?: string | null
          founder_id: string
          id?: string
          kind?: string
          name: string
        }
        Update: {
          created_at?: string
          direct_key?: string | null
          founder_id?: string
          id?: string
          kind?: string
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
      accept_friend_request: {
        Args: { p_request_id: string }
        Returns: undefined
      }
      accept_room_invite: {
        Args: { invite_code: string }
        Returns: {
          created_at: string
          direct_key: string | null
          founder_id: string
          id: string
          kind: string
          name: string
        }
        SetofOptions: {
          from: "*"
          to: "AAA3_rooms"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      can_chat_with: { Args: { p_other: string }; Returns: boolean }
      can_send_in_room: { Args: { p_room_id: string }; Returns: boolean }
      create_room: {
        Args: { room_name: string }
        Returns: {
          created_at: string
          direct_key: string | null
          founder_id: string
          id: string
          kind: string
          name: string
        }
        SetofOptions: {
          from: "*"
          to: "AAA3_rooms"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      get_my_friend_code: { Args: never; Returns: string }
      get_my_rooms: {
        Args: never
        Returns: {
          created_at: string
          founder_id: string
          id: string
          kind: "group" | "direct"
          last_message_at: string | null
          last_message_body: string | null
          last_message_photo_count: number
          last_message_sender_id: string | null
          last_message_sender_name: string | null
          name: string
          other_avatar_url: string | null
          other_user_id: string | null
          other_username: string | null
          unread_count: number
        }[]
      }
      is_group_room: { Args: { p_room_id: string }; Returns: boolean }
      is_room_founder: { Args: { p_room_id: string }; Returns: boolean }
      is_room_member: { Args: { p_room_id: string }; Returns: boolean }
      mark_room_read: { Args: { p_room_id: string }; Returns: undefined }
      normalize_friend_code: { Args: { p_code: string }; Returns: string }
      open_direct_chat: { Args: { p_other: string }; Returns: string }
      regenerate_my_friend_code: { Args: never; Returns: string }
      revoke_room_invite: { Args: { invite_id: string }; Returns: undefined }
      send_friend_request: { Args: { p_code: string }; Returns: string }
      send_friend_request_to_user: { Args: { p_user: string }; Returns: string }
      shares_group_room: { Args: { p_other: string }; Returns: boolean }
      set_room_notifications_muted: {
        Args: { p_muted: boolean; p_room_id: string }
        Returns: undefined
      }
      set_room_translation_enabled: {
        Args: { p_enabled: boolean; p_room_id: string }
        Returns: undefined
      }
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
