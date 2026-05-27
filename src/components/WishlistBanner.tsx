import { useState, type CSSProperties, type FormEvent } from "react";
import { submitWishlist, validateWishlistFields } from "@/lib/wishlist";

const inputStyle: CSSProperties = {
  width: "100%",
  padding: "11px 14px",
  background: "rgba(255,255,255,0.06)",
  border: "1px solid rgba(200,168,75,0.3)",
  borderRadius: 8,
  color: "#F4EFE6",
  fontSize: 14,
  fontFamily: "'DM Sans',sans-serif",
  outline: "none",
  boxSizing: "border-box",
};

const labelStyle: CSSProperties = {
  display: "block",
  fontSize: 11,
  fontWeight: 600,
  color: "#A8C5A0",
  letterSpacing: "1px",
  textTransform: "uppercase",
  marginBottom: 5,
};

export function WishlistBanner() {
  const [form, setForm] = useState({ name: "", email: "", city: "", country: "", website: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (status === "success") return;

    const fieldErrors = validateWishlistFields(form);
    if (Object.keys(fieldErrors).length) {
      setErrors(fieldErrors);
      return;
    }

    setErrors({});
    setStatus("loading");
    setMessage("");

    try {
      await submitWishlist(form);
      setStatus("success");
      setMessage("You're on the list — thank you for your interest in CanGrants.");
    } catch (err) {
      setStatus("error");
      setMessage(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    }
  };

  const field = (key: "name" | "email" | "city" | "country", label: string, type = "text") => (
    <div>
      <label style={labelStyle} htmlFor={`wishlist-${key}`}>
        {label}
      </label>
      <input
        id={`wishlist-${key}`}
        type={type}
        value={form[key]}
        disabled={status === "loading" || status === "success"}
        onChange={(e) => setForm((p) => ({ ...p, [key]: e.target.value }))}
        placeholder={`Your ${label.toLowerCase()}`}
        style={{
          ...inputStyle,
          border: `1px solid ${errors[key] ? "#E74C3C" : "rgba(200,168,75,0.3)"}`,
        }}
      />
      {errors[key] && (
        <div style={{ fontSize: 11, color: "#E74C3C", marginTop: 4 }}>{errors[key]}</div>
      )}
    </div>
  );

  return (
    <section
      style={{
        width: "100%",
        marginTop: 8,
        marginBottom: 48,
        padding: "36px 28px",
        background: "rgba(200,168,75,0.06)",
        border: "1px solid rgba(200,168,75,0.25)",
        borderRadius: 20,
        backdropFilter: "blur(10px)",
      }}
      aria-labelledby="wishlist-heading"
    >
      <h2
        id="wishlist-heading"
        style={{
          fontFamily: "'Cormorant Garamond',serif",
          fontSize: "clamp(22px,3vw,28px)",
          fontWeight: 700,
          lineHeight: 1.35,
          margin: "0 0 8px",
          color: "#F4EFE6",
          textAlign: "center",
        }}
      >
        Did you find this web app useful in your work? Please add your name to the wishlist to make
        it happen.
      </h2>
      <p
        style={{
          fontSize: 14,
          color: "#8A9C8A",
          textAlign: "center",
          margin: "0 0 24px",
          lineHeight: 1.6,
        }}
      >
        Join the interest list for early access and updates as we build CanGrants.
      </p>

      {status === "success" ? (
        <p
          style={{
            textAlign: "center",
            fontSize: 15,
            color: "#C8A84B",
            fontWeight: 600,
            margin: 0,
            lineHeight: 1.6,
          }}
          role="status"
        >
          {message}
        </p>
      ) : (
        <form onSubmit={handleSubmit} noValidate>
          <div
            style={{
              position: "absolute",
              left: -9999,
              width: 1,
              height: 1,
              overflow: "hidden",
            }}
            aria-hidden="true"
          >
            <label htmlFor="wishlist-website">Website</label>
            <input
              id="wishlist-website"
              type="text"
              name="website"
              tabIndex={-1}
              autoComplete="off"
              value={form.website}
              onChange={(e) => setForm((p) => ({ ...p, website: e.target.value }))}
            />
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              gap: 16,
              marginBottom: 20,
            }}
          >
            {field("name", "Name")}
            {field("email", "Email", "email")}
            {field("city", "City")}
            {field("country", "Country")}
          </div>

          {status === "error" && message && (
            <div
              style={{
                background: "rgba(192,57,43,0.15)",
                border: "1px solid rgba(192,57,43,0.4)",
                borderRadius: 8,
                padding: "10px 14px",
                fontSize: 13,
                color: "#E74C3C",
                marginBottom: 16,
                textAlign: "center",
              }}
              role="alert"
            >
              {message}
            </div>
          )}

          <button
            type="submit"
            disabled={status === "loading"}
            style={{
              width: "100%",
              maxWidth: 320,
              display: "block",
              margin: "0 auto",
              padding: "14px 24px",
              borderRadius: 12,
              border: "none",
              background: status === "loading" ? "rgba(200,168,75,0.5)" : "#C8A84B",
              color: "#0B2215",
              fontSize: 15,
              fontWeight: 700,
              cursor: status === "loading" ? "wait" : "pointer",
              fontFamily: "'DM Sans',sans-serif",
            }}
          >
            {status === "loading" ? "Adding you…" : "Join the wishlist →"}
          </button>
        </form>
      )}

      <p
        style={{
          fontSize: 11,
          color: "#555",
          textAlign: "center",
          marginTop: 16,
          marginBottom: 0,
          lineHeight: 1.5,
        }}
      >
        We use this only to gauge interest in CanGrants. To be removed, email{" "}
        <a href="mailto:hello@betterhalffilms.com" style={{ color: "#6A9C6A" }}>
          hello@betterhalffilms.com
        </a>
        .
      </p>
    </section>
  );
}
