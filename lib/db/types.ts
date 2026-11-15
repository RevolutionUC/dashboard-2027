// Database types for supabase-js. Keep in sync with supabase/migrations.
// Regenerate with: npx supabase gen types typescript --db-url "$DATABASE_URL" > lib/db/types.ts

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      user: {
        Row: {
          id: string;
          name: string;
          email: string;
          emailVerified: boolean;
          image: string | null;
          createdAt: string;
          updatedAt: string;
          banned: boolean | null;
          banReason: string | null;
          banExpires: string | null;
        };
        Insert: {
          id: string;
          name: string;
          email: string;
          emailVerified: boolean;
          image?: string | null;
          createdAt?: string;
          updatedAt?: string;
          banned?: boolean | null;
          banReason?: string | null;
          banExpires?: string | null;
        };
        Update: {
          id?: string;
          name?: string;
          email?: string;
          emailVerified?: boolean;
          image?: string | null;
          createdAt?: string;
          updatedAt?: string;
          banned?: boolean | null;
          banReason?: string | null;
          banExpires?: string | null;
        };
        Relationships: [];
      };
      session: {
        Row: {
          id: string;
          expiresAt: string;
          token: string;
          createdAt: string;
          updatedAt: string;
          ipAddress: string | null;
          userAgent: string | null;
          userId: string;
          impersonatedBy: string | null;
        };
        Insert: {
          id: string;
          expiresAt: string;
          token: string;
          createdAt?: string;
          updatedAt: string;
          ipAddress?: string | null;
          userAgent?: string | null;
          userId: string;
          impersonatedBy?: string | null;
        };
        Update: {
          id?: string;
          expiresAt?: string;
          token?: string;
          createdAt?: string;
          updatedAt?: string;
          ipAddress?: string | null;
          userAgent?: string | null;
          userId?: string;
          impersonatedBy?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "session_userId_user_id_fk";
            columns: ["userId"];
            isOneToOne: false;
            referencedRelation: "user";
            referencedColumns: ["id"];
          },
        ];
      };
      account: {
        Row: {
          id: string;
          accountId: string;
          providerId: string;
          userId: string;
          accessToken: string | null;
          refreshToken: string | null;
          idToken: string | null;
          accessTokenExpiresAt: string | null;
          refreshTokenExpiresAt: string | null;
          scope: string | null;
          password: string | null;
          createdAt: string;
          updatedAt: string;
        };
        Insert: {
          id: string;
          accountId: string;
          providerId: string;
          userId: string;
          accessToken?: string | null;
          refreshToken?: string | null;
          idToken?: string | null;
          accessTokenExpiresAt?: string | null;
          refreshTokenExpiresAt?: string | null;
          scope?: string | null;
          password?: string | null;
          createdAt?: string;
          updatedAt: string;
        };
        Update: {
          id?: string;
          accountId?: string;
          providerId?: string;
          userId?: string;
          accessToken?: string | null;
          refreshToken?: string | null;
          idToken?: string | null;
          accessTokenExpiresAt?: string | null;
          refreshTokenExpiresAt?: string | null;
          scope?: string | null;
          password?: string | null;
          createdAt?: string;
          updatedAt?: string;
        };
        Relationships: [
          {
            foreignKeyName: "account_userId_user_id_fk";
            columns: ["userId"];
            isOneToOne: false;
            referencedRelation: "user";
            referencedColumns: ["id"];
          },
        ];
      };
      verification: {
        Row: {
          id: string;
          identifier: string;
          value: string;
          expiresAt: string;
          createdAt: string;
          updatedAt: string;
        };
        Insert: {
          id: string;
          identifier: string;
          value: string;
          expiresAt: string;
          createdAt?: string;
          updatedAt?: string;
        };
        Update: {
          id?: string;
          identifier?: string;
          value?: string;
          expiresAt?: string;
          createdAt?: string;
          updatedAt?: string;
        };
        Relationships: [];
      };
      participants: {
        Row: {
          user_id: string;
          first_name: string;
          last_name: string;
          email: string;
          phone: string;
          age: number;
          gender: string;
          school: string;
          level_of_study: string;
          country: string;
          major: string;
          diet_restrictions: string | null;
          linkedin_url: string | null;
          github_url: string | null;
          shirt_size: string;
          hackathons: string;
          race_ethnicity: string[] | null;
          referral_source: string[] | null;
          resume_url: string | null;
          qr_base64: string | null;
          status: Database["public"]["Enums"]["participant_status"];
          checked_in: boolean | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          user_id?: string;
          first_name: string;
          last_name: string;
          email: string;
          phone: string;
          age: number;
          gender: string;
          school: string;
          level_of_study: string;
          country: string;
          major: string;
          diet_restrictions?: string | null;
          linkedin_url?: string | null;
          github_url?: string | null;
          shirt_size: string;
          hackathons: string;
          race_ethnicity?: string[] | null;
          referral_source?: string[] | null;
          resume_url?: string | null;
          qr_base64?: string | null;
          status?: Database["public"]["Enums"]["participant_status"];
          checked_in?: boolean | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          user_id?: string;
          first_name?: string;
          last_name?: string;
          email?: string;
          phone?: string;
          age?: number;
          gender?: string;
          school?: string;
          level_of_study?: string;
          country?: string;
          major?: string;
          diet_restrictions?: string | null;
          linkedin_url?: string | null;
          github_url?: string | null;
          shirt_size?: string;
          hackathons?: string;
          race_ethnicity?: string[] | null;
          referral_source?: string[] | null;
          resume_url?: string | null;
          qr_base64?: string | null;
          status?: Database["public"]["Enums"]["participant_status"];
          checked_in?: boolean | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      events: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          event_type: string;
          start_time: string | null;
          end_time: string | null;
          location: string | null;
          capacity: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
          event_type: string;
          start_time?: string | null;
          end_time?: string | null;
          location?: string | null;
          capacity?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string | null;
          event_type?: string;
          start_time?: string | null;
          end_time?: string | null;
          location?: string | null;
          capacity?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      day_of_schedule: {
        Row: {
          id: string;
          name: string;
          start_time: string | null;
          end_time: string | null;
          location: string | null;
          capacity: number | null;
          visibility: Database["public"]["Enums"]["schedule_visibility"];
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          start_time?: string | null;
          end_time?: string | null;
          location?: string | null;
          capacity?: number | null;
          visibility?: Database["public"]["Enums"]["schedule_visibility"];
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          start_time?: string | null;
          end_time?: string | null;
          location?: string | null;
          capacity?: number | null;
          visibility?: Database["public"]["Enums"]["schedule_visibility"];
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "day_of_schedule_created_by_user_id_fk";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "user";
            referencedColumns: ["id"];
          },
        ];
      };
      event_registrations: {
        Row: {
          id: string;
          participant_id: string;
          event_id: string;
          registered_at: string;
        };
        Insert: {
          id?: string;
          participant_id: string;
          event_id: string;
          registered_at?: string;
        };
        Update: {
          id?: string;
          participant_id?: string;
          event_id?: string;
          registered_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "event_registrations_participant_id_participants_user_id_fk";
            columns: ["participant_id"];
            isOneToOne: false;
            referencedRelation: "participants";
            referencedColumns: ["user_id"];
          },
          {
            foreignKeyName: "event_registrations_event_id_events_id_fk";
            columns: ["event_id"];
            isOneToOne: false;
            referencedRelation: "events";
            referencedColumns: ["id"];
          },
        ];
      };
      access_requests: {
        Row: {
          id: string;
          user_id: string;
          email: string;
          name: string;
          image: string | null;
          status: Database["public"]["Enums"]["access_request_status"];
          role: string | null;
          requested_at: string;
          reviewed_at: string | null;
          reviewed_by: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          email: string;
          name: string;
          image?: string | null;
          status?: Database["public"]["Enums"]["access_request_status"];
          role?: string | null;
          requested_at?: string;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          email?: string;
          name?: string;
          image?: string | null;
          status?: Database["public"]["Enums"]["access_request_status"];
          role?: string | null;
          requested_at?: string;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "access_requests_user_id_user_id_fk";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "user";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "access_requests_reviewed_by_user_id_fk";
            columns: ["reviewed_by"];
            isOneToOne: false;
            referencedRelation: "user";
            referencedColumns: ["id"];
          },
        ];
      };
      confirm_tokens: {
        Row: {
          id: string;
          token: string;
          participant_id: string;
          email: string;
          expires_at: string;
          used_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          token: string;
          participant_id: string;
          email: string;
          expires_at: string;
          used_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          token?: string;
          participant_id?: string;
          email?: string;
          expires_at?: string;
          used_at?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "confirm_tokens_participant_id_participants_user_id_fk";
            columns: ["participant_id"];
            isOneToOne: false;
            referencedRelation: "participants";
            referencedColumns: ["user_id"];
          },
        ];
      };
      audit_log: {
        Row: {
          id: string;
          session_id: string | null;
          user_id: string;
          name: string;
          email: string;
          action: Database["public"]["Enums"]["actions"];
          target_id: string | null;
          details: Json | null;
          event_time: string;
        };
        Insert: {
          id?: string;
          session_id?: string | null;
          user_id: string;
          name: string;
          email: string;
          action: Database["public"]["Enums"]["actions"];
          target_id?: string | null;
          details?: Json | null;
          event_time?: string;
        };
        Update: {
          id?: string;
          session_id?: string | null;
          user_id?: string;
          name?: string;
          email?: string;
          action?: Database["public"]["Enums"]["actions"];
          target_id?: string | null;
          details?: Json | null;
          event_time?: string;
        };
        Relationships: [
          {
            foreignKeyName: "audit_log_session_id_session_id_fk";
            columns: ["session_id"];
            isOneToOne: false;
            referencedRelation: "session";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "audit_log_user_id_user_id_fk";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "user";
            referencedColumns: ["id"];
          },
        ];
      };
      categories: {
        Row: {
          id: string;
          name: string;
          type: Database["public"]["Enums"]["category_type"];
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          name: string;
          type?: Database["public"]["Enums"]["category_type"];
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          type?: Database["public"]["Enums"]["category_type"];
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      judge_groups: {
        Row: {
          id: number;
          name: string;
          category_id: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: number;
          name: string;
          category_id: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: number;
          name?: string;
          category_id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "judge_groups_category_id_categories_id_fk";
            columns: ["category_id"];
            isOneToOne: false;
            referencedRelation: "categories";
            referencedColumns: ["id"];
          },
        ];
      };
      judges: {
        Row: {
          id: string;
          name: string;
          email: string;
          category_id: string;
          judge_group_id: number | null;
          judging_phase: Database["public"]["Enums"]["judging_phase"];
          is_checkedin: boolean | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          email: string;
          category_id: string;
          judge_group_id?: number | null;
          judging_phase?: Database["public"]["Enums"]["judging_phase"];
          is_checkedin?: boolean | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          email?: string;
          category_id?: string;
          judge_group_id?: number | null;
          judging_phase?: Database["public"]["Enums"]["judging_phase"];
          is_checkedin?: boolean | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "judges_category_id_categories_id_fk";
            columns: ["category_id"];
            isOneToOne: false;
            referencedRelation: "categories";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "judges_judge_group_id_judge_groups_id_fk";
            columns: ["judge_group_id"];
            isOneToOne: false;
            referencedRelation: "judge_groups";
            referencedColumns: ["id"];
          },
        ];
      };
      projects: {
        Row: {
          id: string;
          name: string;
          status: Database["public"]["Enums"]["project_status"];
          url: string | null;
          location: string;
          location2: string;
          disqualify_reason: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          status?: Database["public"]["Enums"]["project_status"];
          url?: string | null;
          location: string;
          location2: string;
          disqualify_reason?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          status?: Database["public"]["Enums"]["project_status"];
          url?: string | null;
          location?: string;
          location2?: string;
          disqualify_reason?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      submissions: {
        Row: {
          project_id: string;
          category_id: string;
          created_at: string;
        };
        Insert: {
          project_id: string;
          category_id: string;
          created_at?: string;
        };
        Update: {
          project_id?: string;
          category_id?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "submissions_project_id_projects_id_fk";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "submissions_category_id_categories_id_fk";
            columns: ["category_id"];
            isOneToOne: false;
            referencedRelation: "categories";
            referencedColumns: ["id"];
          },
        ];
      };
      assignments: {
        Row: {
          project_id: string;
          judge_group_id: number;
          created_at: string;
        };
        Insert: {
          project_id: string;
          judge_group_id: number;
          created_at?: string;
        };
        Update: {
          project_id?: string;
          judge_group_id?: number;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "assignments_project_id_projects_id_fk";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "assignments_judge_group_id_judge_groups_id_fk";
            columns: ["judge_group_id"];
            isOneToOne: false;
            referencedRelation: "judge_groups";
            referencedColumns: ["id"];
          },
        ];
      };
      user_roles: {
        Row: {
          id: number;
          user_id: string;
          role: Database["public"]["Enums"]["app_role"];
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: number;
          user_id: string;
          role: Database["public"]["Enums"]["app_role"];
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: number;
          user_id?: string;
          role?: Database["public"]["Enums"]["app_role"];
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      evaluations: {
        Row: {
          project_id: string;
          judge_id: string;
          category_id: string;
          scores: number[] | null;
          category_relevance: number;
          category_borda_score: number | null;
          note: string | null;
        };
        Insert: {
          project_id: string;
          judge_id: string;
          category_id: string;
          scores?: number[] | null;
          category_relevance?: number;
          category_borda_score?: number | null;
          note?: string | null;
        };
        Update: {
          project_id?: string;
          judge_id?: string;
          category_id?: string;
          scores?: number[] | null;
          category_relevance?: number;
          category_borda_score?: number | null;
          note?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "evaluations_project_id_projects_id_fk";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "evaluations_judge_id_judges_id_fk";
            columns: ["judge_id"];
            isOneToOne: false;
            referencedRelation: "judges";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "evaluations_category_id_categories_id_fk";
            columns: ["category_id"];
            isOneToOne: false;
            referencedRelation: "categories";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: { [_ in never]: never };
    Functions: {
      replace_assignments: { Args: { p_assignments: Json; p_evaluations: Json }; Returns: undefined };
      clear_assignments: { Args: Record<PropertyKey, never>; Returns: undefined };
      replace_projects: { Args: { p_projects: Json }; Returns: number };
      disqualify_projects: { Args: { p_updates: Json }; Returns: undefined };
      replace_judge_groups: { Args: { p_groups: Json }; Returns: number };
      custom_access_token_hook: { Args: { event: Json }; Returns: Json };
    };
    Enums: {
      access_request_status: "pending" | "approved" | "denied";
      participant_status: "REGISTERED" | "CONFIRMED" | "WAITLISTED" | "CHECKED_IN";
      schedule_visibility: "internal" | "public";
      actions: "SIGNED_IN" | "CHECKIN" | "WORKSHOP_CHECKIN" | "FOOD_CHECKIN" | "UPDATE_STATUS" | "CREATE_EVENT" | "UPDATE_EVENT" | "DELETE_EVENT" | "CREATE_SCHEDULE" | "UPDATE_SCHEDULE" | "DELETE_SCHEDULE" | "APPROVE_USER" | "DENY_USER" | "REVOKE_USER";
      judging_phase: "scoring" | "finalized";
      category_type: "Sponsor" | "Inhouse" | "General" | "MLH";
      project_status: "created" | "disqualified";
      app_role: "admin" | "lead" | "organizer";
    };
    CompositeTypes: { [_ in never]: never };
  };
};

type PublicSchema = Database["public"];
export type Tables<T extends keyof PublicSchema["Tables"]> = PublicSchema["Tables"][T]["Row"];
export type TablesInsert<T extends keyof PublicSchema["Tables"]> = PublicSchema["Tables"][T]["Insert"];
export type TablesUpdate<T extends keyof PublicSchema["Tables"]> = PublicSchema["Tables"][T]["Update"];
export type Enums<T extends keyof PublicSchema["Enums"]> = PublicSchema["Enums"][T];
