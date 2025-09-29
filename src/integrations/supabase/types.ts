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
          contextual_seo_info: string | null
          created_at: string
          display_order: number | null
          id: string
          landing_page_id: string
          notes: string | null
          raw_review_id: string
          seo_generated_by_ai: boolean | null
        }
        Insert: {
          ai_keywords?: Json | null
          approved_at?: string
          approved_by?: string | null
          contextual_seo_info?: string | null
          created_at?: string
          display_order?: number | null
          id?: string
          landing_page_id: string
          notes?: string | null
          raw_review_id: string
          seo_generated_by_ai?: boolean | null
        }
        Update: {
          ai_keywords?: Json | null
          approved_at?: string
          approved_by?: string | null
          contextual_seo_info?: string | null
          created_at?: string
          display_order?: number | null
          id?: string
          landing_page_id?: string
          notes?: string | null
          raw_review_id?: string
          seo_generated_by_ai?: boolean | null
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
          author_kol_id: string | null
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
          author_kol_id?: string | null
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
          author_kol_id?: string | null
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
        Relationships: [
          {
            foreignKeyName: "blog_posts_author_kol_id_fkey"
            columns: ["author_kol_id"]
            isOneToOne: false
            referencedRelation: "key_opinion_leaders"
            referencedColumns: ["id"]
          },
        ]
      }
      categories_config: {
        Row: {
          category: string
          created_at: string
          id: string
          keywords: Json | null
          market_keywords: Json | null
          search_intent_keywords: Json | null
          subcategory: string
          target_audience: Json | null
          updated_at: string
        }
        Insert: {
          category: string
          created_at?: string
          id?: string
          keywords?: Json | null
          market_keywords?: Json | null
          search_intent_keywords?: Json | null
          subcategory: string
          target_audience?: Json | null
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          id?: string
          keywords?: Json | null
          market_keywords?: Json | null
          search_intent_keywords?: Json | null
          subcategory?: string
          target_audience?: Json | null
          updated_at?: string
        }
        Relationships: []
      }
      company_profile: {
        Row: {
          brand_values: string | null
          business_sector: string | null
          company_culture: string | null
          company_description: string | null
          company_logo_url: string | null
          company_name: string
          company_videos: Json | null
          contact_email: string | null
          contact_phone: string | null
          created_at: string
          delivery_approach: string | null
          differentiators: string | null
          founded_year: number | null
          id: string
          instagram_profile: string | null
          institutional_links: Json | null
          location: string | null
          main_products_services: string | null
          mission_statement: string | null
          seo_competitive_advantages: string | null
          seo_context_keywords: Json | null
          seo_market_positioning: string | null
          seo_service_areas: string | null
          seo_technical_expertise: string | null
          social_media_links: Json | null
          target_audience: string | null
          team_size: string | null
          updated_at: string
          user_id: string
          vision_statement: string | null
          website_url: string | null
          working_methodology: string | null
          youtube_channel: string | null
          youtube_company_footer: string | null
        }
        Insert: {
          brand_values?: string | null
          business_sector?: string | null
          company_culture?: string | null
          company_description?: string | null
          company_logo_url?: string | null
          company_name: string
          company_videos?: Json | null
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          delivery_approach?: string | null
          differentiators?: string | null
          founded_year?: number | null
          id?: string
          instagram_profile?: string | null
          institutional_links?: Json | null
          location?: string | null
          main_products_services?: string | null
          mission_statement?: string | null
          seo_competitive_advantages?: string | null
          seo_context_keywords?: Json | null
          seo_market_positioning?: string | null
          seo_service_areas?: string | null
          seo_technical_expertise?: string | null
          social_media_links?: Json | null
          target_audience?: string | null
          team_size?: string | null
          updated_at?: string
          user_id: string
          vision_statement?: string | null
          website_url?: string | null
          working_methodology?: string | null
          youtube_channel?: string | null
          youtube_company_footer?: string | null
        }
        Update: {
          brand_values?: string | null
          business_sector?: string | null
          company_culture?: string | null
          company_description?: string | null
          company_logo_url?: string | null
          company_name?: string
          company_videos?: Json | null
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          delivery_approach?: string | null
          differentiators?: string | null
          founded_year?: number | null
          id?: string
          instagram_profile?: string | null
          institutional_links?: Json | null
          location?: string | null
          main_products_services?: string | null
          mission_statement?: string | null
          seo_competitive_advantages?: string | null
          seo_context_keywords?: Json | null
          seo_market_positioning?: string | null
          seo_service_areas?: string | null
          seo_technical_expertise?: string | null
          social_media_links?: Json | null
          target_audience?: string | null
          team_size?: string | null
          updated_at?: string
          user_id?: string
          vision_statement?: string | null
          website_url?: string | null
          working_methodology?: string | null
          youtube_channel?: string | null
          youtube_company_footer?: string | null
        }
        Relationships: []
      }
      content_analytics: {
        Row: {
          action_type: string
          content_id: string
          content_type: string
          created_at: string | null
          id: string
          metadata: Json | null
          performance_score: number | null
          quality_metrics: Json | null
          updated_at: string | null
          user_feedback: Json | null
        }
        Insert: {
          action_type: string
          content_id: string
          content_type: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          performance_score?: number | null
          quality_metrics?: Json | null
          updated_at?: string | null
          user_feedback?: Json | null
        }
        Update: {
          action_type?: string
          content_id?: string
          content_type?: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          performance_score?: number | null
          quality_metrics?: Json | null
          updated_at?: string | null
          user_feedback?: Json | null
        }
        Relationships: []
      }
      external_links: {
        Row: {
          approved: boolean
          category: string
          created_at: string
          description: string | null
          id: string
          name: string
          subcategory: string | null
          updated_at: string
          url: string
        }
        Insert: {
          approved?: boolean
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          name: string
          subcategory?: string | null
          updated_at?: string
          url: string
        }
        Update: {
          approved?: boolean
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          subcategory?: string | null
          updated_at?: string
          url?: string
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
      google_ads_campaigns: {
        Row: {
          campaign_history: Json | null
          campaign_type: string | null
          config: Json
          created_at: string
          id: string
          landing_page_id: string | null
          last_exported: string | null
          product_id: string | null
          updated_at: string
        }
        Insert: {
          campaign_history?: Json | null
          campaign_type?: string | null
          config: Json
          created_at?: string
          id?: string
          landing_page_id?: string | null
          last_exported?: string | null
          product_id?: string | null
          updated_at?: string
        }
        Update: {
          campaign_history?: Json | null
          campaign_type?: string | null
          config?: Json
          created_at?: string
          id?: string
          landing_page_id?: string | null
          last_exported?: string | null
          product_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "google_ads_campaigns_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products_repository"
            referencedColumns: ["id"]
          },
        ]
      }
      key_opinion_leaders: {
        Row: {
          approved: boolean
          created_at: string
          display_order: number | null
          full_name: string
          id: string
          instagram_url: string | null
          lattes_url: string | null
          mini_cv: string | null
          photo_url: string | null
          specialty: string | null
          updated_at: string
          website_url: string | null
          youtube_url: string | null
        }
        Insert: {
          approved?: boolean
          created_at?: string
          display_order?: number | null
          full_name: string
          id?: string
          instagram_url?: string | null
          lattes_url?: string | null
          mini_cv?: string | null
          photo_url?: string | null
          specialty?: string | null
          updated_at?: string
          website_url?: string | null
          youtube_url?: string | null
        }
        Update: {
          approved?: boolean
          created_at?: string
          display_order?: number | null
          full_name?: string
          id?: string
          instagram_url?: string | null
          lattes_url?: string | null
          mini_cv?: string | null
          photo_url?: string | null
          specialty?: string | null
          updated_at?: string
          website_url?: string | null
          youtube_url?: string | null
        }
        Relationships: []
      }
      landing_pages: {
        Row: {
          blog_generated: boolean | null
          blog_generated_at: string | null
          created_at: string
          data: Json | null
          embed: string | null
          id: string
          last_modified: string
          name: string
          selected_product_ids: string[] | null
          status: string
          template: string
          updated_at: string
          user_id: string | null
          version: number
        }
        Insert: {
          blog_generated?: boolean | null
          blog_generated_at?: string | null
          created_at?: string
          data?: Json | null
          embed?: string | null
          id: string
          last_modified?: string
          name: string
          selected_product_ids?: string[] | null
          status?: string
          template: string
          updated_at?: string
          user_id?: string | null
          version?: number
        }
        Update: {
          blog_generated?: boolean | null
          blog_generated_at?: string | null
          created_at?: string
          data?: Json | null
          embed?: string | null
          id?: string
          last_modified?: string
          name?: string
          selected_product_ids?: string[] | null
          status?: string
          template?: string
          updated_at?: string
          user_id?: string | null
          version?: number
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
      products_repository: {
        Row: {
          age_group: string | null
          ai_generated_benefits: boolean | null
          ai_generated_category: boolean | null
          ai_generated_keywords: boolean | null
          approved: boolean | null
          availability: string | null
          benefits: Json | null
          bot_trigger_words: Json | null
          brand: string | null
          canonical_url: string | null
          category: string | null
          color: string | null
          condition: string | null
          created_at: string
          currency: string | null
          description: string | null
          display_order: number | null
          faq: Json | null
          features: Json | null
          gender: string | null
          google_product_category: string | null
          gtin: string | null
          id: string
          image_url: string | null
          individual_blog_content: Json | null
          instagram_copies: Json | null
          instagram_videos: Json | null
          keywords: Json | null
          market_keywords: Json | null
          material: string | null
          mpn: string | null
          name: string
          offer_discount_cta: Json | null
          original_data: Json | null
          price: number | null
          product_url: string | null
          resource_cta1: Json | null
          resource_cta2: Json | null
          resource_cta3: Json | null
          resource_descriptions: Json | null
          sales_pitch: string | null
          search_intent_keywords: Json | null
          selected: boolean | null
          seo_description_override: string | null
          seo_enhanced: boolean | null
          seo_title_override: string | null
          show_in_resources: boolean | null
          size: string | null
          source_landing_page_id: string | null
          source_type: string
          subcategory: string | null
          tags: Json | null
          target_audience: Json | null
          technical_specifications: Json | null
          technical_videos: Json | null
          testimonial_videos: Json | null
          tiktok_content: Json | null
          tiktok_videos: Json | null
          updated_at: string
          use_in_ai_generation: boolean | null
          video_captions: Json | null
          whatsapp_messages: Json | null
          youtube_descriptions: Json | null
          youtube_videos: Json | null
        }
        Insert: {
          age_group?: string | null
          ai_generated_benefits?: boolean | null
          ai_generated_category?: boolean | null
          ai_generated_keywords?: boolean | null
          approved?: boolean | null
          availability?: string | null
          benefits?: Json | null
          bot_trigger_words?: Json | null
          brand?: string | null
          canonical_url?: string | null
          category?: string | null
          color?: string | null
          condition?: string | null
          created_at?: string
          currency?: string | null
          description?: string | null
          display_order?: number | null
          faq?: Json | null
          features?: Json | null
          gender?: string | null
          google_product_category?: string | null
          gtin?: string | null
          id?: string
          image_url?: string | null
          individual_blog_content?: Json | null
          instagram_copies?: Json | null
          instagram_videos?: Json | null
          keywords?: Json | null
          market_keywords?: Json | null
          material?: string | null
          mpn?: string | null
          name: string
          offer_discount_cta?: Json | null
          original_data?: Json | null
          price?: number | null
          product_url?: string | null
          resource_cta1?: Json | null
          resource_cta2?: Json | null
          resource_cta3?: Json | null
          resource_descriptions?: Json | null
          sales_pitch?: string | null
          search_intent_keywords?: Json | null
          selected?: boolean | null
          seo_description_override?: string | null
          seo_enhanced?: boolean | null
          seo_title_override?: string | null
          show_in_resources?: boolean | null
          size?: string | null
          source_landing_page_id?: string | null
          source_type: string
          subcategory?: string | null
          tags?: Json | null
          target_audience?: Json | null
          technical_specifications?: Json | null
          technical_videos?: Json | null
          testimonial_videos?: Json | null
          tiktok_content?: Json | null
          tiktok_videos?: Json | null
          updated_at?: string
          use_in_ai_generation?: boolean | null
          video_captions?: Json | null
          whatsapp_messages?: Json | null
          youtube_descriptions?: Json | null
          youtube_videos?: Json | null
        }
        Update: {
          age_group?: string | null
          ai_generated_benefits?: boolean | null
          ai_generated_category?: boolean | null
          ai_generated_keywords?: boolean | null
          approved?: boolean | null
          availability?: string | null
          benefits?: Json | null
          bot_trigger_words?: Json | null
          brand?: string | null
          canonical_url?: string | null
          category?: string | null
          color?: string | null
          condition?: string | null
          created_at?: string
          currency?: string | null
          description?: string | null
          display_order?: number | null
          faq?: Json | null
          features?: Json | null
          gender?: string | null
          google_product_category?: string | null
          gtin?: string | null
          id?: string
          image_url?: string | null
          individual_blog_content?: Json | null
          instagram_copies?: Json | null
          instagram_videos?: Json | null
          keywords?: Json | null
          market_keywords?: Json | null
          material?: string | null
          mpn?: string | null
          name?: string
          offer_discount_cta?: Json | null
          original_data?: Json | null
          price?: number | null
          product_url?: string | null
          resource_cta1?: Json | null
          resource_cta2?: Json | null
          resource_cta3?: Json | null
          resource_descriptions?: Json | null
          sales_pitch?: string | null
          search_intent_keywords?: Json | null
          selected?: boolean | null
          seo_description_override?: string | null
          seo_enhanced?: boolean | null
          seo_title_override?: string | null
          show_in_resources?: boolean | null
          size?: string | null
          source_landing_page_id?: string | null
          source_type?: string
          subcategory?: string | null
          tags?: Json | null
          target_audience?: Json | null
          technical_specifications?: Json | null
          technical_videos?: Json | null
          testimonial_videos?: Json | null
          tiktok_content?: Json | null
          tiktok_videos?: Json | null
          updated_at?: string
          use_in_ai_generation?: boolean | null
          video_captions?: Json | null
          whatsapp_messages?: Json | null
          youtube_descriptions?: Json | null
          youtube_videos?: Json | null
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
      prompts_configuration: {
        Row: {
          analytics_enabled: boolean | null
          backup_prompt: string | null
          content_validation_rules: Json | null
          created_at: string
          custom_prompt: string
          edge_function_id: string
          id: string
          is_active: boolean | null
          performance_metrics: Json | null
          priority: number | null
          prompt_name: string
          selected_data_sources: Json
          selected_fields: Json
          style_guidelines: Json | null
          tags: Json | null
          template_category: string | null
          tone: string | null
          updated_at: string
          use_intelligent_links: boolean | null
          version_number: number | null
        }
        Insert: {
          analytics_enabled?: boolean | null
          backup_prompt?: string | null
          content_validation_rules?: Json | null
          created_at?: string
          custom_prompt: string
          edge_function_id: string
          id?: string
          is_active?: boolean | null
          performance_metrics?: Json | null
          priority?: number | null
          prompt_name: string
          selected_data_sources?: Json
          selected_fields?: Json
          style_guidelines?: Json | null
          tags?: Json | null
          template_category?: string | null
          tone?: string | null
          updated_at?: string
          use_intelligent_links?: boolean | null
          version_number?: number | null
        }
        Update: {
          analytics_enabled?: boolean | null
          backup_prompt?: string | null
          content_validation_rules?: Json | null
          created_at?: string
          custom_prompt?: string
          edge_function_id?: string
          id?: string
          is_active?: boolean | null
          performance_metrics?: Json | null
          priority?: number | null
          prompt_name?: string
          selected_data_sources?: Json
          selected_fields?: Json
          style_guidelines?: Json | null
          tags?: Json | null
          template_category?: string | null
          tone?: string | null
          updated_at?: string
          use_intelligent_links?: boolean | null
          version_number?: number | null
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
      system_monitoring: {
        Row: {
          component_name: string
          event_data: Json | null
          event_type: string
          id: string
          performance_data: Json | null
          resolved: boolean | null
          session_id: string | null
          severity: string | null
          tags: Json | null
          timestamp: string | null
          user_id: string | null
        }
        Insert: {
          component_name: string
          event_data?: Json | null
          event_type: string
          id?: string
          performance_data?: Json | null
          resolved?: boolean | null
          session_id?: string | null
          severity?: string | null
          tags?: Json | null
          timestamp?: string | null
          user_id?: string | null
        }
        Update: {
          component_name?: string
          event_data?: Json | null
          event_type?: string
          id?: string
          performance_data?: Json | null
          resolved?: boolean | null
          session_id?: string | null
          severity?: string | null
          tags?: Json | null
          timestamp?: string | null
          user_id?: string | null
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
