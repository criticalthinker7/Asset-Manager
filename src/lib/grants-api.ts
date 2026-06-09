import { GRANTS as FALLBACK_GRANTS, type Grant } from "@/data/grants";
import type { Database } from "@/types/database.types";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";

type GrantRow = Database["public"]["Tables"]["grants"]["Row"];

function mapGrantRow(row: GrantRow): Grant {
  return {
    id: row.id,
    name: row.name,
    org: row.org,
    open: row.open_date ?? "",
    close: row.close_label || row.close_date || "Rolling",
    url: row.url,
    discipline: row.discipline,
    location: row.location,
    amount: row.amount ?? "",
    tags: row.tags,
    eligibility: row.eligibility ?? "",
    description: row.description ?? "",
  };
}

export type GrantsSource = "supabase" | "fallback";

export async function fetchGrants(): Promise<{ grants: Grant[]; source: GrantsSource }> {
  if (!isSupabaseConfigured || !supabase) {
    return { grants: FALLBACK_GRANTS, source: "fallback" };
  }

  try {
    const { data, error } = await supabase
      .from("grants")
      .select("*")
      .eq("is_active", true)
      .order("id");

    if (error || !data?.length) {
      console.warn("Supabase grants fetch failed, using fallback:", error?.message);
      return { grants: FALLBACK_GRANTS, source: "fallback" };
    }

    return { grants: data.map(mapGrantRow), source: "supabase" };
  } catch (err) {
    console.warn("Supabase grants fetch error, using fallback:", err);
    return { grants: FALLBACK_GRANTS, source: "fallback" };
  }
}
