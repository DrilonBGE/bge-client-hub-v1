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
      app_config: {
        Row: {
          key: string
          value: string | null
        }
        Insert: {
          key: string
          value?: string | null
        }
        Update: {
          key?: string
          value?: string | null
        }
        Relationships: []
      }
      audit_log: {
        Row: {
          action: string | null
          client_name: string | null
          created_at: string
          detail: string | null
          id: string
          user_name: string | null
        }
        Insert: {
          action?: string | null
          client_name?: string | null
          created_at?: string
          detail?: string | null
          id?: string
          user_name?: string | null
        }
        Update: {
          action?: string | null
          client_name?: string | null
          created_at?: string
          detail?: string | null
          id?: string
          user_name?: string | null
        }
        Relationships: []
      }
      client_access: {
        Row: {
          client_id: string
          course: Json
          tabs: Json
          updated_at: string
        }
        Insert: {
          client_id: string
          course?: Json
          tabs?: Json
          updated_at?: string
        }
        Update: {
          client_id?: string
          course?: Json
          tabs?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_access_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: true
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      client_ads: {
        Row: {
          calls_booked: number
          client_id: string
          created_at: string
          id: string
          leads: number
          note: string | null
          revenue: number
          sales: number
          spend: number
          updated_at: string
          week_start: string
        }
        Insert: {
          calls_booked?: number
          client_id: string
          created_at?: string
          id?: string
          leads?: number
          note?: string | null
          revenue?: number
          sales?: number
          spend?: number
          updated_at?: string
          week_start?: string
        }
        Update: {
          calls_booked?: number
          client_id?: string
          created_at?: string
          id?: string
          leads?: number
          note?: string | null
          revenue?: number
          sales?: number
          spend?: number
          updated_at?: string
          week_start?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_ads_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      client_approvals: {
        Row: {
          client_id: string
          created_at: string
          decision: string
          id: string
          note: string | null
          scope: string
        }
        Insert: {
          client_id: string
          created_at?: string
          decision: string
          id?: string
          note?: string | null
          scope?: string
        }
        Update: {
          client_id?: string
          created_at?: string
          decision?: string
          id?: string
          note?: string | null
          scope?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_approvals_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      client_delays: {
        Row: {
          cause: string
          client_id: string
          client_visible: boolean
          created_at: string
          days: number
          id: string
          logged_by: string | null
          occurred_on: string | null
          phase_id: number | null
          reason: string | null
        }
        Insert: {
          cause?: string
          client_id: string
          client_visible?: boolean
          created_at?: string
          days?: number
          id?: string
          logged_by?: string | null
          occurred_on?: string | null
          phase_id?: number | null
          reason?: string | null
        }
        Update: {
          cause?: string
          client_id?: string
          client_visible?: boolean
          created_at?: string
          days?: number
          id?: string
          logged_by?: string | null
          occurred_on?: string | null
          phase_id?: number | null
          reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_delays_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      client_drafts: {
        Row: {
          client_id: string
          content: string
          created_at: string
          generated_by: string | null
          id: string
          kind: string
          title: string
          updated_at: string
        }
        Insert: {
          client_id: string
          content?: string
          created_at?: string
          generated_by?: string | null
          id?: string
          kind?: string
          title?: string
          updated_at?: string
        }
        Update: {
          client_id?: string
          content?: string
          created_at?: string
          generated_by?: string | null
          id?: string
          kind?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_drafts_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      client_invites: {
        Row: {
          claimed: boolean
          client_id: string
          created_at: string
          email: string
          id: string
        }
        Insert: {
          claimed?: boolean
          client_id: string
          created_at?: string
          email: string
          id?: string
        }
        Update: {
          claimed?: boolean
          client_id?: string
          created_at?: string
          email?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_invites_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      client_issues: {
        Row: {
          client_id: string
          created_at: string
          id: string
          owner: string | null
          resolution: string | null
          resolved: boolean
          severity: string
          title: string
        }
        Insert: {
          client_id: string
          created_at?: string
          id?: string
          owner?: string | null
          resolution?: string | null
          resolved?: boolean
          severity?: string
          title: string
        }
        Update: {
          client_id?: string
          created_at?: string
          id?: string
          owner?: string | null
          resolution?: string | null
          resolved?: boolean
          severity?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_issues_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      client_onboarding: {
        Row: {
          agreed: Json
          client_id: string
          completed_at: string | null
          created_at: string
          email: string | null
          full_name: string | null
          phone: string | null
          updated_at: string
        }
        Insert: {
          agreed?: Json
          client_id: string
          completed_at?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          phone?: string | null
          updated_at?: string
        }
        Update: {
          agreed?: Json
          client_id?: string
          completed_at?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          phone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_onboarding_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: true
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      client_pauses: {
        Row: {
          by_client: boolean
          client_id: string
          created_at: string
          id: string
          logged_by: string | null
          paused_on: string
          reason: string | null
          returning_on: string | null
        }
        Insert: {
          by_client?: boolean
          client_id: string
          created_at?: string
          id?: string
          logged_by?: string | null
          paused_on: string
          reason?: string | null
          returning_on?: string | null
        }
        Update: {
          by_client?: boolean
          client_id?: string
          created_at?: string
          id?: string
          logged_by?: string | null
          paused_on?: string
          reason?: string | null
          returning_on?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_pauses_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      client_requests: {
        Row: {
          client_id: string
          created_at: string
          detail: string | null
          id: string
          loom_url: string | null
          status: string
          suggested_owner: string | null
          team_note: string | null
          title: string
        }
        Insert: {
          client_id: string
          created_at?: string
          detail?: string | null
          id?: string
          loom_url?: string | null
          status?: string
          suggested_owner?: string | null
          team_note?: string | null
          title: string
        }
        Update: {
          client_id?: string
          created_at?: string
          detail?: string | null
          id?: string
          loom_url?: string | null
          status?: string
          suggested_owner?: string | null
          team_note?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_requests_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      client_tasks: {
        Row: {
          actual_date: string | null
          client_id: string
          client_visible: boolean
          created_at: string
          date_locked: boolean
          date_note: string | null
          detail: string | null
          expected_date: string | null
          gate_order: number
          id: string
          instructions: string | null
          owner: string | null
          phase_id: number
          priority: string
          sort_order: number
          status: string
          status_note: string | null
          step_key: string | null
          step_kind: string
          step_payload: Json
          submission_note: string | null
          submission_url: string | null
          template_index: number | null
          template_url: string | null
          title: string
          updated_at: string
        }
        Insert: {
          actual_date?: string | null
          client_id: string
          client_visible?: boolean
          created_at?: string
          date_locked?: boolean
          date_note?: string | null
          detail?: string | null
          expected_date?: string | null
          gate_order?: number
          id?: string
          instructions?: string | null
          owner?: string | null
          phase_id?: number
          priority?: string
          sort_order?: number
          status?: string
          status_note?: string | null
          step_key?: string | null
          step_kind?: string
          step_payload?: Json
          submission_note?: string | null
          submission_url?: string | null
          template_index?: number | null
          template_url?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          actual_date?: string | null
          client_id?: string
          client_visible?: boolean
          created_at?: string
          date_locked?: boolean
          date_note?: string | null
          detail?: string | null
          expected_date?: string | null
          gate_order?: number
          id?: string
          instructions?: string | null
          owner?: string | null
          phase_id?: number
          priority?: string
          sort_order?: number
          status?: string
          status_note?: string | null
          step_key?: string | null
          step_kind?: string
          step_payload?: Json
          submission_note?: string | null
          submission_url?: string | null
          template_index?: number | null
          template_url?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_tasks_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      client_uploads: {
        Row: {
          by_client: boolean
          client_id: string
          created_at: string
          id: string
          kind: string
          label: string
          task_id: string | null
          url: string
        }
        Insert: {
          by_client?: boolean
          client_id: string
          created_at?: string
          id?: string
          kind?: string
          label: string
          task_id?: string | null
          url: string
        }
        Update: {
          by_client?: boolean
          client_id?: string
          created_at?: string
          id?: string
          kind?: string
          label?: string
          task_id?: string | null
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_uploads_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_uploads_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "client_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          active: string | null
          ads_delivered: string | null
          ads_sheet_url: string | null
          amalor: string | null
          amalor_client_note: string | null
          amalor_note: string | null
          business_context: string | null
          call_reviews: Json
          cancel_reason: string | null
          cancel_recorded_by: string | null
          case_study: boolean
          commas: string | null
          commas_client_note: string | null
          commas_note: string | null
          content_feedback_url: string | null
          content_plan: boolean
          content_plan_url: string | null
          content_youtube_url: string | null
          copy_ready: boolean
          created_at: string
          custom_tasks: Json
          deleted_at: string | null
          denied_reason: string | null
          difficulty: string | null
          docs: Json
          drive_folder_url: string | null
          email: string | null
          ex_client: boolean
          ex_client_date: string | null
          extension_by: string | null
          extension_date: string | null
          extension_days: number
          extension_note: string | null
          fanbasis: string | null
          fathom_links: Json
          feel_note: string | null
          first_payment_date: string | null
          funnel_url: string | null
          health: string
          id: string
          joined_date: string | null
          journey_start: string | null
          last_sheet_sync: string | null
          last_touchpoint: string | null
          launched: boolean
          launched_date: string | null
          leaving: string | null
          leaving_date_suspect: boolean
          mastermind: string | null
          missing_from_sheet: boolean
          name: string
          niche: string | null
          notes: string | null
          origin: string
          payment: string | null
          phase: number
          phone: string | null
          podia_revoked: boolean
          portal_email: string | null
          portal_status: string
          portal_user_id: string | null
          program: string | null
          renewal: string | null
          renewal_argument: string | null
          renewal_ideas: string | null
          renewal_new_contract: string | null
          renewal_notes: string | null
          renewal_other_notes: string | null
          renewal_owner: string | null
          renewal_talked: string | null
          renewal_team_member: string | null
          renewal_value_leaving: string | null
          results: Json
          roadmap_program: string | null
          sheet_notes: string | null
          sheet_ok_override: boolean
          sheet_override_note: string | null
          sheet_row: number | null
          socials: string | null
          sss: string | null
          sss_client_note: string | null
          sss_note: string | null
          tasks: Json
          tier: string | null
          updated_at: string
          verified_at: string | null
          verified_by: string | null
          vsl_delivered: string | null
          vsl_form: string | null
          vsl_writer: string | null
          web_links: Json
          why_signed_up: string | null
        }
        Insert: {
          active?: string | null
          ads_delivered?: string | null
          ads_sheet_url?: string | null
          amalor?: string | null
          amalor_client_note?: string | null
          amalor_note?: string | null
          business_context?: string | null
          call_reviews?: Json
          cancel_reason?: string | null
          cancel_recorded_by?: string | null
          case_study?: boolean
          commas?: string | null
          commas_client_note?: string | null
          commas_note?: string | null
          content_feedback_url?: string | null
          content_plan?: boolean
          content_plan_url?: string | null
          content_youtube_url?: string | null
          copy_ready?: boolean
          created_at?: string
          custom_tasks?: Json
          deleted_at?: string | null
          denied_reason?: string | null
          difficulty?: string | null
          docs?: Json
          drive_folder_url?: string | null
          email?: string | null
          ex_client?: boolean
          ex_client_date?: string | null
          extension_by?: string | null
          extension_date?: string | null
          extension_days?: number
          extension_note?: string | null
          fanbasis?: string | null
          fathom_links?: Json
          feel_note?: string | null
          first_payment_date?: string | null
          funnel_url?: string | null
          health?: string
          id?: string
          joined_date?: string | null
          journey_start?: string | null
          last_sheet_sync?: string | null
          last_touchpoint?: string | null
          launched?: boolean
          launched_date?: string | null
          leaving?: string | null
          leaving_date_suspect?: boolean
          mastermind?: string | null
          missing_from_sheet?: boolean
          name: string
          niche?: string | null
          notes?: string | null
          origin?: string
          payment?: string | null
          phase?: number
          phone?: string | null
          podia_revoked?: boolean
          portal_email?: string | null
          portal_status?: string
          portal_user_id?: string | null
          program?: string | null
          renewal?: string | null
          renewal_argument?: string | null
          renewal_ideas?: string | null
          renewal_new_contract?: string | null
          renewal_notes?: string | null
          renewal_other_notes?: string | null
          renewal_owner?: string | null
          renewal_talked?: string | null
          renewal_team_member?: string | null
          renewal_value_leaving?: string | null
          results?: Json
          roadmap_program?: string | null
          sheet_notes?: string | null
          sheet_ok_override?: boolean
          sheet_override_note?: string | null
          sheet_row?: number | null
          socials?: string | null
          sss?: string | null
          sss_client_note?: string | null
          sss_note?: string | null
          tasks?: Json
          tier?: string | null
          updated_at?: string
          verified_at?: string | null
          verified_by?: string | null
          vsl_delivered?: string | null
          vsl_form?: string | null
          vsl_writer?: string | null
          web_links?: Json
          why_signed_up?: string | null
        }
        Update: {
          active?: string | null
          ads_delivered?: string | null
          ads_sheet_url?: string | null
          amalor?: string | null
          amalor_client_note?: string | null
          amalor_note?: string | null
          business_context?: string | null
          call_reviews?: Json
          cancel_reason?: string | null
          cancel_recorded_by?: string | null
          case_study?: boolean
          commas?: string | null
          commas_client_note?: string | null
          commas_note?: string | null
          content_feedback_url?: string | null
          content_plan?: boolean
          content_plan_url?: string | null
          content_youtube_url?: string | null
          copy_ready?: boolean
          created_at?: string
          custom_tasks?: Json
          deleted_at?: string | null
          denied_reason?: string | null
          difficulty?: string | null
          docs?: Json
          drive_folder_url?: string | null
          email?: string | null
          ex_client?: boolean
          ex_client_date?: string | null
          extension_by?: string | null
          extension_date?: string | null
          extension_days?: number
          extension_note?: string | null
          fanbasis?: string | null
          fathom_links?: Json
          feel_note?: string | null
          first_payment_date?: string | null
          funnel_url?: string | null
          health?: string
          id?: string
          joined_date?: string | null
          journey_start?: string | null
          last_sheet_sync?: string | null
          last_touchpoint?: string | null
          launched?: boolean
          launched_date?: string | null
          leaving?: string | null
          leaving_date_suspect?: boolean
          mastermind?: string | null
          missing_from_sheet?: boolean
          name?: string
          niche?: string | null
          notes?: string | null
          origin?: string
          payment?: string | null
          phase?: number
          phone?: string | null
          podia_revoked?: boolean
          portal_email?: string | null
          portal_status?: string
          portal_user_id?: string | null
          program?: string | null
          renewal?: string | null
          renewal_argument?: string | null
          renewal_ideas?: string | null
          renewal_new_contract?: string | null
          renewal_notes?: string | null
          renewal_other_notes?: string | null
          renewal_owner?: string | null
          renewal_talked?: string | null
          renewal_team_member?: string | null
          renewal_value_leaving?: string | null
          results?: Json
          roadmap_program?: string | null
          sheet_notes?: string | null
          sheet_ok_override?: boolean
          sheet_override_note?: string | null
          sheet_row?: number | null
          socials?: string | null
          sss?: string | null
          sss_client_note?: string | null
          sss_note?: string | null
          tasks?: Json
          tier?: string | null
          updated_at?: string
          verified_at?: string | null
          verified_by?: string | null
          vsl_delivered?: string | null
          vsl_form?: string | null
          vsl_writer?: string | null
          web_links?: Json
          why_signed_up?: string | null
        }
        Relationships: []
      }
      course_items: {
        Row: {
          created_at: string
          global_order: number
          id: string
          kind: string
          module_id: string
          needed: boolean
          note: string | null
          sort_order: number
          title: string
          updated_at: string
          url: string | null
        }
        Insert: {
          created_at?: string
          global_order?: number
          id?: string
          kind?: string
          module_id: string
          needed?: boolean
          note?: string | null
          sort_order?: number
          title: string
          updated_at?: string
          url?: string | null
        }
        Update: {
          created_at?: string
          global_order?: number
          id?: string
          kind?: string
          module_id?: string
          needed?: boolean
          note?: string | null
          sort_order?: number
          title?: string
          updated_at?: string
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "course_items_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "course_modules"
            referencedColumns: ["id"]
          },
        ]
      }
      course_modules: {
        Row: {
          created_at: string
          id: string
          section_id: string
          sort_order: number
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          section_id: string
          sort_order?: number
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          section_id?: string
          sort_order?: number
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_modules_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "course_sections"
            referencedColumns: ["id"]
          },
        ]
      }
      course_progress: {
        Row: {
          client_id: string
          done_at: string
          id: string
          item_id: string
        }
        Insert: {
          client_id: string
          done_at?: string
          id?: string
          item_id: string
        }
        Update: {
          client_id?: string
          done_at?: string
          id?: string
          item_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_progress_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_progress_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "course_items"
            referencedColumns: ["id"]
          },
        ]
      }
      course_sections: {
        Row: {
          created_at: string
          id: string
          sort_order: number
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          sort_order?: number
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          sort_order?: number
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      delivery_log: {
        Row: {
          client_id: string
          client_visible: boolean
          id: string
          label: string
          on_time: boolean
          sent_at: string
          task_id: string | null
        }
        Insert: {
          client_id: string
          client_visible?: boolean
          id?: string
          label: string
          on_time?: boolean
          sent_at?: string
          task_id?: string | null
        }
        Update: {
          client_id?: string
          client_visible?: boolean
          id?: string
          label?: string
          on_time?: boolean
          sent_at?: string
          task_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "delivery_log_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_log_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "client_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      global_todos: {
        Row: {
          client_id: string | null
          client_name: string | null
          created_at: string
          detail: string | null
          done: boolean
          done_at: string | null
          done_by: string | null
          due_date: string | null
          id: string
          issued_by: string | null
          owner: string | null
          priority: string
          source: string
          text: string
        }
        Insert: {
          client_id?: string | null
          client_name?: string | null
          created_at?: string
          detail?: string | null
          done?: boolean
          done_at?: string | null
          done_by?: string | null
          due_date?: string | null
          id?: string
          issued_by?: string | null
          owner?: string | null
          priority?: string
          source?: string
          text: string
        }
        Update: {
          client_id?: string | null
          client_name?: string | null
          created_at?: string
          detail?: string | null
          done?: boolean
          done_at?: string | null
          done_by?: string | null
          due_date?: string | null
          id?: string
          issued_by?: string | null
          owner?: string | null
          priority?: string
          source?: string
          text?: string
        }
        Relationships: [
          {
            foreignKeyName: "global_todos_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      group_calls: {
        Row: {
          created_at: string
          day: string | null
          host: string | null
          id: string
          join_url: string | null
          note: string | null
          sort_order: number
          temp_active: boolean
          temp_day: string | null
          temp_note: string | null
          temp_time: string | null
          time: string | null
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          day?: string | null
          host?: string | null
          id?: string
          join_url?: string | null
          note?: string | null
          sort_order?: number
          temp_active?: boolean
          temp_day?: string | null
          temp_note?: string | null
          temp_time?: string | null
          time?: string | null
          title?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          day?: string | null
          host?: string | null
          id?: string
          join_url?: string | null
          note?: string | null
          sort_order?: number
          temp_active?: boolean
          temp_day?: string | null
          temp_note?: string | null
          temp_time?: string | null
          time?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      notification_reads: {
        Row: {
          notification_id: string
          read_at: string
          user_id: string
        }
        Insert: {
          notification_id: string
          read_at?: string
          user_id: string
        }
        Update: {
          notification_id?: string
          read_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_reads_notification_id_fkey"
            columns: ["notification_id"]
            isOneToOne: false
            referencedRelation: "notifications"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          audience: string
          body: string | null
          client_id: string | null
          created_at: string
          id: string
          kind: string
          owner: string | null
          title: string
        }
        Insert: {
          audience?: string
          body?: string | null
          client_id?: string | null
          created_at?: string
          id?: string
          kind?: string
          owner?: string | null
          title: string
        }
        Update: {
          audience?: string
          body?: string | null
          client_id?: string | null
          created_at?: string
          id?: string
          kind?: string
          owner?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      onboarding_cases: {
        Row: {
          agreement_kind: string
          agreement_note: string | null
          agreement_sent_at: string | null
          agreement_signed_at: string | null
          client_id: string | null
          closer: string | null
          created_at: string
          deal_value: string | null
          email: string | null
          id: string
          name: string
          notes: string | null
          paid_at: string
          portal_active_at: string | null
          portal_invited_at: string | null
          program: string | null
          roadmap_at: string | null
          sheet_row: number | null
          source: string
          stage: string
          updated_at: string
          whatsapp: boolean
        }
        Insert: {
          agreement_kind?: string
          agreement_note?: string | null
          agreement_sent_at?: string | null
          agreement_signed_at?: string | null
          client_id?: string | null
          closer?: string | null
          created_at?: string
          deal_value?: string | null
          email?: string | null
          id?: string
          name: string
          notes?: string | null
          paid_at?: string
          portal_active_at?: string | null
          portal_invited_at?: string | null
          program?: string | null
          roadmap_at?: string | null
          sheet_row?: number | null
          source?: string
          stage?: string
          updated_at?: string
          whatsapp?: boolean
        }
        Update: {
          agreement_kind?: string
          agreement_note?: string | null
          agreement_sent_at?: string | null
          agreement_signed_at?: string | null
          client_id?: string | null
          closer?: string | null
          created_at?: string
          deal_value?: string | null
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          paid_at?: string
          portal_active_at?: string | null
          portal_invited_at?: string | null
          program?: string | null
          roadmap_at?: string | null
          sheet_row?: number | null
          source?: string
          stage?: string
          updated_at?: string
          whatsapp?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "onboarding_cases_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      onboarding_docs: {
        Row: {
          created_at: string
          description: string | null
          hidden: boolean
          id: string
          program: string
          sort_order: number
          title: string
          updated_at: string
          url: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          hidden?: boolean
          id?: string
          program: string
          sort_order?: number
          title: string
          updated_at?: string
          url?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          hidden?: boolean
          id?: string
          program?: string
          sort_order?: number
          title?: string
          updated_at?: string
          url?: string | null
        }
        Relationships: []
      }
      onboarding_events: {
        Row: {
          actor: string | null
          case_id: string
          created_at: string
          detail: string | null
          id: string
          stage: string
        }
        Insert: {
          actor?: string | null
          case_id: string
          created_at?: string
          detail?: string | null
          id?: string
          stage: string
        }
        Update: {
          actor?: string | null
          case_id?: string
          created_at?: string
          detail?: string | null
          id?: string
          stage?: string
        }
        Relationships: [
          {
            foreignKeyName: "onboarding_events_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "onboarding_cases"
            referencedColumns: ["id"]
          },
        ]
      }
      phase_moves: {
        Row: {
          client_id: string
          client_name: string | null
          created_at: string
          from_phase: number | null
          id: string
          to_phase: number
        }
        Insert: {
          client_id: string
          client_name?: string | null
          created_at?: string
          from_phase?: number | null
          id?: string
          to_phase: number
        }
        Update: {
          client_id?: string
          client_name?: string | null
          created_at?: string
          from_phase?: number | null
          id?: string
          to_phase?: number
        }
        Relationships: [
          {
            foreignKeyName: "phase_moves_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      phase_tasks: {
        Row: {
          label: string
          name: string
          phase_id: number
          tasks: Json
        }
        Insert: {
          label: string
          name: string
          phase_id: number
          tasks?: Json
        }
        Update: {
          label?: string
          name?: string
          phase_id?: number
          tasks?: Json
        }
        Relationships: []
      }
      sheet_pending: {
        Row: {
          changes: Json
          client_id: string | null
          created_at: string
          decided_at: string | null
          decided_by: string | null
          fields: Json
          id: string
          kind: string
          name: string
          parked_until: string | null
          sheet_row: number | null
          status: string
          updated_at: string
        }
        Insert: {
          changes?: Json
          client_id?: string | null
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          fields?: Json
          id?: string
          kind?: string
          name: string
          parked_until?: string | null
          sheet_row?: number | null
          status?: string
          updated_at?: string
        }
        Update: {
          changes?: Json
          client_id?: string | null
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          fields?: Json
          id?: string
          kind?: string
          name?: string
          parked_until?: string | null
          sheet_row?: number | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sheet_pending_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      strategy_versions: {
        Row: {
          changed_by: string | null
          client_id: string
          content: string | null
          created_at: string
          deliverables: string | null
          id: string
          price_point: string | null
          version: number
        }
        Insert: {
          changed_by?: string | null
          client_id: string
          content?: string | null
          created_at?: string
          deliverables?: string | null
          id?: string
          price_point?: string | null
          version?: number
        }
        Update: {
          changed_by?: string | null
          client_id?: string
          content?: string | null
          created_at?: string
          deliverables?: string | null
          id?: string
          price_point?: string | null
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "strategy_versions_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      team_links: {
        Row: {
          category: string
          email: string | null
          id: string
          link: string | null
          name: string | null
          phone: string | null
          role: string | null
          sort_order: number
        }
        Insert: {
          category?: string
          email?: string | null
          id?: string
          link?: string | null
          name?: string | null
          phone?: string | null
          role?: string | null
          sort_order?: number
        }
        Update: {
          category?: string
          email?: string | null
          id?: string
          link?: string | null
          name?: string | null
          phone?: string | null
          role?: string | null
          sort_order?: number
        }
        Relationships: []
      }
      team_members: {
        Row: {
          colour: string
          created_at: string
          display_name: string | null
          email: string | null
          id: string
          initials: string | null
          role: string
          user_id: string | null
        }
        Insert: {
          colour?: string
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
          initials?: string | null
          role?: string
          user_id?: string | null
        }
        Update: {
          colour?: string
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
          initials?: string | null
          role?: string
          user_id?: string | null
        }
        Relationships: []
      }
      user_prefs: {
        Row: {
          last_seen_at: string
          updated_at: string
          user_id: string
          widget_order: Json
          widgets: Json
        }
        Insert: {
          last_seen_at?: string
          updated_at?: string
          user_id: string
          widget_order?: Json
          widgets?: Json
        }
        Update: {
          last_seen_at?: string
          updated_at?: string
          user_id?: string
          widget_order?: Json
          widgets?: Json
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_team: { Args: { _user_id: string }; Returns: boolean }
      my_client_id: { Args: never; Returns: string }
    }
    Enums: {
      app_role: "admin" | "member"
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
  public: {
    Enums: {
      app_role: ["admin", "member"],
    },
  },
} as const
