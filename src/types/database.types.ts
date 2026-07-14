/**
 * Supabase database types for CanGrants.
 * Regenerate after schema changes via Supabase MCP `generate_typescript_types`.
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.5";
  };
  public: {
    Tables: {
      applications: {
        Row: {
          created_at: string;
          grant_id: number;
          id: number;
          notes: string | null;
          status: Database["public"]["Enums"]["application_status"];
          updated_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          grant_id: number;
          id?: never;
          notes?: string | null;
          status?: Database["public"]["Enums"]["application_status"];
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          grant_id?: number;
          id?: never;
          notes?: string | null;
          status?: Database["public"]["Enums"]["application_status"];
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "applications_grant_id_fkey";
            columns: ["grant_id"];
            isOneToOne: false;
            referencedRelation: "grants";
            referencedColumns: ["id"];
          },
        ];
      };
      grants: {
        Row: {
          amount: string | null;
          close_date: string | null;
          close_label: string;
          created_at: string;
          description: string | null;
          discipline: string[];
          eligibility: string | null;
          id: number;
          is_active: boolean;
          location: string;
          name: string;
          open_date: string | null;
          org: string;
          tags: string[];
          updated_at: string;
          url: string;
        };
        Insert: {
          amount?: string | null;
          close_date?: string | null;
          close_label?: string;
          created_at?: string;
          description?: string | null;
          discipline?: string[];
          eligibility?: string | null;
          id?: never;
          is_active?: boolean;
          location?: string;
          name: string;
          open_date?: string | null;
          org: string;
          tags?: string[];
          updated_at?: string;
          url: string;
        };
        Update: {
          amount?: string | null;
          close_date?: string | null;
          close_label?: string;
          created_at?: string;
          description?: string | null;
          discipline?: string[];
          eligibility?: string | null;
          id?: never;
          is_active?: boolean;
          location?: string;
          name?: string;
          open_date?: string | null;
          org?: string;
          tags?: string[];
          updated_at?: string;
          url?: string;
        };
        Relationships: [];
      };
      newsletter_signups: {
        Row: {
          created_at: string;
          email: string;
          id: number;
          name: string | null;
          source: string | null;
        };
        Insert: {
          created_at?: string;
          email: string;
          id?: never;
          name?: string | null;
          source?: string | null;
        };
        Update: {
          created_at?: string;
          email?: string;
          id?: never;
          name?: string | null;
          source?: string | null;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          address: string | null;
          career: string | null;
          city: string | null;
          created_at: string;
          discipline: string | null;
          email: string;
          id: string;
          name: string;
          postal: string | null;
          province: string | null;
          updated_at: string;
        };
        Insert: {
          address?: string | null;
          career?: string | null;
          city?: string | null;
          created_at?: string;
          discipline?: string | null;
          email: string;
          id: string;
          name: string;
          postal?: string | null;
          province?: string | null;
          updated_at?: string;
        };
        Update: {
          address?: string | null;
          career?: string | null;
          city?: string | null;
          created_at?: string;
          discipline?: string | null;
          email?: string;
          id?: string;
          name?: string;
          postal?: string | null;
          province?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      saved_grants: {
        Row: {
          grant_id: number;
          saved_at: string;
          user_id: string;
        };
        Insert: {
          grant_id: number;
          saved_at?: string;
          user_id: string;
        };
        Update: {
          grant_id?: number;
          saved_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "saved_grants_grant_id_fkey";
            columns: ["grant_id"];
            isOneToOne: false;
            referencedRelation: "grants";
            referencedColumns: ["id"];
          },
        ];
      };
      wishlist_signups: {
        Row: {
          city: string | null;
          country: string | null;
          created_at: string;
          email: string;
          id: number;
          name: string;
          source: string | null;
        };
        Insert: {
          city?: string | null;
          country?: string | null;
          created_at?: string;
          email: string;
          id?: never;
          name: string;
          source?: string | null;
        };
        Update: {
          city?: string | null;
          country?: string | null;
          created_at?: string;
          email?: string;
          id?: never;
          name?: string;
          source?: string | null;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      application_status: "not_started" | "in_progress" | "submitted";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

export type ApplicationStatus = Database["public"]["Enums"]["application_status"];
export type GrantRow = Database["public"]["Tables"]["grants"]["Row"];
export type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];
