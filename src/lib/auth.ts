import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import type { ProfileRow } from "@/types/database.types";

export interface UserInfo {
  id: string;
  name: string;
  email: string;
  address?: string;
  city?: string;
  postal?: string;
  province?: string;
  discipline?: string;
  career?: string;
}

export interface RegisterParams {
  name: string;
  email: string;
  password: string;
  address: string;
  city: string;
  postal: string;
  province: string;
  discipline: string;
  career: string;
}

function profileToUser(profile: ProfileRow): UserInfo {
  return {
    id: profile.id,
    name: profile.name,
    email: profile.email,
    address: profile.address ?? undefined,
    city: profile.city ?? undefined,
    postal: profile.postal ?? undefined,
    province: profile.province ?? undefined,
    discipline: profile.discipline ?? undefined,
    career: profile.career ?? undefined,
  };
}

export async function fetchProfile(userId: string): Promise<UserInfo> {
  if (!supabase) throw new Error("Supabase is not configured");

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();

  if (data && !error) return profileToUser(data);

  const { data: authData } = await supabase.auth.getUser();
  const authUser = authData.user;
  if (!authUser || authUser.id !== userId) throw new Error("Could not load profile");

  return {
    id: userId,
    name: (authUser.user_metadata?.name as string) || authUser.email?.split("@")[0] || "Artist",
    email: authUser.email ?? "",
    address: (authUser.user_metadata?.address as string) || undefined,
    city: (authUser.user_metadata?.city as string) || undefined,
    postal: (authUser.user_metadata?.postal as string) || undefined,
    province: (authUser.user_metadata?.province as string) || undefined,
    discipline: (authUser.user_metadata?.discipline as string) || undefined,
    career: (authUser.user_metadata?.career as string) || undefined,
  };
}

export function getAuthRedirectUrl(): string {
  if (typeof window === "undefined") return "";

  const base = import.meta.env.BASE_URL || "/";
  const path = base === "/" ? "" : base.replace(/\/$/, "");
  const currentUrl = `${window.location.origin}${path}`;
  const host = window.location.hostname;

  if (host === "localhost" || host === "127.0.0.1" || host.endsWith(".vercel.app")) {
    return currentUrl;
  }

  const configured = import.meta.env.VITE_SITE_URL?.replace(/\/$/, "");
  if (configured) return configured;

  return `${window.location.origin}${path}`;
}

export async function signInWithGoogle(): Promise<void> {
  if (!supabase) throw new Error("Supabase is not configured");

  const { error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: getAuthRedirectUrl() },
  });
  if (error) throw error;
}

export async function signIn(email: string, password: string): Promise<UserInfo> {
  if (!supabase) throw new Error("Supabase is not configured");

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  if (!data.user) throw new Error("Sign in failed");

  return fetchProfile(data.user.id);
}

export type SignUpResult =
  | { needsConfirmation: true }
  | { needsConfirmation: false; user: UserInfo };

export async function signUp(params: RegisterParams): Promise<SignUpResult> {
  if (!supabase) throw new Error("Supabase is not configured");

  const { data, error } = await supabase.auth.signUp({
    email: params.email,
    password: params.password,
    options: {
      data: {
        name: params.name,
        address: params.address,
        city: params.city,
        postal: params.postal,
        province: params.province,
        discipline: params.discipline,
        career: params.career,
      },
    },
  });

  if (error) throw error;
  if (!data.session || !data.user) {
    return { needsConfirmation: true };
  }

  return { needsConfirmation: false, user: await fetchProfile(data.user.id) };
}

export async function signOut(): Promise<void> {
  if (!supabase) return;
  await supabase.auth.signOut();
}

export function initAuth(onUser: (user: UserInfo | null) => void): () => void {
  if (!isSupabaseConfigured || !supabase) {
    onUser(null);
    return () => {};
  }

  supabase.auth.getSession().then(({ data: { session } }) => {
    if (session?.user) {
      fetchProfile(session.user.id).then(onUser).catch(() => onUser(null));
    } else {
      onUser(null);
    }
  });

  const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
    if (session?.user) {
      fetchProfile(session.user.id).then(onUser).catch(() => onUser(null));
    } else {
      onUser(null);
    }
  });

  return () => subscription.unsubscribe();
}

export function authErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    const message = error.message;

    if (/invalid login credentials/i.test(message)) {
      return "Invalid email or password.";
    }
    if (/email not confirmed/i.test(message)) {
      return "Please confirm your email before signing in.";
    }
    if (/already registered|already been registered/i.test(message)) {
      return "An account with this email already exists. Try signing in.";
    }
    if (/rate limit|too many requests|429/i.test(message)) {
      return "Too many attempts. Please wait a moment and try again.";
    }

    return message;
  }
  return "Something went wrong. Please try again.";
}
