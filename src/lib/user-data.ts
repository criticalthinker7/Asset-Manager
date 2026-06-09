import { supabase } from "@/lib/supabase";
import type { ApplicationStatus } from "@/types/database.types";

export type UiApplicationStatus = "Not Started" | "In Progress" | "Submitted";

export interface UserApplication {
  id: number;
  dbId: number;
  status: UiApplicationStatus;
  notes: string;
}

const STATUS_TO_DB: Record<UiApplicationStatus, ApplicationStatus> = {
  "Not Started": "not_started",
  "In Progress": "in_progress",
  Submitted: "submitted",
};

const STATUS_FROM_DB: Record<ApplicationStatus, UiApplicationStatus> = {
  not_started: "Not Started",
  in_progress: "In Progress",
  submitted: "Submitted",
};

export async function fetchSavedGrantIds(userId: string): Promise<Set<number>> {
  if (!supabase) return new Set();

  const { data, error } = await supabase
    .from("saved_grants")
    .select("grant_id")
    .eq("user_id", userId);

  if (error || !data) {
    console.warn("Failed to load saved grants:", error?.message);
    return new Set();
  }

  return new Set(data.map((row) => row.grant_id));
}

export async function saveGrant(userId: string, grantId: number): Promise<void> {
  if (!supabase) throw new Error("Supabase is not configured");

  const { error } = await supabase.from("saved_grants").insert({ user_id: userId, grant_id: grantId });
  if (error) throw error;
}

export async function unsaveGrant(userId: string, grantId: number): Promise<void> {
  if (!supabase) throw new Error("Supabase is not configured");

  const { error } = await supabase
    .from("saved_grants")
    .delete()
    .eq("user_id", userId)
    .eq("grant_id", grantId);

  if (error) throw error;
}

export async function fetchApplications(userId: string): Promise<UserApplication[]> {
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("applications")
    .select("id, grant_id, status, notes")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false });

  if (error || !data) {
    console.warn("Failed to load applications:", error?.message);
    return [];
  }

  return data.map((row) => ({
    id: row.grant_id,
    dbId: row.id,
    status: STATUS_FROM_DB[row.status],
    notes: row.notes ?? "",
  }));
}

export async function createApplication(userId: string, grantId: number): Promise<UserApplication> {
  if (!supabase) throw new Error("Supabase is not configured");

  const { data, error } = await supabase
    .from("applications")
    .insert({ user_id: userId, grant_id: grantId, status: "not_started", notes: "" })
    .select("id, grant_id, status, notes")
    .single();

  if (error || !data) throw error ?? new Error("Could not create application");

  return {
    id: data.grant_id,
    dbId: data.id,
    status: STATUS_FROM_DB[data.status],
    notes: data.notes ?? "",
  };
}

export async function updateApplicationStatus(
  dbId: number,
  status: UiApplicationStatus
): Promise<void> {
  if (!supabase) throw new Error("Supabase is not configured");

  const { error } = await supabase
    .from("applications")
    .update({ status: STATUS_TO_DB[status], updated_at: new Date().toISOString() })
    .eq("id", dbId);

  if (error) throw error;
}
