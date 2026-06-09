/**
 * Supabase database types for CanGrants.
 * Matches supabase/migrations/00000000000000_cangrants_schema.sql
 * Regenerate after schema changes via Supabase MCP `generate_typescript_types`.
 */

export type ApplicationStatus = 'not_started' | 'in_progress' | 'submitted';

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          name: string;
          email: string;
          province: string | null;
          discipline: string | null;
          career: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          name: string;
          email: string;
          province?: string | null;
          discipline?: string | null;
          career?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['profiles']['Insert']>;
      };
      grants: {
        Row: {
          id: number;
          name: string;
          org: string;
          open_date: string | null;
          close_date: string | null;
          close_label: string;
          url: string;
          discipline: string[];
          location: string;
          amount: string | null;
          tags: string[];
          eligibility: string | null;
          description: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: number;
          name: string;
          org: string;
          open_date?: string | null;
          close_date?: string | null;
          close_label?: string;
          url: string;
          discipline?: string[];
          location?: string;
          amount?: string | null;
          tags?: string[];
          eligibility?: string | null;
          description?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['grants']['Insert']>;
      };
      saved_grants: {
        Row: {
          user_id: string;
          grant_id: number;
          saved_at: string;
        };
        Insert: {
          user_id: string;
          grant_id: number;
          saved_at?: string;
        };
        Update: Partial<Database['public']['Tables']['saved_grants']['Insert']>;
      };
      applications: {
        Row: {
          id: number;
          user_id: string;
          grant_id: number;
          status: ApplicationStatus;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: number;
          user_id: string;
          grant_id: number;
          status?: ApplicationStatus;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['applications']['Insert']>;
      };
      wishlist_signups: {
        Row: {
          id: number;
          name: string;
          email: string;
          city: string | null;
          country: string | null;
          created_at: string;
        };
        Insert: {
          id?: number;
          name: string;
          email: string;
          city?: string | null;
          country?: string | null;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['wishlist_signups']['Insert']>;
      };
    };
    Enums: {
      application_status: ApplicationStatus;
    };
  };
}

export type GrantRow = Database['public']['Tables']['grants']['Row'];
export type ProfileRow = Database['public']['Tables']['profiles']['Row'];
