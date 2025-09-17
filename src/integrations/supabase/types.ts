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
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      approved_reviews: {
        Row: {
          ai_keywords: Json | null
          approved_at: string
          approved_by: string | null
          created_at: string
          display_order: number | null
          id: string
          landing_page_id: string
          notes: string | null
          raw_review_id: string
          seo_generated_by_ai: boolean | null
          seo_hidden_content: string | null
        }
        Insert: {
          ai_keywords?: Json | null
          approved_at?: string
          approved_by?: string | null
          created_at?: string
          display_order?: number | null
          id?: string
          landing_page_id: string
          notes?: string | null
          raw_review_id: string
          seo_generated_by_ai?: boolean | null
          seo_hidden_content?: string | null
        }
        Update: {
          ai_keywords?: Json | null
          approved_at?: string
          approved_by?: string | null
          created_at?: string
          display_order?: number | null
          id?: string
          landing_page_id?: string
          notes?: string | null
          raw_review_id?: string
          seo_generated_by_ai?: boolean | null
          seo_hidden_content?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "approved_reviews_raw_review_id_fkey"
            columns: ["raw_review_id"]
            isOneToOne: false
            referencedRelation: "raw_reviews"
            referencedColumns: ["id"]
          },
        ]
      }
      blog_posts: {
        Row: {
          content: string
          created_at: string
          id: string
          include_offers: boolean | null
          intelligent_links: Json | null
          keywords: string[] | null
          landing_page_id: string
          meta_description: string | null
          published_at: string | null
          published_domains: string[] | null
          schema_json_ld: Json | null
          status: string
          title: string
          updated_at: string
          youtube_video_url: string | null
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          include_offers?: boolean | null
          intelligent_links?: Json | null
          keywords?: string[] | null
          landing_page_id: string
          meta_description?: string | null
          published_at?: string | null
          published_domains?: string[] | null
          schema_json_ld?: Json | null
          status?: string
          title: string
          updated_at?: string
          youtube_video_url?: string | null
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          include_offers?: boolean | null
          intelligent_links?: Json | null
          keywords?: string[] | null
          landing_page_id?: string
          meta_description?: string | null
          published_at?: string | null
          published_domains?: string[] | null
          schema_json_ld?: Json | null
          status?: string
          title?: string
          updated_at?: string
          youtube_video_url?: string | null
        }
        Relationships: []
      }
      extraction_jobs: {
        Row: {
          business_name: string | null
          completed_at: string | null
          created_at: string
          error_message: string | null
          google_maps_url: string
          id: string
          place_id: string
          reviews_extracted: number | null
          started_at: string | null
          status: string
          total_reviews_found: number | null
        }
        Insert: {
          business_name?: string | null
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          google_maps_url: string
          id?: string
          place_id: string
          reviews_extracted?: number | null
          started_at?: string | null
          status?: string
          total_reviews_found?: number | null
        }
        Update: {
          business_name?: string | null
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          google_maps_url?: string
          id?: string
          place_id?: string
          reviews_extracted?: number | null
          started_at?: string | null
          status?: string
          total_reviews_found?: number | null
        }
        Relationships: []
      }
      manual_reviews: {
        Row: {
          approved: boolean
          author_name: string
          created_at: string
          id: string
          landing_page_id: string
          rating: number
          review_text: string | null
          updated_at: string
        }
        Insert: {
          approved?: boolean
          author_name: string
          created_at?: string
          id?: string
          landing_page_id: string
          rating: number
          review_text?: string | null
          updated_at?: string
        }
        Update: {
          approved?: boolean
          author_name?: string
          created_at?: string
          id?: string
          landing_page_id?: string
          rating?: number
          review_text?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string | null
          email: string | null
          id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          email?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      publication_settings: {
        Row: {
          created_at: string
          ftp_host: string | null
          ftp_password_encrypted: string | null
          ftp_port: number | null
          ftp_protocol: string | null
          ftp_remote_path: string | null
          ftp_user: string | null
          id: string
          updated_at: string
          user_id: string
          wordpress_app_password_encrypted: string | null
          wordpress_url: string | null
          wordpress_user: string | null
        }
        Insert: {
          created_at?: string
          ftp_host?: string | null
          ftp_password_encrypted?: string | null
          ftp_port?: number | null
          ftp_protocol?: string | null
          ftp_remote_path?: string | null
          ftp_user?: string | null
          id?: string
          updated_at?: string
          user_id: string
          wordpress_app_password_encrypted?: string | null
          wordpress_url?: string | null
          wordpress_user?: string | null
        }
        Update: {
          created_at?: string
          ftp_host?: string | null
          ftp_password_encrypted?: string | null
          ftp_port?: number | null
          ftp_protocol?: string | null
          ftp_remote_path?: string | null
          ftp_user?: string | null
          id?: string
          updated_at?: string
          user_id?: string
          wordpress_app_password_encrypted?: string | null
          wordpress_url?: string | null
          wordpress_user?: string | null
        }
        Relationships: []
      }
      raw_reviews: {
        Row: {
          author_name: string
          author_url: string | null
          created_at: string
          extracted_at: string
          id: string
          is_local_guide: boolean | null
          place_id: string
          profile_photo_url: string | null
          rating: number
          relative_time: string | null
          response_date: string | null
          response_from_owner: string | null
          review_date: string | null
          review_likes: number | null
          review_text: string | null
        }
        Insert: {
          author_name: string
          author_url?: string | null
          created_at?: string
          extracted_at?: string
          id?: string
          is_local_guide?: boolean | null
          place_id: string
          profile_photo_url?: string | null
          rating: number
          relative_time?: string | null
          response_date?: string | null
          response_from_owner?: string | null
          review_date?: string | null
          review_likes?: number | null
          review_text?: string | null
        }
        Update: {
          author_name?: string
          author_url?: string | null
          created_at?: string
          extracted_at?: string
          id?: string
          is_local_guide?: boolean | null
          place_id?: string
          profile_photo_url?: string | null
          rating?: number
          relative_time?: string | null
          response_date?: string | null
          response_from_owner?: string | null
          review_date?: string | null
          review_likes?: number | null
          review_text?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      video_testimonials: {
        Row: {
          ai_extracted_benefits: Json | null
          ai_keywords: Json | null
          approved: boolean | null
          client_name: string
          created_at: string
          display_order: number | null
          id: string
          instagram_url: string | null
          landing_page_id: string
          location: string | null
          profession: string | null
          sentiment_score: number | null
          specialty: string | null
          state: string | null
          testimonial_text: string
          updated_at: string
          youtube_url: string | null
        }
        Insert: {
          ai_extracted_benefits?: Json | null
          ai_keywords?: Json | null
          approved?: boolean | null
          client_name: string
          created_at?: string
          display_order?: number | null
          id?: string
          instagram_url?: string | null
          landing_page_id: string
          location?: string | null
          profession?: string | null
          sentiment_score?: number | null
          specialty?: string | null
          state?: string | null
          testimonial_text: string
          updated_at?: string
          youtube_url?: string | null
        }
        Update: {
          ai_extracted_benefits?: Json | null
          ai_keywords?: Json | null
          approved?: boolean | null
          client_name?: string
          created_at?: string
          display_order?: number | null
          id?: string
          instagram_url?: string | null
          landing_page_id?: string
          location?: string | null
          profession?: string | null
          sentiment_score?: number | null
          specialty?: string | null
          state?: string | null
          testimonial_text?: string
          updated_at?: string
          youtube_url?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_current_user_role: {
        Args: Record<PropertyKey, never>
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      promote_user_to_admin: {
        Args: { _email: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user"
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
    },
  },
} as const
