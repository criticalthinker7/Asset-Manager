import { useState, useRef, useEffect, useMemo, type FormEvent } from "react";
import { CA_PROVINCES, getDeadlineStatus, validatePostal, type Grant } from "@/data/grants";
import { fetchGrants, type GrantsSource } from "@/lib/grants-api";
import {
  authErrorMessage,
  initAuth,
  sendMagicLink,
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

const canGrantsLogo = `${import.meta.env.BASE_URL}cangrants-logo.png`;

const formatGrantDate = (value: string) => (
  value === "Rolling"
    ? "Rolling"
    : new Date(value).toLocaleDateString("en-CA", { month:"long", day:"numeric", year:"numeric" })
);

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
  const dim = size === "lg" ? 80 : size === "sm" ? 40 : 55;
  return (
    <img src={canGrantsLogo} alt="CanGrants powered by BetterHalf Films" style={{ width:dim, height:dim, borderRadius:"50%", objectFit:"cover" }} />
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
    <section style={{ width:"100%", borderTop:"1px solid rgba(200,168,75,0.18)", borderBottom:"1px solid rgba(200,168,75,0.14)", padding:"34px 0 38px", margin:"0 0 60px", textAlign:"left" }}>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(280px,1fr))", gap:34, alignItems:"start" }}>
        <div>
          <div style={{ fontSize:11, letterSpacing:"3px", color:"#C8A84B", textTransform:"uppercase", marginBottom:12, fontWeight:700 }}>Wishlist</div>
          <h2 style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:"clamp(28px,4vw,42px)", lineHeight:1.05, margin:"0 0 12px", color:"#F4EFE6" }}>{WISHLIST_HEADLINE}</h2>
          <p style={{ fontSize:13, color:"#8A9C8A", lineHeight:1.7, margin:"0 0 22px", maxWidth:520 }}>We'll only use this to track CanGrants interest and follow up about the project.</p>
          <WishlistForm source="homepage" />
        </div>
        <div>
          <div style={{ fontSize:11, letterSpacing:"3px", color:"#A8C5A0", textTransform:"uppercase", marginBottom:12, fontWeight:700 }}>Newsletter</div>
          <h2 style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:"clamp(26px,3vw,36px)", lineHeight:1.12, margin:"0 0 12px", color:"#F4EFE6" }}>Get occasional CanGrants updates.</h2>
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

function LandingPage({ onAuth }: { onAuth: (user: UserInfo) => void }) {
  const [mode, setMode] = useState("welcome");
  const [form, setForm] = useState({ name:"", email:"", password:"", address:"", city:"", province:"", postal:"", discipline:"", career:"" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loginForm, setLoginForm] = useState({ email:"", password:"" });
  const [loginMethod, setLoginMethod] = useState<"password" | "magic_link">("password");
  const [loginErr, setLoginErr] = useState("");
  const [loginMsg, setLoginMsg] = useState("");
  const [authBusy, setAuthBusy] = useState(false);
  const [registerMsg, setRegisterMsg] = useState("");
  const [particles] = useState(() => Array.from({length:22}, (_,i) => ({ id:i, x:Math.random()*100, y:Math.random()*100, size: 1+Math.random()*2.5, delay:Math.random()*4, dur:3+Math.random()*5 })));

  const resetLoginExtras = () => {
    setLoginMethod("password");
    setLoginMsg("");
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
    if (!form.email.includes("@")) e.email = "Valid email required";
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
    setLoginMsg("");
    try {
      const user = await signIn(loginForm.email.trim(), loginForm.password);
      onAuth(user);
    } catch (err) {
      setLoginErr(authErrorMessage(err));
    } finally {
      setAuthBusy(false);
    }
  };

  const handleSendMagicLink = async () => {
    const email = loginForm.email.trim();
    if (!EMAIL_PATTERN.test(email)) {
      setLoginErr("Enter a valid email address first.");
      return;
    }
    setAuthBusy(true);
    setLoginErr("");
    setLoginMsg("");
    try {
      await sendMagicLink(email);
      setLoginMsg("Sign-in link sent. Check your email and click the link to continue.");
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
    <div style={{ minHeight:"100vh", background:"#030E07", color:"#F4EFE6", fontFamily:"'DM Sans',sans-serif", position:"relative", overflowX:"hidden" }}>
      <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,600;0,700;1,400&family=DM+Sans:wght@300;400;500;600&family=Barlow:wght@700;800&display=swap" rel="stylesheet"/>

      <div style={{ position:"fixed", inset:0, pointerEvents:"none", zIndex:0 }}>
        {particles.map(p => (
          <div key={p.id} style={{ position:"absolute", left:`${p.x}%`, top:`${p.y}%`, width:p.size, height:p.size, borderRadius:"50%", background:"#C8A84B", opacity:0.25, animation:`drift ${p.dur}s ease-in-out ${p.delay}s infinite alternate` }}/>
        ))}
        <div style={{ position:"absolute", top:"-20%", left:"-10%", width:"60vw", height:"60vw", borderRadius:"50%", background:"radial-gradient(circle, rgba(11,34,21,0.8) 0%, transparent 70%)", pointerEvents:"none" }}/>
        <div style={{ position:"absolute", bottom:"-20%", right:"-10%", width:"50vw", height:"50vw", borderRadius:"50%", background:"radial-gradient(circle, rgba(200,168,75,0.07) 0%, transparent 70%)", pointerEvents:"none" }}/>
      </div>

      <div style={{ position:"relative", zIndex:10, padding:"20px 40px", display:"flex", justifyContent:"space-between", alignItems:"center", borderBottom:"1px solid rgba(200,168,75,0.1)" }}>
        <CanGrantsLogoImg size="sm"/>
        <div style={{ display:"flex", gap:8 }}>
          {mode !== "login" && <button onClick={() => {setMode("login"); setErrors({}); resetLoginExtras();}} style={{ padding:"9px 20px", borderRadius:8, border:"1px solid rgba(200,168,75,0.4)", background:"transparent", color:"#C8A84B", fontSize:13, cursor:"pointer", fontFamily:"'DM Sans',sans-serif", fontWeight:500 }}>Sign In</button>}
          {mode !== "register" && <button onClick={() => {setMode("register"); setErrors({}); resetLoginExtras();}} style={{ padding:"9px 20px", borderRadius:8, border:"none", background:"#C8A84B", color:"#0B2215", fontSize:13, cursor:"pointer", fontFamily:"'DM Sans',sans-serif", fontWeight:700 }}>Create Account</button>}
        </div>
      </div>

      <div style={{ position:"relative", zIndex:5, maxWidth:1100, margin:"0 auto", padding:"0 24px" }}>

        {mode === "welcome" && (
          <div style={{ display:"flex", flexDirection:"column", alignItems:"center", textAlign:"center", paddingTop:"8vh" }}>
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
        )}

        {mode === "login" && (
          <div style={{ display:"flex", justifyContent:"center", paddingTop:"6vh", paddingBottom:60 }}>
            <div style={{ width:"100%", maxWidth:440 }}>
              <button onClick={() => { setMode("welcome"); resetLoginExtras(); }} style={{ background:"none", border:"none", color:"#6A9C6A", cursor:"pointer", fontSize:13, marginBottom:24, padding:0, fontFamily:"'DM Sans',sans-serif" }}>{"\u2190"} Back</button>
              <div style={{ width:40, height:2, background:"#C8A84B", marginBottom:20 }}/>
              <h2 style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:36, fontWeight:700, margin:"0 0 6px" }}>Sign In</h2>
              <p style={{ fontSize:14, color:"#6A8C6A", marginBottom:24 }}>Welcome back. Access your CanGrants dashboard.</p>

              <GoogleSignInButton disabled={authBusy} onClick={handleGoogleSignIn} />
              <AuthDivider label="or use email" />

              <div style={{ display:"flex", gap:6, marginBottom:18, flexWrap:"wrap" }}>
                {([
                  ["password", "Password"],
                  ["magic_link", "Email link"],
                ] as const).map(([id, label]) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => { setLoginMethod(id); setLoginErr(""); setLoginMsg(""); }}
                    style={{ padding:"7px 12px", borderRadius:20, border:`1px solid ${loginMethod===id?"#C8A84B":"rgba(200,168,75,0.25)"}`, background:loginMethod===id?"rgba(200,168,75,0.15)":"transparent", color:loginMethod===id?"#C8A84B":"#8A9C8A", fontSize:12, cursor:"pointer", fontFamily:"'DM Sans',sans-serif", fontWeight:500 }}
                  >
                    {label}
                  </button>
                ))}
              </div>

              <div style={{ marginBottom:14 }}>
                <label style={{ display:"block", fontSize:11, fontWeight:600, color:"#A8C5A0", letterSpacing:"1px", textTransform:"uppercase", marginBottom:5 }}>Email Address</label>
                <input type="email" value={loginForm.email} onChange={e => setLoginForm(p=>({...p,email:e.target.value}))} placeholder="your@email.com"
                  style={{ width:"100%", padding:"12px 14px", background:"rgba(255,255,255,0.06)", border:"1px solid rgba(200,168,75,0.3)", borderRadius:8, color:"#F4EFE6", fontSize:14, fontFamily:"'DM Sans',sans-serif", outline:"none", boxSizing:"border-box" }}/>
              </div>

              {loginMethod === "password" && (
                <div style={{ marginBottom:22 }}>
                  <label style={{ display:"block", fontSize:11, fontWeight:600, color:"#A8C5A0", letterSpacing:"1px", textTransform:"uppercase", marginBottom:5 }}>Password</label>
                  <input type="password" value={loginForm.password} onChange={e => setLoginForm(p=>({...p,password:e.target.value}))} placeholder="\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022"
                    onKeyDown={e => e.key==="Enter" && handleLogin()}
                    style={{ width:"100%", padding:"12px 14px", background:"rgba(255,255,255,0.06)", border:"1px solid rgba(200,168,75,0.3)", borderRadius:8, color:"#F4EFE6", fontSize:14, fontFamily:"'DM Sans',sans-serif", outline:"none", boxSizing:"border-box" }}/>
                </div>
              )}

              {loginErr && <div style={{ background:"rgba(192,57,43,0.15)", border:"1px solid rgba(192,57,43,0.4)", borderRadius:8, padding:"10px 14px", fontSize:13, color:"#E74C3C", marginBottom:16 }}>{loginErr}</div>}
              {loginMsg && <div style={{ background:"rgba(90,158,106,0.15)", border:"1px solid rgba(90,158,106,0.35)", borderRadius:8, padding:"10px 14px", fontSize:13, color:"#A8C5A0", marginBottom:16, lineHeight:1.5 }}>{loginMsg}</div>}

              {loginMethod === "password" && (
                <button onClick={handleLogin} disabled={authBusy} style={{ width:"100%", padding:"14px", borderRadius:10, border:"none", background:authBusy?"#7A6933":"#C8A84B", color:"#0B2215", fontSize:15, fontWeight:700, cursor:authBusy?"not-allowed":"pointer", fontFamily:"'DM Sans',sans-serif", marginBottom:14 }}>
                  {authBusy ? "Signing in..." : <>Sign In {"\u2192"}</>}
                </button>
              )}
              {loginMethod === "magic_link" && (
                <>
                  <p style={{ fontSize:12, color:"#6A8C6A", margin:"0 0 14px", lineHeight:1.5 }}>
                    We'll email you a one-click sign-in link. Open it on this device to continue.
                  </p>
                  <button onClick={handleSendMagicLink} disabled={authBusy} style={{ width:"100%", padding:"14px", borderRadius:10, border:"none", background:authBusy?"#7A6933":"#C8A84B", color:"#0B2215", fontSize:15, fontWeight:700, cursor:authBusy?"not-allowed":"pointer", fontFamily:"'DM Sans',sans-serif", marginBottom:14 }}>
                    {authBusy ? "Sending..." : "Email me a sign-in link"}
                  </button>
                </>
              )}

              <p style={{ textAlign:"center", fontSize:13, color:"#666" }}>
                Don't have an account?{" "}
                <button onClick={() => {setMode("register"); setErrors({}); resetLoginExtras();}} style={{ background:"none", border:"none", color:"#C8A84B", cursor:"pointer", fontSize:13, fontFamily:"'DM Sans',sans-serif", fontWeight:600 }}>Create one</button>
              </p>
            </div>
          </div>
        )}

        {mode === "register" && (
          <div style={{ display:"flex", justifyContent:"center", paddingTop:"4vh", paddingBottom:60 }}>
            <div style={{ width:"100%", maxWidth:560 }}>
              <button onClick={() => setMode("welcome")} style={{ background:"none", border:"none", color:"#6A9C6A", cursor:"pointer", fontSize:13, marginBottom:24, padding:0, fontFamily:"'DM Sans',sans-serif" }}>{"\u2190"} Back</button>
              <div style={{ width:40, height:2, background:"#C8A84B", marginBottom:20 }}/>
              <h2 style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:36, fontWeight:700, margin:"0 0 6px" }}>Create Your Account</h2>
              <p style={{ fontSize:14, color:"#6A8C6A", marginBottom:8 }}>Join CanGrants — Canada's AI-powered grant platform for artists and producers.</p>
              <div style={{ background:"rgba(200,168,75,0.08)", border:"1px solid rgba(200,168,75,0.2)", borderRadius:8, padding:"10px 14px", fontSize:12, color:"#B8A055", marginBottom:20 }}>
                <strong>Canadian residents only.</strong> A valid Canadian postal code is required for the full registration form. You can also use Google or an email sign-in link on the sign-in page.
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
          <div>{"\u00A9"} 2026 BetterHalf Films {"\u00b7"} Toronto, Canada {"\u00b7"} betterhalffilms.com</div>
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
  const [activeTab, setActiveTab] = useState("discover");
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

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior:"smooth" }); }, [messages]);

  useEffect(() => {
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
    const q = search.toLowerCase();
    const matchSearch = !q || g.name.toLowerCase().includes(q) || g.org.toLowerCase().includes(q) || g.discipline.some(d=>d.toLowerCase().includes(q)) || g.tags.some(t=>t.toLowerCase().includes(q));
    const matchDisc = !filters.discipline || g.discipline.includes(filters.discipline);
    const matchLoc = !filters.location || g.location === filters.location;
    const matchTag = !filters.tag || g.tags.includes(filters.tag);
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

  return (
    <div style={{ fontFamily:"'DM Sans',sans-serif", background:"#F4EFE6", minHeight:"100vh", color:"#1A1208" }}>
      <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;600;700&family=DM+Sans:wght@300;400;500;600&family=Barlow:wght@700;800&display=swap" rel="stylesheet"/>

      <header style={{ background:"#0B2215", color:"#F4EFE6", padding:"0 24px", display:"flex", alignItems:"center", justifyContent:"space-between", height:62, position:"sticky", top:0, zIndex:100, boxShadow:"0 2px 20px rgba(0,0,0,0.3)" }}>
        <div style={{ display:"flex", alignItems:"center", gap:18 }}>
          <CanGrantsLogoImg size="sm" />
          <div style={{ width:1, height:28, background:"rgba(200,168,75,0.3)" }}/>
          <span style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:22, fontWeight:700, letterSpacing:"-0.5px", color:"#C8A84B" }}>CanGrants</span>
        </div>
        <div style={{ display:"flex", gap:4, alignItems:"center" }}>
          <nav style={{ display:"flex", gap:3 }}>
            {[{id:"discover",label:"Discover"},{id:"saved",label:`Saved (${saved.size})`},{id:"applications",label:"My Applications"},{id:"assistant",label:"AI Assistant"}].map(tab => (
              <button key={tab.id} onClick={()=>setActiveTab(tab.id)} style={{ background:activeTab===tab.id?"#C8A84B":"transparent", color:activeTab===tab.id?"#0B2215":"#A8C5A0", border:"none", borderRadius:6, padding:"7px 13px", fontSize:12, fontWeight:500, cursor:"pointer", fontFamily:"'DM Sans',sans-serif" }}>{tab.label}</button>
            ))}
          </nav>
          <div style={{ width:1, height:24, background:"rgba(200,168,75,0.2)", margin:"0 8px" }}/>
          <div style={{ fontSize:12, color:"#6A9C6A", marginRight:8 }}>{user.name.split(" ")[0]}</div>
          <button onClick={() => setShowSignOutPrompt(true)} style={{ padding:"6px 12px", borderRadius:6, border:"1px solid rgba(200,168,75,0.3)", background:"transparent", color:"#C8A84B", fontSize:11, cursor:"pointer", fontFamily:"'DM Sans',sans-serif" }}>Sign Out</button>
        </div>
      </header>

      <div style={{ maxWidth:1200, margin:"0 auto", padding:"28px 20px" }}>
        {userDataLoading ? (
          <div style={{ textAlign:"center", padding:"80px 0", color:"#5A6B5A" }}>Loading your saved grants and applications…</div>
        ) : (<>
        {activeTab==="discover" && (
          <div>
            <div style={{ marginBottom:28, display:"flex", gap:16, flexWrap:"wrap", alignItems:"center", justifyContent:"space-between" }}>
              <div>
                <h1 style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:32, fontWeight:700, margin:"0 0 4px", color:"#0B2215" }}>Grant Discovery</h1>
                <p style={{ margin:0, color:"#5A6B5A", fontSize:14 }}>{grants.length} opportunities \u00b7 Canadian &amp; International \u00b7 Updated 2026{grantsSource === "fallback" ? " · offline catalog" : ""}</p>
              </div>
              <div style={{ display:"flex", gap:12 }}>
                {[{label:"Total",value:grants.length,color:"#C8A84B"},{label:"Canadian",value:grants.filter(g=>g.location==="Canada").length,color:"#2D7D46"},{label:"International",value:grants.filter(g=>g.location==="International").length,color:"#1A5FA8"}].map(s=>(
                  <div key={s.label} style={{ background:"#fff", borderRadius:10, padding:"12px 20px", textAlign:"center", boxShadow:"0 1px 6px rgba(0,0,0,0.07)", minWidth:80 }}>
                    <div style={{ fontSize:22, fontWeight:700, fontFamily:"'Cormorant Garamond',serif", color:s.color }}>{s.value}</div>
                    <div style={{ fontSize:11, color:"#888" }}>{s.label}</div>
                  </div>
                ))}
              </div>
            </div>
            <div style={{ background:"#fff", borderRadius:14, padding:20, marginBottom:24, boxShadow:"0 2px 12px rgba(0,0,0,0.06)", border:"1px solid #E8E0D0" }}>
              <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search grants, organizations, disciplines, tags..." style={{ width:"100%", padding:"12px 16px", borderRadius:8, border:"1.5px solid #D5CBB8", fontSize:14, fontFamily:"'DM Sans',sans-serif", background:"#FAFAF7", outline:"none", boxSizing:"border-box", marginBottom:14, color:"#1A1208" }}/>
              <div style={{ display:"flex", gap:10, flexWrap:"wrap" }}>
                {[{key:"discipline",label:"Discipline",opts:allDisciplines},{key:"location",label:"Location",opts:["Canada","International"]},{key:"deadline",label:"Deadline",opts:[["urgent","Urgent (\u226414 days)"],["month","This Month"],["rolling","Rolling"]]},{key:"tag",label:"For\u2026",opts:allTags}].map(({key,label,opts})=>(
                  <select key={key} value={filters[key as keyof typeof filters]} onChange={e=>setFilters(p=>({...p,[key]:e.target.value}))} style={{ padding:"8px 12px", borderRadius:8, border:"1.5px solid #D5CBB8", fontSize:13, background:"#fff", fontFamily:"'DM Sans',sans-serif", color:"#1A1208", cursor:"pointer" }}>
                    <option value="">{label}: All</option>
                    {opts.map(o=>Array.isArray(o)?<option key={o[0]} value={o[0]}>{o[1]}</option>:<option key={o} value={o}>{o}</option>)}
                  </select>
                ))}
                {(search||Object.values(filters).some(Boolean))&&<button onClick={()=>{setSearch("");setFilters({discipline:"",location:"",tag:"",deadline:""}); }} style={{ padding:"8px 14px", borderRadius:8, border:"1px solid #E0D5C5", background:"transparent", fontSize:13, cursor:"pointer", color:"#888", fontFamily:"'DM Sans',sans-serif" }}>Clear all</button>}
              </div>
            </div>
            <p style={{ fontSize:13, color:"#888", marginBottom:16 }}>Showing {filtered.length} of {grants.length} grants</p>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(340px,1fr))", gap:18 }}>
              {filtered.map(g=>{
                const dl=getDeadlineStatus(g.close), isSaved=saved.has(g.id), hasApp=applications.find(a=>a.id===g.id);
                return (
                  <div key={g.id} style={{ background:"#fff", borderRadius:14, border:"1px solid #E8E0D0", boxShadow:"0 2px 10px rgba(0,0,0,0.05)", overflow:"hidden", display:"flex", flexDirection:"column" }}>
                    <div style={{ background:g.location==="Canada"?"#0B2215":"#1A2F5A", padding:"14px 18px", display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
                      <div style={{ flex:1 }}>
                        <div style={{ fontSize:10, letterSpacing:"1.5px", color:g.location==="Canada"?"#6A9C6A":"#6A8CC8", textTransform:"uppercase", marginBottom:4 }}>{g.location} \u00b7 {g.discipline.slice(0,2).join(", ")}</div>
                        <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:18, fontWeight:700, color:"#F4EFE6", lineHeight:1.2 }}>{g.name}</div>
                        <div style={{ fontSize:12, color:"#A8C5A0", marginTop:3 }}>{g.org}</div>
                      </div>
                      <button onClick={()=>toggleSave(g.id)} style={{ background:"none", border:"none", cursor:"pointer", fontSize:18, padding:"0 0 0 8px", color:isSaved?"#C8A84B":"#4A6A4A" }}>{isSaved?"\u2605":"\u2606"}</button>
                    </div>
                    <div style={{ padding:"14px 18px", flex:1, display:"flex", flexDirection:"column", gap:10 }}>
                      <p style={{ margin:0, fontSize:13, color:"#5A6B5A", lineHeight:1.5 }}>{g.description}</p>
                      <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
                        {g.tags.slice(0,3).map(t=><span key={t} style={{ background:"#EEF5EE", color:"#2A5C2A", fontSize:11, padding:"3px 8px", borderRadius:20, fontWeight:500 }}>{t}</span>)}
                      </div>
                      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginTop:"auto" }}>
                        <div><div style={{ fontSize:11, color:"#888", marginBottom:1 }}>Deadline</div><span style={{ background:dl.color+"20", color:dl.color, fontSize:12, fontWeight:600, padding:"3px 9px", borderRadius:12, border:`1px solid ${dl.color}40` }}>{dl.label}</span></div>
                        <div style={{ textAlign:"right" }}><div style={{ fontSize:11, color:"#888", marginBottom:1 }}>Amount</div><div style={{ fontSize:13, fontWeight:600, color:"#1A7A3A" }}>{g.amount}</div></div>
                      </div>
                    </div>
                    <div style={{ padding:"12px 18px", borderTop:"1px solid #F0E8D8", display:"flex", gap:8 }}>
                      <button onClick={()=>setSelectedGrant(g)} style={{ flex:1, padding:"8px 0", borderRadius:8, border:"1.5px solid #D5CBB8", background:"transparent", fontSize:13, cursor:"pointer", color:"#5A4A2A", fontFamily:"'DM Sans',sans-serif", fontWeight:500 }}>Details</button>
                      <button onClick={()=>{addApplication(g);setActiveTab("applications");}} style={{ flex:1, padding:"8px 0", borderRadius:8, border:"none", background:hasApp?"#E8F5E8":"#0B2215", color:hasApp?"#1A7A3A":"#C8A84B", fontSize:13, cursor:"pointer", fontFamily:"'DM Sans',sans-serif", fontWeight:500 }}>{hasApp?"\u2713 Tracking":"Track"}</button>
                      <a href={g.url} target="_blank" rel="noopener noreferrer" style={{ flex:1, padding:"8px 0", borderRadius:8, border:"none", background:"#C8A84B", color:"#0B2215", fontSize:13, cursor:"pointer", fontFamily:"'DM Sans',sans-serif", fontWeight:600, textDecoration:"none", textAlign:"center", lineHeight:"1.8" }}>Apply {"\u2197"}</a>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {activeTab==="saved" && (
          <div>
            <h1 style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:32, fontWeight:700, marginBottom:8, color:"#0B2215" }}>Saved Grants</h1>
            <p style={{ color:"#5A6B5A", fontSize:14, marginBottom:24 }}>{saved.size} grants saved to your list</p>
            {savedGrants.length===0?(<div style={{ textAlign:"center", padding:"60px 0", color:"#888" }}><div style={{ fontSize:40, marginBottom:12 }}>\u2606</div><p>No saved grants yet. Star grants in Discover.</p></div>):(
              <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
                {savedGrants.map(g=>{
                  const dl=getDeadlineStatus(g.close), hasApp=applications.find(a=>a.id===g.id);
                  return (
                    <div key={g.id} style={{ background:"#fff", borderRadius:12, border:"1px solid #E8E0D0", padding:"18px 22px", display:"flex", gap:18, alignItems:"center", boxShadow:"0 1px 8px rgba(0,0,0,0.04)" }}>
                      <div style={{ width:6, alignSelf:"stretch", background:g.location==="Canada"?"#2D7D46":"#1A5FA8", borderRadius:3, flexShrink:0 }}/>
                      <div style={{ flex:1 }}>
                        <div style={{ display:"flex", gap:8, alignItems:"baseline", marginBottom:3 }}>
                          <span style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:18, fontWeight:700, color:"#0B2215" }}>{g.name}</span>
                          <span style={{ fontSize:12, color:"#888" }}>\u00b7 {g.org}</span>
                        </div>
                        <p style={{ margin:"4px 0", fontSize:13, color:"#5A6B5A" }}>{g.eligibility.slice(0,120)}\u2026</p>
                        <div style={{ display:"flex", gap:8, marginTop:6, flexWrap:"wrap" }}>
                          {g.tags.slice(0,3).map(t=><span key={t} style={{ background:"#EEF5EE", color:"#2A5C2A", fontSize:11, padding:"2px 7px", borderRadius:12 }}>{t}</span>)}
                        </div>
                      </div>
                      <div style={{ display:"flex", flexDirection:"column", gap:8, alignItems:"flex-end", flexShrink:0 }}>
                        <span style={{ background:dl.color+"20", color:dl.color, fontSize:12, fontWeight:600, padding:"3px 10px", borderRadius:12 }}>{dl.label}</span>
                        <span style={{ fontSize:13, fontWeight:600, color:"#1A7A3A" }}>{g.amount}</span>
                        <div style={{ display:"flex", gap:6 }}>
                          <button onClick={()=>toggleSave(g.id)} style={{ padding:"6px 12px", borderRadius:7, border:"1px solid #E0D5C5", background:"transparent", fontSize:12, cursor:"pointer", color:"#888" }}>Remove</button>
                          <button onClick={()=>{addApplication(g);setActiveTab("applications");}} style={{ padding:"6px 12px", borderRadius:7, border:"none", background:hasApp?"#E8F5E8":"#0B2215", color:hasApp?"#1A7A3A":"#C8A84B", fontSize:12, cursor:"pointer", fontWeight:500 }}>{hasApp?"\u2713 Tracked":"Track"}</button>
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
            <h1 style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:32, fontWeight:700, marginBottom:8, color:"#0B2215" }}>My Applications</h1>
            <p style={{ color:"#5A6B5A", fontSize:14, marginBottom:24 }}>Track your grant applications and their status</p>
            {["Not Started","In Progress","Submitted"].map(status=>{
              const apps=appGrants.filter(a=>a.status===status&&a.grant);
              return (
                <div key={status} style={{ marginBottom:28 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:14 }}>
                    <span style={{ background:statusBg[status], color:statusColors[status], fontSize:12, fontWeight:600, padding:"4px 12px", borderRadius:20 }}>{status}</span>
                    <span style={{ fontSize:13, color:"#888" }}>{apps.length} grant{apps.length!==1?"s":""}</span>
                  </div>
                  {apps.length===0?(<div style={{ background:"#FAFAF7", borderRadius:10, padding:"20px", textAlign:"center", color:"#bbb", fontSize:13, border:"1px dashed #E0D5C5" }}>No grants here yet</div>):(
                    <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                      {apps.map(({grant,id,dbId,notes})=>{
                        const dl=getDeadlineStatus(grant.close);
                        return (
                          <div key={id} style={{ background:"#fff", borderRadius:12, border:"1px solid #E8E0D0", padding:"16px 20px", display:"flex", gap:16, alignItems:"center" }}>
                            <div style={{ flex:1 }}>
                              <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:17, fontWeight:700, color:"#0B2215" }}>{grant.name}</div>
                              <div style={{ fontSize:12, color:"#888", marginBottom:notes?6:0 }}>{grant.org} \u00b7 {grant.amount}</div>
                              {notes&&<div style={{ fontSize:12, color:"#5A6B5A", background:"#F7F2E8", padding:"5px 10px", borderRadius:6, marginTop:4 }}>{notes}</div>}
                            </div>
                            <div style={{ display:"flex", flexDirection:"column", gap:8, alignItems:"flex-end", flexShrink:0 }}>
                              <span style={{ background:dl.color+"20", color:dl.color, fontSize:12, fontWeight:600, padding:"3px 10px", borderRadius:12 }}>{dl.label}</span>
                              <select value={status} onChange={e=>updateAppStatus(dbId, id, e.target.value as UserApplication["status"])} style={{ padding:"5px 10px", borderRadius:7, border:"1px solid #D5CBB8", fontSize:12, fontFamily:"'DM Sans',sans-serif", background:"#fff", cursor:"pointer" }}>
                                {["Not Started","In Progress","Submitted"].map(s=><option key={s} value={s}>{s}</option>)}
                              </select>
                              <button onClick={()=>{setInput(`Help me write a grant proposal for ${grant.name} by ${grant.org}. Amount: ${grant.amount}. My project is...`);setActiveTab("assistant");}} style={{ padding:"5px 12px", borderRadius:7, border:"none", background:"#C8A84B", color:"#0B2215", fontSize:12, cursor:"pointer", fontWeight:600, fontFamily:"'DM Sans',sans-serif" }}>AI Draft {"\u2192"}</button>
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
          <div style={{ maxWidth:760, margin:"0 auto" }}>
            <h1 style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:32, fontWeight:700, marginBottom:6, color:"#0B2215" }}>AI Grant Assistant</h1>
            <p style={{ color:"#5A6B5A", fontSize:14, margin:"0 0 20px" }}>Ask about eligibility, get grant recommendations, draft proposals and artist statements</p>
            <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginBottom:20 }}>
              {["Which grants am I eligible for as a South Asian diaspora filmmaker in Toronto?","Draft an artist statement for Soso Park for the MAC Matchmaker grant","What are the most urgent upcoming deadlines?","Help me write a project summary for Son of Soil"].map(p=>(
                <button key={p} onClick={()=>setInput(p)} style={{ padding:"8px 14px", borderRadius:20, border:"1.5px solid #C8A84B", background:"#FEF8EC", color:"#7A5A0A", fontSize:12, cursor:"pointer", fontFamily:"'DM Sans',sans-serif", fontWeight:500 }}>
                  {p.length>50?p.slice(0,50)+"\u2026":p}
                </button>
              ))}
            </div>
            <div style={{ background:"#fff", borderRadius:16, border:"1px solid #E8E0D0", boxShadow:"0 2px 20px rgba(0,0,0,0.06)", overflow:"hidden" }}>
              <div style={{ height:460, overflowY:"auto", padding:"24px 24px 12px" }}>
                {messages.map((m,i)=>(
                  <div key={i} style={{ marginBottom:18, display:"flex", justifyContent:m.role==="user"?"flex-end":"flex-start" }}>
                    {m.role==="assistant"&&<div style={{ width:30, height:30, borderRadius:8, background:"#0B2215", color:"#C8A84B", fontSize:14, fontWeight:700, display:"flex", alignItems:"center", justifyContent:"center", marginRight:10, flexShrink:0, fontFamily:"'Cormorant Garamond',serif" }}>C</div>}
                    <div style={{ background:m.role==="user"?"#0B2215":"#F7F2E8", color:m.role==="user"?"#F4EFE6":"#1A1208", padding:"12px 16px", borderRadius:m.role==="user"?"14px 14px 4px 14px":"14px 14px 14px 4px", maxWidth:"78%", fontSize:14, lineHeight:1.65, whiteSpace:"pre-wrap" }}>{m.content}</div>
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
            <p style={{ textAlign:"center", fontSize:12, color:"#aaa", marginTop:12 }}>Powered by Claude \u00b7 Tailored for BetterHalf Films slate</p>
          </div>
        )}
        </>)}
      </div>

      <footer style={{ borderTop:"1px solid #E8E0D0", padding:"24px 40px", display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:16, marginTop:40, background:"#fff" }}>
        <CanGrantsLogoImg size="md" />
        <div style={{ textAlign:"right", fontSize:12, color:"#888" }}>
          <div style={{ color:"#C8A84B", fontWeight:600, fontSize:14, fontFamily:"'Cormorant Garamond',serif" }}>CanGrants</div>
          <div>{"\u00A9"} 2026 BetterHalf Films {"\u00b7"} Toronto, Canada {"\u00b7"} betterhalffilms.com</div>
          <div style={{ marginTop:3 }}>A platform for Canadian artists & producers</div>
        </div>
      </footer>

      {selectedGrant&&(
        <div onClick={()=>setSelectedGrant(null)} style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.5)", zIndex:200, display:"flex", alignItems:"center", justifyContent:"center", padding:20 }}>
          <div onClick={e=>e.stopPropagation()} style={{ background:"#fff", borderRadius:18, maxWidth:600, width:"100%", maxHeight:"85vh", overflowY:"auto", boxShadow:"0 20px 60px rgba(0,0,0,0.3)" }}>
            <div style={{ background:selectedGrant.location==="Canada"?"#0B2215":"#1A2F5A", padding:"22px 26px", borderRadius:"18px 18px 0 0" }}>
              <div style={{ fontSize:11, letterSpacing:"1.5px", color:selectedGrant.location==="Canada"?"#6A9C6A":"#6A8CC8", textTransform:"uppercase", marginBottom:6 }}>{selectedGrant.location} \u00b7 {selectedGrant.discipline.join(", ")}</div>
              <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:24, fontWeight:700, color:"#F4EFE6" }}>{selectedGrant.name}</div>
              <div style={{ fontSize:14, color:"#A8C5A0", marginTop:4 }}>{selectedGrant.org}</div>
            </div>
            <div style={{ padding:"24px 26px" }}>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16, marginBottom:20 }}>
                {[{label:"Amount",value:selectedGrant.amount},{label:"Deadline",value:selectedGrant.close==="Rolling"?"Rolling":new Date(selectedGrant.close).toLocaleDateString("en-CA",{month:"long",day:"numeric",year:"numeric"})},{label:"Opens",value:new Date(selectedGrant.open).toLocaleDateString("en-CA",{month:"long",day:"numeric",year:"numeric"})},{label:"Location",value:selectedGrant.location}].map(({label,value})=>(
                  <div key={label} style={{ background:"#F7F2E8", borderRadius:10, padding:"12px 16px" }}>
                    <div style={{ fontSize:11, color:"#888", marginBottom:2 }}>{label}</div>
                    <div style={{ fontSize:15, fontWeight:600, color:"#0B2215" }}>{value}</div>
                  </div>
                ))}
              </div>
              <div style={{ marginBottom:18 }}>
                <div style={{ fontSize:12, fontWeight:600, color:"#C8A84B", letterSpacing:"1px", textTransform:"uppercase", marginBottom:8 }}>Description</div>
                <p style={{ margin:0, fontSize:14, color:"#3A3A2A", lineHeight:1.7 }}>{selectedGrant.description}</p>
              </div>
              <div style={{ marginBottom:18 }}>
                <div style={{ fontSize:12, fontWeight:600, color:"#C8A84B", letterSpacing:"1px", textTransform:"uppercase", marginBottom:8 }}>Eligibility</div>
                <p style={{ margin:0, fontSize:14, color:"#3A3A2A", lineHeight:1.7 }}>{selectedGrant.eligibility}</p>
              </div>
              <div style={{ marginBottom:20 }}>
                <div style={{ fontSize:12, fontWeight:600, color:"#C8A84B", letterSpacing:"1px", textTransform:"uppercase", marginBottom:8 }}>Tags</div>
                <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
                  {selectedGrant.tags.map(t=><span key={t} style={{ background:"#EEF5EE", color:"#2A5C2A", fontSize:12, padding:"4px 10px", borderRadius:20, fontWeight:500 }}>{t}</span>)}
                </div>
              </div>
              <div style={{ display:"flex", gap:10, marginTop:20 }}>
                <a href={selectedGrant.url} target="_blank" rel="noopener noreferrer" style={{ flex:1, padding:"12px 0", borderRadius:10, border:"none", background:"#C8A84B", color:"#0B2215", fontSize:14, fontWeight:700, textDecoration:"none", textAlign:"center", cursor:"pointer", fontFamily:"'DM Sans',sans-serif" }}>Apply Now {"\u2197"}</a>
                <button onClick={()=>setSelectedGrant(null)} style={{ flex:1, padding:"12px 0", borderRadius:10, border:"1.5px solid #D5CBB8", background:"transparent", fontSize:14, cursor:"pointer", color:"#5A4A2A", fontFamily:"'DM Sans',sans-serif", fontWeight:500 }}>Close</button>
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
    const unsubscribe = initAuth((profile) => {
      setUser(profile);
      setAuthLoading(false);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!user) return;
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
