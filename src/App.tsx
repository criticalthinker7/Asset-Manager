import { useState, useRef, useEffect, useMemo, type FormEvent, type MouseEvent } from "react";
import { CA_PROVINCES, GRANTS as FALLBACK_GRANTS, getDeadlineStatus, validatePostal, type Grant } from "@/data/grants";
import { fetchGrants, type GrantsSource } from "@/lib/grants-api";
import {
  authErrorMessage,
  initAuth,
  signIn,
  signInWithGoogle,
  signOut,
  signUp,
  type UserInfo,
} from "@/lib/auth";
import { submitNewsletter, submitWishlist } from "@/lib/captures";
import {
  createApplication,
  fetchApplications,
  fetchSavedGrantIds,
  saveGrant,
  unsaveGrant,
  updateApplicationStatus,
  type UserApplication,
} from "@/lib/user-data";
import { FaInstagram, FaLinkedinIn, FaXTwitter } from "react-icons/fa6";

const canGrantsLogo = `${import.meta.env.BASE_URL}cangrants-logo.png`;

const THEME = {
  navy: "#070C3C",
  indigo: "#4E58EE",
  chartreuse: "#EEE44E",
  surface: "#E1E0DA",
  foreground: "#111110",
  muted: "#6E6E6B",
  ivory: "#F7F6F1",
  line: "rgba(225,224,218,0.18)",
} as const;

const COMPANY_NAME = "BetterHalf Labs";

const SOCIAL_LINKS = [
  { label: "Instagram", href: "https://www.instagram.com/betterhalflabs/", Icon: FaInstagram },
  { label: "LinkedIn", href: "https://www.linkedin.com/company/canadianartgrants", Icon: FaLinkedinIn },
  { label: "X", href: "https://x.com/CdnArtGrants", Icon: FaXTwitter },
] as const;

const PUBLIC_NAV_ITEMS = [
  { label: "About", href: "/about" },
  { label: "Team", href: "/team" },
  { label: "Pricing", href: "/pricing" },
  { label: "Tools", href: "/tools" },
  { label: "Resources", href: "/resources" },
  { label: "Ask a Consultant", href: "/ask-a-consultant" },
  { label: "Contact", href: "/contact" },
] as const;

const DASHBOARD_NAV_ITEMS = [
  { id: "discover", label: "Discover", href: "/discover" },
  { id: "saved", label: "Saved", href: "/saved" },
  { id: "applications", label: "My Applications", href: "/applications" },
  { id: "assistant", label: "AI Assistant", href: "/assistant" },
] as const;

type DashboardTabId = typeof DASHBOARD_NAV_ITEMS[number]["id"];

const DEMO_USER: UserInfo = {
  id: "preview-dashboard-user",
  name: "Preview Artist",
  email: "preview@canadiangrants.local",
  province: "Ontario",
  discipline: "Visual Arts",
  career: "Emerging",
};

const HOME_STATS = [
  { value: "$48.2M", label: "Disbursed in 2025" },
  { value: "3,840", label: "Artists funded" },
  { value: "412", label: "Active grants" },
  { value: "13", label: "Provinces & territories" },
] as const;

const HOME_DISCIPLINES = ["Visual Arts", "Music", "Indigenous Arts", "Film", "Literary Arts", "Theatre"] as const;

const basePath = () => import.meta.env.BASE_URL.replace(/\/$/, "");
const withBasePath = (href: string) => {
  if (href.startsWith("http")) return href;
  const base = basePath();
  if (href === "/") return `${base}/` || "/";
  return `${base}${href}`;
};

const isValidEmailAddress = (value: string) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value.trim());

const getCurrentAppPath = () => {
  if (typeof window === "undefined") return "/";
  const base = basePath();
  const path = window.location.pathname.replace(/\/$/, "") || "/";
  if (base && path === base) return "/";
  if (base && path.startsWith(`${base}/`)) return path.slice(base.length) || "/";
  return path;
};

const getDashboardPathForTab = (tabId: DashboardTabId) =>
  DASHBOARD_NAV_ITEMS.find(item => item.id === tabId)?.href || "/discover";

const getDashboardTabForPath = (path = getCurrentAppPath()): DashboardTabId =>
  DASHBOARD_NAV_ITEMS.find(item => item.href === path)?.id || "discover";

const isDashboardPath = (path = getCurrentAppPath()) =>
  path === "/" || DASHBOARD_NAV_ITEMS.some(item => item.href === path);

const getDemoDashboardSearch = () => {
  if (typeof window === "undefined") return "";
  const params = new URLSearchParams(window.location.search);
  return params.get("demo") === "dashboard" ? "?demo=dashboard" : "";
};

const dashboardUrlForTab = (tabId: DashboardTabId, preserveDemoSearch = false) =>
  `${withBasePath(getDashboardPathForTab(tabId))}${preserveDemoSearch ? getDemoDashboardSearch() : ""}`;

const canUsePreviewDashboard = () => {
  if (typeof window === "undefined") return false;
  const host = window.location.hostname;
  return host === "localhost"
    || host === "127.0.0.1"
    || (host.endsWith(".vercel.app") && host.includes("-simranscarborough-9150s-projects"));
};

const demoDashboardHref = () => `${withBasePath("/")}?demo=dashboard`;

const canOpenDemoDashboard = () => {
  if (typeof window === "undefined") return false;
  const params = new URLSearchParams(window.location.search);
  return params.get("demo") === "dashboard" && canUsePreviewDashboard();
};

const formatGrantDate = (value: string) => (
  value === "Rolling"
    ? "Rolling"
    : new Date(value).toLocaleDateString("en-CA", { month:"long", day:"numeric", year:"numeric" })
);

const normalizeGrantSearchText = (value: string) =>
  value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/&/g, " and ")
    .replace(/['\u2018\u2019`]/g, "")
    .replace(/[-\u2013\u2014_/]+/g, " ")
    .replace(/[^a-zA-Z0-9]+/g, " ")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");

const grantSearchCorpus = (grant: Grant) =>
  normalizeGrantSearchText([
    grant.name,
    grant.org,
    grant.discipline.join(" "),
    grant.tags.join(" "),
    grant.eligibility,
    grant.description,
    grant.amount,
    grant.url,
  ].join(" "));

const matchesGrantSearch = (grant: Grant, query: string) => {
  const normalizedQuery = normalizeGrantSearchText(query);
  if (!normalizedQuery) return true;

  const corpus = grantSearchCorpus(grant);
  if (corpus.includes(normalizedQuery)) return true;

  const queryTokens = normalizedQuery.split(" ").filter(Boolean);
  const corpusTokens = corpus.split(" ");
  return queryTokens.every(token =>
    corpusTokens.includes(token)
    || (token.length >= 4 && corpusTokens.some(value => value.startsWith(token)))
  );
};

const matchesNormalizedListValue = (selected: string, values: string[]) => {
  const normalizedSelected = normalizeGrantSearchText(selected);
  if (!normalizedSelected) return true;

  return values.some(value => {
    const normalizedValue = normalizeGrantSearchText(value);
    return normalizedValue === normalizedSelected || normalizedValue.includes(normalizedSelected);
  });
};

interface UserInfoForAssistant {
  name: string;
  province?: string;
  discipline?: string;
  career?: string;
}

type ChatMessage = {
  role: "assistant" | "user";
  content: string;
};

type CaptureSource = "homepage" | "signout_prompt";
type SubmissionStatus = "idle" | "submitting" | "success" | "error";

type WishlistValues = {
  name: string;
  email: string;
  city: string;
  country: string;
  website: string;
};

type NewsletterValues = {
  name: string;
  email: string;
  website: string;
};

const WISHLIST_HEADLINE = "Did you find this web app useful in your work? Please add your name to the wishlist to make it happen.";
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const captureLabelStyle = { display:"block", fontSize:11, fontWeight:600, color:"#A8C5A0", letterSpacing:"1px", textTransform:"uppercase", marginBottom:6 } as const;
const captureInputStyle = { width:"100%", padding:"11px 13px", background:"rgba(255,255,255,0.06)", border:"1px solid rgba(200,168,75,0.28)", borderRadius:8, color:"#F4EFE6", fontSize:14, fontFamily:"'DM Sans',sans-serif", outline:"none", boxSizing:"border-box" } as const;
const captureErrorStyle = { fontSize:12, color:"#F08A72", marginTop:8, lineHeight:1.5 } as const;
const captureSuccessStyle = { fontSize:12, color:"#A8C5A0", marginTop:8, lineHeight:1.5 } as const;

const getLocalAssistantResponse = (prompt: string, user: UserInfoForAssistant, grants: Grant[]) => {
  const q = prompt.toLowerCase();
  const upcoming = grants
    .map(grant => ({ grant, status: getDeadlineStatus(grant.close) }))
    .filter(({ status }) => status.days >= 0 && status.days !== Infinity)
    .sort((a, b) => a.status.days - b.status.days);

  if (q.includes("urgent") || q.includes("deadline")) {
    const lines = upcoming.slice(0, 5).map(({ grant, status }) =>
      `- ${grant.name} (${grant.org}) - ${formatGrantDate(grant.close)} - ${status.label} - ${grant.amount}`
    );
    return `The most urgent upcoming deadlines are:\n\n${lines.join("\n")}\n\nI would prioritize anything under 14 days first, then move grants in the 15-45 day window into your tracker.`;
  }

  if (q.includes("eligible") || q.includes("eligibility")) {
    const matches = grants
      .filter(grant =>
        (!user.discipline || grant.discipline.includes(user.discipline)) &&
        (!user.province || grant.location === "Canada" || grant.tags.includes(user.province))
      )
      .slice(0, 5);
    const lines = matches.map(grant =>
      `- ${grant.name} (${grant.org}) - ${grant.amount}: ${grant.eligibility}`
    );
    return `Based on your profile, these are strong places to start:\n\n${lines.join("\n")}\n\nOpen each grant's Details panel to confirm fit before applying.`;
  }

  if (q.includes("draft") || q.includes("proposal") || q.includes("artist statement") || q.includes("project summary")) {
    return `Here is a starter structure you can adapt:\n\n- Project overview: one clear paragraph describing the work, audience, and why now.\n- Artistic rationale: connect the project to your practice, community, and point of view.\n- Impact: describe who the work serves and what changes because it exists.\n- Work plan: list the major production steps, timeline, and collaborators.\n- Budget fit: connect the requested amount to concrete creative needs.\n\nShare the grant name and project details, and I can shape this into a more specific draft.`;
  }

  return `I can help with deadline triage, eligibility matching, application tracking, and proposal drafts. Try asking: "What are the most urgent deadlines?" or "Which grants am I eligible for?"`;
};

function CanGrantsLogoImg({ size = "md" }: { size?: "lg" | "md" | "sm" }) {
  const dims = size === "lg"
    ? { width: 240, height: 126 }
    : size === "sm"
      ? { width: 118, height: 62 }
      : { width: 160, height: 84 };
  return (
    <img
      src={canGrantsLogo}
      alt={`CanGrants powered by ${COMPANY_NAME}`}
      style={{
        width:dims.width,
        height:dims.height,
        objectFit:"contain",
        filter:"drop-shadow(0 1px 2px rgba(255,255,255,0.22))",
      }}
    />
  );
}

function CaptureInput({ label, value, onChange, type = "text", placeholder, disabled = false }: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
  disabled?: boolean;
}) {
  return (
    <div>
      <label style={captureLabelStyle}>{label}</label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        style={{ ...captureInputStyle, opacity:disabled ? 0.65 : 1 }}
      />
    </div>
  );
}

function WishlistForm({ source, initialValues = {}, submitLabel = "Join the Wishlist", onSuccess }: {
  source: CaptureSource;
  initialValues?: Partial<WishlistValues>;
  submitLabel?: string;
  onSuccess?: () => void;
}) {
  const [values, setValues] = useState<WishlistValues>(() => ({
    name: initialValues.name || "",
    email: initialValues.email || "",
    city: initialValues.city || "",
    country: initialValues.country || "Canada",
    website: "",
  }));
  const [status, setStatus] = useState<SubmissionStatus>("idle");
  const [message, setMessage] = useState("");

  const update = (field: keyof WishlistValues, value: string) => {
    setValues(prev => ({ ...prev, [field]: value }));
    if (status !== "submitting") {
      setStatus("idle");
      setMessage("");
    }
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const name = values.name.trim();
    const email = values.email.trim();
    const city = values.city.trim();
    const country = values.country.trim();

    if (!name || !email || !city || !country) {
      setStatus("error");
      setMessage("Please add your name, email, city, and country.");
      return;
    }

    if (!EMAIL_PATTERN.test(email)) {
      setStatus("error");
      setMessage("Please enter a valid email address.");
      return;
    }

    setStatus("submitting");
    setMessage("");

    try {
      await submitWishlist({ name, email, city, country, source });
      setStatus("success");
      setMessage("You're on the wishlist. Thank you for helping shape CanGrants.");
      onSuccess?.();
    } catch {
      setStatus("error");
      setMessage("We couldn't save your details. Please try again.");
    }
  };

  const disabled = status === "submitting" || status === "success";

  return (
    <form onSubmit={handleSubmit} style={{ display:"flex", flexDirection:"column", gap:12 }}>
      <input value={values.website} onChange={e => update("website", e.target.value)} tabIndex={-1} autoComplete="off" style={{ display:"none" }} aria-hidden="true" />
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))", gap:12 }}>
        <CaptureInput label="Name" value={values.name} onChange={value => update("name", value)} placeholder="Your name" disabled={disabled} />
        <CaptureInput label="Email" value={values.email} onChange={value => update("email", value)} type="email" placeholder="you@email.com" disabled={disabled} />
        <CaptureInput label="City" value={values.city} onChange={value => update("city", value)} placeholder="Toronto" disabled={disabled} />
        <CaptureInput label="Country" value={values.country} onChange={value => update("country", value)} placeholder="Canada" disabled={disabled} />
      </div>
      <button
        type="submit"
        disabled={disabled}
        style={{ padding:"12px 18px", borderRadius:8, border:"none", background:disabled?"#7A6933":"#C8A84B", color:"#0B2215", fontSize:14, fontWeight:700, cursor:disabled?"not-allowed":"pointer", fontFamily:"'DM Sans',sans-serif", alignSelf:"flex-start" }}
      >
        {status === "submitting" ? "Saving..." : submitLabel}
      </button>
      {message && <div style={status === "success" ? captureSuccessStyle : captureErrorStyle}>{message}</div>}
    </form>
  );
}

function NewsletterForm({ source }: { source: CaptureSource }) {
  const [values, setValues] = useState<NewsletterValues>({ name:"", email:"", website:"" });
  const [status, setStatus] = useState<SubmissionStatus>("idle");
  const [message, setMessage] = useState("");

  const update = (field: keyof NewsletterValues, value: string) => {
    setValues(prev => ({ ...prev, [field]: value }));
    if (status !== "submitting") {
      setStatus("idle");
      setMessage("");
    }
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const name = values.name.trim();
    const email = values.email.trim();

    if (!email) {
      setStatus("error");
      setMessage("Please add your email address.");
      return;
    }

    if (!EMAIL_PATTERN.test(email)) {
      setStatus("error");
      setMessage("Please enter a valid email address.");
      return;
    }

    setStatus("submitting");
    setMessage("");

    try {
      await submitNewsletter({ name, email, source });
      setStatus("success");
      setMessage("You're subscribed. We'll send CanGrants updates when there is something useful to share.");
    } catch {
      setStatus("error");
      setMessage("We couldn't save your email. Please try again.");
    }
  };

  const disabled = status === "submitting" || status === "success";

  return (
    <form onSubmit={handleSubmit} style={{ display:"flex", flexDirection:"column", gap:12 }}>
      <input value={values.website} onChange={e => update("website", e.target.value)} tabIndex={-1} autoComplete="off" style={{ display:"none" }} aria-hidden="true" />
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(170px,1fr))", gap:12 }}>
        <CaptureInput label="Name" value={values.name} onChange={value => update("name", value)} placeholder="Optional" disabled={disabled} />
        <CaptureInput label="Email" value={values.email} onChange={value => update("email", value)} type="email" placeholder="you@email.com" disabled={disabled} />
      </div>
      <button
        type="submit"
        disabled={disabled}
        style={{ padding:"12px 18px", borderRadius:8, border:"1px solid rgba(200,168,75,0.45)", background:disabled?"rgba(200,168,75,0.12)":"transparent", color:disabled?"#7A8A7A":"#C8A84B", fontSize:14, fontWeight:700, cursor:disabled?"not-allowed":"pointer", fontFamily:"'DM Sans',sans-serif", alignSelf:"flex-start" }}
      >
        {status === "submitting" ? "Subscribing..." : "Subscribe"}
      </button>
      {message && <div style={status === "success" ? captureSuccessStyle : captureErrorStyle}>{message}</div>}
    </form>
  );
}

function HomepageCaptureSection() {
  return (
    <section style={{ width:"100%", background:THEME.navy, borderTop:`1px solid ${THEME.line}`, borderBottom:`1px solid ${THEME.line}`, padding:"34px 28px 38px", margin:"0", textAlign:"left" }}>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(280px,1fr))", gap:34, alignItems:"start" }}>
        <div>
          <div style={{ fontSize:11, letterSpacing:"3px", color:"#C8A84B", textTransform:"uppercase", marginBottom:12, fontWeight:700 }}>Wishlist</div>
          <h2 style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:"clamp(28px,4vw,42px)", lineHeight:1.05, margin:"0 0 12px", color:THEME.ivory }}>{WISHLIST_HEADLINE}</h2>
          <p style={{ fontSize:13, color:"#8A9C8A", lineHeight:1.7, margin:"0 0 22px", maxWidth:520 }}>We'll only use this to track CanGrants interest and follow up about the project.</p>
          <WishlistForm source="homepage" />
        </div>
        <div>
          <div style={{ fontSize:11, letterSpacing:"3px", color:"#A8C5A0", textTransform:"uppercase", marginBottom:12, fontWeight:700 }}>Newsletter</div>
          <h2 style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:"clamp(26px,3vw,36px)", lineHeight:1.12, margin:"0 0 12px", color:THEME.ivory }}>Get occasional CanGrants updates.</h2>
          <p style={{ fontSize:13, color:"#8A9C8A", lineHeight:1.7, margin:"0 0 22px", maxWidth:460 }}>A quiet note when the grant list, AI tools, or launch plans move forward.</p>
          <NewsletterForm source="homepage" />
        </div>
      </div>
    </section>
  );
}

function SignOutWishlistSheet({ user, onClose, onSignOut }: {
  user: UserInfo;
  onClose: () => void;
  onSignOut: () => void;
}) {
  const [showForm, setShowForm] = useState(false);

  const handleSaved = () => {
    window.setTimeout(onSignOut, 1200);
  };

  return (
    <div style={{ position:"fixed", inset:0, zIndex:300, background:"rgba(0,0,0,0.48)", display:"flex", alignItems:"flex-end", justifyContent:"center", padding:"20px" }}>
      <div style={{ width:"100%", maxWidth:720, background:"#0B2215", color:"#F4EFE6", border:"1px solid rgba(200,168,75,0.28)", borderRadius:8, boxShadow:"0 -12px 50px rgba(0,0,0,0.35)", padding:"24px", position:"relative" }}>
        <button onClick={onClose} aria-label="Close" style={{ position:"absolute", top:14, right:14, width:30, height:30, borderRadius:8, border:"1px solid rgba(200,168,75,0.25)", background:"transparent", color:"#C8A84B", cursor:"pointer", fontSize:18, lineHeight:1 }}>x</button>
        {!showForm ? (
          <>
            <div style={{ fontSize:11, letterSpacing:"3px", color:"#C8A84B", textTransform:"uppercase", marginBottom:12, fontWeight:700 }}>Before you go</div>
            <h2 style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:"clamp(28px,4vw,40px)", lineHeight:1.08, margin:"0 40px 12px 0" }}>{WISHLIST_HEADLINE}</h2>
            <p style={{ color:"#8A9C8A", fontSize:14, lineHeight:1.7, margin:"0 0 22px", maxWidth:560 }}>Your response helps measure early interest from test users.</p>
            <div style={{ display:"flex", gap:12, flexWrap:"wrap" }}>
              <button onClick={() => setShowForm(true)} style={{ padding:"12px 18px", borderRadius:8, border:"none", background:"#C8A84B", color:"#0B2215", fontSize:14, fontWeight:700, cursor:"pointer", fontFamily:"'DM Sans',sans-serif" }}>Yes, add me</button>
              <button onClick={onSignOut} style={{ padding:"12px 18px", borderRadius:8, border:"1px solid rgba(200,168,75,0.38)", background:"transparent", color:"#C8A84B", fontSize:14, fontWeight:600, cursor:"pointer", fontFamily:"'DM Sans',sans-serif" }}>No, sign out</button>
            </div>
          </>
        ) : (
          <>
            <div style={{ fontSize:11, letterSpacing:"3px", color:"#C8A84B", textTransform:"uppercase", marginBottom:12, fontWeight:700 }}>Wishlist</div>
            <h2 style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:"clamp(28px,4vw,38px)", lineHeight:1.08, margin:"0 40px 10px 0" }}>Add your name before you sign out.</h2>
            <p style={{ color:"#8A9C8A", fontSize:14, lineHeight:1.7, margin:"0 0 20px", maxWidth:560 }}>Name and email are filled from your account when available.</p>
            <WishlistForm source="signout_prompt" initialValues={{ name:user.name, email:user.email, country:"Canada" }} submitLabel="Add me and sign out" onSuccess={handleSaved} />
            <button onClick={onSignOut} style={{ marginTop:14, padding:0, border:"none", background:"transparent", color:"#6A9C6A", fontSize:13, cursor:"pointer", fontFamily:"'DM Sans',sans-serif" }}>Sign out without adding</button>
          </>
        )}
      </div>
    </div>
  );
}

function AuthDivider({ label = "or" }: { label?: string }) {
  return (
    <div style={{ display:"flex", alignItems:"center", gap:12, margin:"20px 0" }}>
      <div style={{ flex:1, height:1, background:"rgba(200,168,75,0.2)" }}/>
      <span style={{ fontSize:12, color:"#6A8C6A", textTransform:"uppercase", letterSpacing:"1px" }}>{label}</span>
      <div style={{ flex:1, height:1, background:"rgba(200,168,75,0.2)" }}/>
    </div>
  );
}

function GoogleSignInButton({ disabled, onClick }: { disabled: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{ width:"100%", padding:"12px 14px", borderRadius:10, border:"1px solid rgba(200,168,75,0.35)", background:"rgba(255,255,255,0.06)", color:"#F4EFE6", fontSize:14, fontWeight:600, cursor:disabled?"not-allowed":"pointer", fontFamily:"'DM Sans',sans-serif", display:"flex", alignItems:"center", justifyContent:"center", gap:10 }}
    >
      <span style={{ fontSize:18, lineHeight:1 }}>G</span>
      Continue with Google
    </button>
  );
}

function PublicSiteHeader({ onSignIn, onGetStarted }: { onSignIn?: () => void; onGetStarted?: () => void }) {
  const handleAuthClick = (event: MouseEvent<HTMLAnchorElement>, callback?: () => void) => {
    if (!callback) return;
    event.preventDefault();
    callback();
  };

  return (
    <header className="site-header" style={{ position:"relative", zIndex:20, background:THEME.navy, borderBottom:`1px solid ${THEME.line}` }}>
      <div className="site-header-inner" style={{ maxWidth:1760, margin:"0 auto", padding:"18px 32px", display:"flex", alignItems:"center", justifyContent:"space-between", gap:24 }}>
        <a href={withBasePath("/")} aria-label="CanGrants home" style={{ width:142, height:64, display:"inline-flex", alignItems:"center", justifyContent:"center", textDecoration:"none", flexShrink:0 }}>
          <img src={canGrantsLogo} alt="CanGrants" style={{ width:"100%", height:"100%", objectFit:"contain" }} />
        </a>
        <nav className="site-header-nav" aria-label="Primary navigation" style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:22, flex:1 }}>
          {PUBLIC_NAV_ITEMS.map(item => (
            <a key={item.href} href={withBasePath(item.href)} style={{ color:"rgba(247,246,241,0.88)", textDecoration:"none", fontSize:22, fontWeight:700, lineHeight:1.15, whiteSpace:"nowrap" }}>
              {item.label}
            </a>
          ))}
        </nav>
        <div className="site-header-socials" aria-label="Social links" style={{ display:"flex", alignItems:"center", gap:11 }}>
          {SOCIAL_LINKS.map(link => (
            <a
              key={link.href}
              href={link.href}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={link.label}
              title={link.label}
              style={{ width:36, height:36, color:"rgba(247,246,241,0.8)", textDecoration:"none", display:"inline-flex", alignItems:"center", justifyContent:"center", border:`1px solid ${THEME.line}` }}
            >
              <link.Icon aria-hidden="true" size={18} />
            </a>
          ))}
        </div>
        <div className="site-header-actions" style={{ display:"flex", alignItems:"center", gap:16, flexShrink:0 }}>
          <a href={`${withBasePath("/")}?signin=1`} onClick={event => handleAuthClick(event, onSignIn)} style={{ color:"rgba(247,246,241,0.92)", textDecoration:"none", fontSize:22, fontWeight:700, whiteSpace:"nowrap" }}>Sign In</a>
          <a href={`${withBasePath("/")}?register=1`} onClick={event => handleAuthClick(event, onGetStarted)} style={{ background:THEME.chartreuse, color:THEME.foreground, textDecoration:"none", padding:"14px 24px", fontSize:22, fontWeight:800, lineHeight:1, border:"1px solid rgba(255,255,255,0.25)", whiteSpace:"nowrap" }}>Get Started</a>
        </div>
      </div>
    </header>
  );
}

function PublicInfoPage({ path }: { path: string }) {
  const normalized = (path.replace(/\/$/, "") || "/") as string;
  const pages: Record<string, { title: string; subtitle: string; eyebrow: string; body: string[] }> = {
    "/about": {
      eyebrow: "About",
      title: "AI-powered grant discovery for Canadian creators.",
      subtitle: "CanGrants reduces administrative friction so artists can spend more time making work.",
      body: [
        "CanGrants brings fragmented Canadian arts funding into one searchable, trackable platform for individual artists, producers, and small creative teams.",
        "The product combines grant discovery, eligibility matching, proposal support, and application tracking in a focused workflow built by creators who understand the pressure of funding deadlines.",
      ],
    },
    "/team": {
      eyebrow: "Team",
      title: "Built by creator-operators.",
      subtitle: "A Canadian-made platform led by BetterHalf Labs.",
      body: [
        "The team brings independent production experience, grant-writing context, and practical product design into one platform for Canadian artists and producers.",
        "CanGrants is Ontario based, South Asian led, and focused on helping independent creators keep more ownership of their ideas and time.",
      ],
    },
    "/pricing": {
      eyebrow: "Pricing",
      title: "Start lean while the platform grows.",
      subtitle: "Bootstrap-friendly subscriptions with a simple free-trial path before paid plans.",
      body: [
        "Recommended launch path: start with Stripe Checkout or Stripe Payment Links for subscriptions and keep the plan structure simple while usage is still validating.",
        "Suggested tiers can begin with individual artists, indie producers, small companies, and consultant/hub accounts, with higher pricing tied to storage, AI usage, and multi-client workflows.",
      ],
    },
    "/tools": {
      eyebrow: "Tools",
      title: "Grant discovery, matching, drafting, and tracking.",
      subtitle: "The core workflow moves from finding grants to managing applications.",
      body: [
        "Search across curated opportunities, filter by discipline and region, save relevant grants, and move them into an application tracker.",
        "The AI assistant helps with deadline triage, eligibility checks, proposal structure, artist statements, and project summaries.",
      ],
    },
    "/resources": {
      eyebrow: "Resources",
      title: "A resource hub for the Canadian funding landscape.",
      subtitle: "Guides, funder context, and creator workflows can live here as the platform grows.",
      body: [
        "This section is the natural home for educational content, funder explainers, grant calendars, and launch updates.",
        "Future resources can support partnerships with arts service organizations, guilds, incubators, and post-secondary programs.",
      ],
    },
    "/ask-a-consultant": {
      eyebrow: "Ask a Consultant",
      title: "Expert grant strategy when a search tool is not enough.",
      subtitle: "For producing companies, arts hubs, and creators managing complex applications.",
      body: [
        "Use this pathway for one-on-one strategy, proposal review, funder matching, and multi-funder application planning.",
        "A consultant offer pairs well with the higher tier because it supports organizations and multi-client pipelines.",
      ],
    },
    "/contact": {
      eyebrow: "Contact",
      title: "Contact",
      subtitle: "Join us in building Canada's creator IP future.",
      body: [
        "Get in touch",
        "Email: contact@betterhalffilms.com",
        `Company: ${COMPANY_NAME}`,
        "Canadian made. Ontario based. South Asian led.",
      ],
    },
  };

  const page = pages[normalized] || pages["/about"];

  return (
    <div style={{ minHeight:"100vh", background:THEME.navy, color:THEME.ivory, fontFamily:"'DM Sans',sans-serif" }}>
      <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;600;700&family=DM+Sans:wght@300;400;500;600;700&display=swap" rel="stylesheet"/>
      <PublicSiteHeader />
      <main style={{ maxWidth:900, margin:"0 auto", padding:"58px 24px 96px" }}>
        <a href={withBasePath("/")} style={{ display:"inline-flex", color:THEME.chartreuse, fontSize:14, fontWeight:700, textDecoration:"none", marginBottom:30 }}>Back to home</a>
        <div style={{ width:54, height:2, background:THEME.chartreuse, marginBottom:28 }}/>
        <div style={{ color:THEME.chartreuse, fontSize:12, fontWeight:800, letterSpacing:"3px", textTransform:"uppercase", marginBottom:16 }}>{page.eyebrow}</div>
        <h1 style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:"clamp(46px,8vw,78px)", lineHeight:0.96, fontWeight:700, margin:"0 0 18px", maxWidth:760 }}>{page.title}</h1>
        <p style={{ color:"rgba(247,246,241,0.72)", fontSize:18, lineHeight:1.7, margin:"0 0 38px", maxWidth:720 }}>{page.subtitle}</p>
        <section style={{ background:"rgba(255,255,255,0.035)", border:`1px solid ${THEME.line}`, padding:"28px", display:"grid", gap:18 }}>
          {page.body.map(item => (
            <p key={item} style={{ margin:0, color:THEME.ivory, fontSize:16, lineHeight:1.8 }}>{item}</p>
          ))}
          {normalized === "/contact" && (
            <div style={{ display:"flex", gap:12, flexWrap:"wrap", marginTop:8 }}>
              {SOCIAL_LINKS.map(link => (
                <a key={link.href} href={link.href} target="_blank" rel="noopener noreferrer" style={{ color:THEME.chartreuse, border:`1px solid ${THEME.line}`, padding:"9px 13px", textDecoration:"none", fontSize:13, fontWeight:800 }}>
                  {link.label}
                </a>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

function LandingPage({ onAuth }: { onAuth: (user: UserInfo) => void }) {
  const [mode, setMode] = useState(() => {
    if (typeof window === "undefined") return "welcome";
    const params = new URLSearchParams(window.location.search);
    if (params.has("signin")) return "login";
    if (params.has("register")) return "register";
    return "welcome";
  });
  const [form, setForm] = useState({ name:"", email:"", password:"", address:"", city:"", province:"", postal:"", discipline:"", career:"" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loginForm, setLoginForm] = useState({ email:"", password:"" });
  const [loginErr, setLoginErr] = useState("");
  const [authBusy, setAuthBusy] = useState(false);
  const [registerMsg, setRegisterMsg] = useState("");

  const resetLoginExtras = () => {
    setLoginErr("");
  };

  const handleGoogleSignIn = async () => {
    setAuthBusy(true);
    setLoginErr("");
    setRegisterMsg("");
    try {
      await signInWithGoogle();
    } catch (err) {
      const message = authErrorMessage(err);
      if (mode === "register") setRegisterMsg(message);
      else setLoginErr(message);
      setAuthBusy(false);
    }
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = "Full name is required";
    if (!isValidEmailAddress(form.email)) e.email = "Enter a valid email address";
    if (form.password.length < 6) e.password = "Min 6 characters";
    if (!form.address.trim()) e.address = "Street address required";
    if (!form.city.trim()) e.city = "City required";
    if (!form.province) e.province = "Select a province or territory";
    if (!validatePostal(form.postal)) e.postal = "Enter a valid Canadian postal code (e.g. M5V 1A1)";
    if (!form.discipline) e.discipline = "Select your primary discipline";
    return e;
  };

  const handleRegister = async () => {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    setAuthBusy(true);
    setRegisterMsg("");
    setLoginErr("");
    try {
      const result = await signUp({
        name: form.name.trim(),
        email: form.email.trim(),
        password: form.password,
        address: form.address.trim(),
        city: form.city.trim(),
        postal: form.postal.trim().toUpperCase(),
        province: form.province,
        discipline: form.discipline,
        career: form.career,
      });
      if (result.needsConfirmation) {
        setRegisterMsg("Account created. Check your email for a confirmation link, then sign in.");
        setMode("login");
        setLoginForm({ email: form.email.trim(), password: "" });
        resetLoginExtras();
        return;
      }
      onAuth(result.user);
    } catch (err) {
      setRegisterMsg(authErrorMessage(err));
    } finally {
      setAuthBusy(false);
    }
  };

  const handleLogin = async () => {
    setAuthBusy(true);
    setLoginErr("");
    try {
      const user = await signIn(loginForm.email.trim(), loginForm.password);
      onAuth(user);
    } catch (err) {
      setLoginErr(authErrorMessage(err));
    } finally {
      setAuthBusy(false);
    }
  };

  const inp = (field: string, label: string, type="text", opts: string[] | null = null) => {
    const isSelect = !!opts;
    const formVal = form[field as keyof typeof form];
    return (
      <div style={{ marginBottom:14 }}>
        <label style={{ display:"block", fontSize:11, fontWeight:600, color:"#A8C5A0", letterSpacing:"1px", textTransform:"uppercase", marginBottom:5 }}>{label}</label>
        {isSelect
          ? <select value={formVal} onChange={e => setForm(p=>({...p,[field]:e.target.value}))}
              style={{ width:"100%", padding:"11px 14px", background:"rgba(255,255,255,0.06)", border:`1px solid ${errors[field]?"#E74C3C":"rgba(200,168,75,0.3)"}`, borderRadius:8, color: formVal?"#F4EFE6":"#666", fontSize:14, fontFamily:"'DM Sans',sans-serif", outline:"none", boxSizing:"border-box" }}>
              <option value="" disabled>Select...</option>
              {opts!.map(o => <option key={o} value={o} style={{background:"#0B2215",color:"#F4EFE6"}}>{o}</option>)}
            </select>
          : <input type={type} value={formVal} onChange={e => setForm(p=>({...p,[field]:e.target.value}))} placeholder={`Enter ${label.toLowerCase()}`}
              style={{ width:"100%", padding:"11px 14px", background:"rgba(255,255,255,0.06)", border:`1px solid ${errors[field]?"#E74C3C":"rgba(200,168,75,0.3)"}`, borderRadius:8, color:"#F4EFE6", fontSize:14, fontFamily:"'DM Sans',sans-serif", outline:"none", boxSizing:"border-box" }} />
        }
        {errors[field] && <div style={{ fontSize:11, color:"#E74C3C", marginTop:4 }}>{errors[field]}</div>}
      </div>
    );
  };

  return (
    <div style={{ minHeight:"100vh", background:THEME.ivory, color:THEME.foreground, fontFamily:"'DM Sans',sans-serif", position:"relative", overflowX:"hidden" }}>
      <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;600;700&family=DM+Sans:wght@300;400;500;600;700&display=swap" rel="stylesheet"/>

      <PublicSiteHeader
        onSignIn={() => {setMode("login"); setErrors({}); resetLoginExtras();}}
        onGetStarted={() => {setMode("register"); setErrors({}); resetLoginExtras();}}
      />

      <div style={{ position:"relative", zIndex:5, maxWidth:"none", margin:"0 auto", padding:0 }}>

        {(mode === "welcome" || mode === "login" || mode === "register") && (
          <>
            <section style={{ background:THEME.navy, color:THEME.ivory, borderBottom:`1px solid ${THEME.line}` }}>
              <div style={{ maxWidth:1180, margin:"0 auto", padding:"72px 24px 86px" }}>
                <div style={{ display:"inline-flex", alignItems:"center", gap:10, border:`1px solid ${THEME.line}`, color:"rgba(247,246,241,0.75)", padding:"7px 13px", fontSize:13, letterSpacing:"1.5px", fontFamily:"Menlo,monospace", marginBottom:34 }}>
                  <span style={{ color:THEME.chartreuse, fontSize:16, lineHeight:1 }}>*</span>
                  AI-powered grant matching - 412 active opportunities
                </div>
                <h1 style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:"clamp(56px,9vw,104px)", fontWeight:700, lineHeight:0.92, margin:"0 0 28px", maxWidth:820 }}>
                  Canada's Grants<br/>Platform for Artists
                </h1>
                <p style={{ color:"rgba(247,246,241,0.72)", fontSize:"clamp(17px,2vw,21px)", lineHeight:1.65, maxWidth:760, margin:"0 0 38px" }}>
                  Canada's AI funding navigator for artists. Discover federal, provincial, and private grants matched to your discipline, province, and career stage.
                </p>
                <div className="hero-search" style={{ display:"grid", gridTemplateColumns:"minmax(220px,1fr) 160px 120px 122px", width:"100%", maxWidth:850, border:`6px solid ${THEME.ivory}`, background:THEME.ivory, gap:6, marginBottom:20 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:12, background:THEME.ivory, color:THEME.muted, padding:"0 16px", minHeight:50, fontSize:15 }}>
                    <span style={{ color:THEME.muted, fontSize:20, lineHeight:1 }}>⌕</span>
                    <span>Search grants, funders, disciplines...</span>
                  </div>
                  <select aria-label="Discipline" style={{ background:THEME.surface, border:"none", color:THEME.foreground, padding:"0 14px", fontSize:14 }}>
                    <option>All</option>
                    <option>Film</option>
                    <option>Visual Arts</option>
                    <option>Music</option>
                  </select>
                  <select aria-label="Province" style={{ background:THEME.surface, border:"none", color:THEME.foreground, padding:"0 12px", fontSize:14 }}>
                    <option>All</option>
                    <option>Ontario</option>
                    <option>Canada</option>
                  </select>
                  <button onClick={() => setMode("register")} style={{ background:THEME.indigo, color:"#fff", border:"none", fontSize:15, fontWeight:800, cursor:"pointer", fontFamily:"'DM Sans',sans-serif" }}>Search</button>
                </div>
                <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
                  {HOME_DISCIPLINES.map(item => (
                    <button key={item} onClick={() => setMode("register")} style={{ background:"transparent", color:"rgba(247,246,241,0.72)", border:`1px solid ${THEME.line}`, padding:"7px 13px", fontFamily:"Menlo,monospace", fontSize:13, cursor:"pointer" }}>{item}</button>
                  ))}
                </div>
              </div>
            </section>

            <section style={{ background:THEME.chartreuse, color:THEME.foreground }}>
              <div className="stats-grid" style={{ maxWidth:1180, margin:"0 auto", padding:"28px 24px 30px", display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:22 }}>
                {HOME_STATS.map(stat => (
                  <div key={stat.label} style={{ textAlign:"center" }}>
                    <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:"clamp(32px,4vw,42px)", lineHeight:1, fontWeight:700 }}>{stat.value}</div>
                    <div style={{ marginTop:8, fontFamily:"Menlo,monospace", fontSize:11, letterSpacing:"2px", textTransform:"uppercase" }}>{stat.label}</div>
                  </div>
                ))}
              </div>
            </section>

            <section style={{ maxWidth:1180, margin:"0 auto", padding:"58px 24px 36px" }}>
              <div style={{ color:THEME.muted, fontFamily:"Menlo,monospace", fontSize:12, letterSpacing:"3px", textTransform:"uppercase", marginBottom:18 }}>Active funding opportunities</div>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(240px,1fr))", gap:16, marginBottom:44 }}>
                {[
                  { title:"Grant Discovery", desc:"Curated federal, provincial, private, and international arts funding in one searchable flow." },
                  { title:"AI Matching", desc:"Eligibility prompts help match opportunities to discipline, province, and career stage." },
                  { title:"Application Tracker", desc:"Save grants, track deadlines, and move applications from idea to submitted." },
                ].map(item => (
                  <div key={item.title} style={{ border:`1px solid ${THEME.surface}`, padding:"22px 20px", background:"#fff" }}>
                    <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:28, lineHeight:1, fontWeight:700, marginBottom:10 }}>{item.title}</div>
                    <p style={{ color:THEME.muted, fontSize:15, lineHeight:1.7, margin:0 }}>{item.desc}</p>
                  </div>
                ))}
              </div>
              <div style={{ display:"flex", gap:12, flexWrap:"wrap", alignItems:"center" }}>
                <button onClick={() => setMode("register")} style={{ background:THEME.navy, color:THEME.chartreuse, border:"none", padding:"14px 20px", fontSize:15, fontWeight:800, cursor:"pointer", fontFamily:"'DM Sans',sans-serif" }}>Create Your Account</button>
                <button onClick={() => { setMode("login"); resetLoginExtras(); }} style={{ background:"transparent", color:THEME.indigo, border:`1px solid ${THEME.indigo}`, padding:"13px 19px", fontSize:15, fontWeight:800, cursor:"pointer", fontFamily:"'DM Sans',sans-serif" }}>I already have an account</button>
              </div>
            </section>

            <section style={{ display:"none", maxWidth:1180, margin:"0 auto", padding:"0 24px 70px" }}>
              <HomepageCaptureSection />
            </section>

            <div style={{ display:"none", flexDirection:"column", alignItems:"center", textAlign:"center", background:THEME.navy, color:THEME.ivory, padding:"76px 24px 0" }}>
            <div style={{ width:60, height:2, background:"#C8A84B", marginBottom:28 }}/>
            <div style={{ fontSize:12, letterSpacing:"4px", color:"#6A9C6A", textTransform:"uppercase", marginBottom:20, fontWeight:500 }}>Welcome to</div>
            <h1 style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:"clamp(56px,8vw,100px)", fontWeight:700, lineHeight:0.9, margin:"0 0 6px", letterSpacing:"-2px" }}>
              Can<span style={{ color:"#C8A84B" }}>Grants</span>
            </h1>
            <div style={{ width:120, height:1, background:"rgba(200,168,75,0.4)", margin:"24px auto" }}/>
            <p style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:"clamp(18px,2.5vw,26px)", fontStyle:"italic", color:"#B8C5B0", lineHeight:1.5, maxWidth:680, marginBottom:10 }}>
              An interactive AI-powered grant tracking platform
            </p>
            <p style={{ fontSize:13, color:"#6A9C6A", letterSpacing:"2px", textTransform:"uppercase", marginBottom:6 }}>created by</p>
            <div style={{ marginBottom:32 }}><CanGrantsLogoImg size="sm"/></div>

            <div style={{ maxWidth:580, marginBottom:40 }}>
              <p style={{ fontSize:16, lineHeight:1.8, color:"#C5BFAC", margin:"0 0 16px" }}>
                A single search platform for <strong style={{ color:"#F4EFE6" }}>individual artists and producers based in Canada</strong> — discover, track, and apply for arts funding from coast to coast and around the world.
              </p>
              <div style={{ display:"flex", justifyContent:"center", gap:10, flexWrap:"wrap", margin:"24px 0" }}>
                {["Funding","Labs","Residencies","Tax Credits","International Programs"].map(t => (
                  <span key={t} style={{ padding:"6px 16px", borderRadius:20, border:"1px solid rgba(200,168,75,0.35)", color:"#C8A84B", fontSize:12, fontWeight:500, letterSpacing:"0.5px" }}>{t}</span>
                ))}
              </div>
            </div>

            <div style={{ background:"rgba(200,168,75,0.06)", border:"1px solid rgba(200,168,75,0.2)", borderRadius:20, padding:"40px 50px", maxWidth:580, width:"100%", backdropFilter:"blur(10px)", marginBottom:50 }}>
              <div style={{ fontSize:11, letterSpacing:"4px", color:"#C8A84B", textTransform:"uppercase", marginBottom:12 }}>CREATE \u00b7 APPLY \u00b7 TRACK</div>
              <h2 style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:32, fontWeight:700, margin:"0 0 12px", lineHeight:1.2 }}>
                Explore the world of<br/>arts grants
              </h2>
              <p style={{ fontSize:14, color:"#8A9C8A", lineHeight:1.7, margin:"0 0 28px" }}>
                30+ funding opportunities \u00b7 AI-powered eligibility matching \u00b7 Proposal drafting assistant \u00b7 Deadline tracker
              </p>
              <button onClick={() => setMode("register")} style={{ width:"100%", padding:"16px", borderRadius:12, border:"none", background:"#C8A84B", color:"#0B2215", fontSize:16, fontWeight:700, cursor:"pointer", fontFamily:"'DM Sans',sans-serif", letterSpacing:"0.5px", marginBottom:14 }}>
                Create Your Account {"\u2192"}
              </button>
              <GoogleSignInButton disabled={authBusy} onClick={handleGoogleSignIn} />
              <button onClick={() => { setMode("login"); resetLoginExtras(); }} style={{ width:"100%", padding:"13px", borderRadius:12, border:"1px solid rgba(200,168,75,0.3)", background:"transparent", color:"#C8A84B", fontSize:14, fontWeight:500, cursor:"pointer", fontFamily:"'DM Sans',sans-serif", marginTop:14 }}>
                I already have an account
              </button>
              <p style={{ fontSize:11, color:"#555", marginTop:14, lineHeight:1.5 }}>Registration restricted to Canadian residents \u00b7 Postal code verified</p>
            </div>

            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))", gap:20, width:"100%", marginBottom:60 }}>
              {[
                { icon:"\ud83d\udd0d", title:"Grant Discovery", desc:"30+ curated grants from Telefilm, TAC, CMF, NFB, Sundance, Berlinale & more" },
                { icon:"\ud83e\udd16", title:"AI Assistant", desc:"Check eligibility, draft proposals, generate artist statements in seconds" },
                { icon:"\ud83d\udccb", title:"Application Tracker", desc:"Track every application from Not Started through to Submitted" },
                { icon:"\u2b50", title:"Save & Filter", desc:"Save your favourites, filter by discipline, location, deadline & identity" }
              ].map(f => (
                <div key={f.title} style={{ background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.07)", borderRadius:14, padding:"22px 20px", textAlign:"left" }}>
                  <div style={{ fontSize:26, marginBottom:10 }}>{f.icon}</div>
                  <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:18, fontWeight:700, marginBottom:6, color:"#F4EFE6" }}>{f.title}</div>
                  <div style={{ fontSize:13, color:"#7A8A7A", lineHeight:1.6 }}>{f.desc}</div>
                </div>
              ))}
            </div>

            <HomepageCaptureSection />
          </div>
          </>
        )}

        {(mode === "login" || mode === "register") && (
          <div style={{ position:"fixed", inset:0, zIndex:120, background:"rgba(7,12,60,0.78)", display:"flex", alignItems:"center", justifyContent:"center", padding:24 }}>
            <div style={{ width:"min(560px,100%)", maxHeight:"88vh", overflowY:"auto", background:THEME.navy, color:THEME.ivory, border:`1px solid ${THEME.line}`, boxShadow:"0 24px 80px rgba(0,0,0,0.38)", padding:"28px", position:"relative" }}>
              <button onClick={() => { setMode("welcome"); resetLoginExtras(); setErrors({}); }} aria-label="Close auth panel" style={{ position:"absolute", top:16, right:16, width:32, height:32, border:`1px solid ${THEME.line}`, background:"transparent", color:THEME.ivory, cursor:"pointer", fontSize:18, lineHeight:1 }}>×</button>
              <div style={{ width:42, height:2, background:THEME.chartreuse, marginBottom:22 }}/>
              <div style={{ color:THEME.chartreuse, fontSize:12, fontWeight:800, letterSpacing:"3px", textTransform:"uppercase", marginBottom:10 }}>{mode === "login" ? "Sign In" : "Get Started"}</div>
              <h2 style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:"clamp(34px,5vw,48px)", lineHeight:1, fontWeight:700, margin:"0 36px 10px 0" }}>
                {mode === "login" ? "Access your dashboard." : "Create your CanGrants account."}
              </h2>
              <p style={{ color:"rgba(247,246,241,0.68)", fontSize:14, lineHeight:1.7, margin:"0 0 22px" }}>
                {mode === "login"
                  ? "Use the same Supabase sign-in process as before, now inside the new homepage design."
                  : "Canadian artists and producers can create an account or continue with Google."}
              </p>

              <GoogleSignInButton disabled={authBusy} onClick={handleGoogleSignIn} />
              <AuthDivider label={mode === "login" ? "or sign in with email" : "or register with email"} />

              {mode === "login" ? (
                <>
                  <div style={{ marginBottom:14 }}>
                    <label style={{ display:"block", fontSize:11, fontWeight:700, color:THEME.chartreuse, letterSpacing:"1.5px", textTransform:"uppercase", marginBottom:6 }}>Email Address</label>
                    <input type="email" value={loginForm.email} onChange={e => setLoginForm(p=>({...p,email:e.target.value}))} placeholder="your@email.com"
                      style={{ width:"100%", padding:"13px 14px", background:"rgba(255,255,255,0.06)", border:`1px solid ${THEME.line}`, color:THEME.ivory, fontSize:14, fontFamily:"'DM Sans',sans-serif", outline:"none", boxSizing:"border-box" }}/>
                  </div>
                  <div style={{ marginBottom:20 }}>
                    <label style={{ display:"block", fontSize:11, fontWeight:700, color:THEME.chartreuse, letterSpacing:"1.5px", textTransform:"uppercase", marginBottom:6 }}>Password</label>
                    <input type="password" value={loginForm.password} onChange={e => setLoginForm(p=>({...p,password:e.target.value}))} placeholder="••••••••"
                      onKeyDown={e => e.key==="Enter" && handleLogin()}
                      style={{ width:"100%", padding:"13px 14px", background:"rgba(255,255,255,0.06)", border:`1px solid ${THEME.line}`, color:THEME.ivory, fontSize:14, fontFamily:"'DM Sans',sans-serif", outline:"none", boxSizing:"border-box" }}/>
                  </div>
                  {loginErr && <div style={{ background:"rgba(192,57,43,0.16)", border:"1px solid rgba(192,57,43,0.45)", padding:"10px 14px", fontSize:13, color:"#FFB3A8", marginBottom:16 }}>{loginErr}</div>}
                  <button onClick={handleLogin} disabled={authBusy} style={{ width:"100%", padding:"14px", border:"none", background:authBusy?"#9A9444":THEME.chartreuse, color:THEME.foreground, fontSize:15, fontWeight:800, cursor:authBusy?"not-allowed":"pointer", fontFamily:"'DM Sans',sans-serif", marginBottom:16 }}>
                    {authBusy ? "Signing in..." : "Sign In"}
                  </button>
                  <p style={{ textAlign:"center", fontSize:13, color:"rgba(247,246,241,0.64)", margin:0 }}>
                    Don't have an account?{" "}
                    <button onClick={() => { setMode("register"); setErrors({}); resetLoginExtras(); }} style={{ background:"none", border:"none", color:THEME.chartreuse, cursor:"pointer", fontSize:13, fontFamily:"'DM Sans',sans-serif", fontWeight:800 }}>Create one</button>
                  </p>
                </>
              ) : (
                <>
                  <div style={{ fontSize:11, fontWeight:800, color:THEME.chartreuse, letterSpacing:"2px", textTransform:"uppercase", marginBottom:14, paddingBottom:8, borderBottom:`1px solid ${THEME.line}` }}>Personal Info</div>
                  {inp("name","Full Name")}
                  {inp("email","Email Address","email")}
                  {inp("password","Password","password")}
                  <div style={{ fontSize:11, fontWeight:800, color:THEME.chartreuse, letterSpacing:"2px", textTransform:"uppercase", margin:"18px 0 14px", paddingBottom:8, borderBottom:`1px solid ${THEME.line}` }}>Canadian Address</div>
                  {inp("address","Street Address")}
                  <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))", gap:12 }}>
                    <div>{inp("city","City")}</div>
                    <div>{inp("postal","Postal Code")}<div style={{ fontSize:11, color:"rgba(247,246,241,0.46)", marginTop:2 }}>Format: A1A 1A1</div></div>
                  </div>
                  {inp("province","Province / Territory","text", CA_PROVINCES)}
                  <div style={{ fontSize:11, fontWeight:800, color:THEME.chartreuse, letterSpacing:"2px", textTransform:"uppercase", margin:"18px 0 14px", paddingBottom:8, borderBottom:`1px solid ${THEME.line}` }}>Your Practice</div>
                  {inp("discipline","Primary Discipline","text", ["Film","Documentary","Animation","Television","Digital Media","Visual Arts","Music","Writing","Interdisciplinary","Other"])}
                  {inp("career","Career Stage","text", ["Emerging (0-5 years)","Mid-Career (5-15 years)","Established (15+ years)","Student","Organization / Company"])}
                  {registerMsg && <div style={{ background:registerMsg.includes("created")?"rgba(90,158,106,0.16)":"rgba(192,57,43,0.16)", border:`1px solid ${registerMsg.includes("created")?"rgba(90,158,106,0.45)":"rgba(192,57,43,0.45)"}`, padding:"10px 14px", fontSize:13, color:registerMsg.includes("created")?"#B9F0C0":"#FFB3A8", marginBottom:16 }}>{registerMsg}</div>}
                  <button onClick={handleRegister} disabled={authBusy} style={{ width:"100%", padding:"14px", border:"none", background:authBusy?"#9A9444":THEME.chartreuse, color:THEME.foreground, fontSize:15, fontWeight:800, cursor:authBusy?"not-allowed":"pointer", fontFamily:"'DM Sans',sans-serif", marginTop:4, marginBottom:16 }}>
                    {authBusy ? "Creating account..." : "Create Account & Explore Grants"}
                  </button>
                  <p style={{ textAlign:"center", fontSize:13, color:"rgba(247,246,241,0.64)", margin:0 }}>
                    Already have an account?{" "}
                    <button onClick={() => setMode("login")} style={{ background:"none", border:"none", color:THEME.chartreuse, cursor:"pointer", fontSize:13, fontFamily:"'DM Sans',sans-serif", fontWeight:800 }}>Sign in</button>
                  </p>
                </>
              )}
            </div>
          </div>
        )}

        {false && mode === "login" && (
          <div style={{ display:"flex", justifyContent:"center", paddingTop:"6vh", paddingBottom:60 }}>
            <div style={{ width:"100%", maxWidth:440 }}>
              <button onClick={() => { setMode("welcome"); resetLoginExtras(); }} style={{ background:"none", border:"none", color:"#6A9C6A", cursor:"pointer", fontSize:13, marginBottom:24, padding:0, fontFamily:"'DM Sans',sans-serif" }}>{"\u2190"} Back</button>
              <div style={{ width:40, height:2, background:"#C8A84B", marginBottom:20 }}/>
              <h2 style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:36, fontWeight:700, margin:"0 0 6px" }}>Sign In</h2>
              <p style={{ fontSize:14, color:"#6A8C6A", marginBottom:24 }}>Welcome back. Access your CanGrants dashboard.</p>

              <GoogleSignInButton disabled={authBusy} onClick={handleGoogleSignIn} />
              <AuthDivider label="or sign in with email" />

              <div style={{ marginBottom:14 }}>
                <label style={{ display:"block", fontSize:11, fontWeight:600, color:"#A8C5A0", letterSpacing:"1px", textTransform:"uppercase", marginBottom:5 }}>Email Address</label>
                <input type="email" value={loginForm.email} onChange={e => setLoginForm(p=>({...p,email:e.target.value}))} placeholder="your@email.com"
                  style={{ width:"100%", padding:"12px 14px", background:"rgba(255,255,255,0.06)", border:"1px solid rgba(200,168,75,0.3)", borderRadius:8, color:"#F4EFE6", fontSize:14, fontFamily:"'DM Sans',sans-serif", outline:"none", boxSizing:"border-box" }}/>
              </div>

              <div style={{ marginBottom:22 }}>
                <label style={{ display:"block", fontSize:11, fontWeight:600, color:"#A8C5A0", letterSpacing:"1px", textTransform:"uppercase", marginBottom:5 }}>Password</label>
                <input type="password" value={loginForm.password} onChange={e => setLoginForm(p=>({...p,password:e.target.value}))} placeholder="\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022"
                  onKeyDown={e => e.key==="Enter" && handleLogin()}
                  style={{ width:"100%", padding:"12px 14px", background:"rgba(255,255,255,0.06)", border:"1px solid rgba(200,168,75,0.3)", borderRadius:8, color:"#F4EFE6", fontSize:14, fontFamily:"'DM Sans',sans-serif", outline:"none", boxSizing:"border-box" }}/>
              </div>

              {loginErr && <div style={{ background:"rgba(192,57,43,0.15)", border:"1px solid rgba(192,57,43,0.4)", borderRadius:8, padding:"10px 14px", fontSize:13, color:"#E74C3C", marginBottom:16 }}>{loginErr}</div>}

              <button onClick={handleLogin} disabled={authBusy} style={{ width:"100%", padding:"14px", borderRadius:10, border:"none", background:authBusy?"#7A6933":"#C8A84B", color:"#0B2215", fontSize:15, fontWeight:700, cursor:authBusy?"not-allowed":"pointer", fontFamily:"'DM Sans',sans-serif", marginBottom:14 }}>
                {authBusy ? "Signing in..." : <>Sign In {"\u2192"}</>}
              </button>

              <p style={{ textAlign:"center", fontSize:13, color:"#666" }}>
                Don't have an account?{" "}
                <button onClick={() => {setMode("register"); setErrors({}); resetLoginExtras();}} style={{ background:"none", border:"none", color:"#C8A84B", cursor:"pointer", fontSize:13, fontFamily:"'DM Sans',sans-serif", fontWeight:600 }}>Create one</button>
              </p>
            </div>
          </div>
        )}

        {false && mode === "register" && (
          <div style={{ display:"flex", justifyContent:"center", paddingTop:"4vh", paddingBottom:60 }}>
            <div style={{ width:"100%", maxWidth:560 }}>
              <button onClick={() => setMode("welcome")} style={{ background:"none", border:"none", color:"#6A9C6A", cursor:"pointer", fontSize:13, marginBottom:24, padding:0, fontFamily:"'DM Sans',sans-serif" }}>{"\u2190"} Back</button>
              <div style={{ width:40, height:2, background:"#C8A84B", marginBottom:20 }}/>
              <h2 style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:36, fontWeight:700, margin:"0 0 6px" }}>Create Your Account</h2>
              <p style={{ fontSize:14, color:"#6A8C6A", marginBottom:8 }}>Join CanGrants — Canada's AI-powered grant platform for artists and producers.</p>
              <div style={{ background:"rgba(200,168,75,0.08)", border:"1px solid rgba(200,168,75,0.2)", borderRadius:8, padding:"10px 14px", fontSize:12, color:"#B8A055", marginBottom:20 }}>
                <strong>Canadian residents only.</strong> A valid Canadian postal code is required for the full registration form. You can also sign in with Google or your email and password.
              </div>

              <GoogleSignInButton disabled={authBusy} onClick={handleGoogleSignIn} />
              <AuthDivider label="or register with email" />

              <div style={{ fontSize:11, fontWeight:700, color:"#C8A84B", letterSpacing:"2px", textTransform:"uppercase", marginBottom:14, paddingBottom:8, borderBottom:"1px solid rgba(200,168,75,0.15)" }}>Personal Info</div>
              {inp("name","Full Name")}
              {inp("email","Email Address","email")}
              {inp("password","Password","password")}

              <div style={{ fontSize:11, fontWeight:700, color:"#C8A84B", letterSpacing:"2px", textTransform:"uppercase", margin:"20px 0 14px", paddingBottom:8, borderBottom:"1px solid rgba(200,168,75,0.15)" }}>Canadian Address</div>
              {inp("address","Street Address")}
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
                <div>{inp("city","City")}</div>
                <div>{inp("postal","Postal Code")}<div style={{ fontSize:11, color:"#555", marginTop:2 }}>Format: A1A 1A1</div></div>
              </div>
              {inp("province","Province / Territory","text", CA_PROVINCES)}

              <div style={{ fontSize:11, fontWeight:700, color:"#C8A84B", letterSpacing:"2px", textTransform:"uppercase", margin:"20px 0 14px", paddingBottom:8, borderBottom:"1px solid rgba(200,168,75,0.15)" }}>Your Practice</div>
              {inp("discipline","Primary Discipline","text", ["Film","Documentary","Animation","Television","Digital Media","Visual Arts","Music","Writing","Interdisciplinary","Other"])}
              {inp("career","Career Stage","text", ["Emerging (0\u20135 years)","Mid-Career (5\u201315 years)","Established (15+ years)","Student","Organization / Company"])}

              {registerMsg && <div style={{ background:registerMsg.includes("created")?"rgba(90,158,106,0.15)":"rgba(192,57,43,0.15)", border:`1px solid ${registerMsg.includes("created")?"rgba(90,158,106,0.4)":"rgba(192,57,43,0.4)"}`, borderRadius:8, padding:"10px 14px", fontSize:13, color:registerMsg.includes("created")?"#A8C5A0":"#E74C3C", marginBottom:16 }}>{registerMsg}</div>}

              <button onClick={handleRegister} disabled={authBusy} style={{ width:"100%", padding:"15px", borderRadius:10, border:"none", background:authBusy?"#7A6933":"#C8A84B", color:"#0B2215", fontSize:16, fontWeight:700, cursor:authBusy?"not-allowed":"pointer", fontFamily:"'DM Sans',sans-serif", marginTop:10, marginBottom:12, letterSpacing:"0.5px" }}>
                {authBusy ? "Creating account..." : <>Create Account & Explore Grants {"\u2192"}</>}
              </button>
              <p style={{ textAlign:"center", fontSize:13, color:"#666" }}>
                Already have an account?{" "}
                <button onClick={() => setMode("login")} style={{ background:"none", border:"none", color:"#C8A84B", cursor:"pointer", fontSize:13, fontFamily:"'DM Sans',sans-serif", fontWeight:600 }}>Sign in</button>
              </p>
            </div>
          </div>
        )}
      </div>

      <div style={{ position:"relative", zIndex:5, borderTop:"1px solid rgba(200,168,75,0.1)", padding:"24px 40px", display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:16, marginTop:20 }}>
        <CanGrantsLogoImg size="sm"/>
        <div style={{ fontSize:12, color:"#444", textAlign:"right" }}>
          <div style={{ color:"#C8A84B", fontWeight:600, fontSize:13 }}>CanGrants</div>
          <div>{"\u00A9"} 2026 {COMPANY_NAME} {"\u00b7"} Toronto, Canada {"\u00b7"} betterhalflabs.com</div>
          <div style={{ marginTop:3 }}>Proudly built for Canadian artists & producers</div>
        </div>
      </div>

      <style>{`
        @keyframes drift {
          from { transform: translateY(0px) translateX(0px); opacity:0.15; }
          to { transform: translateY(-20px) translateX(10px); opacity:0.35; }
        }
      `}</style>
    </div>
  );
}

function Dashboard({ user, onLogout, grants, grantsSource }: { user: UserInfo; onLogout: () => void; grants: Grant[]; grantsSource: GrantsSource }) {
  const allDisciplines = useMemo(() => [...new Set(grants.flatMap(g => g.discipline))].sort(), [grants]);
  const allTags = useMemo(() => [...new Set(grants.flatMap(g => g.tags))].sort(), [grants]);
  const [activeTab, setActiveTab] = useState<DashboardTabId>(() => getDashboardTabForPath());
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState({ discipline:"", location:"", tag:"", deadline:"" });
  const [saved, setSaved] = useState<Set<number>>(new Set());
  const [userDataLoading, setUserDataLoading] = useState(true);
  const [showSignOutPrompt, setShowSignOutPrompt] = useState(false);
  const [applications, setApplications] = useState<UserApplication[]>([]);
  const [selectedGrant, setSelectedGrant] = useState<Grant | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role:"assistant" as const, content:`Welcome back, ${user.name}!\n\nI'm your CanGrants AI assistant. I can help you find the right grants, check your eligibility, and draft compelling proposals. What would you like to work on today?` }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const preserveDemoSearch = user.id === DEMO_USER.id;
    if (!isDashboardPath()) {
      window.history.replaceState(null, "", dashboardUrlForTab("discover", preserveDemoSearch));
      setActiveTab("discover");
    }
    const handlePopState = () => setActiveTab(getDashboardTabForPath());
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [user.id]);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior:"smooth" }); }, [messages]);

  useEffect(() => {
    if (user.id === DEMO_USER.id) {
      setSaved(new Set());
      setApplications([]);
      setUserDataLoading(false);
      return;
    }

    let cancelled = false;
    setUserDataLoading(true);
    Promise.all([
      fetchSavedGrantIds(user.id),
      fetchApplications(user.id),
    ]).then(([savedIds, apps]) => {
      if (!cancelled) {
        setSaved(savedIds);
        setApplications(apps);
        setUserDataLoading(false);
      }
    });
    return () => { cancelled = true; };
  }, [user.id]);

  const filtered = grants.filter(g => {
    const matchSearch = matchesGrantSearch(g, search);
    const matchDisc = !filters.discipline || matchesNormalizedListValue(filters.discipline, g.discipline);
    const matchLoc = !filters.location || g.location === filters.location;
    const matchTag = !filters.tag || matchesNormalizedListValue(filters.tag, g.tags);
    const matchDead = !filters.deadline || (() => {
      if (filters.deadline==="rolling") return g.close==="Rolling";
      if (filters.deadline==="urgent") { const d=getDeadlineStatus(g.close); return d.days>=0&&d.days<=14; }
      if (filters.deadline==="month") { const d=getDeadlineStatus(g.close); return d.days>14&&d.days<=45; }
      return true;
    })();
    return matchSearch&&matchDisc&&matchLoc&&matchTag&&matchDead;
  });

  const toggleSave = async (grantId: number) => {
    const wasSaved = saved.has(grantId);
    setSaved(prev => {
      const next = new Set(prev);
      if (wasSaved) next.delete(grantId);
      else next.add(grantId);
      return next;
    });
    if (user.id === DEMO_USER.id) return;
    try {
      if (wasSaved) await unsaveGrant(user.id, grantId);
      else await saveGrant(user.id, grantId);
    } catch {
      setSaved(prev => {
        const next = new Set(prev);
        if (wasSaved) next.add(grantId);
        else next.delete(grantId);
        return next;
      });
    }
  };

  const addApplication = async (grant: Grant) => {
    if (applications.find(a => a.id === grant.id)) return;
    const optimistic: UserApplication = { id: grant.id, dbId: -1, status: "Not Started", notes: "" };
    setApplications(p => [...p, optimistic]);
    if (user.id === DEMO_USER.id) return;
    try {
      const created = await createApplication(user.id, grant.id);
      setApplications(p => p.map(a => (a.id === grant.id && a.dbId === -1 ? created : a)));
    } catch {
      setApplications(p => p.filter(a => a.id !== grant.id || a.dbId !== -1));
    }
  };

  const updateAppStatus = async (dbId: number, grantId: number, status: UserApplication["status"]) => {
    const previous = applications.find(a => a.dbId === dbId);
    setApplications(p => p.map(a => a.dbId === dbId ? { ...a, status } : a));
    if (user.id === DEMO_USER.id) return;
    try {
      await updateApplicationStatus(dbId, status);
    } catch {
      if (previous) {
        setApplications(p => p.map(a => a.dbId === dbId ? previous : a));
      }
    }
  };

  const sendMessage = async () => {
    if (!input.trim()||loading) return;
    const userMsg = {role:"user" as const, content:input};
    setMessages(p=>[...p,userMsg]); setInput(""); setLoading(true);
    try {
      const res = await fetch(`${import.meta.env.BASE_URL}api/chat`.replace(/\/\//g, '/'), {
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body: JSON.stringify({
          messages:[...messages,userMsg].map(m=>({role:m.role,content:m.content})),
          userName: user.name,
          userProvince: user.province || "Canada",
          userDiscipline: user.discipline || "",
        })
      });
      if (!res.ok) throw new Error("Chat API unavailable");
      const data = await res.json();
      setMessages(p=>[...p,{role:"assistant" as const,content:data.content||getLocalAssistantResponse(userMsg.content, user, grants)}]);
    } catch { setMessages(p=>[...p,{role:"assistant" as const,content:getLocalAssistantResponse(userMsg.content, user, grants)}]); }
    setLoading(false);
  };

  const savedGrants = grants.filter(g=>saved.has(g.id));
  const appGrants = applications.map(a=>({...a,grant:grants.find(g=>g.id===a.id)!}));
  const statusColors: Record<string,string> = {"Not Started":"#8B6914","In Progress":"#1A6BC4","Submitted":"#1E7A3E"};
  const statusBg: Record<string,string> = {"Not Started":"#FEF3C7","In Progress":"#DBEAFE","Submitted":"#D1FAE5"};
  const preserveDemoSearch = user.id === DEMO_USER.id;

  const selectDashboardTab = (tabId: DashboardTabId) => {
    setActiveTab(tabId);
    if (typeof window === "undefined") return;
    const nextUrl = dashboardUrlForTab(tabId, preserveDemoSearch);
    const currentUrl = `${window.location.pathname}${window.location.search}`;
    if (currentUrl !== nextUrl) {
      window.history.pushState(null, "", nextUrl);
    }
  };

  return (
    <div style={{ fontFamily:"'DM Sans',sans-serif", background:"#F4EFE6", minHeight:"100vh", color:"#1A1208" }}>
      <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;600;700&family=DM+Sans:wght@300;400;500;600&family=Barlow:wght@700;800&display=swap" rel="stylesheet"/>

      <header className="dashboard-header" style={{ background:"#0B2215", color:"#F4EFE6", padding:"0 34px", display:"flex", alignItems:"center", justifyContent:"space-between", minHeight:86, position:"sticky", top:0, zIndex:100, boxShadow:"0 2px 20px rgba(0,0,0,0.3)" }}>
        <div style={{ display:"flex", alignItems:"center", gap:18 }}>
          <CanGrantsLogoImg size="sm" />
          <div style={{ width:1, height:28, background:"rgba(200,168,75,0.3)" }}/>
          <span style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:34, fontWeight:700, letterSpacing:"0", color:"#C8A84B" }}>CanGrants</span>
        </div>
        <div className="dashboard-header-actions" style={{ display:"flex", gap:12, alignItems:"center" }}>
          <nav style={{ display:"flex", gap:10, flexWrap:"wrap" }}>
            {DASHBOARD_NAV_ITEMS.map(tab => (
              <a
                key={tab.id}
                href={dashboardUrlForTab(tab.id, preserveDemoSearch)}
                onClick={event => {
                  event.preventDefault();
                  selectDashboardTab(tab.id);
                }}
                style={{ background:activeTab===tab.id?"#C8A84B":"transparent", color:activeTab===tab.id?"#0B2215":"#A8C5A0", border:"none", borderRadius:8, padding:"12px 18px", fontSize:20, fontWeight:800, cursor:"pointer", fontFamily:"'DM Sans',sans-serif", textDecoration:"none", display:"inline-flex", alignItems:"center" }}
              >
                {tab.id === "saved" ? `Saved (${saved.size})` : tab.label}
              </a>
            ))}
          </nav>
          <div style={{ width:1, height:32, background:"rgba(200,168,75,0.2)", margin:"0 10px" }}/>
          <div style={{ fontSize:18, color:"#8BB88B", marginRight:8, fontWeight:700 }}>{user.name.split(" ")[0]}</div>
          <button onClick={() => setShowSignOutPrompt(true)} style={{ padding:"11px 17px", borderRadius:8, border:"1px solid rgba(200,168,75,0.45)", background:"transparent", color:"#C8A84B", fontSize:18, cursor:"pointer", fontFamily:"'DM Sans',sans-serif", fontWeight:800 }}>Sign Out</button>
        </div>
      </header>

      <div className="dashboard-shell" style={{ maxWidth:1640, margin:"0 auto", padding:"38px 42px" }}>
        {userDataLoading ? (
          <div style={{ textAlign:"center", padding:"80px 0", color:"#5A6B5A" }}>Loading your saved grants and applications…</div>
        ) : (<>
        {activeTab==="discover" && (
          <div>
            <div style={{ marginBottom:28, display:"flex", gap:16, flexWrap:"wrap", alignItems:"center", justifyContent:"space-between" }}>
              <div>
                <h1 style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:42, fontWeight:700, margin:"0 0 6px", color:"#0B2215" }}>Grant Discovery</h1>
                <p style={{ margin:0, color:"#5A6B5A", fontSize:14 }}>{grants.length} opportunities \u00b7 Canadian &amp; International \u00b7 Updated 2026{grantsSource === "fallback" ? " · offline catalog" : ""}</p>
              </div>
              <div style={{ display:"flex", gap:12 }}>
                {[{label:"Total",value:grants.length,color:"#C8A84B"},{label:"Canadian",value:grants.filter(g=>g.location==="Canada").length,color:"#2D7D46"},{label:"International",value:grants.filter(g=>g.location==="International").length,color:"#1A5FA8"}].map(s=>(
                  <div key={s.label} style={{ background:"#fff", borderRadius:12, padding:"14px 24px", textAlign:"center", boxShadow:"0 1px 8px rgba(0,0,0,0.08)", minWidth:104 }}>
                    <div style={{ fontSize:32, fontWeight:700, fontFamily:"'Cormorant Garamond',serif", color:s.color }}>{s.value}</div>
                    <div style={{ fontSize:14, color:"#777", fontWeight:800, textTransform:"uppercase", letterSpacing:"0.5px" }}>{s.label}</div>
                  </div>
                ))}
              </div>
            </div>
            <div style={{ background:"#fff", borderRadius:16, padding:24, marginBottom:26, boxShadow:"0 2px 14px rgba(0,0,0,0.07)", border:"1px solid #E8E0D0" }}>
              <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search grants, organizations, disciplines, tags..." style={{ width:"100%", padding:"17px 20px", borderRadius:10, border:"1.5px solid #D5CBB8", fontSize:18, fontFamily:"'DM Sans',sans-serif", background:"#FAFAF7", outline:"none", boxSizing:"border-box", marginBottom:16, color:"#1A1208" }}/>
              <div style={{ display:"flex", gap:10, flexWrap:"wrap" }}>
                {[{key:"discipline",label:"Discipline",opts:allDisciplines},{key:"location",label:"Location",opts:["Canada","International"]},{key:"deadline",label:"Deadline",opts:[["urgent","Urgent (\u226414 days)"],["month","This Month"],["rolling","Rolling"]]},{key:"tag",label:"For\u2026",opts:allTags}].map(({key,label,opts})=>(
                  <select key={key} value={filters[key as keyof typeof filters]} onChange={e=>setFilters(p=>({...p,[key]:e.target.value}))} style={{ padding:"12px 16px", minHeight:48, borderRadius:9, border:"1.5px solid #D5CBB8", fontSize:16, background:"#fff", fontFamily:"'DM Sans',sans-serif", color:"#1A1208", cursor:"pointer", fontWeight:700 }}>
                    <option value="">{label}: All</option>
                    {opts.map(o=>Array.isArray(o)?<option key={o[0]} value={o[0]}>{o[1]}</option>:<option key={o} value={o}>{o}</option>)}
                  </select>
                ))}
                {(search||Object.values(filters).some(Boolean))&&<button onClick={()=>{setSearch("");setFilters({discipline:"",location:"",tag:"",deadline:""}); }} style={{ padding:"12px 18px", borderRadius:9, border:"1px solid #E0D5C5", background:"transparent", fontSize:16, cursor:"pointer", color:"#777", fontFamily:"'DM Sans',sans-serif", fontWeight:800 }}>Clear all</button>}
              </div>
            </div>
            <p style={{ fontSize:17, color:"#777", marginBottom:18, fontWeight:800 }}>Showing {filtered.length} of {grants.length} grants</p>
            <div className="dashboard-grants-grid" style={{ display:"grid", gridTemplateColumns:"repeat(3,minmax(0,1fr))", gap:24 }}>
              {filtered.map(g=>{
                const dl=getDeadlineStatus(g.close), isSaved=saved.has(g.id), hasApp=applications.find(a=>a.id===g.id);
                return (
                  <div key={g.id} style={{ background:"#fff", borderRadius:14, border:"1px solid #E8E0D0", boxShadow:"0 2px 12px rgba(0,0,0,0.06)", overflow:"hidden", display:"flex", flexDirection:"column" }}>
                    <div style={{ background:g.location==="Canada"?"#0B2215":"#1A2F5A", padding:"18px 22px", display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
                      <div style={{ flex:1 }}>
                        <div style={{ fontSize:13, letterSpacing:"1.5px", color:g.location==="Canada"?"#6A9C6A":"#6A8CC8", textTransform:"uppercase", marginBottom:6, fontWeight:800 }}>{g.location} \u00b7 {g.discipline.slice(0,2).join(", ")}</div>
                        <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:24, fontWeight:700, color:"#F4EFE6", lineHeight:1.18 }}>{g.name}</div>
                        <div style={{ fontSize:16, color:"#A8C5A0", marginTop:5, fontWeight:700 }}>{g.org}</div>
                      </div>
                      <button onClick={()=>toggleSave(g.id)} style={{ background:"none", border:"none", cursor:"pointer", fontSize:22, padding:"0 0 0 10px", color:isSaved?"#C8A84B":"#4A6A4A" }}>{isSaved?"\u2605":"\u2606"}</button>
                    </div>
                    <div style={{ padding:"16px 22px", flex:1, display:"flex", flexDirection:"column", gap:12 }}>
                      <p style={{ margin:0, fontSize:16, color:"#4F614F", lineHeight:1.65 }}>{g.description}</p>
                      <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
                        {g.tags.slice(0,3).map(t=><span key={t} style={{ background:"#EEF5EE", color:"#2A5C2A", fontSize:12, padding:"4px 9px", borderRadius:20, fontWeight:700 }}>{t}</span>)}
                      </div>
                      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginTop:"auto" }}>
                        <div><div style={{ fontSize:12, color:"#777", marginBottom:3, fontWeight:700 }}>Deadline</div><span style={{ background:dl.color+"20", color:dl.color, fontSize:13, fontWeight:700, padding:"4px 10px", borderRadius:12, border:`1px solid ${dl.color}40` }}>{dl.label}</span></div>
                        <div style={{ textAlign:"right" }}><div style={{ fontSize:12, color:"#777", marginBottom:3, fontWeight:700 }}>Amount</div><div style={{ fontSize:15, fontWeight:800, color:"#1A7A3A" }}>{g.amount}</div></div>
                      </div>
                    </div>
                    <div style={{ padding:"14px 22px", borderTop:"1px solid #F0E8D8", display:"flex", gap:10 }}>
                      <button onClick={()=>setSelectedGrant(g)} style={{ flex:1, padding:"12px 0", borderRadius:9, border:"1.5px solid #D5CBB8", background:"transparent", fontSize:16, cursor:"pointer", color:"#5A4A2A", fontFamily:"'DM Sans',sans-serif", fontWeight:800 }}>Details</button>
                      <button onClick={()=>{addApplication(g);selectDashboardTab("applications");}} style={{ flex:1, padding:"12px 0", borderRadius:9, border:"none", background:hasApp?"#E8F5E8":"#0B2215", color:hasApp?"#1A7A3A":"#C8A84B", fontSize:16, cursor:"pointer", fontFamily:"'DM Sans',sans-serif", fontWeight:800 }}>{hasApp?"\u2713 Tracking":"Track"}</button>
                      <a href={g.url} target="_blank" rel="noopener noreferrer" style={{ flex:1, padding:"12px 0", borderRadius:9, border:"none", background:"#C8A84B", color:"#0B2215", fontSize:16, cursor:"pointer", fontFamily:"'DM Sans',sans-serif", fontWeight:800, textDecoration:"none", textAlign:"center", lineHeight:"1.4" }}>Apply {"\u2197"}</a>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {activeTab==="saved" && (
          <div>
            <h1 style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:40, fontWeight:700, marginBottom:8, color:"#0B2215" }}>Saved Grants</h1>
            <p style={{ color:"#5A6B5A", fontSize:16, marginBottom:26, fontWeight:500 }}>{saved.size} grants saved to your list</p>
            {savedGrants.length===0?(<div style={{ textAlign:"center", padding:"60px 0", color:"#888" }}><div style={{ fontSize:40, marginBottom:12 }}>\u2606</div><p>No saved grants yet. Star grants in Discover.</p></div>):(
              <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
                {savedGrants.map(g=>{
                  const dl=getDeadlineStatus(g.close), hasApp=applications.find(a=>a.id===g.id);
                  return (
                    <div key={g.id} style={{ background:"#fff", borderRadius:12, border:"1px solid #E8E0D0", padding:"18px 22px", display:"flex", gap:18, alignItems:"center", boxShadow:"0 1px 8px rgba(0,0,0,0.04)" }}>
                      <div style={{ width:6, alignSelf:"stretch", background:g.location==="Canada"?"#2D7D46":"#1A5FA8", borderRadius:3, flexShrink:0 }}/>
                      <div style={{ flex:1 }}>
                        <div style={{ display:"flex", gap:8, alignItems:"baseline", marginBottom:3 }}>
                          <span style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:22, fontWeight:700, color:"#0B2215" }}>{g.name}</span>
                          <span style={{ fontSize:14, color:"#777", fontWeight:600 }}>\u00b7 {g.org}</span>
                        </div>
                        <p style={{ margin:"4px 0", fontSize:15, color:"#5A6B5A", lineHeight:1.55 }}>{g.eligibility.slice(0,120)}\u2026</p>
                        <div style={{ display:"flex", gap:8, marginTop:6, flexWrap:"wrap" }}>
                          {g.tags.slice(0,3).map(t=><span key={t} style={{ background:"#EEF5EE", color:"#2A5C2A", fontSize:11, padding:"2px 7px", borderRadius:12 }}>{t}</span>)}
                        </div>
                      </div>
                      <div style={{ display:"flex", flexDirection:"column", gap:8, alignItems:"flex-end", flexShrink:0 }}>
                        <span style={{ background:dl.color+"20", color:dl.color, fontSize:12, fontWeight:600, padding:"3px 10px", borderRadius:12 }}>{dl.label}</span>
                        <span style={{ fontSize:13, fontWeight:600, color:"#1A7A3A" }}>{g.amount}</span>
                        <div style={{ display:"flex", gap:6 }}>
                          <button onClick={()=>toggleSave(g.id)} style={{ padding:"6px 12px", borderRadius:7, border:"1px solid #E0D5C5", background:"transparent", fontSize:12, cursor:"pointer", color:"#888" }}>Remove</button>
                          <button onClick={()=>{addApplication(g);selectDashboardTab("applications");}} style={{ padding:"6px 12px", borderRadius:7, border:"none", background:hasApp?"#E8F5E8":"#0B2215", color:hasApp?"#1A7A3A":"#C8A84B", fontSize:12, cursor:"pointer", fontWeight:500 }}>{hasApp?"\u2713 Tracked":"Track"}</button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {activeTab==="applications" && (
          <div>
            <h1 style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:40, fontWeight:700, marginBottom:8, color:"#0B2215" }}>My Applications</h1>
            <p style={{ color:"#5A6B5A", fontSize:16, marginBottom:26, fontWeight:500 }}>Track your grant applications and their status</p>
            {["Not Started","In Progress","Submitted"].map(status=>{
              const apps=appGrants.filter(a=>a.status===status&&a.grant);
              return (
                <div key={status} style={{ marginBottom:28 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:14 }}>
                    <span style={{ background:statusBg[status], color:statusColors[status], fontSize:13, fontWeight:700, padding:"5px 13px", borderRadius:20 }}>{status}</span>
                    <span style={{ fontSize:14, color:"#777", fontWeight:600 }}>{apps.length} grant{apps.length!==1?"s":""}</span>
                  </div>
                  {apps.length===0?(<div style={{ background:"#FAFAF7", borderRadius:10, padding:"20px", textAlign:"center", color:"#bbb", fontSize:13, border:"1px dashed #E0D5C5" }}>No grants here yet</div>):(
                    <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                      {apps.map(({grant,id,dbId,notes})=>{
                        const dl=getDeadlineStatus(grant.close);
                        return (
                          <div key={id} style={{ background:"#fff", borderRadius:12, border:"1px solid #E8E0D0", padding:"16px 20px", display:"flex", gap:16, alignItems:"center" }}>
                            <div style={{ flex:1 }}>
                              <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:21, fontWeight:700, color:"#0B2215" }}>{grant.name}</div>
                              <div style={{ fontSize:14, color:"#777", marginBottom:notes?6:0, fontWeight:600 }}>{grant.org} \u00b7 {grant.amount}</div>
                              {notes&&<div style={{ fontSize:12, color:"#5A6B5A", background:"#F7F2E8", padding:"5px 10px", borderRadius:6, marginTop:4 }}>{notes}</div>}
                            </div>
                            <div style={{ display:"flex", flexDirection:"column", gap:8, alignItems:"flex-end", flexShrink:0 }}>
                              <span style={{ background:dl.color+"20", color:dl.color, fontSize:12, fontWeight:600, padding:"3px 10px", borderRadius:12 }}>{dl.label}</span>
                              <select value={status} onChange={e=>updateAppStatus(dbId, id, e.target.value as UserApplication["status"])} style={{ padding:"5px 10px", borderRadius:7, border:"1px solid #D5CBB8", fontSize:12, fontFamily:"'DM Sans',sans-serif", background:"#fff", cursor:"pointer" }}>
                                {["Not Started","In Progress","Submitted"].map(s=><option key={s} value={s}>{s}</option>)}
                              </select>
                              <button onClick={()=>{setInput(`Help me write a grant proposal for ${grant.name} by ${grant.org}. Amount: ${grant.amount}. My project is...`);selectDashboardTab("assistant");}} style={{ padding:"5px 12px", borderRadius:7, border:"none", background:"#C8A84B", color:"#0B2215", fontSize:12, cursor:"pointer", fontWeight:600, fontFamily:"'DM Sans',sans-serif" }}>AI Draft {"\u2192"}</button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {activeTab==="assistant" && (
          <div style={{ maxWidth:1040, margin:"0 auto" }}>
            <h1 style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:40, fontWeight:700, marginBottom:6, color:"#0B2215" }}>AI Grant Assistant</h1>
            <p style={{ color:"#5A6B5A", fontSize:16, margin:"0 0 22px", fontWeight:500 }}>Ask about eligibility, get grant recommendations, draft proposals and artist statements</p>
            <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginBottom:20 }}>
              {["Which grants am I eligible for as a South Asian diaspora filmmaker in Toronto?","Draft an artist statement for Soso Park for the MAC Matchmaker grant","What are the most urgent upcoming deadlines?","Help me write a project summary for Son of Soil"].map(p=>(
                <button key={p} onClick={()=>setInput(p)} style={{ padding:"9px 15px", borderRadius:20, border:"1.5px solid #C8A84B", background:"#FEF8EC", color:"#7A5A0A", fontSize:14, cursor:"pointer", fontFamily:"'DM Sans',sans-serif", fontWeight:600 }}>
                  {p.length>50?p.slice(0,50)+"\u2026":p}
                </button>
              ))}
            </div>
            <div style={{ background:"#fff", borderRadius:16, border:"1px solid #E8E0D0", boxShadow:"0 2px 20px rgba(0,0,0,0.06)", overflow:"hidden" }}>
              <div style={{ height:460, overflowY:"auto", padding:"24px 24px 12px" }}>
                {messages.map((m,i)=>(
                  <div key={i} style={{ marginBottom:18, display:"flex", justifyContent:m.role==="user"?"flex-end":"flex-start" }}>
                    {m.role==="assistant"&&<div style={{ width:30, height:30, borderRadius:8, background:"#0B2215", color:"#C8A84B", fontSize:14, fontWeight:700, display:"flex", alignItems:"center", justifyContent:"center", marginRight:10, flexShrink:0, fontFamily:"'Cormorant Garamond',serif" }}>C</div>}
                    <div style={{ background:m.role==="user"?"#0B2215":"#F7F2E8", color:m.role==="user"?"#F4EFE6":"#1A1208", padding:"13px 17px", borderRadius:m.role==="user"?"14px 14px 4px 14px":"14px 14px 14px 4px", maxWidth:"78%", fontSize:15, lineHeight:1.65, whiteSpace:"pre-wrap" }}>{m.content}</div>
                  </div>
                ))}
                {loading&&<div style={{ display:"flex", gap:10, alignItems:"center", padding:"8px 0" }}>
                  <div style={{ width:30, height:30, borderRadius:8, background:"#0B2215", color:"#C8A84B", fontSize:14, fontWeight:700, display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"'Cormorant Garamond',serif" }}>C</div>
                  <div style={{ display:"flex", gap:5 }}>{[0,1,2].map(i=><div key={i} style={{ width:7, height:7, borderRadius:"50%", background:"#C8A84B", animation:"pulse 1.2s ease-in-out infinite", animationDelay:`${i*0.2}s` }}/>)}</div>
                </div>}
                <div ref={chatEndRef}/>
              </div>
              <div style={{ padding:"14px 18px", borderTop:"1px solid #F0E8D8", display:"flex", gap:10 }}>
                <textarea value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();sendMessage();}}} placeholder="Ask about grants, eligibility, or request a draft..." rows={2}
                  style={{ flex:1, padding:"10px 14px", borderRadius:10, border:"1.5px solid #D5CBB8", fontSize:14, fontFamily:"'DM Sans',sans-serif", resize:"none", outline:"none", background:"#FAFAF7", color:"#1A1208", lineHeight:1.5 }}/>
                <button onClick={sendMessage} disabled={loading||!input.trim()} style={{ padding:"10px 20px", borderRadius:10, border:"none", background:loading||!input.trim()?"#D5CBB8":"#0B2215", color:loading||!input.trim()?"#888":"#C8A84B", fontWeight:600, fontSize:14, cursor:loading||!input.trim()?"not-allowed":"pointer", fontFamily:"'DM Sans',sans-serif", alignSelf:"flex-end" }}>Send</button>
              </div>
            </div>
            <p style={{ textAlign:"center", fontSize:12, color:"#aaa", marginTop:12 }}>Powered by Claude {"\u00b7"} Tailored for {COMPANY_NAME}</p>
          </div>
        )}
        </>)}
      </div>

      <footer style={{ borderTop:"1px solid #E8E0D0", padding:"24px 40px", display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:16, marginTop:40, background:"#fff" }}>
        <CanGrantsLogoImg size="md" />
        <div style={{ textAlign:"right", fontSize:12, color:"#888" }}>
          <div style={{ color:"#C8A84B", fontWeight:600, fontSize:14, fontFamily:"'Cormorant Garamond',serif" }}>CanGrants</div>
          <div>{"\u00A9"} 2026 {COMPANY_NAME} {"\u00b7"} Toronto, Canada {"\u00b7"} betterhalflabs.com</div>
          <div style={{ marginTop:3 }}>A platform for Canadian artists & producers</div>
        </div>
      </footer>

      {selectedGrant&&(
        <div onClick={()=>setSelectedGrant(null)} style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.5)", zIndex:200, display:"flex", alignItems:"center", justifyContent:"center", padding:32 }}>
          <div onClick={e=>e.stopPropagation()} style={{ background:"#fff", borderRadius:20, maxWidth:1280, width:"100%", maxHeight:"88vh", overflowY:"auto", boxShadow:"0 24px 70px rgba(0,0,0,0.34)" }}>
            <div style={{ background:selectedGrant.location==="Canada"?"#0B2215":"#1A2F5A", padding:"40px 48px", borderRadius:"20px 20px 0 0" }}>
              <div style={{ fontSize:"22pt", letterSpacing:"1px", color:selectedGrant.location==="Canada"?"#6A9C6A":"#6A8CC8", textTransform:"uppercase", marginBottom:12, lineHeight:1.35, fontWeight:800 }}>{selectedGrant.location} \u00b7 {selectedGrant.discipline.join(", ")}</div>
              <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:"34pt", fontWeight:700, color:"#F4EFE6", lineHeight:1.08 }}>{selectedGrant.name}</div>
              <div style={{ fontSize:"24pt", color:"#A8C5A0", marginTop:12, fontWeight:700 }}>{selectedGrant.org}</div>
            </div>
            <div style={{ padding:"40px 48px" }}>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(320px, 1fr))", gap:20, marginBottom:32 }}>
                {[{label:"Amount",value:selectedGrant.amount},{label:"Deadline",value:selectedGrant.close==="Rolling"?"Rolling":new Date(selectedGrant.close).toLocaleDateString("en-CA",{month:"long",day:"numeric",year:"numeric"})},{label:"Opens",value:new Date(selectedGrant.open).toLocaleDateString("en-CA",{month:"long",day:"numeric",year:"numeric"})},{label:"Location",value:selectedGrant.location}].map(({label,value})=>(
                  <div key={label} style={{ background:"#F7F2E8", borderRadius:12, padding:"20px 24px" }}>
                    <div style={{ fontSize:"22pt", color:"#777", marginBottom:8, fontWeight:800 }}>{label}</div>
                    <div style={{ fontSize:"22pt", fontWeight:800, color:"#0B2215", lineHeight:1.35 }}>{value}</div>
                  </div>
                ))}
              </div>
              <div style={{ marginBottom:32 }}>
                <div style={{ fontSize:"22pt", fontWeight:800, color:"#C8A84B", letterSpacing:"1px", textTransform:"uppercase", marginBottom:14 }}>Description</div>
                <p style={{ margin:0, fontSize:"22pt", color:"#3A3A2A", lineHeight:1.65 }}>{selectedGrant.description}</p>
              </div>
              <div style={{ marginBottom:32 }}>
                <div style={{ fontSize:"22pt", fontWeight:800, color:"#C8A84B", letterSpacing:"1px", textTransform:"uppercase", marginBottom:14 }}>Eligibility</div>
                <p style={{ margin:0, fontSize:"22pt", color:"#3A3A2A", lineHeight:1.65 }}>{selectedGrant.eligibility}</p>
              </div>
              <div style={{ marginBottom:32 }}>
                <div style={{ fontSize:"22pt", fontWeight:800, color:"#C8A84B", letterSpacing:"1px", textTransform:"uppercase", marginBottom:14 }}>Tags</div>
                <div style={{ display:"flex", gap:12, flexWrap:"wrap" }}>
                  {selectedGrant.tags.map(t=><span key={t} style={{ background:"#EEF5EE", color:"#2A5C2A", fontSize:"22pt", padding:"10px 16px", borderRadius:26, fontWeight:700, lineHeight:1.25 }}>{t}</span>)}
                </div>
              </div>
              <div style={{ display:"flex", gap:14, marginTop:32, flexWrap:"wrap" }}>
                <a href={selectedGrant.url} target="_blank" rel="noopener noreferrer" style={{ flex:1, minWidth:280, padding:"18px 0", borderRadius:12, border:"none", background:"#C8A84B", color:"#0B2215", fontSize:"22pt", fontWeight:800, textDecoration:"none", textAlign:"center", cursor:"pointer", fontFamily:"'DM Sans',sans-serif" }}>Apply Now {"\u2197"}</a>
                <button onClick={()=>setSelectedGrant(null)} style={{ flex:1, minWidth:280, padding:"18px 0", borderRadius:12, border:"1.5px solid #D5CBB8", background:"transparent", fontSize:"22pt", cursor:"pointer", color:"#5A4A2A", fontFamily:"'DM Sans',sans-serif", fontWeight:800 }}>Close</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showSignOutPrompt && (
        <SignOutWishlistSheet user={user} onClose={() => setShowSignOutPrompt(false)} onSignOut={onLogout} />
      )}

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.3; transform: scale(0.8); }
          50% { opacity: 1; transform: scale(1.2); }
        }
      `}</style>
    </div>
  );
}

function App() {
  const [user, setUser] = useState<UserInfo | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [grants, setGrants] = useState<Grant[]>([]);
  const [grantsLoading, setGrantsLoading] = useState(false);
  const [grantsSource, setGrantsSource] = useState<GrantsSource>("fallback");

  useEffect(() => {
    if (canOpenDemoDashboard()) {
      setUser(DEMO_USER);
      setAuthLoading(false);
      return () => {};
    }

    const unsubscribe = initAuth((profile) => {
      setUser(profile);
      setAuthLoading(false);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!user) return;
    if (user.id === DEMO_USER.id) {
      setGrants(FALLBACK_GRANTS);
      setGrantsSource("fallback");
      setGrantsLoading(false);
      return;
    }

    let cancelled = false;
    setGrantsLoading(true);
    fetchGrants().then(({ grants: loaded, source }) => {
      if (!cancelled) {
        setGrants(loaded);
        setGrantsSource(source);
        setGrantsLoading(false);
      }
    });
    return () => { cancelled = true; };
  }, [user]);

  const handleLogout = async () => {
    await signOut();
    if (typeof window !== "undefined") {
      window.history.replaceState(null, "", withBasePath("/"));
    }
    setUser(null);
  };

  if (authLoading) {
    return (
      <div style={{ fontFamily:"'DM Sans',sans-serif", background:"#030E07", minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center", color:"#F4EFE6" }}>
        <p style={{ fontSize:16 }}>Loading…</p>
      </div>
    );
  }

  if (!user) {
    const publicPath = getCurrentAppPath();
    if (publicPath !== "/" && PUBLIC_NAV_ITEMS.some(item => item.href === publicPath)) {
      return <PublicInfoPage path={publicPath} />;
    }
    return <LandingPage onAuth={setUser} />;
  }

  if (grantsLoading) {
    return (
      <div style={{ fontFamily:"'DM Sans',sans-serif", background:"#F4EFE6", minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center", color:"#0B2215" }}>
        <p style={{ fontSize:16 }}>Loading grants…</p>
      </div>
    );
  }

  return <Dashboard user={user} onLogout={handleLogout} grants={grants} grantsSource={grantsSource} />;
}

export default App;
