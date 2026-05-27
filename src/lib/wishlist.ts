export interface WishlistFields {
  name: string;
  email: string;
  city: string;
  country: string;
  /** Honeypot — must stay empty */
  website?: string;
}

export function validateWishlistFields(fields: WishlistFields): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!fields.name.trim()) errors.name = "Name is required";
  if (!fields.email.trim() || !fields.email.includes("@")) {
    errors.email = "Valid email is required";
  }
  if (!fields.city.trim()) errors.city = "City is required";
  if (!fields.country.trim()) errors.country = "Country is required";
  return errors;
}

export async function submitWishlist(fields: WishlistFields): Promise<void> {
  const endpoint = import.meta.env.VITE_WISHLIST_ENDPOINT;
  if (!endpoint) {
    throw new Error(
      "Wishlist is not configured. Set VITE_WISHLIST_ENDPOINT in your environment."
    );
  }

  const secret = import.meta.env.VITE_WISHLIST_SECRET;
  const payload = {
    name: fields.name.trim(),
    email: fields.email.trim(),
    city: fields.city.trim(),
    country: fields.country.trim(),
    website: fields.website ?? "",
    secret: secret ?? "",
    source: typeof window !== "undefined" ? window.location.href : "",
  };

  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify(payload),
  });

  const text = await response.text();
  let result: { ok?: boolean; error?: string };
  try {
    result = JSON.parse(text) as { ok?: boolean; error?: string };
  } catch {
    throw new Error("Unexpected response from wishlist service.");
  }

  if (!result.ok) {
    throw new Error(result.error ?? "Could not add you to the wishlist. Please try again.");
  }
}
