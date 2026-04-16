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
      aftersales_messages: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          message_content: string
          message_order: number
          product_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          message_content: string
          message_order: number
          product_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          message_content?: string
          message_order?: number
          product_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "aftersales_messages_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products_repository"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_token_usage: {
        Row: {
          action_name: string
          completion_tokens: number | null
          cost_brl: number | null
          cost_usd: number | null
          created_at: string | null
          edge_function_id: string
          id: string
          metadata: Json | null
          model: string | null
          product_name: string | null
          prompt_tokens: number | null
          total_tokens: number | null
        }
        Insert: {
          action_name: string
          completion_tokens?: number | null
          cost_brl?: number | null
          cost_usd?: number | null
          created_at?: string | null
          edge_function_id: string
          id?: string
          metadata?: Json | null
          model?: string | null
          product_name?: string | null
          prompt_tokens?: number | null
          total_tokens?: number | null
        }
        Update: {
          action_name?: string
          completion_tokens?: number | null
          cost_brl?: number | null
          cost_usd?: number | null
          created_at?: string | null
          edge_function_id?: string
          id?: string
          metadata?: Json | null
          model?: string | null
          product_name?: string | null
          prompt_tokens?: number | null
          total_tokens?: number | null
        }
        Relationships: []
      }
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
          {
            foreignKeyName: "approved_reviews_raw_review_id_fkey"
            columns: ["raw_review_id"]
            isOneToOne: false
            referencedRelation: "v_reviews_with_responses"
            referencedColumns: ["review_id"]
          },
        ]
      }
      blog_articles: {
        Row: {
          author_kol_id: string | null
          breadcrumb: Json | null
          canonical_url: string | null
          cloudflare_deployment_id: string | null
          created_at: string | null
          domain: string
          eeat_score: number | null
          error_message: string | null
          external_links: Json | null
          faq_blocks: Json | null
          generation_cost_usd: number | null
          generation_model: string | null
          generation_prompt_hash: string | null
          generation_tokens: number | null
          geo_score: number | null
          has_author_schema: boolean | null
          has_comparison_table: boolean | null
          has_definition_block: boolean | null
          has_direct_answer: boolean | null
          has_faq_schema: boolean | null
          has_internal_links: boolean | null
          has_structured_data: boolean | null
          has_wikidata_link: boolean | null
          hreflang_urls: Json | null
          html_content: string | null
          id: string
          indexing_api_submitted: boolean | null
          internal_links: Json | null
          language: string | null
          last_refreshed_at: string | null
          markdown_content: string | null
          meta_description: string | null
          meta_title: string | null
          publish_status: string | null
          published_at: string | null
          published_url: string | null
          readability_score: number | null
          schema_json: Json | null
          seo_score: number | null
          sitemap_included: boolean | null
          systemb_article_id: string | null
          topic_id: string | null
          updated_at: string | null
          version: number | null
          word_count: number | null
        }
        Insert: {
          author_kol_id?: string | null
          breadcrumb?: Json | null
          canonical_url?: string | null
          cloudflare_deployment_id?: string | null
          created_at?: string | null
          domain: string
          eeat_score?: number | null
          error_message?: string | null
          external_links?: Json | null
          faq_blocks?: Json | null
          generation_cost_usd?: number | null
          generation_model?: string | null
          generation_prompt_hash?: string | null
          generation_tokens?: number | null
          geo_score?: number | null
          has_author_schema?: boolean | null
          has_comparison_table?: boolean | null
          has_definition_block?: boolean | null
          has_direct_answer?: boolean | null
          has_faq_schema?: boolean | null
          has_internal_links?: boolean | null
          has_structured_data?: boolean | null
          has_wikidata_link?: boolean | null
          hreflang_urls?: Json | null
          html_content?: string | null
          id?: string
          indexing_api_submitted?: boolean | null
          internal_links?: Json | null
          language?: string | null
          last_refreshed_at?: string | null
          markdown_content?: string | null
          meta_description?: string | null
          meta_title?: string | null
          publish_status?: string | null
          published_at?: string | null
          published_url?: string | null
          readability_score?: number | null
          schema_json?: Json | null
          seo_score?: number | null
          sitemap_included?: boolean | null
          systemb_article_id?: string | null
          topic_id?: string | null
          updated_at?: string | null
          version?: number | null
          word_count?: number | null
        }
        Update: {
          author_kol_id?: string | null
          breadcrumb?: Json | null
          canonical_url?: string | null
          cloudflare_deployment_id?: string | null
          created_at?: string | null
          domain?: string
          eeat_score?: number | null
          error_message?: string | null
          external_links?: Json | null
          faq_blocks?: Json | null
          generation_cost_usd?: number | null
          generation_model?: string | null
          generation_prompt_hash?: string | null
          generation_tokens?: number | null
          geo_score?: number | null
          has_author_schema?: boolean | null
          has_comparison_table?: boolean | null
          has_definition_block?: boolean | null
          has_direct_answer?: boolean | null
          has_faq_schema?: boolean | null
          has_internal_links?: boolean | null
          has_structured_data?: boolean | null
          has_wikidata_link?: boolean | null
          hreflang_urls?: Json | null
          html_content?: string | null
          id?: string
          indexing_api_submitted?: boolean | null
          internal_links?: Json | null
          language?: string | null
          last_refreshed_at?: string | null
          markdown_content?: string | null
          meta_description?: string | null
          meta_title?: string | null
          publish_status?: string | null
          published_at?: string | null
          published_url?: string | null
          readability_score?: number | null
          schema_json?: Json | null
          seo_score?: number | null
          sitemap_included?: boolean | null
          systemb_article_id?: string | null
          topic_id?: string | null
          updated_at?: string | null
          version?: number | null
          word_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "blog_articles_author_kol_id_fkey"
            columns: ["author_kol_id"]
            isOneToOne: false
            referencedRelation: "key_opinion_leaders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blog_articles_domain_fkey"
            columns: ["domain"]
            isOneToOne: false
            referencedRelation: "domain_config"
            referencedColumns: ["domain"]
          },
          {
            foreignKeyName: "blog_articles_systemb_article_id_fkey"
            columns: ["systemb_article_id"]
            isOneToOne: false
            referencedRelation: "systemb_articles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blog_articles_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "blog_topics"
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
          keyword_ids: string[] | null
          keywords: string[] | null
          landing_page_id: string
          meta_description: string | null
          published_at: string | null
          published_domains: string[] | null
          schema_json_ld: Json | null
          status: string
          title: string
          updated_at: string
          version_history: Json | null
          youtube_video_url: string | null
        }
        Insert: {
          author_kol_id?: string | null
          content: string
          created_at?: string
          id?: string
          include_offers?: boolean | null
          intelligent_links?: Json | null
          keyword_ids?: string[] | null
          keywords?: string[] | null
          landing_page_id: string
          meta_description?: string | null
          published_at?: string | null
          published_domains?: string[] | null
          schema_json_ld?: Json | null
          status?: string
          title: string
          updated_at?: string
          version_history?: Json | null
          youtube_video_url?: string | null
        }
        Update: {
          author_kol_id?: string | null
          content?: string
          created_at?: string
          id?: string
          include_offers?: boolean | null
          intelligent_links?: Json | null
          keyword_ids?: string[] | null
          keywords?: string[] | null
          landing_page_id?: string
          meta_description?: string | null
          published_at?: string | null
          published_domains?: string[] | null
          schema_json_ld?: Json | null
          status?: string
          title?: string
          updated_at?: string
          version_history?: Json | null
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
      blog_topics: {
        Row: {
          article_id: string | null
          brief_json: Json | null
          content_type: string | null
          created_at: string | null
          domain: string
          error_message: string | null
          estimated_words: number | null
          id: string
          language: string | null
          lsi_keywords: string[] | null
          pillar_id: string | null
          primary_keyword: string | null
          priority_score: number | null
          related_product_ids: string[] | null
          scheduled_for: string | null
          search_intent: string | null
          slug: string | null
          source: string | null
          status: string | null
          systemb_article_id: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          article_id?: string | null
          brief_json?: Json | null
          content_type?: string | null
          created_at?: string | null
          domain: string
          error_message?: string | null
          estimated_words?: number | null
          id?: string
          language?: string | null
          lsi_keywords?: string[] | null
          pillar_id?: string | null
          primary_keyword?: string | null
          priority_score?: number | null
          related_product_ids?: string[] | null
          scheduled_for?: string | null
          search_intent?: string | null
          slug?: string | null
          source?: string | null
          status?: string | null
          systemb_article_id?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          article_id?: string | null
          brief_json?: Json | null
          content_type?: string | null
          created_at?: string | null
          domain?: string
          error_message?: string | null
          estimated_words?: number | null
          id?: string
          language?: string | null
          lsi_keywords?: string[] | null
          pillar_id?: string | null
          primary_keyword?: string | null
          priority_score?: number | null
          related_product_ids?: string[] | null
          scheduled_for?: string | null
          search_intent?: string | null
          slug?: string | null
          source?: string | null
          status?: string | null
          systemb_article_id?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "blog_topics_domain_fkey"
            columns: ["domain"]
            isOneToOne: false
            referencedRelation: "domain_config"
            referencedColumns: ["domain"]
          },
          {
            foreignKeyName: "blog_topics_pillar_id_fkey"
            columns: ["pillar_id"]
            isOneToOne: false
            referencedRelation: "blog_topics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blog_topics_systemb_article_id_fkey"
            columns: ["systemb_article_id"]
            isOneToOne: false
            referencedRelation: "systemb_articles"
            referencedColumns: ["id"]
          },
        ]
      }
      capcut_kits: {
        Row: {
          aspect_ratio: string
          created_at: string
          drive_folder_id: string | null
          drive_kit_folder_id: string | null
          drive_kit_folder_url: string | null
          drive_upload_status: string | null
          error_message: string | null
          google_ads_desc: string | null
          google_ads_headline: string | null
          id: string
          instagram_copy: string | null
          is_ads_ready: boolean | null
          linkedin_copy: string | null
          narration_audio_url: string | null
          product_id: string
          product_name: string
          script_data: Json | null
          selected_images: Json | null
          status: string
          thumbnail_url: string | null
          tiktok_script: string | null
          updated_at: string
          video_type: string
          whatsapp_copy: string | null
          youtube_chapters: string | null
          youtube_description: string | null
          youtube_status: string | null
          youtube_tags: string[] | null
          youtube_title: string | null
          youtube_uploaded_at: string | null
          youtube_url: string | null
          youtube_video_id: string | null
          yt_like_count: number | null
          yt_stats_updated_at: string | null
          yt_view_count: number | null
        }
        Insert: {
          aspect_ratio?: string
          created_at?: string
          drive_folder_id?: string | null
          drive_kit_folder_id?: string | null
          drive_kit_folder_url?: string | null
          drive_upload_status?: string | null
          error_message?: string | null
          google_ads_desc?: string | null
          google_ads_headline?: string | null
          id?: string
          instagram_copy?: string | null
          is_ads_ready?: boolean | null
          linkedin_copy?: string | null
          narration_audio_url?: string | null
          product_id: string
          product_name: string
          script_data?: Json | null
          selected_images?: Json | null
          status?: string
          thumbnail_url?: string | null
          tiktok_script?: string | null
          updated_at?: string
          video_type: string
          whatsapp_copy?: string | null
          youtube_chapters?: string | null
          youtube_description?: string | null
          youtube_status?: string | null
          youtube_tags?: string[] | null
          youtube_title?: string | null
          youtube_uploaded_at?: string | null
          youtube_url?: string | null
          youtube_video_id?: string | null
          yt_like_count?: number | null
          yt_stats_updated_at?: string | null
          yt_view_count?: number | null
        }
        Update: {
          aspect_ratio?: string
          created_at?: string
          drive_folder_id?: string | null
          drive_kit_folder_id?: string | null
          drive_kit_folder_url?: string | null
          drive_upload_status?: string | null
          error_message?: string | null
          google_ads_desc?: string | null
          google_ads_headline?: string | null
          id?: string
          instagram_copy?: string | null
          is_ads_ready?: boolean | null
          linkedin_copy?: string | null
          narration_audio_url?: string | null
          product_id?: string
          product_name?: string
          script_data?: Json | null
          selected_images?: Json | null
          status?: string
          thumbnail_url?: string | null
          tiktok_script?: string | null
          updated_at?: string
          video_type?: string
          whatsapp_copy?: string | null
          youtube_chapters?: string | null
          youtube_description?: string | null
          youtube_status?: string | null
          youtube_tags?: string[] | null
          youtube_title?: string | null
          youtube_uploaded_at?: string | null
          youtube_url?: string | null
          youtube_video_id?: string | null
          yt_like_count?: number | null
          yt_stats_updated_at?: string | null
          yt_view_count?: number | null
        }
        Relationships: []
      }
      categories_config: {
        Row: {
          anti_hallucination_rules: Json | null
          category: string
          clinical_tone: string | null
          created_at: string
          criticality_percent: number | null
          icon_name: string | null
          id: string
          is_active: boolean | null
          keyword_ids: string[] | null
          keywords: Json | null
          market_keywords: Json | null
          search_intent_keywords: Json | null
          subcategory: string
          target_audience: Json | null
          updated_at: string
        }
        Insert: {
          anti_hallucination_rules?: Json | null
          category: string
          clinical_tone?: string | null
          created_at?: string
          criticality_percent?: number | null
          icon_name?: string | null
          id?: string
          is_active?: boolean | null
          keyword_ids?: string[] | null
          keywords?: Json | null
          market_keywords?: Json | null
          search_intent_keywords?: Json | null
          subcategory: string
          target_audience?: Json | null
          updated_at?: string
        }
        Update: {
          anti_hallucination_rules?: Json | null
          category?: string
          clinical_tone?: string | null
          created_at?: string
          criticality_percent?: number | null
          icon_name?: string | null
          id?: string
          is_active?: boolean | null
          keyword_ids?: string[] | null
          keywords?: Json | null
          market_keywords?: Json | null
          search_intent_keywords?: Json | null
          subcategory?: string
          target_audience?: Json | null
          updated_at?: string
        }
        Relationships: []
      }
      cloned_landing_pages: {
        Row: {
          brand: string | null
          captured_images: Json | null
          cloudflare_deployment_id: string | null
          created_at: string | null
          cta_url: string
          deployment_history: Json | null
          id: string
          is_homepage: boolean | null
          name: string
          original_html: string
          page_path: string | null
          product: string | null
          publish_error_message: string | null
          publish_status: string | null
          published_at: string | null
          published_url: string | null
          seo_config: Json | null
          source_landing_page_id: string | null
          status: string | null
          target_domain: string | null
          transformed_html: string | null
          updated_at: string | null
          user_id: string
          version: number | null
        }
        Insert: {
          brand?: string | null
          captured_images?: Json | null
          cloudflare_deployment_id?: string | null
          created_at?: string | null
          cta_url: string
          deployment_history?: Json | null
          id?: string
          is_homepage?: boolean | null
          name: string
          original_html: string
          page_path?: string | null
          product?: string | null
          publish_error_message?: string | null
          publish_status?: string | null
          published_at?: string | null
          published_url?: string | null
          seo_config?: Json | null
          source_landing_page_id?: string | null
          status?: string | null
          target_domain?: string | null
          transformed_html?: string | null
          updated_at?: string | null
          user_id: string
          version?: number | null
        }
        Update: {
          brand?: string | null
          captured_images?: Json | null
          cloudflare_deployment_id?: string | null
          created_at?: string | null
          cta_url?: string
          deployment_history?: Json | null
          id?: string
          is_homepage?: boolean | null
          name?: string
          original_html?: string
          page_path?: string | null
          product?: string | null
          publish_error_message?: string | null
          publish_status?: string | null
          published_at?: string | null
          published_url?: string | null
          seo_config?: Json | null
          source_landing_page_id?: string | null
          status?: string | null
          target_domain?: string | null
          transformed_html?: string | null
          updated_at?: string | null
          user_id?: string
          version?: number | null
        }
        Relationships: []
      }
      company_milestones: {
        Row: {
          certifications: Json | null
          created_at: string | null
          day: number | null
          description: string | null
          display_order: number | null
          id: string
          image_url: string | null
          impact: string | null
          is_published: boolean | null
          key_people: Json | null
          legacy: string | null
          location: Json | null
          market_context: string | null
          month: number | null
          products_involved: Json | null
          slug: string
          strategic_decision: string | null
          technologies: Json | null
          title: string
          updated_at: string | null
          user_id: string
          video_url: string | null
          year: number
        }
        Insert: {
          certifications?: Json | null
          created_at?: string | null
          day?: number | null
          description?: string | null
          display_order?: number | null
          id?: string
          image_url?: string | null
          impact?: string | null
          is_published?: boolean | null
          key_people?: Json | null
          legacy?: string | null
          location?: Json | null
          market_context?: string | null
          month?: number | null
          products_involved?: Json | null
          slug: string
          strategic_decision?: string | null
          technologies?: Json | null
          title: string
          updated_at?: string | null
          user_id: string
          video_url?: string | null
          year: number
        }
        Update: {
          certifications?: Json | null
          created_at?: string | null
          day?: number | null
          description?: string | null
          display_order?: number | null
          id?: string
          image_url?: string | null
          impact?: string | null
          is_published?: boolean | null
          key_people?: Json | null
          legacy?: string | null
          location?: Json | null
          market_context?: string | null
          month?: number | null
          products_involved?: Json | null
          slug?: string
          strategic_decision?: string | null
          technologies?: Json | null
          title?: string
          updated_at?: string | null
          user_id?: string
          video_url?: string | null
          year?: number
        }
        Relationships: []
      }
      company_profile: {
        Row: {
          address_number: string | null
          anvisa_registrations: Json | null
          areas_served: Json | null
          brand_values: string | null
          business_sector: string | null
          city: string | null
          company_culture: string | null
          company_description: string | null
          company_logo_supabase_path: string | null
          company_logo_url: string | null
          company_name: string
          company_reviews: Json | null
          company_videos: Json | null
          contact_email: string | null
          contact_phone: string | null
          country: string | null
          created_at: string
          delivery_approach: string | null
          differentiators: string | null
          duns_number: string | null
          fda_establishment_number: string | null
          founded_year: number | null
          founder_linkedin: string | null
          founder_name: string | null
          founder_title: string | null
          founders: Json | null
          google_aggregate_rating: Json | null
          id: string
          instagram_profile: string | null
          instagram_verified: boolean | null
          institutional_links: Json | null
          latitude: number | null
          legal_name: string | null
          location: string | null
          longitude: number | null
          main_products_services: string | null
          mission_statement: string | null
          navigation_footer_config: Json | null
          nps_metrics: Json | null
          number_of_employees: string | null
          opening_hours: Json | null
          postal_code: string | null
          price_range: string | null
          seo_competitive_advantages: string | null
          seo_context_keywords: Json | null
          seo_domains: Json | null
          seo_market_positioning: string | null
          seo_service_areas: string | null
          seo_technical_expertise: string | null
          social_media_handles: string[] | null
          social_media_hashtags: string[] | null
          social_media_links: Json | null
          state: string | null
          street_address: string | null
          target_audience: string | null
          tax_id: string | null
          team_size: string | null
          tracking_pixels: Json | null
          updated_at: string
          us_entity: Json | null
          user_id: string
          verified_sources: Json | null
          vision_statement: string | null
          website_url: string | null
          wikidata_id: string | null
          working_methodology: string | null
          youtube_channel: string | null
          youtube_company_footer: string | null
          youtube_tags: string[] | null
          youtube_verified: boolean | null
        }
        Insert: {
          address_number?: string | null
          anvisa_registrations?: Json | null
          areas_served?: Json | null
          brand_values?: string | null
          business_sector?: string | null
          city?: string | null
          company_culture?: string | null
          company_description?: string | null
          company_logo_supabase_path?: string | null
          company_logo_url?: string | null
          company_name: string
          company_reviews?: Json | null
          company_videos?: Json | null
          contact_email?: string | null
          contact_phone?: string | null
          country?: string | null
          created_at?: string
          delivery_approach?: string | null
          differentiators?: string | null
          duns_number?: string | null
          fda_establishment_number?: string | null
          founded_year?: number | null
          founder_linkedin?: string | null
          founder_name?: string | null
          founder_title?: string | null
          founders?: Json | null
          google_aggregate_rating?: Json | null
          id?: string
          instagram_profile?: string | null
          instagram_verified?: boolean | null
          institutional_links?: Json | null
          latitude?: number | null
          legal_name?: string | null
          location?: string | null
          longitude?: number | null
          main_products_services?: string | null
          mission_statement?: string | null
          navigation_footer_config?: Json | null
          nps_metrics?: Json | null
          number_of_employees?: string | null
          opening_hours?: Json | null
          postal_code?: string | null
          price_range?: string | null
          seo_competitive_advantages?: string | null
          seo_context_keywords?: Json | null
          seo_domains?: Json | null
          seo_market_positioning?: string | null
          seo_service_areas?: string | null
          seo_technical_expertise?: string | null
          social_media_handles?: string[] | null
          social_media_hashtags?: string[] | null
          social_media_links?: Json | null
          state?: string | null
          street_address?: string | null
          target_audience?: string | null
          tax_id?: string | null
          team_size?: string | null
          tracking_pixels?: Json | null
          updated_at?: string
          us_entity?: Json | null
          user_id: string
          verified_sources?: Json | null
          vision_statement?: string | null
          website_url?: string | null
          wikidata_id?: string | null
          working_methodology?: string | null
          youtube_channel?: string | null
          youtube_company_footer?: string | null
          youtube_tags?: string[] | null
          youtube_verified?: boolean | null
        }
        Update: {
          address_number?: string | null
          anvisa_registrations?: Json | null
          areas_served?: Json | null
          brand_values?: string | null
          business_sector?: string | null
          city?: string | null
          company_culture?: string | null
          company_description?: string | null
          company_logo_supabase_path?: string | null
          company_logo_url?: string | null
          company_name?: string
          company_reviews?: Json | null
          company_videos?: Json | null
          contact_email?: string | null
          contact_phone?: string | null
          country?: string | null
          created_at?: string
          delivery_approach?: string | null
          differentiators?: string | null
          duns_number?: string | null
          fda_establishment_number?: string | null
          founded_year?: number | null
          founder_linkedin?: string | null
          founder_name?: string | null
          founder_title?: string | null
          founders?: Json | null
          google_aggregate_rating?: Json | null
          id?: string
          instagram_profile?: string | null
          instagram_verified?: boolean | null
          institutional_links?: Json | null
          latitude?: number | null
          legal_name?: string | null
          location?: string | null
          longitude?: number | null
          main_products_services?: string | null
          mission_statement?: string | null
          navigation_footer_config?: Json | null
          nps_metrics?: Json | null
          number_of_employees?: string | null
          opening_hours?: Json | null
          postal_code?: string | null
          price_range?: string | null
          seo_competitive_advantages?: string | null
          seo_context_keywords?: Json | null
          seo_domains?: Json | null
          seo_market_positioning?: string | null
          seo_service_areas?: string | null
          seo_technical_expertise?: string | null
          social_media_handles?: string[] | null
          social_media_hashtags?: string[] | null
          social_media_links?: Json | null
          state?: string | null
          street_address?: string | null
          target_audience?: string | null
          tax_id?: string | null
          team_size?: string | null
          tracking_pixels?: Json | null
          updated_at?: string
          us_entity?: Json | null
          user_id?: string
          verified_sources?: Json | null
          vision_statement?: string | null
          website_url?: string | null
          wikidata_id?: string | null
          working_methodology?: string | null
          youtube_channel?: string | null
          youtube_company_footer?: string | null
          youtube_tags?: string[] | null
          youtube_verified?: boolean | null
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
      content_calendar: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          caption: string | null
          comments: number | null
          content_type: string
          created_at: string
          cta_text: string | null
          cta_url: string | null
          error_message: string | null
          hashtags: string[] | null
          id: string
          likes: number | null
          media_url: string | null
          platform: string
          platform_post_id: string | null
          platform_url: string | null
          product_id: string | null
          product_name: string | null
          published_at: string | null
          reach: number | null
          saves: number | null
          scheduled_for: string | null
          shares: number | null
          source_id: string | null
          source_type: string
          stats_updated_at: string | null
          status: string
          thumbnail_url: string | null
          title: string | null
          updated_at: string
          views: number | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          caption?: string | null
          comments?: number | null
          content_type: string
          created_at?: string
          cta_text?: string | null
          cta_url?: string | null
          error_message?: string | null
          hashtags?: string[] | null
          id?: string
          likes?: number | null
          media_url?: string | null
          platform: string
          platform_post_id?: string | null
          platform_url?: string | null
          product_id?: string | null
          product_name?: string | null
          published_at?: string | null
          reach?: number | null
          saves?: number | null
          scheduled_for?: string | null
          shares?: number | null
          source_id?: string | null
          source_type: string
          stats_updated_at?: string | null
          status?: string
          thumbnail_url?: string | null
          title?: string | null
          updated_at?: string
          views?: number | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          caption?: string | null
          comments?: number | null
          content_type?: string
          created_at?: string
          cta_text?: string | null
          cta_url?: string | null
          error_message?: string | null
          hashtags?: string[] | null
          id?: string
          likes?: number | null
          media_url?: string | null
          platform?: string
          platform_post_id?: string | null
          platform_url?: string | null
          product_id?: string | null
          product_name?: string | null
          published_at?: string | null
          reach?: number | null
          saves?: number | null
          scheduled_for?: string | null
          shares?: number | null
          source_id?: string | null
          source_type?: string
          stats_updated_at?: string | null
          status?: string
          thumbnail_url?: string | null
          title?: string | null
          updated_at?: string
          views?: number | null
        }
        Relationships: []
      }
      content_completion_tracking: {
        Row: {
          completion_score: number
          completion_status: string
          created_at: string
          entity_id: string
          entity_type: string
          id: string
          last_calculated_at: string
          marked_complete: boolean | null
          marked_complete_at: string | null
          marked_complete_by: string | null
          missing_fields: string[] | null
          required_fields: string[] | null
          score_details: Json
          updated_at: string
        }
        Insert: {
          completion_score?: number
          completion_status?: string
          created_at?: string
          entity_id: string
          entity_type: string
          id?: string
          last_calculated_at?: string
          marked_complete?: boolean | null
          marked_complete_at?: string | null
          marked_complete_by?: string | null
          missing_fields?: string[] | null
          required_fields?: string[] | null
          score_details?: Json
          updated_at?: string
        }
        Update: {
          completion_score?: number
          completion_status?: string
          created_at?: string
          entity_id?: string
          entity_type?: string
          id?: string
          last_calculated_at?: string
          marked_complete?: boolean | null
          marked_complete_at?: string | null
          marked_complete_by?: string | null
          missing_fields?: string[] | null
          required_fields?: string[] | null
          score_details?: Json
          updated_at?: string
        }
        Relationships: []
      }
      content_entity_links: {
        Row: {
          created_at: string | null
          entity_id: string
          entity_slug: string | null
          entity_type: string
          id: string
          page_id: string | null
          relevance_score: number | null
        }
        Insert: {
          created_at?: string | null
          entity_id: string
          entity_slug?: string | null
          entity_type: string
          id?: string
          page_id?: string | null
          relevance_score?: number | null
        }
        Update: {
          created_at?: string | null
          entity_id?: string
          entity_slug?: string | null
          entity_type?: string
          id?: string
          page_id?: string | null
          relevance_score?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "content_entity_links_page_id_fkey"
            columns: ["page_id"]
            isOneToOne: false
            referencedRelation: "generated_pages"
            referencedColumns: ["id"]
          },
        ]
      }
      content_jobs: {
        Row: {
          attempts: number | null
          created_at: string | null
          finished_at: string | null
          id: string
          job_type: string
          last_error: string | null
          locked_at: string | null
          locked_by: string | null
          max_attempts: number | null
          priority: number | null
          scheduled_at: string | null
          started_at: string | null
          status: string | null
          submission_id: string | null
        }
        Insert: {
          attempts?: number | null
          created_at?: string | null
          finished_at?: string | null
          id?: string
          job_type: string
          last_error?: string | null
          locked_at?: string | null
          locked_by?: string | null
          max_attempts?: number | null
          priority?: number | null
          scheduled_at?: string | null
          started_at?: string | null
          status?: string | null
          submission_id?: string | null
        }
        Update: {
          attempts?: number | null
          created_at?: string | null
          finished_at?: string | null
          id?: string
          job_type?: string
          last_error?: string | null
          locked_at?: string | null
          locked_by?: string | null
          max_attempts?: number | null
          priority?: number | null
          scheduled_at?: string | null
          started_at?: string | null
          status?: string | null
          submission_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "content_jobs_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "content_submissions"
            referencedColumns: ["id"]
          },
        ]
      }
      content_refresh_log: {
        Row: {
          created_at: string
          details: Json | null
          duration_ms: number | null
          error_message: string | null
          id: string
          operation: string
          source_id: string | null
          source_table: string | null
          success: boolean | null
          target_id: string | null
          target_type: string | null
          target_url: string | null
          trigger_type: string
        }
        Insert: {
          created_at?: string
          details?: Json | null
          duration_ms?: number | null
          error_message?: string | null
          id?: string
          operation: string
          source_id?: string | null
          source_table?: string | null
          success?: boolean | null
          target_id?: string | null
          target_type?: string | null
          target_url?: string | null
          trigger_type: string
        }
        Update: {
          created_at?: string
          details?: Json | null
          duration_ms?: number | null
          error_message?: string | null
          id?: string
          operation?: string
          source_id?: string | null
          source_table?: string | null
          success?: boolean | null
          target_id?: string | null
          target_type?: string | null
          target_url?: string | null
          trigger_type?: string
        }
        Relationships: []
      }
      content_submissions: {
        Row: {
          content_type: string
          created_at: string | null
          editorial_status: string | null
          extracted_entities: Json | null
          id: string
          metadata: Json | null
          origin: Json | null
          parent_submission_id: string | null
          processed_at: string | null
          processed_by: string | null
          processing_notes: string | null
          processing_status: string | null
          raw_content: string | null
          rejection_reason: string | null
          related_products: string[] | null
          source_system: string
          tags: string[] | null
          title: string
          updated_at: string | null
          version: number | null
        }
        Insert: {
          content_type: string
          created_at?: string | null
          editorial_status?: string | null
          extracted_entities?: Json | null
          id?: string
          metadata?: Json | null
          origin?: Json | null
          parent_submission_id?: string | null
          processed_at?: string | null
          processed_by?: string | null
          processing_notes?: string | null
          processing_status?: string | null
          raw_content?: string | null
          rejection_reason?: string | null
          related_products?: string[] | null
          source_system: string
          tags?: string[] | null
          title: string
          updated_at?: string | null
          version?: number | null
        }
        Update: {
          content_type?: string
          created_at?: string | null
          editorial_status?: string | null
          extracted_entities?: Json | null
          id?: string
          metadata?: Json | null
          origin?: Json | null
          parent_submission_id?: string | null
          processed_at?: string | null
          processed_by?: string | null
          processing_notes?: string | null
          processing_status?: string | null
          raw_content?: string | null
          rejection_reason?: string | null
          related_products?: string[] | null
          source_system?: string
          tags?: string[] | null
          title?: string
          updated_at?: string | null
          version?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "content_submissions_parent_submission_id_fkey"
            columns: ["parent_submission_id"]
            isOneToOne: false
            referencedRelation: "content_submissions"
            referencedColumns: ["id"]
          },
        ]
      }
      cs_messages: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          message_content: string
          message_order: number
          product_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          message_content: string
          message_order: number
          product_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          message_content?: string
          message_order?: number
          product_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cs_messages_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products_repository"
            referencedColumns: ["id"]
          },
        ]
      }
      domain_config: {
        Row: {
          active: boolean | null
          blog_author_kol_id: string | null
          blog_base_path: string | null
          blog_cta_url: string | null
          blog_lang_default: string | null
          brand_name: string
          cf_status: string | null
          cloudflare_project: string | null
          created_at: string | null
          description: string | null
          domain: string
          ftp_profile: string | null
          google_indexing_enabled: boolean | null
          hreflang_locales: string[] | null
          hub_domain: string | null
          is_hub: boolean | null
          keyword_rules: string[] | null
          main_theme: string
          monthly_target: number | null
          priority: number | null
          product_categories: string[] | null
          publish_method: string | null
          schema_org_type: string | null
          sitemap_url: string | null
          updated_at: string | null
          url_structure: Json | null
        }
        Insert: {
          active?: boolean | null
          blog_author_kol_id?: string | null
          blog_base_path?: string | null
          blog_cta_url?: string | null
          blog_lang_default?: string | null
          brand_name: string
          cf_status?: string | null
          cloudflare_project?: string | null
          created_at?: string | null
          description?: string | null
          domain: string
          ftp_profile?: string | null
          google_indexing_enabled?: boolean | null
          hreflang_locales?: string[] | null
          hub_domain?: string | null
          is_hub?: boolean | null
          keyword_rules?: string[] | null
          main_theme: string
          monthly_target?: number | null
          priority?: number | null
          product_categories?: string[] | null
          publish_method?: string | null
          schema_org_type?: string | null
          sitemap_url?: string | null
          updated_at?: string | null
          url_structure?: Json | null
        }
        Update: {
          active?: boolean | null
          blog_author_kol_id?: string | null
          blog_base_path?: string | null
          blog_cta_url?: string | null
          blog_lang_default?: string | null
          brand_name?: string
          cf_status?: string | null
          cloudflare_project?: string | null
          created_at?: string | null
          description?: string | null
          domain?: string
          ftp_profile?: string | null
          google_indexing_enabled?: boolean | null
          hreflang_locales?: string[] | null
          hub_domain?: string | null
          is_hub?: boolean | null
          keyword_rules?: string[] | null
          main_theme?: string
          monthly_target?: number | null
          priority?: number | null
          product_categories?: string[] | null
          publish_method?: string | null
          schema_org_type?: string | null
          sitemap_url?: string | null
          updated_at?: string | null
          url_structure?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "domain_config_blog_author_kol_id_fkey"
            columns: ["blog_author_kol_id"]
            isOneToOne: false
            referencedRelation: "key_opinion_leaders"
            referencedColumns: ["id"]
          },
        ]
      }
      external_links: {
        Row: {
          ai_generated: boolean | null
          approved: boolean
          category: string
          competition_level: string | null
          cpc_estimate: number | null
          created_at: string
          description: string | null
          id: string
          keyword_type: string | null
          last_used_at: string | null
          monthly_searches: number | null
          name: string
          related_keywords: string[] | null
          relevance_score: number | null
          search_intent: string | null
          source_products: string[] | null
          subcategory: string | null
          updated_at: string
          url: string
          usage_count: number | null
        }
        Insert: {
          ai_generated?: boolean | null
          approved?: boolean
          category?: string
          competition_level?: string | null
          cpc_estimate?: number | null
          created_at?: string
          description?: string | null
          id?: string
          keyword_type?: string | null
          last_used_at?: string | null
          monthly_searches?: number | null
          name: string
          related_keywords?: string[] | null
          relevance_score?: number | null
          search_intent?: string | null
          source_products?: string[] | null
          subcategory?: string | null
          updated_at?: string
          url: string
          usage_count?: number | null
        }
        Update: {
          ai_generated?: boolean | null
          approved?: boolean
          category?: string
          competition_level?: string | null
          cpc_estimate?: number | null
          created_at?: string
          description?: string | null
          id?: string
          keyword_type?: string | null
          last_used_at?: string | null
          monthly_searches?: number | null
          name?: string
          related_keywords?: string[] | null
          relevance_score?: number | null
          search_intent?: string | null
          source_products?: string[] | null
          subcategory?: string | null
          updated_at?: string
          url?: string
          usage_count?: number | null
        }
        Relationships: []
      }
      external_links_backup_20250120: {
        Row: {
          ai_generated: boolean | null
          approved: boolean | null
          category: string | null
          competition_level: string | null
          cpc_estimate: number | null
          created_at: string | null
          description: string | null
          id: string | null
          keyword_type: string | null
          last_used_at: string | null
          monthly_searches: number | null
          name: string | null
          related_keywords: string[] | null
          relevance_score: number | null
          search_intent: string | null
          source_products: string[] | null
          subcategory: string | null
          updated_at: string | null
          url: string | null
          usage_count: number | null
        }
        Insert: {
          ai_generated?: boolean | null
          approved?: boolean | null
          category?: string | null
          competition_level?: string | null
          cpc_estimate?: number | null
          created_at?: string | null
          description?: string | null
          id?: string | null
          keyword_type?: string | null
          last_used_at?: string | null
          monthly_searches?: number | null
          name?: string | null
          related_keywords?: string[] | null
          relevance_score?: number | null
          search_intent?: string | null
          source_products?: string[] | null
          subcategory?: string | null
          updated_at?: string | null
          url?: string | null
          usage_count?: number | null
        }
        Update: {
          ai_generated?: boolean | null
          approved?: boolean | null
          category?: string | null
          competition_level?: string | null
          cpc_estimate?: number | null
          created_at?: string | null
          description?: string | null
          id?: string | null
          keyword_type?: string | null
          last_used_at?: string | null
          monthly_searches?: number | null
          name?: string | null
          related_keywords?: string[] | null
          relevance_score?: number | null
          search_intent?: string | null
          source_products?: string[] | null
          subcategory?: string | null
          updated_at?: string | null
          url?: string | null
          usage_count?: number | null
        }
        Relationships: []
      }
      external_links_backup_20251013: {
        Row: {
          approved: boolean | null
          category: string | null
          created_at: string | null
          description: string | null
          id: string | null
          name: string | null
          subcategory: string | null
          updated_at: string | null
          url: string | null
        }
        Insert: {
          approved?: boolean | null
          category?: string | null
          created_at?: string | null
          description?: string | null
          id?: string | null
          name?: string | null
          subcategory?: string | null
          updated_at?: string | null
          url?: string | null
        }
        Update: {
          approved?: boolean | null
          category?: string | null
          created_at?: string | null
          description?: string | null
          id?: string | null
          name?: string | null
          subcategory?: string | null
          updated_at?: string | null
          url?: string | null
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
      gbp_posts_log: {
        Row: {
          created_at: string
          cta_type: string | null
          cta_url: string | null
          error_message: string | null
          google_post_id: string | null
          id: string
          image_url: string | null
          post_type: string
          published_at: string | null
          scheduled_for: string | null
          source_id: string | null
          source_type: string | null
          status: string
          summary: string
          title: string | null
        }
        Insert: {
          created_at?: string
          cta_type?: string | null
          cta_url?: string | null
          error_message?: string | null
          google_post_id?: string | null
          id?: string
          image_url?: string | null
          post_type?: string
          published_at?: string | null
          scheduled_for?: string | null
          source_id?: string | null
          source_type?: string | null
          status?: string
          summary: string
          title?: string | null
        }
        Update: {
          created_at?: string
          cta_type?: string | null
          cta_url?: string | null
          error_message?: string | null
          google_post_id?: string | null
          id?: string
          image_url?: string | null
          post_type?: string
          published_at?: string | null
          scheduled_for?: string | null
          source_id?: string | null
          source_type?: string | null
          status?: string
          summary?: string
          title?: string | null
        }
        Relationships: []
      }
      generated_pages: {
        Row: {
          canonical_url: string | null
          content_hash: string | null
          content_status: string | null
          created_at: string | null
          embedding: string | null
          entities: Json | null
          html_content: string | null
          id: string
          knowledge_graph_snapshot: Json | null
          page_type: string | null
          path: string | null
          published: boolean | null
          published_at: string | null
          published_url: string | null
          regeneration_required: boolean | null
          schema_json_ld: string | null
          seo_score: number | null
          slug: string
          source_submission_id: string | null
          structured_content: Json | null
          tags: string[] | null
          title: string
          updated_at: string | null
        }
        Insert: {
          canonical_url?: string | null
          content_hash?: string | null
          content_status?: string | null
          created_at?: string | null
          embedding?: string | null
          entities?: Json | null
          html_content?: string | null
          id?: string
          knowledge_graph_snapshot?: Json | null
          page_type?: string | null
          path?: string | null
          published?: boolean | null
          published_at?: string | null
          published_url?: string | null
          regeneration_required?: boolean | null
          schema_json_ld?: string | null
          seo_score?: number | null
          slug: string
          source_submission_id?: string | null
          structured_content?: Json | null
          tags?: string[] | null
          title: string
          updated_at?: string | null
        }
        Update: {
          canonical_url?: string | null
          content_hash?: string | null
          content_status?: string | null
          created_at?: string | null
          embedding?: string | null
          entities?: Json | null
          html_content?: string | null
          id?: string
          knowledge_graph_snapshot?: Json | null
          page_type?: string | null
          path?: string | null
          published?: boolean | null
          published_at?: string | null
          published_url?: string | null
          regeneration_required?: boolean | null
          schema_json_ld?: string | null
          seo_score?: number | null
          slug?: string
          source_submission_id?: string | null
          structured_content?: Json | null
          tags?: string[] | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "generated_pages_source_submission_id_fkey"
            columns: ["source_submission_id"]
            isOneToOne: false
            referencedRelation: "content_submissions"
            referencedColumns: ["id"]
          },
        ]
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
      google_oauth_tokens: {
        Row: {
          created_at: string | null
          expires_at: string | null
          id: string
          provider_refresh_token: string | null
          provider_token: string | null
          scopes: string[] | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          expires_at?: string | null
          id?: string
          provider_refresh_token?: string | null
          provider_token?: string | null
          scopes?: string[] | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          expires_at?: string | null
          id?: string
          provider_refresh_token?: string | null
          provider_token?: string | null
          scopes?: string[] | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      key_opinion_leaders: {
        Row: {
          academic_title: string | null
          approved: boolean
          citations_count: number | null
          created_at: string
          display_order: number | null
          full_name: string
          id: string
          instagram_url: string | null
          institution: string | null
          lattes_url: string | null
          linkedin_url: string | null
          mini_cv: string | null
          orcid_url: string | null
          photo_url: string | null
          regulatory_ids: Json | null
          specialty: string | null
          updated_at: string
          website_url: string | null
          wikidata_id: string | null
          youtube_url: string | null
        }
        Insert: {
          academic_title?: string | null
          approved?: boolean
          citations_count?: number | null
          created_at?: string
          display_order?: number | null
          full_name: string
          id?: string
          instagram_url?: string | null
          institution?: string | null
          lattes_url?: string | null
          linkedin_url?: string | null
          mini_cv?: string | null
          orcid_url?: string | null
          photo_url?: string | null
          regulatory_ids?: Json | null
          specialty?: string | null
          updated_at?: string
          website_url?: string | null
          wikidata_id?: string | null
          youtube_url?: string | null
        }
        Update: {
          academic_title?: string | null
          approved?: boolean
          citations_count?: number | null
          created_at?: string
          display_order?: number | null
          full_name?: string
          id?: string
          instagram_url?: string | null
          institution?: string | null
          lattes_url?: string | null
          linkedin_url?: string | null
          mini_cv?: string | null
          orcid_url?: string | null
          photo_url?: string | null
          regulatory_ids?: Json | null
          specialty?: string | null
          updated_at?: string
          website_url?: string | null
          wikidata_id?: string | null
          youtube_url?: string | null
        }
        Relationships: []
      }
      knowledge_base_cache: {
        Row: {
          created_at: string | null
          data: Json
          expires_at: string | null
          format: string
          id: string
          products_count: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          data: Json
          expires_at?: string | null
          format?: string
          id?: string
          products_count?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          data?: Json
          expires_at?: string | null
          format?: string
          id?: string
          products_count?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      knowledge_vectors: {
        Row: {
          chunk_type: string
          content: string
          created_at: string | null
          embedding: string | null
          id: string
          metadata: Json | null
          product_id: string
          product_name: string | null
          updated_at: string | null
        }
        Insert: {
          chunk_type: string
          content: string
          created_at?: string | null
          embedding?: string | null
          id?: string
          metadata?: Json | null
          product_id: string
          product_name?: string | null
          updated_at?: string | null
        }
        Update: {
          chunk_type?: string
          content?: string
          created_at?: string | null
          embedding?: string | null
          id?: string
          metadata?: Json | null
          product_id?: string
          product_name?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      landing_pages: {
        Row: {
          blog_generated: boolean | null
          blog_generated_at: string | null
          consolidated_generated_at: string | null
          consolidated_html_cache: Json | null
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
          consolidated_generated_at?: string | null
          consolidated_html_cache?: Json | null
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
          consolidated_generated_at?: string | null
          consolidated_html_cache?: Json | null
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
      lia_conversations: {
        Row: {
          channel: string | null
          cognitive_analysis: Json | null
          created_at: string
          current_state: string
          ended_at: string | null
          extracted_entities: Json | null
          id: string
          lead_id: string
          message_count: number
          outcome: string | null
          started_at: string
          updated_at: string
        }
        Insert: {
          channel?: string | null
          cognitive_analysis?: Json | null
          created_at?: string
          current_state?: string
          ended_at?: string | null
          extracted_entities?: Json | null
          id?: string
          lead_id: string
          message_count?: number
          outcome?: string | null
          started_at?: string
          updated_at?: string
        }
        Update: {
          channel?: string | null
          cognitive_analysis?: Json | null
          created_at?: string
          current_state?: string
          ended_at?: string | null
          extracted_entities?: Json | null
          id?: string
          lead_id?: string
          message_count?: number
          outcome?: string | null
          started_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lia_conversations_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "lia_leads"
            referencedColumns: ["id"]
          },
        ]
      }
      lia_lead_events: {
        Row: {
          created_at: string
          event_data: Json | null
          event_type: string
          id: string
          lead_id: string
          source: string
        }
        Insert: {
          created_at?: string
          event_data?: Json | null
          event_type: string
          id?: string
          lead_id: string
          source?: string
        }
        Update: {
          created_at?: string
          event_data?: Json | null
          event_type?: string
          id?: string
          lead_id?: string
          source?: string
        }
        Relationships: [
          {
            foreignKeyName: "lia_lead_events_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "lia_leads"
            referencedColumns: ["id"]
          },
        ]
      }
      lia_leads: {
        Row: {
          company_name: string | null
          created_at: string
          email: string | null
          external_id: string | null
          first_seen_at: string
          id: string
          last_seen_at: string
          lead_score: number
          name: string | null
          phone: string | null
          profile_summary: string | null
          role: string | null
          tags: Json | null
          total_conversations: number
          updated_at: string
        }
        Insert: {
          company_name?: string | null
          created_at?: string
          email?: string | null
          external_id?: string | null
          first_seen_at?: string
          id?: string
          last_seen_at?: string
          lead_score?: number
          name?: string | null
          phone?: string | null
          profile_summary?: string | null
          role?: string | null
          tags?: Json | null
          total_conversations?: number
          updated_at?: string
        }
        Update: {
          company_name?: string | null
          created_at?: string
          email?: string | null
          external_id?: string | null
          first_seen_at?: string
          id?: string
          last_seen_at?: string
          lead_score?: number
          name?: string | null
          phone?: string | null
          profile_summary?: string | null
          role?: string | null
          tags?: Json | null
          total_conversations?: number
          updated_at?: string
        }
        Relationships: []
      }
      lia_messages: {
        Row: {
          chunks_used: Json | null
          content: string
          conversation_id: string
          created_at: string
          hallucination_flag: boolean | null
          id: string
          quality_score: number | null
          role: string
        }
        Insert: {
          chunks_used?: Json | null
          content: string
          conversation_id: string
          created_at?: string
          hallucination_flag?: boolean | null
          id?: string
          quality_score?: number | null
          role: string
        }
        Update: {
          chunks_used?: Json | null
          content?: string
          conversation_id?: string
          created_at?: string
          hallucination_flag?: boolean | null
          id?: string
          quality_score?: number | null
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "lia_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "lia_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      local_seo_targets: {
        Row: {
          category_name: string | null
          city: string | null
          competition_est: string | null
          created_at: string
          delivery_promise: string | null
          focus_keyword: string | null
          h1_text: string | null
          html_content: string | null
          html_generated: boolean | null
          id: string
          last_refreshed: string | null
          meta_description: string | null
          page_slug: string | null
          page_title: string | null
          priority: number | null
          product_id: string | null
          product_name: string | null
          published_at: string | null
          published_url: string | null
          region_label: string | null
          search_volume_est: number | null
          secondary_keywords: string[] | null
          shipping_highlight: string | null
          specialty: string
          state_uf: string
          status: string
          updated_at: string
        }
        Insert: {
          category_name?: string | null
          city?: string | null
          competition_est?: string | null
          created_at?: string
          delivery_promise?: string | null
          focus_keyword?: string | null
          h1_text?: string | null
          html_content?: string | null
          html_generated?: boolean | null
          id?: string
          last_refreshed?: string | null
          meta_description?: string | null
          page_slug?: string | null
          page_title?: string | null
          priority?: number | null
          product_id?: string | null
          product_name?: string | null
          published_at?: string | null
          published_url?: string | null
          region_label?: string | null
          search_volume_est?: number | null
          secondary_keywords?: string[] | null
          shipping_highlight?: string | null
          specialty: string
          state_uf: string
          status?: string
          updated_at?: string
        }
        Update: {
          category_name?: string | null
          city?: string | null
          competition_est?: string | null
          created_at?: string
          delivery_promise?: string | null
          focus_keyword?: string | null
          h1_text?: string | null
          html_content?: string | null
          html_generated?: boolean | null
          id?: string
          last_refreshed?: string | null
          meta_description?: string | null
          page_slug?: string | null
          page_title?: string | null
          priority?: number | null
          product_id?: string | null
          product_name?: string | null
          published_at?: string | null
          published_url?: string | null
          region_label?: string | null
          search_volume_est?: number | null
          secondary_keywords?: string[] | null
          shipping_highlight?: string | null
          specialty?: string
          state_uf?: string
          status?: string
          updated_at?: string
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
      nps_generated_content: {
        Row: {
          action_type: string
          applied: boolean
          applied_at: string | null
          created_at: string
          generated_data: Json
          id: string
          notes: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          action_type: string
          applied?: boolean
          applied_at?: string | null
          created_at?: string
          generated_data?: Json
          id?: string
          notes?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          action_type?: string
          applied?: boolean
          applied_at?: string | null
          created_at?: string
          generated_data?: Json
          id?: string
          notes?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      oauth_client_configs: {
        Row: {
          client_id: string
          client_secret: string
          created_at: string
          id: string
          owner_user_id: string
          provider: string
          updated_at: string
        }
        Insert: {
          client_id: string
          client_secret: string
          created_at?: string
          id?: string
          owner_user_id: string
          provider: string
          updated_at?: string
        }
        Update: {
          client_id?: string
          client_secret?: string
          created_at?: string
          id?: string
          owner_user_id?: string
          provider?: string
          updated_at?: string
        }
        Relationships: []
      }
      oauth_credentials: {
        Row: {
          client_id: string | null
          client_secret: string | null
          created_at: string
          id: string
          provider: string
          refresh_token: string
          updated_at: string
          user_id: string
        }
        Insert: {
          client_id?: string | null
          client_secret?: string | null
          created_at?: string
          id?: string
          provider: string
          refresh_token: string
          updated_at?: string
          user_id: string
        }
        Update: {
          client_id?: string | null
          client_secret?: string | null
          created_at?: string
          id?: string
          provider?: string
          refresh_token?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      page_publications: {
        Row: {
          html_snapshot: string | null
          id: string
          page_id: string | null
          published_at: string | null
          published_domain: string | null
          published_url: string | null
          version: number
        }
        Insert: {
          html_snapshot?: string | null
          id?: string
          page_id?: string | null
          published_at?: string | null
          published_domain?: string | null
          published_url?: string | null
          version: number
        }
        Update: {
          html_snapshot?: string | null
          id?: string
          page_id?: string | null
          published_at?: string | null
          published_domain?: string | null
          published_url?: string | null
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "page_publications_page_id_fkey"
            columns: ["page_id"]
            isOneToOne: false
            referencedRelation: "generated_pages"
            referencedColumns: ["id"]
          },
        ]
      }
      panda_videos: {
        Row: {
          category_name: string | null
          copies_approved: boolean | null
          copies_generated: boolean | null
          copies_generated_at: string | null
          created_at: string
          description: string | null
          duration_seconds: number | null
          embed_url: string | null
          file_size_bytes: number | null
          gbp_post_id: string | null
          gbp_post_status: string | null
          gbp_posted_at: string | null
          id: string
          instagram_post_id: string | null
          instagram_posted_at: string | null
          language: string | null
          last_synced_at: string | null
          panda_finish_rate: number | null
          panda_folder_id: string | null
          panda_play_count: number | null
          panda_stats_updated_at: string | null
          panda_url: string | null
          panda_video_id: string
          panda_view_count: number | null
          product_id: string | null
          product_name: string | null
          sistema_b_reference: string | null
          source: string
          status: string
          tags: string[] | null
          thumbnail_url: string | null
          title: string
          transcript: string | null
          transcript_updated_at: string | null
          updated_at: string
          youtube_description: string | null
          youtube_posted_at: string | null
          youtube_status: string | null
          youtube_tags: string[] | null
          youtube_title: string | null
          youtube_url: string | null
          youtube_video_id: string | null
          yt_avg_view_duration: number | null
          yt_comment_count: number | null
          yt_ctr: number | null
          yt_impressions: number | null
          yt_like_count: number | null
          yt_stats_updated_at: string | null
          yt_view_count: number | null
        }
        Insert: {
          category_name?: string | null
          copies_approved?: boolean | null
          copies_generated?: boolean | null
          copies_generated_at?: string | null
          created_at?: string
          description?: string | null
          duration_seconds?: number | null
          embed_url?: string | null
          file_size_bytes?: number | null
          gbp_post_id?: string | null
          gbp_post_status?: string | null
          gbp_posted_at?: string | null
          id?: string
          instagram_post_id?: string | null
          instagram_posted_at?: string | null
          language?: string | null
          last_synced_at?: string | null
          panda_finish_rate?: number | null
          panda_folder_id?: string | null
          panda_play_count?: number | null
          panda_stats_updated_at?: string | null
          panda_url?: string | null
          panda_video_id: string
          panda_view_count?: number | null
          product_id?: string | null
          product_name?: string | null
          sistema_b_reference?: string | null
          source?: string
          status?: string
          tags?: string[] | null
          thumbnail_url?: string | null
          title: string
          transcript?: string | null
          transcript_updated_at?: string | null
          updated_at?: string
          youtube_description?: string | null
          youtube_posted_at?: string | null
          youtube_status?: string | null
          youtube_tags?: string[] | null
          youtube_title?: string | null
          youtube_url?: string | null
          youtube_video_id?: string | null
          yt_avg_view_duration?: number | null
          yt_comment_count?: number | null
          yt_ctr?: number | null
          yt_impressions?: number | null
          yt_like_count?: number | null
          yt_stats_updated_at?: string | null
          yt_view_count?: number | null
        }
        Update: {
          category_name?: string | null
          copies_approved?: boolean | null
          copies_generated?: boolean | null
          copies_generated_at?: string | null
          created_at?: string
          description?: string | null
          duration_seconds?: number | null
          embed_url?: string | null
          file_size_bytes?: number | null
          gbp_post_id?: string | null
          gbp_post_status?: string | null
          gbp_posted_at?: string | null
          id?: string
          instagram_post_id?: string | null
          instagram_posted_at?: string | null
          language?: string | null
          last_synced_at?: string | null
          panda_finish_rate?: number | null
          panda_folder_id?: string | null
          panda_play_count?: number | null
          panda_stats_updated_at?: string | null
          panda_url?: string | null
          panda_video_id?: string
          panda_view_count?: number | null
          product_id?: string | null
          product_name?: string | null
          sistema_b_reference?: string | null
          source?: string
          status?: string
          tags?: string[] | null
          thumbnail_url?: string | null
          title?: string
          transcript?: string | null
          transcript_updated_at?: string | null
          updated_at?: string
          youtube_description?: string | null
          youtube_posted_at?: string | null
          youtube_status?: string | null
          youtube_tags?: string[] | null
          youtube_title?: string | null
          youtube_url?: string | null
          youtube_video_id?: string | null
          yt_avg_view_duration?: number | null
          yt_comment_count?: number | null
          yt_ctr?: number | null
          yt_impressions?: number | null
          yt_like_count?: number | null
          yt_stats_updated_at?: string | null
          yt_view_count?: number | null
        }
        Relationships: []
      }
      pipeline_audit_logs: {
        Row: {
          created_at: string | null
          duration_ms: number | null
          error_message: string | null
          finished_at: string | null
          id: string
          input_summary: Json | null
          output_summary: Json | null
          started_at: string | null
          status: string
          step_name: string
          step_number: number
          submission_id: string | null
        }
        Insert: {
          created_at?: string | null
          duration_ms?: number | null
          error_message?: string | null
          finished_at?: string | null
          id?: string
          input_summary?: Json | null
          output_summary?: Json | null
          started_at?: string | null
          status?: string
          step_name: string
          step_number: number
          submission_id?: string | null
        }
        Update: {
          created_at?: string | null
          duration_ms?: number | null
          error_message?: string | null
          finished_at?: string | null
          id?: string
          input_summary?: Json | null
          output_summary?: Json | null
          started_at?: string | null
          status?: string
          step_name?: string
          step_number?: number
          submission_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pipeline_audit_logs_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "content_submissions"
            referencedColumns: ["id"]
          },
        ]
      }
      product_blog_publications: {
        Row: {
          blog_type: string
          cloudflare_deployment_id: string | null
          created_at: string
          html_content: string | null
          id: string
          page_path: string
          product_id: string
          publish_error_message: string | null
          publish_status: string
          published_at: string | null
          published_url: string | null
          seo_config: Json | null
          target_domain: string
          updated_at: string
        }
        Insert: {
          blog_type: string
          cloudflare_deployment_id?: string | null
          created_at?: string
          html_content?: string | null
          id?: string
          page_path?: string
          product_id: string
          publish_error_message?: string | null
          publish_status?: string
          published_at?: string | null
          published_url?: string | null
          seo_config?: Json | null
          target_domain: string
          updated_at?: string
        }
        Update: {
          blog_type?: string
          cloudflare_deployment_id?: string | null
          created_at?: string
          html_content?: string | null
          id?: string
          page_path?: string
          product_id?: string
          publish_error_message?: string | null
          publish_status?: string
          published_at?: string | null
          published_url?: string | null
          seo_config?: Json | null
          target_domain?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_blog_publications_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products_repository"
            referencedColumns: ["id"]
          },
        ]
      }
      product_coupons: {
        Row: {
          allow_promotions: boolean
          coupon_code: string
          created_at: string
          discount_percentage: number
          id: string
          product_id: string
          updated_at: string
        }
        Insert: {
          allow_promotions?: boolean
          coupon_code: string
          created_at?: string
          discount_percentage: number
          id?: string
          product_id: string
          updated_at?: string
        }
        Update: {
          allow_promotions?: boolean
          coupon_code?: string
          created_at?: string
          discount_percentage?: number
          id?: string
          product_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_coupons_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: true
            referencedRelation: "products_repository"
            referencedColumns: ["id"]
          },
        ]
      }
      product_drive_folders: {
        Row: {
          assets_count: number | null
          auto_sync: boolean | null
          created_at: string
          folder_id: string
          folder_name: string | null
          folder_url: string | null
          id: string
          images_count: number | null
          last_synced_at: string | null
          product_id: string
          product_name: string | null
          updated_at: string
          videos_count: number | null
        }
        Insert: {
          assets_count?: number | null
          auto_sync?: boolean | null
          created_at?: string
          folder_id: string
          folder_name?: string | null
          folder_url?: string | null
          id?: string
          images_count?: number | null
          last_synced_at?: string | null
          product_id: string
          product_name?: string | null
          updated_at?: string
          videos_count?: number | null
        }
        Update: {
          assets_count?: number | null
          auto_sync?: boolean | null
          created_at?: string
          folder_id?: string
          folder_name?: string | null
          folder_url?: string | null
          id?: string
          images_count?: number | null
          last_synced_at?: string | null
          product_id?: string
          product_name?: string | null
          updated_at?: string
          videos_count?: number | null
        }
        Relationships: []
      }
      product_video_projects: {
        Row: {
          ads_campaign_type: string | null
          ads_description: string | null
          ads_headline: string | null
          aspect_ratio: string
          assembly_cost_usd: number | null
          assembly_done_at: string | null
          assembly_job_id: string | null
          assembly_progress: number | null
          assembly_service: string | null
          assembly_started_at: string | null
          assembly_status: string | null
          copies: Json | null
          created_at: string
          drive_assets: Json | null
          drive_assets_synced: boolean | null
          drive_folder_id: string | null
          drive_folder_url: string | null
          duration_target_s: number | null
          error_message: string | null
          id: string
          is_ads_ready: boolean | null
          is_shorts: boolean | null
          narration_audio_url: string | null
          narration_duration_s: number | null
          narration_status: string | null
          narration_voice: string | null
          product_id: string
          product_name: string
          script_data: Json | null
          script_generated_at: string | null
          script_status: string | null
          selected_clips: Json | null
          selected_images: Json | null
          status: string
          thumbnail_status: string | null
          thumbnail_url: string | null
          updated_at: string
          video_file_size_mb: number | null
          video_type: string
          video_url: string | null
          youtube_chapters: string | null
          youtube_description: string | null
          youtube_status: string | null
          youtube_tags: string[] | null
          youtube_title: string | null
          youtube_uploaded_at: string | null
          youtube_url: string | null
          youtube_video_id: string | null
          yt_like_count: number | null
          yt_stats_updated_at: string | null
          yt_view_count: number | null
        }
        Insert: {
          ads_campaign_type?: string | null
          ads_description?: string | null
          ads_headline?: string | null
          aspect_ratio?: string
          assembly_cost_usd?: number | null
          assembly_done_at?: string | null
          assembly_job_id?: string | null
          assembly_progress?: number | null
          assembly_service?: string | null
          assembly_started_at?: string | null
          assembly_status?: string | null
          copies?: Json | null
          created_at?: string
          drive_assets?: Json | null
          drive_assets_synced?: boolean | null
          drive_folder_id?: string | null
          drive_folder_url?: string | null
          duration_target_s?: number | null
          error_message?: string | null
          id?: string
          is_ads_ready?: boolean | null
          is_shorts?: boolean | null
          narration_audio_url?: string | null
          narration_duration_s?: number | null
          narration_status?: string | null
          narration_voice?: string | null
          product_id: string
          product_name: string
          script_data?: Json | null
          script_generated_at?: string | null
          script_status?: string | null
          selected_clips?: Json | null
          selected_images?: Json | null
          status?: string
          thumbnail_status?: string | null
          thumbnail_url?: string | null
          updated_at?: string
          video_file_size_mb?: number | null
          video_type: string
          video_url?: string | null
          youtube_chapters?: string | null
          youtube_description?: string | null
          youtube_status?: string | null
          youtube_tags?: string[] | null
          youtube_title?: string | null
          youtube_uploaded_at?: string | null
          youtube_url?: string | null
          youtube_video_id?: string | null
          yt_like_count?: number | null
          yt_stats_updated_at?: string | null
          yt_view_count?: number | null
        }
        Update: {
          ads_campaign_type?: string | null
          ads_description?: string | null
          ads_headline?: string | null
          aspect_ratio?: string
          assembly_cost_usd?: number | null
          assembly_done_at?: string | null
          assembly_job_id?: string | null
          assembly_progress?: number | null
          assembly_service?: string | null
          assembly_started_at?: string | null
          assembly_status?: string | null
          copies?: Json | null
          created_at?: string
          drive_assets?: Json | null
          drive_assets_synced?: boolean | null
          drive_folder_id?: string | null
          drive_folder_url?: string | null
          duration_target_s?: number | null
          error_message?: string | null
          id?: string
          is_ads_ready?: boolean | null
          is_shorts?: boolean | null
          narration_audio_url?: string | null
          narration_duration_s?: number | null
          narration_status?: string | null
          narration_voice?: string | null
          product_id?: string
          product_name?: string
          script_data?: Json | null
          script_generated_at?: string | null
          script_status?: string | null
          selected_clips?: Json | null
          selected_images?: Json | null
          status?: string
          thumbnail_status?: string | null
          thumbnail_url?: string | null
          updated_at?: string
          video_file_size_mb?: number | null
          video_type?: string
          video_url?: string | null
          youtube_chapters?: string | null
          youtube_description?: string | null
          youtube_status?: string | null
          youtube_tags?: string[] | null
          youtube_title?: string | null
          youtube_uploaded_at?: string | null
          youtube_url?: string | null
          youtube_video_id?: string | null
          yt_like_count?: number | null
          yt_stats_updated_at?: string | null
          yt_view_count?: number | null
        }
        Relationships: []
      }
      products_repository: {
        Row: {
          active: boolean | null
          age_group: string | null
          ai_generated_benefits: boolean | null
          ai_generated_category: boolean | null
          ai_generated_keywords: boolean | null
          all_categories: Json | null
          anti_hallucination_rules: Json | null
          applications: string | null
          approved: boolean | null
          availability: string | null
          benefits: Json | null
          bot_trigger_words: Json | null
          brand: string | null
          canonical_url: string | null
          carousel_extra_images: Json | null
          category: string | null
          clinical_brain_generated_at: string | null
          clinical_brain_status: string | null
          clinical_brain_validated_at: string | null
          clinical_brain_validation_notes: string | null
          clinical_brain_validator_name: string | null
          color: string | null
          competitor_comparison: Json | null
          condition: string | null
          created_at: string
          currency: string | null
          depth: number | null
          description: string | null
          display_order: number | null
          document_transcriptions: Json | null
          ean: string | null
          ecommerce_html: Json | null
          faq: Json | null
          featured: boolean | null
          features: Json | null
          fiscal_class: string | null
          fiscal_origin: string | null
          forbidden_products: Json | null
          free_shipping: boolean | null
          gender: string | null
          google_product_category: string | null
          gtin: string | null
          height: number | null
          id: string
          image_alt: string | null
          image_url: string | null
          image_url_original: string | null
          images_gallery: Json | null
          individual_blog_content: Json | null
          instagram_copies: Json | null
          instagram_engagement_carousel: Json | null
          instagram_reels_scripts: Json | null
          instagram_videos: Json | null
          keyword_ids: string[] | null
          keywords: Json | null
          launch: boolean | null
          market_keywords: Json | null
          material: string | null
          max_order_quantity: number | null
          min_order_quantity: number | null
          mpn: string | null
          multiple_order_quantity: number | null
          name: string
          ncm: string | null
          offer_discount_cta: Json | null
          original_data: Json | null
          package_size: string | null
          price: number | null
          product_type: string | null
          product_url: string | null
          promo_price: number | null
          promotion: boolean | null
          required_products: Json | null
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
          shipping_time: string | null
          shipping_type: string | null
          show_in_resources: boolean | null
          showcase: boolean | null
          size: string | null
          slug: string | null
          source_landing_page_id: string | null
          source_type: string
          stock_managed: boolean | null
          stock_quantity: number | null
          store_category: string | null
          subcategory: string | null
          tags: Json | null
          target_audience: Json | null
          tax_situation: string | null
          technical_documents: Json | null
          technical_specifications: Json | null
          technical_videos: Json | null
          testimonial_videos: Json | null
          tiktok_content: Json | null
          tiktok_videos: Json | null
          tutorial_resources: Json | null
          unit_measure: string | null
          updated_at: string
          use_in_ai_generation: boolean | null
          variations: Json | null
          video_captions: Json | null
          weight: number | null
          whatsapp_messages: Json | null
          whatsapp_sequences: Json | null
          width: number | null
          wikidata_item_id: string | null
          workflow_stages: Json | null
          youtube_descriptions: Json | null
          youtube_scripts: Json | null
          youtube_videos: Json | null
        }
        Insert: {
          active?: boolean | null
          age_group?: string | null
          ai_generated_benefits?: boolean | null
          ai_generated_category?: boolean | null
          ai_generated_keywords?: boolean | null
          all_categories?: Json | null
          anti_hallucination_rules?: Json | null
          applications?: string | null
          approved?: boolean | null
          availability?: string | null
          benefits?: Json | null
          bot_trigger_words?: Json | null
          brand?: string | null
          canonical_url?: string | null
          carousel_extra_images?: Json | null
          category?: string | null
          clinical_brain_generated_at?: string | null
          clinical_brain_status?: string | null
          clinical_brain_validated_at?: string | null
          clinical_brain_validation_notes?: string | null
          clinical_brain_validator_name?: string | null
          color?: string | null
          competitor_comparison?: Json | null
          condition?: string | null
          created_at?: string
          currency?: string | null
          depth?: number | null
          description?: string | null
          display_order?: number | null
          document_transcriptions?: Json | null
          ean?: string | null
          ecommerce_html?: Json | null
          faq?: Json | null
          featured?: boolean | null
          features?: Json | null
          fiscal_class?: string | null
          fiscal_origin?: string | null
          forbidden_products?: Json | null
          free_shipping?: boolean | null
          gender?: string | null
          google_product_category?: string | null
          gtin?: string | null
          height?: number | null
          id?: string
          image_alt?: string | null
          image_url?: string | null
          image_url_original?: string | null
          images_gallery?: Json | null
          individual_blog_content?: Json | null
          instagram_copies?: Json | null
          instagram_engagement_carousel?: Json | null
          instagram_reels_scripts?: Json | null
          instagram_videos?: Json | null
          keyword_ids?: string[] | null
          keywords?: Json | null
          launch?: boolean | null
          market_keywords?: Json | null
          material?: string | null
          max_order_quantity?: number | null
          min_order_quantity?: number | null
          mpn?: string | null
          multiple_order_quantity?: number | null
          name: string
          ncm?: string | null
          offer_discount_cta?: Json | null
          original_data?: Json | null
          package_size?: string | null
          price?: number | null
          product_type?: string | null
          product_url?: string | null
          promo_price?: number | null
          promotion?: boolean | null
          required_products?: Json | null
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
          shipping_time?: string | null
          shipping_type?: string | null
          show_in_resources?: boolean | null
          showcase?: boolean | null
          size?: string | null
          slug?: string | null
          source_landing_page_id?: string | null
          source_type: string
          stock_managed?: boolean | null
          stock_quantity?: number | null
          store_category?: string | null
          subcategory?: string | null
          tags?: Json | null
          target_audience?: Json | null
          tax_situation?: string | null
          technical_documents?: Json | null
          technical_specifications?: Json | null
          technical_videos?: Json | null
          testimonial_videos?: Json | null
          tiktok_content?: Json | null
          tiktok_videos?: Json | null
          tutorial_resources?: Json | null
          unit_measure?: string | null
          updated_at?: string
          use_in_ai_generation?: boolean | null
          variations?: Json | null
          video_captions?: Json | null
          weight?: number | null
          whatsapp_messages?: Json | null
          whatsapp_sequences?: Json | null
          width?: number | null
          wikidata_item_id?: string | null
          workflow_stages?: Json | null
          youtube_descriptions?: Json | null
          youtube_scripts?: Json | null
          youtube_videos?: Json | null
        }
        Update: {
          active?: boolean | null
          age_group?: string | null
          ai_generated_benefits?: boolean | null
          ai_generated_category?: boolean | null
          ai_generated_keywords?: boolean | null
          all_categories?: Json | null
          anti_hallucination_rules?: Json | null
          applications?: string | null
          approved?: boolean | null
          availability?: string | null
          benefits?: Json | null
          bot_trigger_words?: Json | null
          brand?: string | null
          canonical_url?: string | null
          carousel_extra_images?: Json | null
          category?: string | null
          clinical_brain_generated_at?: string | null
          clinical_brain_status?: string | null
          clinical_brain_validated_at?: string | null
          clinical_brain_validation_notes?: string | null
          clinical_brain_validator_name?: string | null
          color?: string | null
          competitor_comparison?: Json | null
          condition?: string | null
          created_at?: string
          currency?: string | null
          depth?: number | null
          description?: string | null
          display_order?: number | null
          document_transcriptions?: Json | null
          ean?: string | null
          ecommerce_html?: Json | null
          faq?: Json | null
          featured?: boolean | null
          features?: Json | null
          fiscal_class?: string | null
          fiscal_origin?: string | null
          forbidden_products?: Json | null
          free_shipping?: boolean | null
          gender?: string | null
          google_product_category?: string | null
          gtin?: string | null
          height?: number | null
          id?: string
          image_alt?: string | null
          image_url?: string | null
          image_url_original?: string | null
          images_gallery?: Json | null
          individual_blog_content?: Json | null
          instagram_copies?: Json | null
          instagram_engagement_carousel?: Json | null
          instagram_reels_scripts?: Json | null
          instagram_videos?: Json | null
          keyword_ids?: string[] | null
          keywords?: Json | null
          launch?: boolean | null
          market_keywords?: Json | null
          material?: string | null
          max_order_quantity?: number | null
          min_order_quantity?: number | null
          mpn?: string | null
          multiple_order_quantity?: number | null
          name?: string
          ncm?: string | null
          offer_discount_cta?: Json | null
          original_data?: Json | null
          package_size?: string | null
          price?: number | null
          product_type?: string | null
          product_url?: string | null
          promo_price?: number | null
          promotion?: boolean | null
          required_products?: Json | null
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
          shipping_time?: string | null
          shipping_type?: string | null
          show_in_resources?: boolean | null
          showcase?: boolean | null
          size?: string | null
          slug?: string | null
          source_landing_page_id?: string | null
          source_type?: string
          stock_managed?: boolean | null
          stock_quantity?: number | null
          store_category?: string | null
          subcategory?: string | null
          tags?: Json | null
          target_audience?: Json | null
          tax_situation?: string | null
          technical_documents?: Json | null
          technical_specifications?: Json | null
          technical_videos?: Json | null
          testimonial_videos?: Json | null
          tiktok_content?: Json | null
          tiktok_videos?: Json | null
          tutorial_resources?: Json | null
          unit_measure?: string | null
          updated_at?: string
          use_in_ai_generation?: boolean | null
          variations?: Json | null
          video_captions?: Json | null
          weight?: number | null
          whatsapp_messages?: Json | null
          whatsapp_sequences?: Json | null
          width?: number | null
          wikidata_item_id?: string | null
          workflow_stages?: Json | null
          youtube_descriptions?: Json | null
          youtube_scripts?: Json | null
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
          profile_name: string | null
          seo_settings: Json | null
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
          profile_name?: string | null
          seo_settings?: Json | null
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
          profile_name?: string | null
          seo_settings?: Json | null
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
      review_responses: {
        Row: {
          ai_model: string | null
          author_name: string
          created_at: string
          error_message: string | null
          id: string
          manually_approved: boolean
          original_rating: number | null
          original_text: string | null
          posted_at: string | null
          raw_review_id: string | null
          response_text: string
          response_tone: string | null
          status: string
          updated_at: string
        }
        Insert: {
          ai_model?: string | null
          author_name: string
          created_at?: string
          error_message?: string | null
          id?: string
          manually_approved?: boolean
          original_rating?: number | null
          original_text?: string | null
          posted_at?: string | null
          raw_review_id?: string | null
          response_text: string
          response_tone?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          ai_model?: string | null
          author_name?: string
          created_at?: string
          error_message?: string | null
          id?: string
          manually_approved?: boolean
          original_rating?: number | null
          original_text?: string | null
          posted_at?: string | null
          raw_review_id?: string | null
          response_text?: string
          response_tone?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "review_responses_raw_review_id_fkey"
            columns: ["raw_review_id"]
            isOneToOne: false
            referencedRelation: "raw_reviews"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "review_responses_raw_review_id_fkey"
            columns: ["raw_review_id"]
            isOneToOne: false
            referencedRelation: "v_reviews_with_responses"
            referencedColumns: ["review_id"]
          },
        ]
      }
      spin_selling_solutions: {
        Row: {
          active: boolean | null
          ai_generated_images: Json | null
          competitor_comparison: Json | null
          created_at: string | null
          custom_url: Json | null
          faq: Json | null
          frequency: string | null
          google_ads_campaign: Json | null
          id: string
          impact_metrics: Json | null
          journey_generated_at: string | null
          landing_page_custom_text: Json
          landing_page_generated_at: string | null
          landing_page_html: string | null
          metadata: Json | null
          metrics_generated_at: string | null
          pain_metrics: Json | null
          pain_type: string
          priority: number | null
          product_ids: string[] | null
          real_quotes: Json | null
          sales_pitch: string | null
          selected_video_title: string | null
          selected_video_url: string | null
          spin_journey: Json | null
          spin_journey_labels: Json | null
          storytelling_auto_generated: string | null
          success_cases: Json | null
          title: string
          updated_at: string | null
          whatsapp_complete_message: string | null
          whatsapp_section_titles: Json | null
        }
        Insert: {
          active?: boolean | null
          ai_generated_images?: Json | null
          competitor_comparison?: Json | null
          created_at?: string | null
          custom_url?: Json | null
          faq?: Json | null
          frequency?: string | null
          google_ads_campaign?: Json | null
          id?: string
          impact_metrics?: Json | null
          journey_generated_at?: string | null
          landing_page_custom_text?: Json
          landing_page_generated_at?: string | null
          landing_page_html?: string | null
          metadata?: Json | null
          metrics_generated_at?: string | null
          pain_metrics?: Json | null
          pain_type: string
          priority?: number | null
          product_ids?: string[] | null
          real_quotes?: Json | null
          sales_pitch?: string | null
          selected_video_title?: string | null
          selected_video_url?: string | null
          spin_journey?: Json | null
          spin_journey_labels?: Json | null
          storytelling_auto_generated?: string | null
          success_cases?: Json | null
          title: string
          updated_at?: string | null
          whatsapp_complete_message?: string | null
          whatsapp_section_titles?: Json | null
        }
        Update: {
          active?: boolean | null
          ai_generated_images?: Json | null
          competitor_comparison?: Json | null
          created_at?: string | null
          custom_url?: Json | null
          faq?: Json | null
          frequency?: string | null
          google_ads_campaign?: Json | null
          id?: string
          impact_metrics?: Json | null
          journey_generated_at?: string | null
          landing_page_custom_text?: Json
          landing_page_generated_at?: string | null
          landing_page_html?: string | null
          metadata?: Json | null
          metrics_generated_at?: string | null
          pain_metrics?: Json | null
          pain_type?: string
          priority?: number | null
          product_ids?: string[] | null
          real_quotes?: Json | null
          sales_pitch?: string | null
          selected_video_title?: string | null
          selected_video_url?: string | null
          spin_journey?: Json | null
          spin_journey_labels?: Json | null
          storytelling_auto_generated?: string | null
          success_cases?: Json | null
          title?: string
          updated_at?: string | null
          whatsapp_complete_message?: string | null
          whatsapp_section_titles?: Json | null
        }
        Relationships: []
      }
      system_flags: {
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
      systemb_articles: {
        Row: {
          ai_context: Json | null
          ai_context_en: Json | null
          ai_context_es: Json | null
          answer_block: string | null
          answer_block_en: string | null
          answer_block_es: string | null
          author: Json | null
          category_letter: string | null
          category_name: string | null
          created_at: string | null
          enriched_at: string | null
          enriched_json: Json | null
          excerpt: string | null
          excerpt_en: string | null
          excerpt_es: string | null
          faqs: Json | null
          faqs_en: Json | null
          faqs_es: Json | null
          geo: Json | null
          id: string
          image_alt: string | null
          image_url: string | null
          is_medical_device: boolean | null
          is_scholarly: boolean | null
          keywords: string[] | null
          meta_description: string | null
          norm_references: Json | null
          publish_status: string | null
          published_at: string | null
          published_at_source: string | null
          published_url: string | null
          recommended_products: Json | null
          recommended_resins: Json | null
          slug: string
          source_url: string | null
          synced_at: string | null
          systemb_id: string
          target_domain: string | null
          technical_properties: Json | null
          title: string
          title_en: string | null
          title_es: string | null
          updated_at: string | null
          updated_at_source: string | null
          veredict_data: Json | null
        }
        Insert: {
          ai_context?: Json | null
          ai_context_en?: Json | null
          ai_context_es?: Json | null
          answer_block?: string | null
          answer_block_en?: string | null
          answer_block_es?: string | null
          author?: Json | null
          category_letter?: string | null
          category_name?: string | null
          created_at?: string | null
          enriched_at?: string | null
          enriched_json?: Json | null
          excerpt?: string | null
          excerpt_en?: string | null
          excerpt_es?: string | null
          faqs?: Json | null
          faqs_en?: Json | null
          faqs_es?: Json | null
          geo?: Json | null
          id?: string
          image_alt?: string | null
          image_url?: string | null
          is_medical_device?: boolean | null
          is_scholarly?: boolean | null
          keywords?: string[] | null
          meta_description?: string | null
          norm_references?: Json | null
          publish_status?: string | null
          published_at?: string | null
          published_at_source?: string | null
          published_url?: string | null
          recommended_products?: Json | null
          recommended_resins?: Json | null
          slug: string
          source_url?: string | null
          synced_at?: string | null
          systemb_id: string
          target_domain?: string | null
          technical_properties?: Json | null
          title: string
          title_en?: string | null
          title_es?: string | null
          updated_at?: string | null
          updated_at_source?: string | null
          veredict_data?: Json | null
        }
        Update: {
          ai_context?: Json | null
          ai_context_en?: Json | null
          ai_context_es?: Json | null
          answer_block?: string | null
          answer_block_en?: string | null
          answer_block_es?: string | null
          author?: Json | null
          category_letter?: string | null
          category_name?: string | null
          created_at?: string | null
          enriched_at?: string | null
          enriched_json?: Json | null
          excerpt?: string | null
          excerpt_en?: string | null
          excerpt_es?: string | null
          faqs?: Json | null
          faqs_en?: Json | null
          faqs_es?: Json | null
          geo?: Json | null
          id?: string
          image_alt?: string | null
          image_url?: string | null
          is_medical_device?: boolean | null
          is_scholarly?: boolean | null
          keywords?: string[] | null
          meta_description?: string | null
          norm_references?: Json | null
          publish_status?: string | null
          published_at?: string | null
          published_at_source?: string | null
          published_url?: string | null
          recommended_products?: Json | null
          recommended_resins?: Json | null
          slug?: string
          source_url?: string | null
          synced_at?: string | null
          systemb_id?: string
          target_domain?: string | null
          technical_properties?: Json | null
          title?: string
          title_en?: string | null
          title_es?: string | null
          updated_at?: string | null
          updated_at_source?: string | null
          veredict_data?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "systemb_articles_target_domain_fkey"
            columns: ["target_domain"]
            isOneToOne: false
            referencedRelation: "domain_config"
            referencedColumns: ["domain"]
          },
        ]
      }
      ugc_intake: {
        Row: {
          ai_location: string | null
          ai_notes: string | null
          ai_product_match: string | null
          ai_publish_ready: boolean | null
          ai_quality_score: number | null
          ai_specialty: string | null
          ai_transcript: string | null
          created_at: string
          drive_file_id: string | null
          duration_s: number | null
          file_name: string | null
          file_size_mb: number | null
          file_type: string | null
          id: string
          intake_channel: string
          processed_at: string | null
          raw_file_url: string | null
          rejection_reason: string | null
          sender_email: string | null
          sender_name: string | null
          sender_phone: string | null
          status: string
          testimonial_id: string | null
        }
        Insert: {
          ai_location?: string | null
          ai_notes?: string | null
          ai_product_match?: string | null
          ai_publish_ready?: boolean | null
          ai_quality_score?: number | null
          ai_specialty?: string | null
          ai_transcript?: string | null
          created_at?: string
          drive_file_id?: string | null
          duration_s?: number | null
          file_name?: string | null
          file_size_mb?: number | null
          file_type?: string | null
          id?: string
          intake_channel: string
          processed_at?: string | null
          raw_file_url?: string | null
          rejection_reason?: string | null
          sender_email?: string | null
          sender_name?: string | null
          sender_phone?: string | null
          status?: string
          testimonial_id?: string | null
        }
        Update: {
          ai_location?: string | null
          ai_notes?: string | null
          ai_product_match?: string | null
          ai_publish_ready?: boolean | null
          ai_quality_score?: number | null
          ai_specialty?: string | null
          ai_transcript?: string | null
          created_at?: string
          drive_file_id?: string | null
          duration_s?: number | null
          file_name?: string | null
          file_size_mb?: number | null
          file_type?: string | null
          id?: string
          intake_channel?: string
          processed_at?: string | null
          raw_file_url?: string | null
          rejection_reason?: string | null
          sender_email?: string | null
          sender_name?: string | null
          sender_phone?: string | null
          status?: string
          testimonial_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ugc_intake_testimonial_id_fkey"
            columns: ["testimonial_id"]
            isOneToOne: false
            referencedRelation: "v_ugc_pipeline"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ugc_intake_testimonial_id_fkey"
            columns: ["testimonial_id"]
            isOneToOne: false
            referencedRelation: "video_testimonials"
            referencedColumns: ["id"]
          },
        ]
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
      video_copies: {
        Row: {
          ai_model: string | null
          ai_prompt_version: string | null
          approved_at: string | null
          char_count: number | null
          content: string
          copy_type: string
          created_at: string
          id: string
          panda_video_id: string
          status: string
          updated_at: string
          used_at: string | null
          used_in: string | null
        }
        Insert: {
          ai_model?: string | null
          ai_prompt_version?: string | null
          approved_at?: string | null
          char_count?: number | null
          content: string
          copy_type: string
          created_at?: string
          id?: string
          panda_video_id: string
          status?: string
          updated_at?: string
          used_at?: string | null
          used_in?: string | null
        }
        Update: {
          ai_model?: string | null
          ai_prompt_version?: string | null
          approved_at?: string | null
          char_count?: number | null
          content?: string
          copy_type?: string
          created_at?: string
          id?: string
          panda_video_id?: string
          status?: string
          updated_at?: string
          used_at?: string | null
          used_in?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "video_copies_panda_video_id_fkey"
            columns: ["panda_video_id"]
            isOneToOne: false
            referencedRelation: "panda_videos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "video_copies_panda_video_id_fkey"
            columns: ["panda_video_id"]
            isOneToOne: false
            referencedRelation: "v_panda_videos_dashboard"
            referencedColumns: ["id"]
          },
        ]
      }
      video_publish_log: {
        Row: {
          action: string
          copy_id: string | null
          created_at: string
          error_message: string | null
          id: string
          panda_video_id: string
          payload_sent: Json | null
          platform: string
          platform_post_id: string | null
          platform_url: string | null
          response_raw: Json | null
          status: string
          triggered_by: string | null
        }
        Insert: {
          action: string
          copy_id?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          panda_video_id: string
          payload_sent?: Json | null
          platform: string
          platform_post_id?: string | null
          platform_url?: string | null
          response_raw?: Json | null
          status?: string
          triggered_by?: string | null
        }
        Update: {
          action?: string
          copy_id?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          panda_video_id?: string
          payload_sent?: Json | null
          platform?: string
          platform_post_id?: string | null
          platform_url?: string | null
          response_raw?: Json | null
          status?: string
          triggered_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "video_publish_log_copy_id_fkey"
            columns: ["copy_id"]
            isOneToOne: false
            referencedRelation: "video_copies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "video_publish_log_panda_video_id_fkey"
            columns: ["panda_video_id"]
            isOneToOne: false
            referencedRelation: "panda_videos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "video_publish_log_panda_video_id_fkey"
            columns: ["panda_video_id"]
            isOneToOne: false
            referencedRelation: "v_panda_videos_dashboard"
            referencedColumns: ["id"]
          },
        ]
      }
      video_testimonials: {
        Row: {
          ai_enriched: boolean | null
          ai_enriched_at: string | null
          ai_extracted_benefits: Json | null
          ai_keywords: Json | null
          approved: boolean | null
          caption_data: Json | null
          client_name: string
          content_themes: Json | null
          copies_data: Json | null
          copies_generated: boolean | null
          copies_generated_at: string | null
          created_at: string
          display_order: number | null
          engagement_score: number | null
          extracted_city: string | null
          extracted_products: Json | null
          extracted_specialty: string | null
          extracted_state: string | null
          id: string
          instagram_url: string | null
          is_short: boolean | null
          landing_page_id: string
          location: string | null
          platform_status: Json | null
          product_id: string | null
          product_name: string | null
          profession: string | null
          sentiment_score: number | null
          source_type: string | null
          specialty: string | null
          state: string | null
          testimonial_text: string
          tiktok_url: string | null
          updated_at: string
          video_duration_s: number | null
          whatsapp_sent: boolean | null
          youtube_url: string | null
        }
        Insert: {
          ai_enriched?: boolean | null
          ai_enriched_at?: string | null
          ai_extracted_benefits?: Json | null
          ai_keywords?: Json | null
          approved?: boolean | null
          caption_data?: Json | null
          client_name: string
          content_themes?: Json | null
          copies_data?: Json | null
          copies_generated?: boolean | null
          copies_generated_at?: string | null
          created_at?: string
          display_order?: number | null
          engagement_score?: number | null
          extracted_city?: string | null
          extracted_products?: Json | null
          extracted_specialty?: string | null
          extracted_state?: string | null
          id?: string
          instagram_url?: string | null
          is_short?: boolean | null
          landing_page_id: string
          location?: string | null
          platform_status?: Json | null
          product_id?: string | null
          product_name?: string | null
          profession?: string | null
          sentiment_score?: number | null
          source_type?: string | null
          specialty?: string | null
          state?: string | null
          testimonial_text: string
          tiktok_url?: string | null
          updated_at?: string
          video_duration_s?: number | null
          whatsapp_sent?: boolean | null
          youtube_url?: string | null
        }
        Update: {
          ai_enriched?: boolean | null
          ai_enriched_at?: string | null
          ai_extracted_benefits?: Json | null
          ai_keywords?: Json | null
          approved?: boolean | null
          caption_data?: Json | null
          client_name?: string
          content_themes?: Json | null
          copies_data?: Json | null
          copies_generated?: boolean | null
          copies_generated_at?: string | null
          created_at?: string
          display_order?: number | null
          engagement_score?: number | null
          extracted_city?: string | null
          extracted_products?: Json | null
          extracted_specialty?: string | null
          extracted_state?: string | null
          id?: string
          instagram_url?: string | null
          is_short?: boolean | null
          landing_page_id?: string
          location?: string | null
          platform_status?: Json | null
          product_id?: string | null
          product_name?: string | null
          profession?: string | null
          sentiment_score?: number | null
          source_type?: string | null
          specialty?: string | null
          state?: string | null
          testimonial_text?: string
          tiktok_url?: string | null
          updated_at?: string
          video_duration_s?: number | null
          whatsapp_sent?: boolean | null
          youtube_url?: string | null
        }
        Relationships: []
      }
      wikidata_entity_map: {
        Row: {
          collision_candidates: Json | null
          created_at: string
          entity_type: string
          id: string
          internal_id: string
          last_synced_at: string | null
          lock_version: number
          payload_hash: string | null
          resolution_decision: string | null
          resolution_score: number | null
          resolution_source: string | null
          retry_count: number
          sync_status: string
          updated_at: string
          wikidata_qid: string | null
        }
        Insert: {
          collision_candidates?: Json | null
          created_at?: string
          entity_type: string
          id?: string
          internal_id: string
          last_synced_at?: string | null
          lock_version?: number
          payload_hash?: string | null
          resolution_decision?: string | null
          resolution_score?: number | null
          resolution_source?: string | null
          retry_count?: number
          sync_status?: string
          updated_at?: string
          wikidata_qid?: string | null
        }
        Update: {
          collision_candidates?: Json | null
          created_at?: string
          entity_type?: string
          id?: string
          internal_id?: string
          last_synced_at?: string | null
          lock_version?: number
          payload_hash?: string | null
          resolution_decision?: string | null
          resolution_score?: number | null
          resolution_source?: string | null
          retry_count?: number
          sync_status?: string
          updated_at?: string
          wikidata_qid?: string | null
        }
        Relationships: []
      }
      wikidata_sync_logs: {
        Row: {
          action: string
          created_at: string
          duration_ms: number | null
          entity_map_id: string | null
          entity_type: string
          error_code: string | null
          error_context: Json | null
          error_message: string | null
          expires_at: string
          id: string
          internal_id: string | null
          payload_hash: string | null
          request_payload: Json | null
          response_data: Json | null
          semantic_grade: string | null
          semantic_score: number | null
          success: boolean
          wikidata_qid: string | null
          write_decision: string | null
        }
        Insert: {
          action: string
          created_at?: string
          duration_ms?: number | null
          entity_map_id?: string | null
          entity_type: string
          error_code?: string | null
          error_context?: Json | null
          error_message?: string | null
          expires_at?: string
          id?: string
          internal_id?: string | null
          payload_hash?: string | null
          request_payload?: Json | null
          response_data?: Json | null
          semantic_grade?: string | null
          semantic_score?: number | null
          success?: boolean
          wikidata_qid?: string | null
          write_decision?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          duration_ms?: number | null
          entity_map_id?: string | null
          entity_type?: string
          error_code?: string | null
          error_context?: Json | null
          error_message?: string | null
          expires_at?: string
          id?: string
          internal_id?: string | null
          payload_hash?: string | null
          request_payload?: Json | null
          response_data?: Json | null
          semantic_grade?: string | null
          semantic_score?: number | null
          success?: boolean
          wikidata_qid?: string | null
          write_decision?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "wikidata_sync_logs_entity_map_id_fkey"
            columns: ["entity_map_id"]
            isOneToOne: false
            referencedRelation: "wikidata_entity_map"
            referencedColumns: ["id"]
          },
        ]
      }
      youtube_metadata_queue: {
        Row: {
          ai_model: string | null
          approved_at: string | null
          created_at: string
          current_description: string | null
          current_tags: string[] | null
          current_title: string | null
          error_message: string | null
          id: string
          processed_at: string | null
          product_id: string | null
          product_name: string | null
          status: string
          suggested_chapters: string | null
          suggested_description: string | null
          suggested_tags: string[] | null
          suggested_title: string | null
          updated_at: string
          video_id: string
          video_url: string | null
        }
        Insert: {
          ai_model?: string | null
          approved_at?: string | null
          created_at?: string
          current_description?: string | null
          current_tags?: string[] | null
          current_title?: string | null
          error_message?: string | null
          id?: string
          processed_at?: string | null
          product_id?: string | null
          product_name?: string | null
          status?: string
          suggested_chapters?: string | null
          suggested_description?: string | null
          suggested_tags?: string[] | null
          suggested_title?: string | null
          updated_at?: string
          video_id: string
          video_url?: string | null
        }
        Update: {
          ai_model?: string | null
          approved_at?: string | null
          created_at?: string
          current_description?: string | null
          current_tags?: string[] | null
          current_title?: string | null
          error_message?: string | null
          id?: string
          processed_at?: string | null
          product_id?: string | null
          product_name?: string | null
          status?: string
          suggested_chapters?: string | null
          suggested_description?: string | null
          suggested_tags?: string[] | null
          suggested_title?: string | null
          updated_at?: string
          video_id?: string
          video_url?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      v_content_pipeline_summary: {
        Row: {
          avg_asset_score: number | null
          enriched: number | null
          ig_not_yt: number | null
          on_instagram: number | null
          on_tiktok: number | null
          on_youtube: number | null
          product_name: string | null
          total_ugc: number | null
          with_copies: number | null
          yt_not_ig: number | null
        }
        Relationships: []
      }
      v_local_seo_summary: {
        Row: {
          approved: number | null
          avg_priority: number | null
          draft: number | null
          html_ready: number | null
          published: number | null
          state_uf: string | null
          total: number | null
        }
        Relationships: []
      }
      v_panda_videos_dashboard: {
        Row: {
          approved_copies: number | null
          category_name: string | null
          completeness_score: number | null
          copies_approved: boolean | null
          copies_generated: boolean | null
          created_at: string | null
          description: string | null
          duration_seconds: number | null
          embed_url: string | null
          gbp_post_status: string | null
          gbp_posted_at: string | null
          id: string | null
          instagram_copy_approved: string | null
          last_publish_status: string | null
          last_published_at: string | null
          last_published_platform: string | null
          last_synced_at: string | null
          panda_finish_rate: number | null
          panda_play_count: number | null
          panda_url: string | null
          panda_video_id: string | null
          panda_view_count: number | null
          product_id: string | null
          product_name: string | null
          status: string | null
          tags: string[] | null
          thumbnail_url: string | null
          title: string | null
          total_copies: number | null
          updated_at: string | null
          whatsapp_copy_approved: string | null
          youtube_posted_at: string | null
          youtube_status: string | null
          youtube_url: string | null
          youtube_video_id: string | null
          yt_comment_count: number | null
          yt_ctr: number | null
          yt_description_approved: string | null
          yt_impressions: number | null
          yt_like_count: number | null
          yt_stats_updated_at: string | null
          yt_title_approved: string | null
          yt_view_count: number | null
        }
        Insert: {
          approved_copies?: never
          category_name?: string | null
          completeness_score?: never
          copies_approved?: boolean | null
          copies_generated?: boolean | null
          created_at?: string | null
          description?: string | null
          duration_seconds?: number | null
          embed_url?: string | null
          gbp_post_status?: string | null
          gbp_posted_at?: string | null
          id?: string | null
          instagram_copy_approved?: never
          last_publish_status?: never
          last_published_at?: never
          last_published_platform?: never
          last_synced_at?: string | null
          panda_finish_rate?: number | null
          panda_play_count?: number | null
          panda_url?: string | null
          panda_video_id?: string | null
          panda_view_count?: number | null
          product_id?: string | null
          product_name?: string | null
          status?: string | null
          tags?: string[] | null
          thumbnail_url?: string | null
          title?: string | null
          total_copies?: never
          updated_at?: string | null
          whatsapp_copy_approved?: never
          youtube_posted_at?: string | null
          youtube_status?: string | null
          youtube_url?: string | null
          youtube_video_id?: string | null
          yt_comment_count?: number | null
          yt_ctr?: number | null
          yt_description_approved?: never
          yt_impressions?: number | null
          yt_like_count?: number | null
          yt_stats_updated_at?: string | null
          yt_title_approved?: never
          yt_view_count?: number | null
        }
        Update: {
          approved_copies?: never
          category_name?: string | null
          completeness_score?: never
          copies_approved?: boolean | null
          copies_generated?: boolean | null
          created_at?: string | null
          description?: string | null
          duration_seconds?: number | null
          embed_url?: string | null
          gbp_post_status?: string | null
          gbp_posted_at?: string | null
          id?: string | null
          instagram_copy_approved?: never
          last_publish_status?: never
          last_published_at?: never
          last_published_platform?: never
          last_synced_at?: string | null
          panda_finish_rate?: number | null
          panda_play_count?: number | null
          panda_url?: string | null
          panda_video_id?: string | null
          panda_view_count?: number | null
          product_id?: string | null
          product_name?: string | null
          status?: string | null
          tags?: string[] | null
          thumbnail_url?: string | null
          title?: string | null
          total_copies?: never
          updated_at?: string | null
          whatsapp_copy_approved?: never
          youtube_posted_at?: string | null
          youtube_status?: string | null
          youtube_url?: string | null
          youtube_video_id?: string | null
          yt_comment_count?: number | null
          yt_ctr?: number | null
          yt_description_approved?: never
          yt_impressions?: number | null
          yt_like_count?: number | null
          yt_stats_updated_at?: string | null
          yt_title_approved?: never
          yt_view_count?: number | null
        }
        Relationships: []
      }
      v_reviews_with_responses: {
        Row: {
          action_needed: string | null
          ai_model: string | null
          author_name: string | null
          error_message: string | null
          existing_owner_response: string | null
          manually_approved: boolean | null
          posted_at: string | null
          profile_photo_url: string | null
          rating: number | null
          response_created_at: string | null
          response_id: string | null
          response_status: string | null
          response_text: string | null
          response_tone: string | null
          review_created_at: string | null
          review_date: string | null
          review_id: string | null
          review_text: string | null
        }
        Relationships: []
      }
      v_ugc_pipeline: {
        Row: {
          ai_enriched: boolean | null
          ai_enriched_at: string | null
          approved: boolean | null
          asset_score: number | null
          client_name: string | null
          content_themes: Json | null
          copies_generated: boolean | null
          copies_generated_at: string | null
          copy_gbp: string | null
          copy_instagram: string | null
          copy_tiktok: string | null
          copy_whatsapp: string | null
          copy_youtube: string | null
          created_at: string | null
          extracted_city: string | null
          extracted_products: Json | null
          extracted_specialty: string | null
          extracted_state: string | null
          id: string | null
          ig_status: string | null
          instagram_url: string | null
          is_short: boolean | null
          product_id: string | null
          product_name: string | null
          source_type: string | null
          text_preview: string | null
          tiktok_url: string | null
          tt_status: string | null
          wa_status: string | null
          youtube_url: string | null
          yt_status: string | null
        }
        Insert: {
          ai_enriched?: boolean | null
          ai_enriched_at?: string | null
          approved?: boolean | null
          asset_score?: never
          client_name?: string | null
          content_themes?: Json | null
          copies_generated?: boolean | null
          copies_generated_at?: string | null
          copy_gbp?: never
          copy_instagram?: never
          copy_tiktok?: never
          copy_whatsapp?: never
          copy_youtube?: never
          created_at?: string | null
          extracted_city?: string | null
          extracted_products?: Json | null
          extracted_specialty?: string | null
          extracted_state?: string | null
          id?: string | null
          ig_status?: never
          instagram_url?: string | null
          is_short?: boolean | null
          product_id?: string | null
          product_name?: string | null
          source_type?: string | null
          text_preview?: never
          tiktok_url?: string | null
          tt_status?: never
          wa_status?: never
          youtube_url?: string | null
          yt_status?: never
        }
        Update: {
          ai_enriched?: boolean | null
          ai_enriched_at?: string | null
          approved?: boolean | null
          asset_score?: never
          client_name?: string | null
          content_themes?: Json | null
          copies_generated?: boolean | null
          copies_generated_at?: string | null
          copy_gbp?: never
          copy_instagram?: never
          copy_tiktok?: never
          copy_whatsapp?: never
          copy_youtube?: never
          created_at?: string | null
          extracted_city?: string | null
          extracted_products?: Json | null
          extracted_specialty?: string | null
          extracted_state?: string | null
          id?: string | null
          ig_status?: never
          instagram_url?: string | null
          is_short?: boolean | null
          product_id?: string | null
          product_name?: string | null
          source_type?: string | null
          text_preview?: never
          tiktok_url?: string | null
          tt_status?: never
          wa_status?: never
          youtube_url?: string | null
          yt_status?: never
        }
        Relationships: []
      }
      v_video_production_dashboard: {
        Row: {
          ads_campaign_type: string | null
          ads_description: string | null
          ads_headline: string | null
          aspect_ratio: string | null
          assembly_cost_usd: number | null
          assembly_done_at: string | null
          assembly_job_id: string | null
          assembly_progress: number | null
          assembly_service: string | null
          assembly_started_at: string | null
          assembly_status: string | null
          copies: Json | null
          created_at: string | null
          drive_assets: Json | null
          drive_assets_synced: boolean | null
          drive_folder_id: string | null
          drive_folder_name: string | null
          drive_folder_url: string | null
          drive_folder_url_link: string | null
          drive_images_available: number | null
          drive_last_synced: string | null
          drive_videos_available: number | null
          duration_target_s: number | null
          error_message: string | null
          id: string | null
          is_ads_ready: boolean | null
          is_shorts: boolean | null
          narration_audio_url: string | null
          narration_duration_s: number | null
          narration_status: string | null
          narration_voice: string | null
          product_id: string | null
          product_name: string | null
          production_progress: number | null
          script_data: Json | null
          script_generated_at: string | null
          script_status: string | null
          selected_clips: Json | null
          selected_images: Json | null
          status: string | null
          thumbnail_status: string | null
          thumbnail_url: string | null
          updated_at: string | null
          video_file_size_mb: number | null
          video_type: string | null
          video_url: string | null
          youtube_chapters: string | null
          youtube_description: string | null
          youtube_status: string | null
          youtube_tags: string[] | null
          youtube_title: string | null
          youtube_uploaded_at: string | null
          youtube_url: string | null
          youtube_video_id: string | null
          yt_like_count: number | null
          yt_stats_updated_at: string | null
          yt_view_count: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      admin_update_landing_page: {
        Args: {
          _blog_generated?: boolean
          _blog_generated_at?: string
          _data?: Json
          _embed?: string
          _id: string
          _name?: string
          _selected_product_ids?: string[]
          _status?: string
          _template?: string
          _user_id: string
        }
        Returns: boolean
      }
      auto_close_stale_lia_conversations: { Args: never; Returns: undefined }
      calculate_landing_page_score: { Args: { lp_id: string }; Returns: Json }
      calculate_product_score: { Args: { product_id: string }; Returns: Json }
      fn_get_local_seo_schema_block: {
        Args: { p_target_id: string }
        Returns: Json
      }
      fn_get_reviews_schema_block: {
        Args: { p_company_name?: string; p_company_url?: string }
        Returns: Json
      }
      get_complete_knowledge_base:
        | {
            Args: {
              p_approved_only?: boolean
              p_category?: string
              p_include_categories?: boolean
              p_include_company?: boolean
              p_include_google_reviews?: boolean
              p_include_kols?: boolean
              p_include_links?: boolean
              p_include_products?: boolean
              p_include_video_testimonials?: boolean
              p_limit?: number
              p_offset?: number
            }
            Returns: Json
          }
        | {
            Args: {
              p_approved_only?: boolean
              p_category?: string
              p_include_blog_posts?: boolean
              p_include_categories?: boolean
              p_include_company?: boolean
              p_include_google_reviews?: boolean
              p_include_kols?: boolean
              p_include_landing_pages?: boolean
              p_include_links?: boolean
              p_include_products?: boolean
              p_include_spin_solutions?: boolean
              p_include_video_testimonials?: boolean
              p_limit?: number
              p_offset?: number
            }
            Returns: Json
          }
      get_current_user_role: {
        Args: never
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      match_knowledge_chunks: {
        Args: {
          filter_chunk_type?: string
          filter_product_id?: string
          match_count?: number
          match_threshold?: number
          query_embedding: string
        }
        Returns: {
          chunk_type: string
          content: string
          id: string
          metadata: Json
          product_id: string
          product_name: string
          similarity: number
        }[]
      }
      promote_user_to_admin: { Args: { _email: string }; Returns: boolean }
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
