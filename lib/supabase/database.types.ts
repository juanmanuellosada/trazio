export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      comments: {
        Row: {
          content: Json
          created_at: string
          id: string
          task_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content: Json
          created_at?: string
          id?: string
          task_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: Json
          created_at?: string
          id?: string
          task_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "comments_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      filters: {
        Row: {
          color: string
          icon: string | null
          id: string
          is_favorite: boolean
          name: string
          query: string
          user_id: string
        }
        Insert: {
          color: string
          icon?: string | null
          id?: string
          is_favorite?: boolean
          name: string
          query: string
          user_id: string
        }
        Update: {
          color?: string
          icon?: string | null
          id?: string
          is_favorite?: boolean
          name?: string
          query?: string
          user_id?: string
        }
        Relationships: []
      }
      habit_completions: {
        Row: {
          completed_on: string
          habit_id: string
          id: string
          user_id: string
        }
        Insert: {
          completed_on: string
          habit_id: string
          id?: string
          user_id: string
        }
        Update: {
          completed_on?: string
          habit_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "habit_completions_habit_id_fkey"
            columns: ["habit_id"]
            isOneToOne: false
            referencedRelation: "habits"
            referencedColumns: ["id"]
          },
        ]
      }
      habit_schedule_overrides: {
        Row: {
          date: string
          habit_id: string
          scheduled_time: string
          user_id: string
        }
        Insert: {
          date: string
          habit_id: string
          scheduled_time: string
          user_id: string
        }
        Update: {
          date?: string
          habit_id?: string
          scheduled_time?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "habit_schedule_overrides_habit_id_fkey"
            columns: ["habit_id"]
            isOneToOne: false
            referencedRelation: "habits"
            referencedColumns: ["id"]
          },
        ]
      }
      habits: {
        Row: {
          color: string
          created_at: string
          days_of_week: number[] | null
          duration_minutes: number
          frequency_type: string
          icon: string
          id: string
          is_archived: boolean
          name: string
          scheduled_time: string | null
          times_per_week: number | null
          user_id: string
        }
        Insert: {
          color: string
          created_at?: string
          days_of_week?: number[] | null
          duration_minutes: number
          frequency_type: string
          icon: string
          id?: string
          is_archived?: boolean
          name: string
          scheduled_time?: string | null
          times_per_week?: number | null
          user_id: string
        }
        Update: {
          color?: string
          created_at?: string
          days_of_week?: number[] | null
          duration_minutes?: number
          frequency_type?: string
          icon?: string
          id?: string
          is_archived?: boolean
          name?: string
          scheduled_time?: string | null
          times_per_week?: number | null
          user_id?: string
        }
        Relationships: []
      }
      labels: {
        Row: {
          color: string
          id: string
          is_favorite: boolean
          name: string
          user_id: string
        }
        Insert: {
          color: string
          id?: string
          is_favorite?: boolean
          name: string
          user_id: string
        }
        Update: {
          color?: string
          id?: string
          is_favorite?: boolean
          name?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string | null
          id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
        }
        Relationships: []
      }
      projects: {
        Row: {
          color: string | null
          description: string | null
          icon: string | null
          id: string
          is_archived: boolean
          is_favorite: boolean
          is_inbox: boolean
          name: string
          parent_id: string | null
          position: number
          preferred_view: string
          user_id: string
        }
        Insert: {
          color?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          is_archived?: boolean
          is_favorite?: boolean
          is_inbox?: boolean
          name: string
          parent_id?: string | null
          position: number
          preferred_view?: string
          user_id: string
        }
        Update: {
          color?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          is_archived?: boolean
          is_favorite?: boolean
          is_inbox?: boolean
          name?: string
          parent_id?: string | null
          position?: number
          preferred_view?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "projects_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      push_subscriptions: {
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
        Relationships: []
      }
      reminders: {
        Row: {
          delivered_at: string | null
          id: string
          offset_minutes: number | null
          remind_at: string
          task_id: string
          user_id: string
        }
        Insert: {
          delivered_at?: string | null
          id?: string
          offset_minutes?: number | null
          remind_at: string
          task_id: string
          user_id: string
        }
        Update: {
          delivered_at?: string | null
          id?: string
          offset_minutes?: number | null
          remind_at?: string
          task_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reminders_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      sections: {
        Row: {
          id: string
          is_collapsed: boolean
          name: string
          position: number
          project_id: string
          user_id: string
        }
        Insert: {
          id?: string
          is_collapsed?: boolean
          name: string
          position: number
          project_id: string
          user_id: string
        }
        Update: {
          id?: string
          is_collapsed?: boolean
          name?: string
          position?: number
          project_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sections_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      task_labels: {
        Row: {
          label_id: string
          task_id: string
          user_id: string
        }
        Insert: {
          label_id: string
          task_id: string
          user_id: string
        }
        Update: {
          label_id?: string
          task_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_labels_label_id_fkey"
            columns: ["label_id"]
            isOneToOne: false
            referencedRelation: "labels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_labels_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          completed_at: string | null
          created_at: string
          deadline: string | null
          description: Json | null
          description_text: string | null
          due_at: string | null
          due_date: string | null
          duration_minutes: number | null
          id: string
          parent_id: string | null
          position: number
          priority: number
          project_id: string
          recurrence_count: number | null
          recurrence_ends_at: string | null
          recurrence_rule: string | null
          search_vector: unknown
          section_id: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          deadline?: string | null
          description?: Json | null
          description_text?: string | null
          due_at?: string | null
          due_date?: string | null
          duration_minutes?: number | null
          id?: string
          parent_id?: string | null
          position: number
          priority?: number
          project_id: string
          recurrence_count?: number | null
          recurrence_ends_at?: string | null
          recurrence_rule?: string | null
          search_vector?: unknown
          section_id?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          deadline?: string | null
          description?: Json | null
          description_text?: string | null
          due_at?: string | null
          due_date?: string | null
          duration_minutes?: number | null
          id?: string
          parent_id?: string | null
          position?: number
          priority?: number
          project_id?: string
          recurrence_count?: number | null
          recurrence_ends_at?: string | null
          recurrence_rule?: string | null
          search_vector?: unknown
          section_id?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "sections"
            referencedColumns: ["id"]
          },
        ]
      }
      user_preferences: {
        Row: {
          date_format: string
          default_project_id: string | null
          default_view: string
          theme: string
          time_format: number
          timezone: string
          user_id: string
          week_starts_on: number
        }
        Insert: {
          date_format?: string
          default_project_id?: string | null
          default_view?: string
          theme?: string
          time_format?: number
          timezone?: string
          user_id: string
          week_starts_on?: number
        }
        Update: {
          date_format?: string
          default_project_id?: string | null
          default_view?: string
          theme?: string
          time_format?: number
          timezone?: string
          user_id?: string
          week_starts_on?: number
        }
        Relationships: [
          {
            foreignKeyName: "user_preferences_default_project_id_fkey"
            columns: ["default_project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      view_preferences: {
        Row: {
          options: Json
          user_id: string
          view_key: string
        }
        Insert: {
          options?: Json
          user_id: string
          view_key: string
        }
        Update: {
          options?: Json
          user_id?: string
          view_key?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      ast_mentions_completed: { Args: { ast: Json }; Returns: boolean }
      ast_to_sql: {
        Args: { ast: Json; at: string; tz: string }
        Returns: string
      }
      buscar_tareas: {
        Args: { ast: Json; at?: string }
        Returns: {
          completed_at: string | null
          created_at: string
          deadline: string | null
          description: Json | null
          description_text: string | null
          due_at: string | null
          due_date: string | null
          duration_minutes: number | null
          id: string
          parent_id: string | null
          position: number
          priority: number
          project_id: string
          recurrence_count: number | null
          recurrence_ends_at: string | null
          recurrence_rule: string | null
          search_vector: unknown
          section_id: string | null
          title: string
          updated_at: string
          user_id: string
        }[]
        SetofOptions: {
          from: "*"
          to: "tasks"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      calcular_racha_habito: {
        Args: { at?: string; p_habit_id: string }
        Returns: {
          best_streak: number
          current_streak: number
        }[]
      }
      claim_due_reminders: {
        Args: { p_limit?: number }
        Returns: {
          id: string
          task_id: string
          title: string
          user_id: string
        }[]
      }
      rebalance_project_positions: {
        Args: { p_parent_id?: string }
        Returns: undefined
      }
      rebalance_section_positions: {
        Args: { p_project_id: string }
        Returns: undefined
      }
      rebalance_task_positions: {
        Args: { p_project_id: string; p_section_id?: string }
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

