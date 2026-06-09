import { supabase } from "@/lib/supabase";

type CaptureSource = "homepage" | "signout_prompt";

export async function submitWishlist(params: {
  name: string;
  email: string;
  city: string;
  country: string;
  source: CaptureSource;
}): Promise<void> {
  if (!supabase) throw new Error("Supabase is not configured");

  const { error } = await supabase.from("wishlist_signups").insert({
    name: params.name,
    email: params.email.toLowerCase(),
    city: params.city,
    country: params.country,
    source: params.source,
  });

  if (error) throw error;
}

export async function submitNewsletter(params: {
  name: string;
  email: string;
  source: CaptureSource;
}): Promise<void> {
  if (!supabase) throw new Error("Supabase is not configured");

  const { error } = await supabase.from("newsletter_signups").insert({
    name: params.name || null,
    email: params.email.toLowerCase(),
    source: params.source,
  });

  if (error) throw error;
}
