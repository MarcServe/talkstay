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
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      agents: {
        Row: {
          created_at: string
          id: string
          last_updated: string
          prompt: string
          tone: string
          user_id: string | null
          voice_type: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_updated?: string
          prompt: string
          tone?: string
          user_id?: string | null
          voice_type?: string
        }
        Update: {
          created_at?: string
          id?: string
          last_updated?: string
          prompt?: string
          tone?: string
          user_id?: string | null
          voice_type?: string
        }
        Relationships: []
      }
      api_keys: {
        Row: {
          created_at: string | null
          expires_at: string | null
          id: string
          is_active: boolean | null
          key_hash: string
          key_prefix: string
          last_used_at: string | null
          name: string
          permissions: Json | null
          rate_limit_per_month: number | null
          usage_count: number | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          key_hash: string
          key_prefix: string
          last_used_at?: string | null
          name: string
          permissions?: Json | null
          rate_limit_per_month?: number | null
          usage_count?: number | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          key_hash?: string
          key_prefix?: string
          last_used_at?: string | null
          name?: string
          permissions?: Json | null
          rate_limit_per_month?: number | null
          usage_count?: number | null
          user_id?: string | null
        }
        Relationships: []
      }
      api_usage_logs: {
        Row: {
          api_key_id: string | null
          created_at: string | null
          endpoint: string
          error_message: string | null
          id: string
          ip_address: string | null
          method: string
          request_size_bytes: number | null
          response_size_bytes: number | null
          response_time_ms: number | null
          status_code: number | null
          user_agent: string | null
        }
        Insert: {
          api_key_id?: string | null
          created_at?: string | null
          endpoint: string
          error_message?: string | null
          id?: string
          ip_address?: string | null
          method: string
          request_size_bytes?: number | null
          response_size_bytes?: number | null
          response_time_ms?: number | null
          status_code?: number | null
          user_agent?: string | null
        }
        Update: {
          api_key_id?: string | null
          created_at?: string | null
          endpoint?: string
          error_message?: string | null
          id?: string
          ip_address?: string | null
          method?: string
          request_size_bytes?: number | null
          response_size_bytes?: number | null
          response_time_ms?: number | null
          status_code?: number | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "api_usage_logs_api_key_id_fkey"
            columns: ["api_key_id"]
            isOneToOne: false
            referencedRelation: "api_keys"
            referencedColumns: ["id"]
          },
        ]
      }
      assistant_departments: {
        Row: {
          assistant_id: string
          created_at: string
          description: string | null
          handoff_message: string | null
          id: string
          is_active: boolean
          keywords: string[]
          name: string
          priority: number
          routing_email: string | null
          routing_phone: string | null
          routing_whatsapp: string | null
          updated_at: string
        }
        Insert: {
          assistant_id: string
          created_at?: string
          description?: string | null
          handoff_message?: string | null
          id?: string
          is_active?: boolean
          keywords?: string[]
          name: string
          priority?: number
          routing_email?: string | null
          routing_phone?: string | null
          routing_whatsapp?: string | null
          updated_at?: string
        }
        Update: {
          assistant_id?: string
          created_at?: string
          description?: string | null
          handoff_message?: string | null
          id?: string
          is_active?: boolean
          keywords?: string[]
          name?: string
          priority?: number
          routing_email?: string | null
          routing_phone?: string | null
          routing_whatsapp?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "assistant_departments_assistant_id_fkey"
            columns: ["assistant_id"]
            isOneToOne: false
            referencedRelation: "assistants"
            referencedColumns: ["id"]
          },
        ]
      }
      assistant_prompt_versions: {
        Row: {
          assistant_id: string
          created_at: string
          edited_by: string | null
          extra_instructions: string | null
          id: string
          note: string | null
          system_prompt: string | null
        }
        Insert: {
          assistant_id: string
          created_at?: string
          edited_by?: string | null
          extra_instructions?: string | null
          id?: string
          note?: string | null
          system_prompt?: string | null
        }
        Update: {
          assistant_id?: string
          created_at?: string
          edited_by?: string | null
          extra_instructions?: string | null
          id?: string
          note?: string | null
          system_prompt?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "assistant_prompt_versions_assistant_id_fkey"
            columns: ["assistant_id"]
            isOneToOne: false
            referencedRelation: "assistants"
            referencedColumns: ["id"]
          },
        ]
      }
      assistants: {
        Row: {
          analytics_notification_emails: string[]
          api_alert_notification_emails: string[]
          apple_calendar_config: Json | null
          apple_calendar_enabled: boolean | null
          auto_refresh_enabled: boolean | null
          booking_locked: boolean
          booking_notification_email: string | null
          booking_notification_emails: string[]
          business_hours: Json | null
          business_name: string
          business_phone: string | null
          calendly_api_token: string | null
          calendly_connected: boolean | null
          calendly_event_type_name: string | null
          calendly_event_type_uri: string | null
          calendly_link: string | null
          concierge_notification_emails: string[]
          crawl_limit_override: number | null
          crawl_status: string | null
          created_at: string
          default_booking_method: string | null
          demo_request_notification_emails: string[]
          description: string | null
          draft_extra_instructions: string | null
          draft_system_prompt: string | null
          draft_updated_at: string | null
          draft_updated_by: string | null
          email_autoresponder_enabled: boolean
          email_confidence_threshold: number
          email_inbound_slug: string | null
          email_send_mode: string
          embed_code: string | null
          external_link_auto_open: boolean
          external_link_label: string | null
          external_scheduling_url: string | null
          extra_instructions: string
          fallback_contact_name: string | null
          fallback_email: string | null
          fallback_phone: string | null
          firecrawl_job_id: string | null
          google_calendar_access_token: string | null
          google_calendar_client_id: string | null
          google_calendar_client_secret: string | null
          google_calendar_connected: boolean | null
          google_calendar_enabled: boolean | null
          google_calendar_refresh_token: string | null
          google_calendar_token_expires_at: string | null
          id: string
          inquiry_notification_emails: string[]
          is_trial: boolean | null
          knowledge_locked: boolean
          language: string
          last_scraped_at: string | null
          lead_notification_emails: string[]
          lifecycle_notification_emails: string[]
          light_script: Json | null
          limit_alert_notification_emails: string[]
          logo_url: string | null
          meeting_links: Json | null
          nav_links: Json | null
          navigation_map: Json | null
          outlook_calendar_access_token: string | null
          outlook_calendar_connected: boolean | null
          outlook_calendar_enabled: boolean | null
          outlook_calendar_refresh_token: string | null
          outlook_calendar_token_expires_at: string | null
          owner_notify_on_knowledge_update: boolean
          preview_slug: string | null
          preview_url: string | null
          purpose: string | null
          qr_design: Json | null
          quick_help_notification_emails: string[]
          refresh_frequency: string | null
          review_notification_emails: string[]
          scraped_content: Json | null
          summary_notification_emails: string[]
          support_notification_emails: string[]
          system_prompt: string | null
          system_prompt_locked: boolean
          tone: string
          transcript_notifications_enabled: boolean | null
          transfer_call_enabled: boolean | null
          trial_expires_at: string | null
          trial_firecrawl_usage: number | null
          updated_at: string
          use_booking_windows: boolean
          user_id: string | null
          voice_accent: string | null
          voice_form_notification_emails: string[]
          voice_type: string
          website_url: string
          whatsapp_enabled: boolean | null
          whatsapp_forward_notification_emails: string[]
          whatsapp_forwarding_enabled: boolean | null
          whatsapp_message_template: string | null
          whatsapp_number: string | null
          widget_accent_color: string | null
          widget_ai_bubble_color: string | null
          widget_animation_style: string | null
          widget_background_color: string | null
          widget_banner_line1: string | null
          widget_banner_line2: string | null
          widget_border_color: string | null
          widget_border_width: string | null
          widget_button_gradient_enabled: boolean
          widget_button_size: string | null
          widget_gradient_enabled: boolean | null
          widget_primary_color: string | null
          widget_shadow_style: string | null
          widget_shape: string | null
          widget_text_color: string | null
          widget_user_bubble_color: string | null
        }
        Insert: {
          analytics_notification_emails?: string[]
          api_alert_notification_emails?: string[]
          apple_calendar_config?: Json | null
          apple_calendar_enabled?: boolean | null
          auto_refresh_enabled?: boolean | null
          booking_locked?: boolean
          booking_notification_email?: string | null
          booking_notification_emails?: string[]
          business_hours?: Json | null
          business_name: string
          business_phone?: string | null
          calendly_api_token?: string | null
          calendly_connected?: boolean | null
          calendly_event_type_name?: string | null
          calendly_event_type_uri?: string | null
          calendly_link?: string | null
          concierge_notification_emails?: string[]
          crawl_limit_override?: number | null
          crawl_status?: string | null
          created_at?: string
          default_booking_method?: string | null
          demo_request_notification_emails?: string[]
          description?: string | null
          draft_extra_instructions?: string | null
          draft_system_prompt?: string | null
          draft_updated_at?: string | null
          draft_updated_by?: string | null
          email_autoresponder_enabled?: boolean
          email_confidence_threshold?: number
          email_inbound_slug?: string | null
          email_send_mode?: string
          embed_code?: string | null
          external_link_auto_open?: boolean
          external_link_label?: string | null
          external_scheduling_url?: string | null
          extra_instructions?: string
          fallback_contact_name?: string | null
          fallback_email?: string | null
          fallback_phone?: string | null
          firecrawl_job_id?: string | null
          google_calendar_access_token?: string | null
          google_calendar_client_id?: string | null
          google_calendar_client_secret?: string | null
          google_calendar_connected?: boolean | null
          google_calendar_enabled?: boolean | null
          google_calendar_refresh_token?: string | null
          google_calendar_token_expires_at?: string | null
          id?: string
          inquiry_notification_emails?: string[]
          is_trial?: boolean | null
          knowledge_locked?: boolean
          language?: string
          last_scraped_at?: string | null
          lead_notification_emails?: string[]
          lifecycle_notification_emails?: string[]
          light_script?: Json | null
          limit_alert_notification_emails?: string[]
          logo_url?: string | null
          meeting_links?: Json | null
          nav_links?: Json | null
          navigation_map?: Json | null
          outlook_calendar_access_token?: string | null
          outlook_calendar_connected?: boolean | null
          outlook_calendar_enabled?: boolean | null
          outlook_calendar_refresh_token?: string | null
          outlook_calendar_token_expires_at?: string | null
          owner_notify_on_knowledge_update?: boolean
          preview_slug?: string | null
          preview_url?: string | null
          purpose?: string | null
          qr_design?: Json | null
          quick_help_notification_emails?: string[]
          refresh_frequency?: string | null
          review_notification_emails?: string[]
          scraped_content?: Json | null
          summary_notification_emails?: string[]
          support_notification_emails?: string[]
          system_prompt?: string | null
          system_prompt_locked?: boolean
          tone?: string
          transcript_notifications_enabled?: boolean | null
          transfer_call_enabled?: boolean | null
          trial_expires_at?: string | null
          trial_firecrawl_usage?: number | null
          updated_at?: string
          use_booking_windows?: boolean
          user_id?: string | null
          voice_accent?: string | null
          voice_form_notification_emails?: string[]
          voice_type?: string
          website_url: string
          whatsapp_enabled?: boolean | null
          whatsapp_forward_notification_emails?: string[]
          whatsapp_forwarding_enabled?: boolean | null
          whatsapp_message_template?: string | null
          whatsapp_number?: string | null
          widget_accent_color?: string | null
          widget_ai_bubble_color?: string | null
          widget_animation_style?: string | null
          widget_background_color?: string | null
          widget_banner_line1?: string | null
          widget_banner_line2?: string | null
          widget_border_color?: string | null
          widget_border_width?: string | null
          widget_button_gradient_enabled?: boolean
          widget_button_size?: string | null
          widget_gradient_enabled?: boolean | null
          widget_primary_color?: string | null
          widget_shadow_style?: string | null
          widget_shape?: string | null
          widget_text_color?: string | null
          widget_user_bubble_color?: string | null
        }
        Update: {
          analytics_notification_emails?: string[]
          api_alert_notification_emails?: string[]
          apple_calendar_config?: Json | null
          apple_calendar_enabled?: boolean | null
          auto_refresh_enabled?: boolean | null
          booking_locked?: boolean
          booking_notification_email?: string | null
          booking_notification_emails?: string[]
          business_hours?: Json | null
          business_name?: string
          business_phone?: string | null
          calendly_api_token?: string | null
          calendly_connected?: boolean | null
          calendly_event_type_name?: string | null
          calendly_event_type_uri?: string | null
          calendly_link?: string | null
          concierge_notification_emails?: string[]
          crawl_limit_override?: number | null
          crawl_status?: string | null
          created_at?: string
          default_booking_method?: string | null
          demo_request_notification_emails?: string[]
          description?: string | null
          draft_extra_instructions?: string | null
          draft_system_prompt?: string | null
          draft_updated_at?: string | null
          draft_updated_by?: string | null
          email_autoresponder_enabled?: boolean
          email_confidence_threshold?: number
          email_inbound_slug?: string | null
          email_send_mode?: string
          embed_code?: string | null
          external_link_auto_open?: boolean
          external_link_label?: string | null
          external_scheduling_url?: string | null
          extra_instructions?: string
          fallback_contact_name?: string | null
          fallback_email?: string | null
          fallback_phone?: string | null
          firecrawl_job_id?: string | null
          google_calendar_access_token?: string | null
          google_calendar_client_id?: string | null
          google_calendar_client_secret?: string | null
          google_calendar_connected?: boolean | null
          google_calendar_enabled?: boolean | null
          google_calendar_refresh_token?: string | null
          google_calendar_token_expires_at?: string | null
          id?: string
          inquiry_notification_emails?: string[]
          is_trial?: boolean | null
          knowledge_locked?: boolean
          language?: string
          last_scraped_at?: string | null
          lead_notification_emails?: string[]
          lifecycle_notification_emails?: string[]
          light_script?: Json | null
          limit_alert_notification_emails?: string[]
          logo_url?: string | null
          meeting_links?: Json | null
          nav_links?: Json | null
          navigation_map?: Json | null
          outlook_calendar_access_token?: string | null
          outlook_calendar_connected?: boolean | null
          outlook_calendar_enabled?: boolean | null
          outlook_calendar_refresh_token?: string | null
          outlook_calendar_token_expires_at?: string | null
          owner_notify_on_knowledge_update?: boolean
          preview_slug?: string | null
          preview_url?: string | null
          purpose?: string | null
          qr_design?: Json | null
          quick_help_notification_emails?: string[]
          refresh_frequency?: string | null
          review_notification_emails?: string[]
          scraped_content?: Json | null
          summary_notification_emails?: string[]
          support_notification_emails?: string[]
          system_prompt?: string | null
          system_prompt_locked?: boolean
          tone?: string
          transcript_notifications_enabled?: boolean | null
          transfer_call_enabled?: boolean | null
          trial_expires_at?: string | null
          trial_firecrawl_usage?: number | null
          updated_at?: string
          use_booking_windows?: boolean
          user_id?: string | null
          voice_accent?: string | null
          voice_form_notification_emails?: string[]
          voice_type?: string
          website_url?: string
          whatsapp_enabled?: boolean | null
          whatsapp_forward_notification_emails?: string[]
          whatsapp_forwarding_enabled?: boolean | null
          whatsapp_message_template?: string | null
          whatsapp_number?: string | null
          widget_accent_color?: string | null
          widget_ai_bubble_color?: string | null
          widget_animation_style?: string | null
          widget_background_color?: string | null
          widget_banner_line1?: string | null
          widget_banner_line2?: string | null
          widget_border_color?: string | null
          widget_border_width?: string | null
          widget_button_gradient_enabled?: boolean
          widget_button_size?: string | null
          widget_gradient_enabled?: boolean | null
          widget_primary_color?: string | null
          widget_shadow_style?: string | null
          widget_shape?: string | null
          widget_text_color?: string | null
          widget_user_bubble_color?: string | null
        }
        Relationships: []
      }
      booking_blackouts: {
        Row: {
          assistant_id: string
          created_at: string
          end_at: string
          id: string
          reason: string | null
          start_at: string
          updated_at: string
        }
        Insert: {
          assistant_id: string
          created_at?: string
          end_at: string
          id?: string
          reason?: string | null
          start_at: string
          updated_at?: string
        }
        Update: {
          assistant_id?: string
          created_at?: string
          end_at?: string
          id?: string
          reason?: string | null
          start_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      booking_queue: {
        Row: {
          assistant_id: string
          created_at: string
          expires_at: string
          id: string
          preferred_date: string
          preferred_time: string
          queue_id: string
        }
        Insert: {
          assistant_id: string
          created_at?: string
          expires_at: string
          id?: string
          preferred_date: string
          preferred_time: string
          queue_id: string
        }
        Update: {
          assistant_id?: string
          created_at?: string
          expires_at?: string
          id?: string
          preferred_date?: string
          preferred_time?: string
          queue_id?: string
        }
        Relationships: []
      }
      booking_windows: {
        Row: {
          active: boolean
          assistant_id: string
          capacity: number
          created_at: string
          end_time: string
          id: string
          slot_duration_min: number
          specific_date: string | null
          start_time: string
          updated_at: string
          weekday: number
        }
        Insert: {
          active?: boolean
          assistant_id: string
          capacity?: number
          created_at?: string
          end_time: string
          id?: string
          slot_duration_min?: number
          specific_date?: string | null
          start_time: string
          updated_at?: string
          weekday: number
        }
        Update: {
          active?: boolean
          assistant_id?: string
          capacity?: number
          created_at?: string
          end_time?: string
          id?: string
          slot_duration_min?: number
          specific_date?: string | null
          start_time?: string
          updated_at?: string
          weekday?: number
        }
        Relationships: []
      }
      bookings: {
        Row: {
          assistant_id: string
          booking_method: string | null
          calendly_url: string | null
          created_at: string
          email_sent: boolean | null
          id: string
          preferred_date: string
          preferred_time: string | null
          service_type: string | null
          status: string
          updated_at: string
          user_email: string
          user_name: string | null
          user_phone: string | null
          video_meeting_url: string | null
          video_platform_used: string | null
        }
        Insert: {
          assistant_id: string
          booking_method?: string | null
          calendly_url?: string | null
          created_at?: string
          email_sent?: boolean | null
          id?: string
          preferred_date: string
          preferred_time?: string | null
          service_type?: string | null
          status?: string
          updated_at?: string
          user_email: string
          user_name?: string | null
          user_phone?: string | null
          video_meeting_url?: string | null
          video_platform_used?: string | null
        }
        Update: {
          assistant_id?: string
          booking_method?: string | null
          calendly_url?: string | null
          created_at?: string
          email_sent?: boolean | null
          id?: string
          preferred_date?: string
          preferred_time?: string | null
          service_type?: string | null
          status?: string
          updated_at?: string
          user_email?: string
          user_name?: string | null
          user_phone?: string | null
          video_meeting_url?: string | null
          video_platform_used?: string | null
        }
        Relationships: []
      }
      business_pages: {
        Row: {
          calendly_url: string | null
          created_at: string
          id: string
          logo: string | null
          slug: string
          summary: string | null
          title: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          calendly_url?: string | null
          created_at?: string
          id?: string
          logo?: string | null
          slug: string
          summary?: string | null
          title: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          calendly_url?: string | null
          created_at?: string
          id?: string
          logo?: string | null
          slug?: string
          summary?: string | null
          title?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      commerce_customers: {
        Row: {
          activation_token: string
          company: string | null
          created_at: string | null
          email: string
          full_name: string | null
          id: string
          plan: string
          profile_id: string | null
          raw_payload: Json | null
          status: string
          transaction_id: string
          updated_at: string | null
        }
        Insert: {
          activation_token?: string
          company?: string | null
          created_at?: string | null
          email: string
          full_name?: string | null
          id?: string
          plan: string
          profile_id?: string | null
          raw_payload?: Json | null
          status?: string
          transaction_id: string
          updated_at?: string | null
        }
        Update: {
          activation_token?: string
          company?: string | null
          created_at?: string | null
          email?: string
          full_name?: string | null
          id?: string
          plan?: string
          profile_id?: string | null
          raw_payload?: Json | null
          status?: string
          transaction_id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      concierge_requests: {
        Row: {
          cms_type: string
          contact_info: string | null
          created_at: string
          id: string
          status: string
          updated_at: string
          user_id: string | null
          website_url: string
        }
        Insert: {
          cms_type: string
          contact_info?: string | null
          created_at?: string
          id?: string
          status?: string
          updated_at?: string
          user_id?: string | null
          website_url: string
        }
        Update: {
          cms_type?: string
          contact_info?: string | null
          created_at?: string
          id?: string
          status?: string
          updated_at?: string
          user_id?: string | null
          website_url?: string
        }
        Relationships: []
      }
      configs: {
        Row: {
          assistant_enabled: boolean
          business_email: string | null
          calendly_api_token: string | null
          created_at: string
          google_oauth_access_token: string | null
          google_oauth_refresh_token: string | null
          google_oauth_token_expires_at: string | null
          id: string
          phone: string | null
          updated_at: string
          user_id: string | null
          website_url: string | null
        }
        Insert: {
          assistant_enabled?: boolean
          business_email?: string | null
          calendly_api_token?: string | null
          created_at?: string
          google_oauth_access_token?: string | null
          google_oauth_refresh_token?: string | null
          google_oauth_token_expires_at?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
          user_id?: string | null
          website_url?: string | null
        }
        Update: {
          assistant_enabled?: boolean
          business_email?: string | null
          calendly_api_token?: string | null
          created_at?: string
          google_oauth_access_token?: string | null
          google_oauth_refresh_token?: string | null
          google_oauth_token_expires_at?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
          user_id?: string | null
          website_url?: string | null
        }
        Relationships: []
      }
      content_refresh_logs: {
        Row: {
          assistant_id: string
          changes_detected: Json | null
          completed_at: string | null
          error_message: string | null
          id: string
          refresh_status: string
          started_at: string
          triggered_by: string | null
        }
        Insert: {
          assistant_id: string
          changes_detected?: Json | null
          completed_at?: string | null
          error_message?: string | null
          id?: string
          refresh_status?: string
          started_at?: string
          triggered_by?: string | null
        }
        Update: {
          assistant_id?: string
          changes_detected?: Json | null
          completed_at?: string | null
          error_message?: string | null
          id?: string
          refresh_status?: string
          started_at?: string
          triggered_by?: string | null
        }
        Relationships: []
      }
      conversation_logs: {
        Row: {
          conversation_tokens: number | null
          created_at: string
          email: string | null
          id: string
          ip_address: string | null
          is_blocked: boolean | null
          request_timestamp: string
          spam_score: number | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          conversation_tokens?: number | null
          created_at?: string
          email?: string | null
          id?: string
          ip_address?: string | null
          is_blocked?: boolean | null
          request_timestamp?: string
          spam_score?: number | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          conversation_tokens?: number | null
          created_at?: string
          email?: string | null
          id?: string
          ip_address?: string | null
          is_blocked?: boolean | null
          request_timestamp?: string
          spam_score?: number | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      conversations: {
        Row: {
          ai_response: string
          assistant_id: string
          created_at: string
          id: string
          response_time_ms: number | null
          session_id: string
          tool_calls: Json | null
          user_message: string
        }
        Insert: {
          ai_response: string
          assistant_id: string
          created_at?: string
          id?: string
          response_time_ms?: number | null
          session_id?: string
          tool_calls?: Json | null
          user_message: string
        }
        Update: {
          ai_response?: string
          assistant_id?: string
          created_at?: string
          id?: string
          response_time_ms?: number | null
          session_id?: string
          tool_calls?: Json | null
          user_message?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversations_assistant_id_fkey"
            columns: ["assistant_id"]
            isOneToOne: false
            referencedRelation: "assistants"
            referencedColumns: ["id"]
          },
        ]
      }
      demo_requests: {
        Row: {
          company: string
          created_at: string
          email: string
          email_sent: boolean | null
          first_name: string
          id: string
          job_title: string | null
          last_name: string
          message: string
          request_type: string
          sector: string
        }
        Insert: {
          company: string
          created_at?: string
          email: string
          email_sent?: boolean | null
          first_name: string
          id?: string
          job_title?: string | null
          last_name: string
          message: string
          request_type?: string
          sector: string
        }
        Update: {
          company?: string
          created_at?: string
          email?: string
          email_sent?: boolean | null
          first_name?: string
          id?: string
          job_title?: string | null
          last_name?: string
          message?: string
          request_type?: string
          sector?: string
        }
        Relationships: []
      }
      digest_preferences: {
        Row: {
          assistant_id: string
          created_at: string
          frequency: string
          id: string
          include_bookings: boolean
          include_leads: boolean
          include_missed: boolean
          include_team_managers: boolean
          include_topics: boolean
          last_sent_at: string | null
          recipient_email: string | null
          recipient_emails: string[]
          updated_at: string
        }
        Insert: {
          assistant_id: string
          created_at?: string
          frequency?: string
          id?: string
          include_bookings?: boolean
          include_leads?: boolean
          include_missed?: boolean
          include_team_managers?: boolean
          include_topics?: boolean
          last_sent_at?: string | null
          recipient_email?: string | null
          recipient_emails?: string[]
          updated_at?: string
        }
        Update: {
          assistant_id?: string
          created_at?: string
          frequency?: string
          id?: string
          include_bookings?: boolean
          include_leads?: boolean
          include_missed?: boolean
          include_team_managers?: boolean
          include_topics?: boolean
          last_sent_at?: string | null
          recipient_email?: string | null
          recipient_emails?: string[]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "digest_preferences_assistant_id_fkey"
            columns: ["assistant_id"]
            isOneToOne: true
            referencedRelation: "assistants"
            referencedColumns: ["id"]
          },
        ]
      }
      email_messages: {
        Row: {
          assistant_id: string
          body_html: string | null
          body_text: string | null
          confidence_score: number | null
          created_at: string
          direction: string
          email_references: string | null
          error_message: string | null
          from_email: string | null
          from_name: string | null
          id: string
          in_reply_to: string | null
          message_id: string | null
          sent_at: string | null
          status: string
          subject: string | null
          thread_id: string
          to_email: string | null
          top_sources: Json | null
          updated_at: string
        }
        Insert: {
          assistant_id: string
          body_html?: string | null
          body_text?: string | null
          confidence_score?: number | null
          created_at?: string
          direction: string
          email_references?: string | null
          error_message?: string | null
          from_email?: string | null
          from_name?: string | null
          id?: string
          in_reply_to?: string | null
          message_id?: string | null
          sent_at?: string | null
          status?: string
          subject?: string | null
          thread_id: string
          to_email?: string | null
          top_sources?: Json | null
          updated_at?: string
        }
        Update: {
          assistant_id?: string
          body_html?: string | null
          body_text?: string | null
          confidence_score?: number | null
          created_at?: string
          direction?: string
          email_references?: string | null
          error_message?: string | null
          from_email?: string | null
          from_name?: string | null
          id?: string
          in_reply_to?: string | null
          message_id?: string | null
          sent_at?: string | null
          status?: string
          subject?: string | null
          thread_id?: string
          to_email?: string | null
          top_sources?: Json | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_messages_assistant_id_fkey"
            columns: ["assistant_id"]
            isOneToOne: false
            referencedRelation: "assistants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_messages_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "email_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      email_reminder_logs: {
        Row: {
          created_at: string
          email: string
          email_id: string | null
          error_message: string | null
          id: string
          reminder_type: string
          sent_at: string
          success: boolean
          trial_id: string | null
        }
        Insert: {
          created_at?: string
          email: string
          email_id?: string | null
          error_message?: string | null
          id?: string
          reminder_type: string
          sent_at?: string
          success?: boolean
          trial_id?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          email_id?: string | null
          error_message?: string | null
          id?: string
          reminder_type?: string
          sent_at?: string
          success?: boolean
          trial_id?: string | null
        }
        Relationships: []
      }
      email_threads: {
        Row: {
          assistant_id: string
          created_at: string
          from_email: string
          from_name: string | null
          id: string
          last_message_at: string
          status: string
          subject: string | null
          unread_count: number
          updated_at: string
        }
        Insert: {
          assistant_id: string
          created_at?: string
          from_email: string
          from_name?: string | null
          id?: string
          last_message_at?: string
          status?: string
          subject?: string | null
          unread_count?: number
          updated_at?: string
        }
        Update: {
          assistant_id?: string
          created_at?: string
          from_email?: string
          from_name?: string | null
          id?: string
          last_message_at?: string
          status?: string
          subject?: string | null
          unread_count?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_threads_assistant_id_fkey"
            columns: ["assistant_id"]
            isOneToOne: false
            referencedRelation: "assistants"
            referencedColumns: ["id"]
          },
        ]
      }
      faq_cache: {
        Row: {
          created_at: string
          hit_count: number | null
          id: string
          question_hash: string
          question_text: string
          response: Json
          updated_at: string
        }
        Insert: {
          created_at?: string
          hit_count?: number | null
          id?: string
          question_hash: string
          question_text: string
          response: Json
          updated_at?: string
        }
        Update: {
          created_at?: string
          hit_count?: number | null
          id?: string
          question_hash?: string
          question_text?: string
          response?: Json
          updated_at?: string
        }
        Relationships: []
      }
      form_notification_logs: {
        Row: {
          created_at: string | null
          error_message: string | null
          form_id: string
          id: string
          metadata: Json | null
          notification_type: string
          recipient: string | null
          sent_at: string | null
          status: string
          submission_id: string | null
        }
        Insert: {
          created_at?: string | null
          error_message?: string | null
          form_id: string
          id?: string
          metadata?: Json | null
          notification_type: string
          recipient?: string | null
          sent_at?: string | null
          status: string
          submission_id?: string | null
        }
        Update: {
          created_at?: string | null
          error_message?: string | null
          form_id?: string
          id?: string
          metadata?: Json | null
          notification_type?: string
          recipient?: string | null
          sent_at?: string | null
          status?: string
          submission_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "form_notification_logs_form_id_fkey"
            columns: ["form_id"]
            isOneToOne: false
            referencedRelation: "voice_forms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "form_notification_logs_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "voice_form_submissions"
            referencedColumns: ["id"]
          },
        ]
      }
      inquiry_follow_up_config: {
        Row: {
          assistant_id: string
          contacted_status_days: number
          created_at: string
          custom_templates: Json | null
          enabled: boolean
          id: string
          new_status_days: number
          updated_at: string
        }
        Insert: {
          assistant_id: string
          contacted_status_days?: number
          created_at?: string
          custom_templates?: Json | null
          enabled?: boolean
          id?: string
          new_status_days?: number
          updated_at?: string
        }
        Update: {
          assistant_id?: string
          contacted_status_days?: number
          created_at?: string
          custom_templates?: Json | null
          enabled?: boolean
          id?: string
          new_status_days?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "inquiry_follow_up_config_assistant_id_fkey"
            columns: ["assistant_id"]
            isOneToOne: false
            referencedRelation: "assistants"
            referencedColumns: ["id"]
          },
        ]
      }
      inquiry_follow_ups: {
        Row: {
          created_at: string
          email_id: string | null
          email_status: string
          error_message: string | null
          follow_up_type: string
          id: string
          inquiry_id: string
          sent_at: string
        }
        Insert: {
          created_at?: string
          email_id?: string | null
          email_status?: string
          error_message?: string | null
          follow_up_type: string
          id?: string
          inquiry_id: string
          sent_at?: string
        }
        Update: {
          created_at?: string
          email_id?: string | null
          email_status?: string
          error_message?: string | null
          follow_up_type?: string
          id?: string
          inquiry_id?: string
          sent_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "inquiry_follow_ups_inquiry_id_fkey"
            columns: ["inquiry_id"]
            isOneToOne: false
            referencedRelation: "project_inquiries"
            referencedColumns: ["id"]
          },
        ]
      }
      inquiry_notes: {
        Row: {
          created_at: string
          id: string
          inquiry_id: string
          note_text: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          inquiry_id: string
          note_text: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          inquiry_id?: string
          note_text?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "inquiry_notes_inquiry_id_fkey"
            columns: ["inquiry_id"]
            isOneToOne: false
            referencedRelation: "project_inquiries"
            referencedColumns: ["id"]
          },
        ]
      }
      installation_guides: {
        Row: {
          created_at: string
          description: string | null
          difficulty_level: string | null
          estimated_time_minutes: number | null
          id: string
          instructions: Json
          is_active: boolean | null
          platform_name: string
          platform_type: string | null
          prerequisites: string[] | null
          title: string
          updated_at: string
          video_url: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          difficulty_level?: string | null
          estimated_time_minutes?: number | null
          id?: string
          instructions: Json
          is_active?: boolean | null
          platform_name: string
          platform_type?: string | null
          prerequisites?: string[] | null
          title: string
          updated_at?: string
          video_url?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          difficulty_level?: string | null
          estimated_time_minutes?: number | null
          id?: string
          instructions?: Json
          is_active?: boolean | null
          platform_name?: string
          platform_type?: string | null
          prerequisites?: string[] | null
          title?: string
          updated_at?: string
          video_url?: string | null
        }
        Relationships: []
      }
      knowledge_change_events: {
        Row: {
          actor_email: string | null
          actor_user_id: string | null
          assistant_id: string
          change_type: Database["public"]["Enums"]["knowledge_change_type"]
          created_at: string
          details: Json
          id: string
          summary: string
        }
        Insert: {
          actor_email?: string | null
          actor_user_id?: string | null
          assistant_id: string
          change_type: Database["public"]["Enums"]["knowledge_change_type"]
          created_at?: string
          details?: Json
          id?: string
          summary: string
        }
        Update: {
          actor_email?: string | null
          actor_user_id?: string | null
          assistant_id?: string
          change_type?: Database["public"]["Enums"]["knowledge_change_type"]
          created_at?: string
          details?: Json
          id?: string
          summary?: string
        }
        Relationships: []
      }
      knowledge_notification_queue: {
        Row: {
          assistant_id: string
          event_count: number
          first_event_at: string
          last_event_at: string
          send_after: string
          sent_at: string | null
        }
        Insert: {
          assistant_id: string
          event_count?: number
          first_event_at?: string
          last_event_at?: string
          send_after?: string
          sent_at?: string | null
        }
        Update: {
          assistant_id?: string
          event_count?: number
          first_event_at?: string
          last_event_at?: string
          send_after?: string
          sent_at?: string | null
        }
        Relationships: []
      }
      knowledge_vectors: {
        Row: {
          assistant_id: string
          content: string
          created_at: string
          id: string
          metadata: Json | null
          source_id: string | null
          source_type: string
          title: string | null
          updated_at: string
          url: string | null
          vector_embedding: string | null
        }
        Insert: {
          assistant_id: string
          content: string
          created_at?: string
          id?: string
          metadata?: Json | null
          source_id?: string | null
          source_type?: string
          title?: string | null
          updated_at?: string
          url?: string | null
          vector_embedding?: string | null
        }
        Update: {
          assistant_id?: string
          content?: string
          created_at?: string
          id?: string
          metadata?: Json | null
          source_id?: string | null
          source_type?: string
          title?: string | null
          updated_at?: string
          url?: string | null
          vector_embedding?: string | null
        }
        Relationships: []
      }
      lead_captures: {
        Row: {
          ai_summary: string | null
          assistant_id: string
          created_at: string
          id: string
          problem_summary: string | null
          session_id: string | null
          status: string
          transcript: Json | null
          updated_at: string
          user_email: string
          user_name: string | null
          user_phone: string | null
        }
        Insert: {
          ai_summary?: string | null
          assistant_id: string
          created_at?: string
          id?: string
          problem_summary?: string | null
          session_id?: string | null
          status?: string
          transcript?: Json | null
          updated_at?: string
          user_email: string
          user_name?: string | null
          user_phone?: string | null
        }
        Update: {
          ai_summary?: string | null
          assistant_id?: string
          created_at?: string
          id?: string
          problem_summary?: string | null
          session_id?: string | null
          status?: string
          transcript?: Json | null
          updated_at?: string
          user_email?: string
          user_name?: string | null
          user_phone?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lead_captures_assistant_id_fkey"
            columns: ["assistant_id"]
            isOneToOne: false
            referencedRelation: "assistants"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          agent_id: string | null
          created_at: string
          email: string | null
          id: string
          message: string | null
          name: string | null
          phone: string | null
          source: string | null
        }
        Insert: {
          agent_id?: string | null
          created_at?: string
          email?: string | null
          id?: string
          message?: string | null
          name?: string | null
          phone?: string | null
          source?: string | null
        }
        Update: {
          agent_id?: string | null
          created_at?: string
          email?: string | null
          id?: string
          message?: string | null
          name?: string | null
          phone?: string | null
          source?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "leads_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
        ]
      }
      link_clicks: {
        Row: {
          assistant_id: string
          clicked_url: string
          contact_email: string | null
          contact_name: string | null
          contact_phone: string | null
          created_at: string
          id: string
          lead_id: string | null
          link_label: string | null
          referrer_url: string | null
          session_id: string | null
          source: string
          utm_campaign: string | null
          utm_medium: string | null
          utm_source: string | null
        }
        Insert: {
          assistant_id: string
          clicked_url: string
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          id?: string
          lead_id?: string | null
          link_label?: string | null
          referrer_url?: string | null
          session_id?: string | null
          source?: string
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
        }
        Update: {
          assistant_id?: string
          clicked_url?: string
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          id?: string
          lead_id?: string | null
          link_label?: string | null
          referrer_url?: string | null
          session_id?: string | null
          source?: string
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "link_clicks_assistant_id_fkey"
            columns: ["assistant_id"]
            isOneToOne: false
            referencedRelation: "assistants"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_detections: {
        Row: {
          confidence_score: number | null
          created_at: string
          detected_platform: string | null
          detection_metadata: Json | null
          id: string
          technology_stack: Json | null
          updated_at: string
          website_url: string
        }
        Insert: {
          confidence_score?: number | null
          created_at?: string
          detected_platform?: string | null
          detection_metadata?: Json | null
          id?: string
          technology_stack?: Json | null
          updated_at?: string
          website_url: string
        }
        Update: {
          confidence_score?: number | null
          created_at?: string
          detected_platform?: string | null
          detection_metadata?: Json | null
          id?: string
          technology_stack?: Json | null
          updated_at?: string
          website_url?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          business_description: string | null
          business_type: string | null
          company_name: string | null
          created_at: string
          email: string
          first_name: string | null
          id: string
          last_name: string | null
          onboarding_completed: boolean | null
          phone: string | null
          profile_completed: boolean
          timezone: string | null
          updated_at: string
          user_id: string
          website_url: string | null
        }
        Insert: {
          avatar_url?: string | null
          business_description?: string | null
          business_type?: string | null
          company_name?: string | null
          created_at?: string
          email: string
          first_name?: string | null
          id?: string
          last_name?: string | null
          onboarding_completed?: boolean | null
          phone?: string | null
          profile_completed?: boolean
          timezone?: string | null
          updated_at?: string
          user_id: string
          website_url?: string | null
        }
        Update: {
          avatar_url?: string | null
          business_description?: string | null
          business_type?: string | null
          company_name?: string | null
          created_at?: string
          email?: string
          first_name?: string | null
          id?: string
          last_name?: string | null
          onboarding_completed?: boolean | null
          phone?: string | null
          profile_completed?: boolean
          timezone?: string | null
          updated_at?: string
          user_id?: string
          website_url?: string | null
        }
        Relationships: []
      }
      project_inquiries: {
        Row: {
          assistant_id: string
          budget_range: string | null
          business_goals: string | null
          created_at: string
          current_solution: string | null
          id: string
          matched_services: Json | null
          meeting_booked: boolean | null
          meeting_link: string | null
          pricing_provided: Json | null
          project_description: string
          project_type: string | null
          specific_requirements: Json | null
          status: string
          timeline: string | null
          updated_at: string
          user_email: string
          user_name: string
          user_phone: string | null
        }
        Insert: {
          assistant_id: string
          budget_range?: string | null
          business_goals?: string | null
          created_at?: string
          current_solution?: string | null
          id?: string
          matched_services?: Json | null
          meeting_booked?: boolean | null
          meeting_link?: string | null
          pricing_provided?: Json | null
          project_description: string
          project_type?: string | null
          specific_requirements?: Json | null
          status?: string
          timeline?: string | null
          updated_at?: string
          user_email: string
          user_name: string
          user_phone?: string | null
        }
        Update: {
          assistant_id?: string
          budget_range?: string | null
          business_goals?: string | null
          created_at?: string
          current_solution?: string | null
          id?: string
          matched_services?: Json | null
          meeting_booked?: boolean | null
          meeting_link?: string | null
          pricing_provided?: Json | null
          project_description?: string
          project_type?: string | null
          specific_requirements?: Json | null
          status?: string
          timeline?: string | null
          updated_at?: string
          user_email?: string
          user_name?: string
          user_phone?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_inquiries_assistant_id_fkey"
            columns: ["assistant_id"]
            isOneToOne: false
            referencedRelation: "assistants"
            referencedColumns: ["id"]
          },
        ]
      }
      promo_codes: {
        Row: {
          active: boolean
          code: string
          created_at: string
          created_by: string | null
          discount_amount: number
          discount_type: string
          expires_at: string | null
          id: string
          updated_at: string
          usage_limit: number | null
          used_count: number
        }
        Insert: {
          active?: boolean
          code: string
          created_at?: string
          created_by?: string | null
          discount_amount?: number
          discount_type: string
          expires_at?: string | null
          id?: string
          updated_at?: string
          usage_limit?: number | null
          used_count?: number
        }
        Update: {
          active?: boolean
          code?: string
          created_at?: string
          created_by?: string | null
          discount_amount?: number
          discount_type?: string
          expires_at?: string | null
          id?: string
          updated_at?: string
          usage_limit?: number | null
          used_count?: number
        }
        Relationships: []
      }
      rate_limits: {
        Row: {
          block_until: string | null
          created_at: string
          id: string
          identifier: string
          identifier_type: string
          is_blocked: boolean | null
          request_count: number
          updated_at: string
          window_start: string
        }
        Insert: {
          block_until?: string | null
          created_at?: string
          id?: string
          identifier: string
          identifier_type: string
          is_blocked?: boolean | null
          request_count?: number
          updated_at?: string
          window_start?: string
        }
        Update: {
          block_until?: string | null
          created_at?: string
          id?: string
          identifier?: string
          identifier_type?: string
          is_blocked?: boolean | null
          request_count?: number
          updated_at?: string
          window_start?: string
        }
        Relationships: []
      }
      reviews: {
        Row: {
          assistant_id: string
          channel: string | null
          comment: string | null
          created_at: string
          id: string
          metadata: Json | null
          origin: string | null
          rating: number
          session_id: string | null
          user_email: string | null
        }
        Insert: {
          assistant_id: string
          channel?: string | null
          comment?: string | null
          created_at?: string
          id?: string
          metadata?: Json | null
          origin?: string | null
          rating: number
          session_id?: string | null
          user_email?: string | null
        }
        Update: {
          assistant_id?: string
          channel?: string | null
          comment?: string | null
          created_at?: string
          id?: string
          metadata?: Json | null
          origin?: string | null
          rating?: number
          session_id?: string | null
          user_email?: string | null
        }
        Relationships: []
      }
      scrape_analytics: {
        Row: {
          assistant_id: string | null
          created_at: string
          domain: string
          duration_ms: number | null
          error_message: string | null
          id: string
          metadata: Json | null
          pages_scraped: number | null
          quality_score: number | null
          scraper_used: string
          success: boolean
          tokens_used: number | null
          website_url: string
        }
        Insert: {
          assistant_id?: string | null
          created_at?: string
          domain: string
          duration_ms?: number | null
          error_message?: string | null
          id?: string
          metadata?: Json | null
          pages_scraped?: number | null
          quality_score?: number | null
          scraper_used: string
          success?: boolean
          tokens_used?: number | null
          website_url: string
        }
        Update: {
          assistant_id?: string | null
          created_at?: string
          domain?: string
          duration_ms?: number | null
          error_message?: string | null
          id?: string
          metadata?: Json | null
          pages_scraped?: number | null
          quality_score?: number | null
          scraper_used?: string
          success?: boolean
          tokens_used?: number | null
          website_url?: string
        }
        Relationships: [
          {
            foreignKeyName: "scrape_analytics_assistant_id_fkey"
            columns: ["assistant_id"]
            isOneToOne: false
            referencedRelation: "assistants"
            referencedColumns: ["id"]
          },
        ]
      }
      services_catalog: {
        Row: {
          assistant_id: string
          base_price: number
          created_at: string
          delivery_time: string | null
          description: string | null
          id: string
          is_active: boolean
          key_features: Json | null
          metadata: Json | null
          price_currency: string
          pricing_model: string
          service_category: string
          service_name: string
          updated_at: string
        }
        Insert: {
          assistant_id: string
          base_price?: number
          created_at?: string
          delivery_time?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          key_features?: Json | null
          metadata?: Json | null
          price_currency?: string
          pricing_model?: string
          service_category: string
          service_name: string
          updated_at?: string
        }
        Update: {
          assistant_id?: string
          base_price?: number
          created_at?: string
          delivery_time?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          key_features?: Json | null
          metadata?: Json | null
          price_currency?: string
          pricing_model?: string
          service_category?: string
          service_name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "services_catalog_assistant_id_fkey"
            columns: ["assistant_id"]
            isOneToOne: false
            referencedRelation: "assistants"
            referencedColumns: ["id"]
          },
        ]
      }
      slack_integrations: {
        Row: {
          created_at: string
          enabled: boolean
          notify_bookings: boolean
          notify_crawl_complete: boolean
          notify_demo_requests: boolean
          notify_digests: boolean
          notify_inquiries: boolean
          notify_lifecycle: boolean
          updated_at: string
          user_id: string
          webhook_url: string | null
        }
        Insert: {
          created_at?: string
          enabled?: boolean
          notify_bookings?: boolean
          notify_crawl_complete?: boolean
          notify_demo_requests?: boolean
          notify_digests?: boolean
          notify_inquiries?: boolean
          notify_lifecycle?: boolean
          updated_at?: string
          user_id: string
          webhook_url?: string | null
        }
        Update: {
          created_at?: string
          enabled?: boolean
          notify_bookings?: boolean
          notify_crawl_complete?: boolean
          notify_demo_requests?: boolean
          notify_digests?: boolean
          notify_inquiries?: boolean
          notify_lifecycle?: boolean
          updated_at?: string
          user_id?: string
          webhook_url?: string | null
        }
        Relationships: []
      }
      subscribers: {
        Row: {
          created_at: string
          email: string
          id: string
          stripe_customer_id: string | null
          subscribed: boolean
          subscription_end: string | null
          subscription_tier: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          stripe_customer_id?: string | null
          subscribed?: boolean
          subscription_end?: string | null
          subscription_tier?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          stripe_customer_id?: string | null
          subscribed?: boolean
          subscription_end?: string | null
          subscription_tier?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      support_requests: {
        Row: {
          attachments: Json | null
          created_at: string
          description: string
          id: string
          platform_info: Json | null
          priority: string | null
          request_type: string | null
          status: string | null
          title: string
          updated_at: string
          user_email: string
          user_id: string | null
          user_name: string | null
          user_type: string | null
        }
        Insert: {
          attachments?: Json | null
          created_at?: string
          description: string
          id?: string
          platform_info?: Json | null
          priority?: string | null
          request_type?: string | null
          status?: string | null
          title: string
          updated_at?: string
          user_email: string
          user_id?: string | null
          user_name?: string | null
          user_type?: string | null
        }
        Update: {
          attachments?: Json | null
          created_at?: string
          description?: string
          id?: string
          platform_info?: Json | null
          priority?: string | null
          request_type?: string | null
          status?: string | null
          title?: string
          updated_at?: string
          user_email?: string
          user_id?: string | null
          user_name?: string | null
          user_type?: string | null
        }
        Relationships: []
      }
      time_slots: {
        Row: {
          assistant_id: string
          booking_id: string | null
          created_at: string
          date: string
          end_time: string
          id: string
          is_available: boolean
          start_time: string
          updated_at: string
        }
        Insert: {
          assistant_id: string
          booking_id?: string | null
          created_at?: string
          date: string
          end_time: string
          id?: string
          is_available?: boolean
          start_time: string
          updated_at?: string
        }
        Update: {
          assistant_id?: string
          booking_id?: string | null
          created_at?: string
          date?: string
          end_time?: string
          id?: string
          is_available?: boolean
          start_time?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_time_slots_assistant"
            columns: ["assistant_id"]
            isOneToOne: false
            referencedRelation: "assistants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_time_slots_booking"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      user_analytics: {
        Row: {
          created_at: string
          event_data: Json | null
          event_type: string
          id: string
          session_id: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          event_data?: Json | null
          event_type: string
          id?: string
          session_id?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          event_data?: Json | null
          event_type?: string
          id?: string
          session_id?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          assigned_at: string
          assigned_by: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          assigned_at?: string
          assigned_by?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          assigned_at?: string
          assigned_by?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_trials: {
        Row: {
          converted_to_paid: boolean | null
          created_at: string
          device_fingerprint: string | null
          email: string
          features_used: Json | null
          id: string
          ip_address: string | null
          trial_end_date: string
          trial_start_date: string
          trial_status: string
          trial_type: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          converted_to_paid?: boolean | null
          created_at?: string
          device_fingerprint?: string | null
          email: string
          features_used?: Json | null
          id?: string
          ip_address?: string | null
          trial_end_date?: string
          trial_start_date?: string
          trial_status?: string
          trial_type?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          converted_to_paid?: boolean | null
          created_at?: string
          device_fingerprint?: string | null
          email?: string
          features_used?: Json | null
          id?: string
          ip_address?: string | null
          trial_end_date?: string
          trial_start_date?: string
          trial_status?: string
          trial_type?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      user_usage: {
        Row: {
          conversations_limit: number
          conversations_used: number
          conversations_used_today: number | null
          created_at: string
          email: string
          id: string
          last_daily_reset: string | null
          plan_type: string
          reset_date: string
          subscription_start_date: string | null
          updated_at: string
        }
        Insert: {
          conversations_limit?: number
          conversations_used?: number
          conversations_used_today?: number | null
          created_at?: string
          email: string
          id?: string
          last_daily_reset?: string | null
          plan_type?: string
          reset_date?: string
          subscription_start_date?: string | null
          updated_at?: string
        }
        Update: {
          conversations_limit?: number
          conversations_used?: number
          conversations_used_today?: number | null
          created_at?: string
          email?: string
          id?: string
          last_daily_reset?: string | null
          plan_type?: string
          reset_date?: string
          subscription_start_date?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      voice_form_submissions: {
        Row: {
          assistant_id: string | null
          completion_status: string
          completion_time: number | null
          created_at: string
          data: Json
          field_collection_log: Json | null
          form_id: string
          id: string
          session_id: string
          submitted_at: string
          user_email: string | null
          user_name: string | null
        }
        Insert: {
          assistant_id?: string | null
          completion_status?: string
          completion_time?: number | null
          created_at?: string
          data?: Json
          field_collection_log?: Json | null
          form_id: string
          id?: string
          session_id: string
          submitted_at?: string
          user_email?: string | null
          user_name?: string | null
        }
        Update: {
          assistant_id?: string | null
          completion_status?: string
          completion_time?: number | null
          created_at?: string
          data?: Json
          field_collection_log?: Json | null
          form_id?: string
          id?: string
          session_id?: string
          submitted_at?: string
          user_email?: string | null
          user_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "voice_form_submissions_assistant_id_fkey"
            columns: ["assistant_id"]
            isOneToOne: false
            referencedRelation: "assistants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "voice_form_submissions_form_id_fkey"
            columns: ["form_id"]
            isOneToOne: false
            referencedRelation: "voice_forms"
            referencedColumns: ["id"]
          },
        ]
      }
      voice_forms: {
        Row: {
          assistant_context: Json | null
          assistant_id: string | null
          auto_response_config: Json | null
          auto_response_message: string | null
          auto_response_subject: string | null
          branding_logo_url: string | null
          branding_redirect_url: string | null
          business_name: string | null
          conversation_objective: string | null
          created_at: string
          description: string | null
          form_name: string
          form_slug: string
          id: string
          is_active: boolean
          notification_email: string
          notification_settings: Json | null
          send_auto_response: boolean | null
          send_conversation_transcript: boolean | null
          theme: string
          topics: Json
          updated_at: string
          user_id: string
          webhook_config: Json | null
          website_url: string | null
        }
        Insert: {
          assistant_context?: Json | null
          assistant_id?: string | null
          auto_response_config?: Json | null
          auto_response_message?: string | null
          auto_response_subject?: string | null
          branding_logo_url?: string | null
          branding_redirect_url?: string | null
          business_name?: string | null
          conversation_objective?: string | null
          created_at?: string
          description?: string | null
          form_name: string
          form_slug: string
          id?: string
          is_active?: boolean
          notification_email: string
          notification_settings?: Json | null
          send_auto_response?: boolean | null
          send_conversation_transcript?: boolean | null
          theme?: string
          topics?: Json
          updated_at?: string
          user_id: string
          webhook_config?: Json | null
          website_url?: string | null
        }
        Update: {
          assistant_context?: Json | null
          assistant_id?: string | null
          auto_response_config?: Json | null
          auto_response_message?: string | null
          auto_response_subject?: string | null
          branding_logo_url?: string | null
          branding_redirect_url?: string | null
          business_name?: string | null
          conversation_objective?: string | null
          created_at?: string
          description?: string | null
          form_name?: string
          form_slug?: string
          id?: string
          is_active?: boolean
          notification_email?: string
          notification_settings?: Json | null
          send_auto_response?: boolean | null
          send_conversation_transcript?: boolean | null
          theme?: string
          topics?: Json
          updated_at?: string
          user_id?: string
          webhook_config?: Json | null
          website_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "voice_forms_assistant_id_fkey"
            columns: ["assistant_id"]
            isOneToOne: false
            referencedRelation: "assistants"
            referencedColumns: ["id"]
          },
        ]
      }
      webhook_deliveries: {
        Row: {
          created_at: string | null
          delivered_at: string | null
          error_message: string | null
          event_type: string
          form_id: string
          id: string
          payload: Json
          response_body: string | null
          response_status: number | null
          submission_id: string | null
          webhook_url: string
        }
        Insert: {
          created_at?: string | null
          delivered_at?: string | null
          error_message?: string | null
          event_type: string
          form_id: string
          id?: string
          payload: Json
          response_body?: string | null
          response_status?: number | null
          submission_id?: string | null
          webhook_url: string
        }
        Update: {
          created_at?: string | null
          delivered_at?: string | null
          error_message?: string | null
          event_type?: string
          form_id?: string
          id?: string
          payload?: Json
          response_body?: string | null
          response_status?: number | null
          submission_id?: string | null
          webhook_url?: string
        }
        Relationships: [
          {
            foreignKeyName: "webhook_deliveries_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "voice_form_submissions"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_channels: {
        Row: {
          assistant_id: string
          country_code: string | null
          created_at: string
          display_name: string | null
          id: string
          is_active: boolean
          monthly_price_cents: number
          owned_by_platform: boolean
          provisioned_at: string | null
          provisioning_error: string | null
          provisioning_status: string
          released_at: string | null
          twilio_number: string
          twilio_sid: string | null
          updated_at: string
          user_id: string
          voice_replies_enabled: boolean
        }
        Insert: {
          assistant_id: string
          country_code?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          is_active?: boolean
          monthly_price_cents?: number
          owned_by_platform?: boolean
          provisioned_at?: string | null
          provisioning_error?: string | null
          provisioning_status?: string
          released_at?: string | null
          twilio_number: string
          twilio_sid?: string | null
          updated_at?: string
          user_id: string
          voice_replies_enabled?: boolean
        }
        Update: {
          assistant_id?: string
          country_code?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          is_active?: boolean
          monthly_price_cents?: number
          owned_by_platform?: boolean
          provisioned_at?: string | null
          provisioning_error?: string | null
          provisioning_status?: string
          released_at?: string | null
          twilio_number?: string
          twilio_sid?: string | null
          updated_at?: string
          user_id?: string
          voice_replies_enabled?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_channels_assistant_id_fkey"
            columns: ["assistant_id"]
            isOneToOne: false
            referencedRelation: "assistants"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_conversations: {
        Row: {
          assistant_id: string
          channel_id: string
          conversation_history: Json
          created_at: string
          customer_name: string | null
          customer_phone: string
          id: string
          last_message_at: string
          message_count: number
          updated_at: string
        }
        Insert: {
          assistant_id: string
          channel_id: string
          conversation_history?: Json
          created_at?: string
          customer_name?: string | null
          customer_phone: string
          id?: string
          last_message_at?: string
          message_count?: number
          updated_at?: string
        }
        Update: {
          assistant_id?: string
          channel_id?: string
          conversation_history?: Json
          created_at?: string
          customer_name?: string | null
          customer_phone?: string
          id?: string
          last_message_at?: string
          message_count?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_conversations_assistant_id_fkey"
            columns: ["assistant_id"]
            isOneToOne: false
            referencedRelation: "assistants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_conversations_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_channels"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_number_requests: {
        Row: {
          assistant_id: string
          created_at: string
          fulfilled_channel_id: string | null
          id: string
          notes: string | null
          requested_area_code: string | null
          requested_country: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          assistant_id: string
          created_at?: string
          fulfilled_channel_id?: string | null
          id?: string
          notes?: string | null
          requested_area_code?: string | null
          requested_country: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          assistant_id?: string
          created_at?: string
          fulfilled_channel_id?: string | null
          id?: string
          notes?: string | null
          requested_area_code?: string | null
          requested_country?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      workspace_audit_log: {
        Row: {
          action: string
          actor_user_id: string | null
          assistant_id: string
          created_at: string
          id: string
          metadata: Json | null
          target_id: string | null
          target_type: string | null
        }
        Insert: {
          action: string
          actor_user_id?: string | null
          assistant_id: string
          created_at?: string
          id?: string
          metadata?: Json | null
          target_id?: string | null
          target_type?: string | null
        }
        Update: {
          action?: string
          actor_user_id?: string | null
          assistant_id?: string
          created_at?: string
          id?: string
          metadata?: Json | null
          target_id?: string | null
          target_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "workspace_audit_log_assistant_id_fkey"
            columns: ["assistant_id"]
            isOneToOne: false
            referencedRelation: "assistants"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_members: {
        Row: {
          assistant_id: string
          created_at: string
          id: string
          invited_by: string | null
          invited_email: string | null
          notify_on_knowledge_update: boolean
          role: Database["public"]["Enums"]["app_role"]
          status: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          assistant_id: string
          created_at?: string
          id?: string
          invited_by?: string | null
          invited_email?: string | null
          notify_on_knowledge_update?: boolean
          role?: Database["public"]["Enums"]["app_role"]
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          assistant_id?: string
          created_at?: string
          id?: string
          invited_by?: string | null
          invited_email?: string | null
          notify_on_knowledge_update?: boolean
          role?: Database["public"]["Enums"]["app_role"]
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      workspace_notification_webhooks: {
        Row: {
          assistant_id: string
          created_at: string
          created_by: string | null
          enabled: boolean
          id: string
          kind: string
          label: string | null
          updated_at: string
          webhook_url: string
        }
        Insert: {
          assistant_id: string
          created_at?: string
          created_by?: string | null
          enabled?: boolean
          id?: string
          kind: string
          label?: string | null
          updated_at?: string
          webhook_url: string
        }
        Update: {
          assistant_id?: string
          created_at?: string
          created_by?: string | null
          enabled?: boolean
          id?: string
          kind?: string
          label?: string | null
          updated_at?: string
          webhook_url?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      check_booking_conflict: {
        Args: {
          p_assistant_id: string
          p_preferred_date: string
          p_preferred_time: string
          p_queue_id: string
        }
        Returns: {
          available_slots: number
          has_conflict: boolean
        }[]
      }
      check_conversation_limit: {
        Args: { plan: string; user_email: string }
        Returns: {
          allowed: boolean
          daily_remaining: number
          is_daily_limit: boolean
          limit_exceeded: boolean
          remaining: number
        }[]
      }
      check_trial_eligibility: {
        Args: { device_fp?: string; user_email: string; user_ip?: string }
        Returns: {
          eligible: boolean
          existing_trial_id: string
          existing_trial_status: string
          reason: string
        }[]
      }
      cleanup_expired_booking_queue: { Args: never; Returns: undefined }
      create_user_trial: {
        Args: {
          p_device_fingerprint?: string
          p_email: string
          p_ip_address?: string
          p_trial_type?: string
          p_user_id: string
        }
        Returns: string
      }
      discard_assistant_draft: {
        Args: { p_assistant_id: string }
        Returns: undefined
      }
      get_admin_dashboard_stats: { Args: never; Returns: Json }
      get_safe_assistant_data: {
        Args: { assistant_id: string }
        Returns: {
          business_name: string
          created_at: string
          description: string
          id: string
          is_trial: boolean
          language: string
          logo_url: string
          scraped_content: Json
          system_prompt: string
          tone: string
          trial_expires_at: string
          updated_at: string
          voice_type: string
          website_url: string
        }[]
      }
      get_safe_assistant_for_embed: {
        Args: { assistant_uuid: string }
        Returns: {
          business_name: string
          description: string
          id: string
          language: string
          logo_url: string
          tone: string
          voice_type: string
        }[]
      }
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      handle_tool_call: {
        Args: { parameters: Json; tool_name: string }
        Returns: Json
      }
      has_active_trial: { Args: { user_email: string }; Returns: boolean }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      has_workspace_role: {
        Args: {
          _assistant_id: string
          _roles: Database["public"]["Enums"]["app_role"][]
          _user_id: string
        }
        Returns: boolean
      }
      increment_conversation_count: {
        Args: { tokens_used?: number; user_email: string }
        Returns: boolean
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
      is_assistant_publicly_accessible: {
        Args: { assistant_id: string }
        Returns: boolean
      }
      is_valid_trial_assistant: {
        Args: { assistant_id: string }
        Returns: boolean
      }
      log_knowledge_change: {
        Args: {
          p_actor_email?: string
          p_actor_user_id?: string
          p_assistant_id: string
          p_change_type: Database["public"]["Enums"]["knowledge_change_type"]
          p_details?: Json
          p_summary: string
        }
        Returns: string
      }
      match_chunks: {
        Args: {
          match_count?: number
          match_threshold?: number
          query_embedding: string
        }
        Returns: {
          content: string
          doc_authority_rank: number
          doc_title: string
          doc_url: string
          document_id: string
          id: string
          similarity: number
          topic: string
        }[]
      }
      publish_assistant_draft: {
        Args: { p_assistant_id: string }
        Returns: undefined
      }
      reset_user_monthly_limits: {
        Args: never
        Returns: {
          reset_details: Json
          users_reset: number
        }[]
      }
      search_knowledge_vectors: {
        Args: {
          assistant_id: string
          match_count?: number
          match_threshold?: number
          query_embedding: string
        }
        Returns: {
          content: string
          id: string
          metadata: Json
          similarity: number
          source_id: string
          source_type: string
          title: string
          url: string
        }[]
      }
      validate_booking_data: {
        Args: { booking_data: Json }
        Returns: {
          errors: string[]
          is_valid: boolean
        }[]
      }
    }
    Enums: {
      app_role:
        | "admin"
        | "moderator"
        | "user"
        | "owner"
        | "manager"
        | "operator"
        | "viewer"
      knowledge_change_type:
        | "document"
        | "manual_entry"
        | "website_rescrape"
        | "services"
        | "prompt_publish"
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
      app_role: [
        "admin",
        "moderator",
        "user",
        "owner",
        "manager",
        "operator",
        "viewer",
      ],
      knowledge_change_type: [
        "document",
        "manual_entry",
        "website_rescrape",
        "services",
        "prompt_publish",
      ],
    },
  },
} as const
