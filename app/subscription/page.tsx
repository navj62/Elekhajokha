"use client";

import { useState, useRef, useEffect } from "react";
import { useUser }   from "@clerk/nextjs";
import { useRouter } from "next/navigation";

// ── Types ─────────────────────────────────────────────────────────────────────
type PlanId = "HALF_YEARLY" | "YEARLY";

interface Plan {
  id:       PlanId;
  label:    string;
  price:    number;
  duration: string;
  perMonth: string;
  savings:  string | null;
  badge:    string | null;
  features: string[];
}

// Shape of /api/access response used on this page
interface AccessInfo {
  hasAccess: boolean;
  status:    string | null;
  hadTrial:  boolean; // returned by access route after adding hadTrial to select+response
}

declare global {
  interface Window { Razorpay: any; }
}

// ── Constants ─────────────────────────────────────────────────────────────────
const PLANS: Plan[] = [
  {
    id: "HALF_YEARLY", label: "Half Yearly", price: 999,
    duration: "6 months", perMonth: "₹166/mo", savings: null, badge: null,
    features: [
      "Full access to all features",
      "Unlimited customers & pledges",
      "Interest calculator",
      "Priority support",
    ],
  },
  {
    id: "YEARLY", label: "Yearly", price: 1499,
    duration: "12 months", perMonth: "₹124/mo",
    savings: "Save ₹499", badge: "Best Value",
    features: [
      "Full access to all features",
      "Unlimited customers & pledges",
      "Interest calculator",
      "Priority support",
      "2 months free",
    ],
  },
];

const TRIAL_FEATURES = [
  "Full access to all features",
  "Unlimited customers & pledges",
  "Interest calculator",
  "No credit card required",
];

// Statuses that mean "user already has or had access" — redirect away from /subscribe
const REDIRECT_STATUSES = new Set(["active", "trial", "processing"]);

// ── Razorpay SDK loader (idempotent) ──────────────────────────────────────────
function loadRazorpay(): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window.Razorpay !== "undefined") return resolve(true);
    const existing = document.getElementById("rzp-script");
    if (existing) {
      existing.addEventListener("load",  () => resolve(true));
      existing.addEventListener("error", () => resolve(false));
      return;
    }
    const script   = document.createElement("script");
    script.id      = "rzp-script";
    script.src     = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload  = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

// ── Icons ─────────────────────────────────────────────────────────────────────
function Check() {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" aria-hidden>
      <circle cx="7.5" cy="7.5" r="7.5" fill="#16a34a" opacity="0.12" />
      <path d="M4 7.5L6.5 10L11 5" stroke="#16a34a" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function TrialCheck() {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" aria-hidden>
      <circle cx="7.5" cy="7.5" r="7.5" fill="#6366f1" opacity="0.12" />
      <path d="M4 7.5L6.5 10L11 5" stroke="#6366f1" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// dark=true for use on light backgrounds (loading screen)
function Spinner({ dark = false }: { dark?: boolean }) {
  const track  = dark ? "rgba(0,0,0,0.15)" : "rgba(255,255,255,0.3)";
  const stroke = dark ? "#6b7280"          : "white";
  return (
    <>
      <style>{`
        @keyframes rzp-spin   { to { transform: rotate(360deg); } }
        @keyframes rzp-bounce { 0%,80%,100%{transform:scale(0)} 40%{transform:scale(1)} }
      `}</style>
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden
        style={{ animation: "rzp-spin 0.7s linear infinite" }}>
        <circle cx="8" cy="8" r="6" stroke={track}  strokeWidth="2.5" />
        <path d="M8 2a6 6 0 0 1 6 6"  stroke={stroke} strokeWidth="2.5" strokeLinecap="round" />
      </svg>
    </>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function SubscribePage() {
  const { user } = useUser();
  const router   = useRouter();

  const [selected,      setSelected]      = useState<PlanId>("YEARLY");
  const [loading,       setLoading]       = useState(false);
  const [trialLoading,  setTrialLoading]  = useState(false);
  const [sdkReady,      setSdkReady]      = useState(false);
  const [trialSuccess,  setTrialSuccess]  = useState(false);
  const [trialError,    setTrialError]    = useState<string | null>(null);
  const [paymentError,  setPaymentError]  = useState<string | null>(null);
  const [accessInfo,    setAccessInfo]    = useState<AccessInfo | null>(null);
  const [accessLoading, setAccessLoading] = useState(true);

  // Separate refs — trial and payment handlers never block each other
  const isTrialProcessing   = useRef(false);
  const isPaymentProcessing = useRef(false);

  // Snapshot of plan user actually paid for — immune to mid-checkout selection changes
  const paidPlanRef = useRef<Plan | null>(null);

  const activePlan = PLANS.find((p) => p.id === selected)!;

  // Preload Razorpay SDK in background
  useEffect(() => { loadRazorpay().then(setSdkReady); }, []);

  // Check current access on mount — redirect if already has access,
  // populate hadTrial to disable trial button if already used
  useEffect(() => {
    fetch("/api/access")
      .then(async (r) => {
        // ✅ Always check res.ok before parsing — a 500 body is not valid access data
        if (!r.ok) throw new Error("Access check failed");
        return r.json();
      })
      .then((data) => {
        setAccessInfo({
          hasAccess: data.hasAccess ?? false,
          status:    data.status    ?? null,
          // hadTrial must be returned by /api/access — add it to the route's
          // select query and include it in every response that returns user data
          hadTrial:  data.hadTrial  ?? false,
        });

        // Redirect if user already has access or is mid-payment
        // "processing" → they just paid, send back to dashboard
        if (data.hasAccess || REDIRECT_STATUSES.has(data.status)) {
          router.replace("/dashboard");
        }
      })
      .catch(() => {
        // On error, show the page — don't silently block access to /subscribe
        setAccessInfo({ hasAccess: false, status: null, hadTrial: false });
      })
      .finally(() => setAccessLoading(false));
  }, [router]);

  // Auto-redirect 2s after trial success popup
  useEffect(() => {
    if (!trialSuccess) return;
    const t = setTimeout(() => router.push("/dashboard"), 2000);
    return () => clearTimeout(t);
  }, [trialSuccess, router]);

  // ── Free trial handler ────────────────────────────────────────────────────
  async function handleStartTrial() {
    if (isTrialProcessing.current) return;
    isTrialProcessing.current = true;
    setTrialError(null);
    setPaymentError(null);
    setTrialLoading(true);

    try {
      const res  = await fetch("/api/start-trial", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to start trial. Please try again.");
      setTrialSuccess(true);
    } catch (err: unknown) {
      setTrialError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setTrialLoading(false);
      isTrialProcessing.current = false;
    }
  }

  // ── Paid subscription handler ─────────────────────────────────────────────
  async function handleSubscribe() {
    if (isPaymentProcessing.current) return;
    isPaymentProcessing.current = true;
    setTrialError(null);
    setPaymentError(null);
    setLoading(true);

    try {
      if (!sdkReady) {
        const loaded = await loadRazorpay();
        if (!loaded) throw new Error("Payment gateway failed to load. Please refresh and try again.");
        setSdkReady(true);
      }

      const res  = await fetch("/api/create-subscription", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ plan: selected }),
      });
      const data: { subscriptionId?: string; error?: string } = await res.json();

      if (!res.ok || !data.subscriptionId) {
        throw new Error(data.error || "Failed to create subscription. Please try again.");
      }

      const key = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
      if (!key) throw new Error("Payment configuration error. Contact support.");

      const prefill = {
        name:  user?.fullName ?? "",
        email: user?.primaryEmailAddress?.emailAddress ?? "",
        ...(user?.primaryPhoneNumber?.phoneNumber && {
          contact: user.primaryPhoneNumber.phoneNumber,
        }),
      };

      // Snapshot plan before opening modal — selection may change mid-checkout
      paidPlanRef.current = activePlan;

      let dismissed = false;

      const options = {
        key,
        subscription_id: data.subscriptionId,
        name:            "e-lekha-jokha",
        description:     `${activePlan.label} — ${activePlan.duration}`,
        prefill,
        theme:           { color: "#16a34a" },

        // Do NOT verify payment here — webhook is the source of truth.
        // Redirect to dashboard; SubscriptionGuard shows "processing" and
        // polls until webhook confirms active status.
        handler: function () {
          isPaymentProcessing.current = false;
          setLoading(false);
          router.push("/dashboard");
        },

        modal: {
          ondismiss: () => {
            dismissed = true;
            setLoading(false);
            isPaymentProcessing.current = false;
            setPaymentError("Payment cancelled.");
          },
        },
      };

      const rzp = new window.Razorpay(options);

      rzp.on("payment.failed", (resp: { error?: { description?: string } }) => {
        if (!dismissed) {
          setLoading(false);
          isPaymentProcessing.current = false;
          setPaymentError(resp.error?.description || "Payment failed. Try again.");
        }
      });

      rzp.open();

      // Return before finally — modal callbacks own state from here
      return;

    } catch (err: unknown) {
      setPaymentError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
      isPaymentProcessing.current = false;
    }
  }

  const trialAlreadyUsed = accessInfo?.hadTrial === true;

  // ── Mount loading screen ──────────────────────────────────────────────────
  if (accessLoading) {
    return (
      <div style={styles.page}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, color: "#6b7280", fontSize: "0.875rem" }}>
          <Spinner dark /> Checking your account…
        </div>
      </div>
    );
  }

  // ── UI ────────────────────────────────────────────────────────────────────
  return (
    <div style={styles.page}>
      <div style={styles.card}>

        {/* Header */}
        <div style={styles.header}>
          <h2 style={styles.title}>Choose your plan</h2>
          <p style={styles.subtitle}>All plans include full platform access. No hidden fees.</p>
        </div>

        {/* Free Trial Card */}
        {/* opacity on wrapper dims visually; disabled on button handles interaction */}
        <div style={{ ...styles.trialCard, opacity: trialAlreadyUsed ? 0.5 : 1 }}>
          <div style={styles.trialTop}>
            <div>
              <div style={styles.planLabelRow}>
                <span style={styles.planLabel}>Free Trial</span>
                {trialAlreadyUsed
                  ? <span style={{ ...styles.trialBadge, background: "#fee2e2", color: "#dc2626" }}>Already used</span>
                  : <span style={styles.trialBadge}>No card needed</span>
                }
              </div>
              <div style={styles.planMeta}>
                {trialAlreadyUsed ? "Your free trial has been used" : "15 days free · Full access"}
              </div>
            </div>
            <div style={styles.priceBlock}>
              <span style={styles.trialPrice}>₹0</span>
              <div style={{ fontSize: "0.72rem", color: "#6b7280", textAlign: "right" }}>15 days</div>
            </div>
          </div>

          {!trialAlreadyUsed && (
            <ul style={styles.featureList} aria-label="Trial features">
              {TRIAL_FEATURES.map((f) => (
                <li key={f} style={styles.featureItem}>
                  <TrialCheck /><span>{f}</span>
                </li>
              ))}
            </ul>
          )}

          {trialError && (
            <div role="alert" style={styles.errorBox}>
              <span>⚠</span>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <span>{trialError}</span>
                <button onClick={handleStartTrial} style={styles.retryBtn}>Try again</button>
              </div>
            </div>
          )}

          <button
            onClick={handleStartTrial}
            disabled={trialLoading || trialAlreadyUsed}
            aria-busy={trialLoading}
            style={{ ...styles.trialBtn, ...(trialLoading || trialAlreadyUsed ? styles.ctaDisabled : {}) }}
          >
            {trialLoading
              ? <span style={styles.ctaInner}><Spinner /> Starting trial…</span>
              : trialAlreadyUsed
              ? "Trial already used"
              : "Start Free Trial →"
            }
          </button>
        </div>

        {/* Divider */}
        <div style={styles.divider}>
          <div style={styles.dividerLine} />
          <span style={styles.dividerText}>or choose a paid plan</span>
          <div style={styles.dividerLine} />
        </div>

        {/* Paid Plan Cards */}
        <div style={styles.planList}>
          {PLANS.map((plan) => {
            const active = selected === plan.id;
            return (
              <button
                key={plan.id}
                onClick={() => setSelected(plan.id)}
                aria-pressed={active}
                style={{ ...styles.planBtn, ...(active ? styles.planBtnActive : {}) }}
              >
                <div style={styles.planRow}>
                  <div>
                    <div style={styles.planLabelRow}>
                      <span style={styles.planLabel}>{plan.label}</span>
                      {plan.badge && <span style={styles.badge}>{plan.badge}</span>}
                    </div>
                    <div style={styles.planMeta}>{plan.perMonth} &bull; {plan.duration}</div>
                  </div>
                  <div style={styles.priceBlock}>
                    <span style={styles.price}>₹{plan.price}</span>
                    {plan.savings && <span style={styles.savings}>{plan.savings}</span>}
                  </div>
                </div>

                {active && (
                  <ul style={styles.featureList} aria-label="Plan features">
                    {plan.features.map((f) => (
                      <li key={f} style={styles.featureItem}>
                        <Check /><span>{f}</span>
                      </li>
                    ))}
                  </ul>
                )}

                <div style={styles.radioRow}>
                  <span style={{ ...styles.radio, ...(active ? styles.radioActive : {}) }}>
                    {active && <span style={styles.radioDot} />}
                  </span>
                  <span style={styles.radioLabel}>{active ? "Selected" : "Select this plan"}</span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Payment error — retry calls correct handler */}
        {paymentError && (
          <div role="alert" style={styles.errorBox}>
            <span>⚠</span>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <span>{paymentError}</span>
              <button onClick={handleSubscribe} style={styles.retryBtn}>Try again</button>
            </div>
          </div>
        )}

        {/* Paid CTA */}
        <button
          onClick={handleSubscribe}
          disabled={loading || !sdkReady}
          aria-busy={loading}
          style={{ ...styles.cta, ...(loading || !sdkReady ? styles.ctaDisabled : {}) }}
        >
          {loading ? (
            <span style={styles.ctaInner}><Spinner /> Opening checkout…</span>
          ) : !sdkReady ? (
            <span style={styles.ctaInner}><Spinner /> Loading…</span>
          ) : (
            "Secure Checkout →"
          )}
        </button>

        <p style={styles.trust}>🔒 Secured by Razorpay &nbsp;•&nbsp; One-time payment</p>
      </div>

      {/* Trial success popup */}
      {trialSuccess && (
        <div style={styles.overlay} role="dialog" aria-modal aria-label="Trial started">
          <div style={styles.popup}>
            <div style={{ ...styles.popupIcon, background: "#eef2ff", border: "2px solid #c7d2fe", color: "#4f46e5" }}>✓</div>
            <h3 style={styles.popupTitle}>Trial Started!</h3>
            <p style={styles.popupDesc}>
              Your <strong>15-day free trial</strong> is now active.<br />
              Redirecting to dashboard…
            </p>
            <div style={styles.popupDots}>
              {(["0s", "0.2s", "0.4s"] as const).map((delay) => (
                <span key={delay} style={{ ...styles.dot, background: "#6366f1", animationDelay: delay }} />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles: Record<string, React.CSSProperties> = {
  page:         { minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "2rem 1rem", background: "#f9fafb" },
  card:         { width: "100%", maxWidth: 480, background: "#ffffff", borderRadius: 16, boxShadow: "0 4px 24px rgba(0,0,0,0.08)", padding: "2rem" },
  header:       { marginBottom: "1.5rem" },
  title:        { margin: 0, fontSize: "1.4rem", fontWeight: 700, color: "#111" },
  subtitle:     { margin: "0.3rem 0 0", fontSize: "0.875rem", color: "#6b7280" },
  trialCard:    { border: "1.5px solid #c7d2fe", background: "#f5f3ff", borderRadius: 12, padding: "14px 16px", marginBottom: "1.25rem", display: "flex", flexDirection: "column", gap: 10, transition: "opacity 0.2s" },
  trialTop:     { display: "flex", justifyContent: "space-between", alignItems: "flex-start" },
  trialBadge:   { fontSize: "0.65rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em", color: "#6366f1", background: "#e0e7ff", padding: "2px 7px", borderRadius: 99 },
  trialPrice:   { display: "block", fontSize: "1.1rem", fontWeight: 700, color: "#111" },
  trialBtn:     { width: "100%", padding: "11px", background: "#6366f1", color: "#fff", border: "none", borderRadius: 10, fontWeight: 700, fontSize: "0.95rem", cursor: "pointer", transition: "opacity 0.15s" },
  divider:      { display: "flex", alignItems: "center", gap: 10, marginBottom: "1.25rem" },
  dividerLine:  { flex: 1, height: 1, background: "#e5e7eb" },
  dividerText:  { fontSize: "0.75rem", color: "#9ca3af", whiteSpace: "nowrap" },
  planList:     { display: "flex", flexDirection: "column", gap: 10, marginBottom: "1.25rem" },
  planBtn:      { width: "100%", padding: "14px 16px", borderRadius: 12, border: "1.5px solid #e5e7eb", background: "#fff", textAlign: "left", cursor: "pointer", transition: "border-color 0.15s, background 0.15s, box-shadow 0.15s" },
  planBtnActive:{ border: "2px solid #16a34a", background: "#f0fdf4", boxShadow: "0 0 0 3px rgba(22,163,74,0.08)" },
  planRow:      { display: "flex", justifyContent: "space-between", alignItems: "flex-start" },
  planLabelRow: { display: "flex", alignItems: "center", gap: 8 },
  planLabel:    { fontWeight: 600, fontSize: "0.95rem", color: "#111" },
  badge:        { fontSize: "0.65rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em", color: "#16a34a", background: "#dcfce7", padding: "2px 7px", borderRadius: 99 },
  planMeta:     { fontSize: "0.78rem", color: "#6b7280", marginTop: 3 },
  priceBlock:   { textAlign: "right" },
  price:        { display: "block", fontSize: "1.1rem", fontWeight: 700, color: "#111" },
  savings:      { fontSize: "0.72rem", color: "#16a34a", fontWeight: 600 },
  featureList:  { listStyle: "none", margin: "12px 0 4px", padding: 0, display: "flex", flexDirection: "column", gap: 7 },
  featureItem:  { display: "flex", alignItems: "center", gap: 8, fontSize: "0.82rem", color: "#374151" },
  radioRow:     { display: "flex", alignItems: "center", gap: 7, marginTop: 12 },
  radio:        { width: 16, height: 16, borderRadius: "50%", border: "1.5px solid #d1d5db", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  radioActive:  { border: "1.5px solid #16a34a" },
  radioDot:     { width: 8, height: 8, borderRadius: "50%", background: "#16a34a" },
  radioLabel:   { fontSize: "0.78rem", color: "#6b7280" },
  errorBox:     { display: "flex", alignItems: "flex-start", gap: 8, background: "#fef2f2", color: "#991b1b", border: "1px solid #fecaca", padding: "10px 14px", borderRadius: 10, fontSize: "0.85rem", marginBottom: "1rem" },
  cta:          { width: "100%", padding: "13px", background: "#16a34a", color: "#fff", border: "none", borderRadius: 12, fontWeight: 700, fontSize: "1rem", cursor: "pointer", transition: "opacity 0.15s" },
  ctaDisabled:  { opacity: 0.7, cursor: "not-allowed" },
  ctaInner:     { display: "flex", alignItems: "center", justifyContent: "center", gap: 8 },
  retryBtn:     { alignSelf: "flex-start", background: "none", border: "1px solid #fca5a5", borderRadius: 6, color: "#991b1b", fontSize: "0.78rem", fontWeight: 600, padding: "3px 10px", cursor: "pointer" },
  trust:        { textAlign: "center", marginTop: 12, fontSize: "0.75rem", color: "#9ca3af" },
  overlay:      { position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 },
  popup:        { background: "#fff", borderRadius: 20, padding: "2.5rem 2rem", maxWidth: 360, width: "90%", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 12, boxShadow: "0 24px 64px rgba(0,0,0,0.18)" },
  popupIcon:    { width: 60, height: 60, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.6rem", fontWeight: 700 },
  popupTitle:   { margin: 0, fontSize: "1.25rem", fontWeight: 700, color: "#111" },
  popupDesc:    { margin: 0, fontSize: "0.875rem", color: "#6b7280", lineHeight: 1.7 },
  popupDots:    { display: "flex", gap: 6, marginTop: 4 },
  dot:          { width: 7, height: 7, borderRadius: "50%", animation: "rzp-bounce 1s infinite ease-in-out" },
};