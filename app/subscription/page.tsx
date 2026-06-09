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

interface AccessInfo {
  hasAccess: boolean;
  status:    string | null;
  hadTrial:  boolean;
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

// ✅ Only redirect active and mid-payment users
// trial users CAN visit /subscribe to upgrade to a paid plan
const REDIRECT_STATUSES = new Set(["active", "processing"]);

// ── Razorpay SDK loader ───────────────────────────────────────────────────────
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
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#555B3F" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <polyline points="9 12 11 14 15 10" />
    </svg>
  );
}

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

  const isTrialProcessing   = useRef(false);
  const isPaymentProcessing = useRef(false);
  const paidPlanRef         = useRef<Plan | null>(null);

  const activePlan = PLANS.find((p) => p.id === selected)!;

  // Preload Razorpay SDK in background
  useEffect(() => { loadRazorpay().then(setSdkReady); }, []);

  // Check access on mount
  useEffect(() => {
    fetch("/api/access")
      .then(async (r) => {
        if (!r.ok) throw new Error("Access check failed");
        return r.json();
      })
      .then((data) => {
        setAccessInfo({
          hasAccess: data.hasAccess ?? false,
          status:    data.status    ?? null,
          hadTrial:  data.hadTrial  ?? false,
        });

        // ✅ Only redirect based on STATUS — not hasAccess.
        // trial users have hasAccess:true but should still see this page
        // to upgrade. Only active and processing get redirected.
        if (REDIRECT_STATUSES.has(data.status)) {
          router.replace("/dashboard");
        }
      })
      .catch(() => {
        setAccessInfo({ hasAccess: false, status: null, hadTrial: false });
      })
      .finally(() => setAccessLoading(false));
  }, [router]);

  // Auto-redirect 2s after trial success
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

      paidPlanRef.current = activePlan;
      let dismissed = false;

      const options = {
        key,
        subscription_id: data.subscriptionId,
        name:            "e-lekha-jokha",
        description:     `${activePlan.label} — ${activePlan.duration}`,
        prefill,
        theme:           { color: "#16a34a" },
        handler: async function (response: {
          razorpay_payment_id?: string;
          razorpay_subscription_id?: string;
          razorpay_signature?: string;
        }) {
          // Razorpay captured the payment — now verify server-side BEFORE
          // granting access. Only redirect once /api/verify-payment confirms
          // the subscription is genuinely active.
          setLoading(true);
          setPaymentError(null);
          try {
            const verifyRes = await fetch("/api/verify-payment", {
              method:  "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                razorpay_payment_id:      response.razorpay_payment_id,
                razorpay_subscription_id: response.razorpay_subscription_id,
                razorpay_signature:       response.razorpay_signature,
              }),
            });

            const verifyData: { success?: boolean; error?: string } =
              await verifyRes.json().catch(() => ({}));

            if (!verifyRes.ok || !verifyData.success) {
              // Verification failed — do NOT redirect; surface the error.
              setPaymentError(
                verifyData.error
                  ? `Payment verification failed (${verifyData.error}). If you were charged, please contact support.`
                  : "Payment verification failed. If you were charged, please contact support."
              );
              return;
            }

            // Verified & active — refresh server state, then go to dashboard.
            router.push("/dashboard");
            router.refresh();
          } catch {
            // The verify-payment call itself failed (network/other). Don't
            // redirect into a paywall — the webhook is the async safety net.
            setPaymentError(
              "Couldn't verify your payment due to a network error. If you were charged, it will be confirmed shortly — please refresh in a moment."
            );
          } finally {
            setLoading(false);
            isPaymentProcessing.current = false;
          }
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
      return;

    } catch (err: unknown) {
      setPaymentError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
      isPaymentProcessing.current = false;
    }
  }

  // ✅ Disable trial if: already used, OR currently on active trial
  // hadTrial covers both — it's set to true when trial starts and never reset
  const trialAlreadyUsed = accessInfo?.hadTrial === true;

  // ── Mount loading ─────────────────────────────────────────────────────────
  if (accessLoading) {
    return (
      <div className="min-h-screen bg-[#F5F4EF] flex items-center justify-center">
        <div className="text-[#6F6F6F] flex items-center gap-2">
          <Spinner dark /> Checking your account…
        </div>
      </div>
    );
  }

  // ── UI ────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen h-screen bg-[#F5F4EF] text-[#2C2C2C] font-sans flex flex-col pt-8 pb-16 px-6 relative overflow-y-auto">
      
      {/* Back Button */}
      <button 
        onClick={() => router.back()}
        className="absolute top-6 left-6 md:top-8 md:left-10 w-11 h-11 bg-white border border-[#ECEAE4] rounded-full flex items-center justify-center text-[#2C2C2C] shadow-sm hover:bg-[#FAFAF8] hover:border-[#DEDCD1] transition-all z-50 group"
        aria-label="Go back"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="transition-transform group-hover:-translate-x-0.5"><path d="M19 12H5"/><path d="m12 19-7-7 7-7"/></svg>
      </button>

      <div className="max-w-[1100px] mx-auto w-full flex-1 flex flex-col relative z-10 justify-center">
        
        {/* Header Content */}
        <div className="text-center mb-6 flex flex-col items-center">
          <div className="bg-[#EAE8DD] text-[#555B3F] text-[9px] font-bold px-3 py-1.5 rounded-full flex items-center gap-1.5 mb-4 uppercase tracking-wider">
            <svg width="10" height="12" viewBox="0 0 10 12" fill="none">
              <path fillRule="evenodd" clipRule="evenodd" d="M2.5 4.5V3C2.5 1.61929 3.61929 0.5 5 0.5C6.38071 0.5 7.5 1.61929 7.5 3V4.5H8.5C9.05228 4.5 9.5 4.94772 9.5 5.5V10.5C9.5 11.0523 9.05228 11.5 8.5 11.5H1.5C0.947715 11.5 0.5 11.0523 0.5 10.5V5.5C0.5 4.94772 0.947715 4.5 1.5 4.5H2.5ZM5 1.5C4.17157 1.5 3.5 2.17157 3.5 3V4.5H6.5V3C6.5 2.17157 5.82843 1.5 5 1.5Z" fill="#555B3F"/>
            </svg>
            SECURE & ENCRYPTED
          </div>
          <h1 className="text-[36px] md:text-[42px] font-semibold tracking-tight text-[#2C2C2C] leading-tight mb-2">Choose your plan</h1>
          <p className="text-[#6F6F6F] text-[14px]">Start your free trial or subscribe to continue using ELEKHAJOKHA.</p>
        </div>

        {/* Trial banner for current trial users */}
        {accessInfo?.status === "trial" && (
          <div className="max-w-[900px] mx-auto w-full bg-[#FAFAF8] border border-[#ECEAE4] rounded-[16px] p-3 text-[13px] text-[#6F6F6F] text-center mb-6 shadow-sm">
            ⏳ You're currently on a free trial. Upgrade below to get full access after it ends.
          </div>
        )}
        
        {/* Errors */}
        {(trialError || paymentError) && (
          <div className="max-w-[900px] mx-auto w-full bg-[#FCEAE9] border border-[#F5C2C7] rounded-[16px] p-3 text-[13px] text-[#C94A4A] text-center mb-6 flex items-center justify-center gap-3">
             <span className="font-bold">⚠</span> {trialError || paymentError}
          </div>
        )}

        {/* Pricing Cards Row */}
        <div className="w-full grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 px-4 md:px-0">
          
          {/* Free Trial Card */}
          <div className="bg-white rounded-[24px] border border-[#ECEAE4] p-6 flex flex-col relative h-full">
            <h3 className="text-[18px] font-bold text-[#2C2C2C] mb-2">Free Trial</h3>
            <div className="flex items-baseline gap-1 mb-1">
              <span className="text-[36px] font-bold text-[#2C2C2C] leading-none">₹0</span>
            </div>
            <p className="text-[#6F6F6F] text-[13px] mb-4 pb-3 border-b border-[#F4F3EE]">15 days free</p>
            
            <ul className="flex flex-col gap-3 mb-6 flex-1">
              {TRIAL_FEATURES.map(f => (
                <li key={f} className="flex items-start gap-3 text-[13px] font-medium text-[#6F6F6F]">
                  <div className="mt-0.5"><Check /></div>
                  {f}
                </li>
              ))}
            </ul>
            
            <button 
              onClick={handleStartTrial}
              disabled={trialLoading || trialAlreadyUsed}
              className="w-full py-3 rounded-[12px] bg-[#EAE8DD] text-[#555B3F] font-bold text-[13px] transition-colors hover:bg-[#DEDCD1] disabled:opacity-50 mt-auto"
            >
              {trialLoading ? "Starting..." : trialAlreadyUsed ? "Trial Used" : "Start Free Trial"}
            </button>
          </div>

          {/* Half Yearly Card */}
          <div 
             onClick={() => setSelected('HALF_YEARLY')}
             className={`bg-white rounded-[24px] border transition-all p-6 flex flex-col relative cursor-pointer h-full ${selected === 'HALF_YEARLY' ? 'border-[#555B3F] shadow-lg ring-1 ring-[#555B3F]' : 'border-[#ECEAE4] hover:border-[#DEDCD1]'}`}
          >
            <h3 className="text-[18px] font-bold text-[#2C2C2C] mb-2">Half-Yearly</h3>
            <div className="flex items-baseline gap-1 mb-1">
              <span className="text-[36px] font-bold text-[#2C2C2C] leading-none">₹999</span>
            </div>
            <p className="text-[#6F6F6F] text-[13px] mb-4 pb-3 border-b border-[#F4F3EE] flex flex-col gap-0.5">
              <span>6 months access (₹166/month)</span>
            </p>
            
            <ul className="flex flex-col gap-3 mb-6 flex-1">
              {PLANS[0].features.map(f => (
                <li key={f} className="flex items-start gap-3 text-[13px] font-medium text-[#6F6F6F]">
                  <div className="mt-0.5"><Check /></div>
                  {f}
                </li>
              ))}
            </ul>
            
            <button 
               onClick={(e) => { e.stopPropagation(); setSelected('HALF_YEARLY'); handleSubscribe(); }}
               disabled={loading || !sdkReady}
               className="w-full py-3 rounded-[12px] bg-[#EAE8DD] text-[#555B3F] font-bold text-[13px] transition-colors hover:bg-[#DEDCD1] disabled:opacity-50 flex items-center justify-center mt-auto"
            >
              {loading && selected === 'HALF_YEARLY' ? <Spinner dark /> : "Select Plan"}
            </button>
          </div>

          {/* Yearly Card (Best Value) */}
          <div 
             onClick={() => setSelected('YEARLY')}
             className={`bg-white rounded-[24px] border transition-all p-6 flex flex-col relative cursor-pointer h-full ${selected === 'YEARLY' ? 'border-[#555B3F] shadow-[0_12px_40px_rgba(85,91,63,0.15)] ring-1 ring-[#555B3F]' : 'border-[#ECEAE4] hover:border-[#DEDCD1]'}`}
          >
            <div className="absolute top-0 right-0 bg-[#555B3F] text-white text-[10px] font-bold px-3 py-1 rounded-tr-[24px] rounded-bl-[12px]">
              Best Value
            </div>
            
            <h3 className="text-[18px] font-bold text-[#2C2C2C] mb-2">Yearly</h3>
            <div className="flex items-baseline gap-1 mb-1">
              <span className="text-[36px] font-bold text-[#2C2C2C] leading-none">₹1499</span>
            </div>
            <p className="text-[#6F6F6F] text-[13px] mb-4 pb-3 border-b border-[#F4F3EE] flex flex-col gap-0.5">
              <span>12 months access (₹124/mo)</span>
              <span className="font-bold text-[#555B3F]">Save ₹499</span>
            </p>
            
            <ul className="flex flex-col gap-3 mb-6 flex-1">
              {PLANS[1].features.map(f => (
                <li key={f} className="flex items-start gap-3 text-[13px] font-medium text-[#6F6F6F]">
                  <div className="mt-0.5"><Check /></div>
                  {f}
                </li>
              ))}
            </ul>
            
            <button 
              onClick={(e) => { e.stopPropagation(); setSelected('YEARLY'); handleSubscribe(); }}
              disabled={loading || !sdkReady}
              className="w-full py-3 rounded-[12px] bg-[#555B3F] text-white font-bold text-[13px] transition-colors hover:bg-[#4B5036] disabled:opacity-50 flex items-center justify-center mt-auto shadow-md"
            >
               {loading && selected === 'YEARLY' ? <Spinner /> : "Select Plan"}
            </button>
          </div>

        </div>

        {/* Checkout Info */}
        <div className="border-t border-[#EAE8DD] pt-8 pb-4 w-full mx-auto flex flex-col md:flex-row items-center justify-center gap-6 md:gap-10">
          <div className="flex items-start gap-3">
             <div className="mt-0.5">
               <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2C2C2C" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
             </div>
             <div>
               <h4 className="font-bold text-[#2C2C2C] text-[13px] mb-0.5">Secure Checkout</h4>
               <p className="text-[12px] text-[#6F6F6F]">Payment is encrypted</p>
             </div>
          </div>
          <div className="flex items-start gap-3">
             <div className="mt-0.5">
               <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2C2C2C" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
             </div>
             <div>
               <h4 className="font-bold text-[#2C2C2C] text-[13px] mb-0.5">Cancel anytime</h4>
               <p className="text-[12px] text-[#6F6F6F]">No questions asked</p>
             </div>
          </div>
          <div className="flex items-start gap-3">
             <div className="mt-0.5">
               <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2C2C2C" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14 9a2 2 0 0 1-2 2H6l-4 4V4c0-1.1.9-2 2-2h8a2 2 0 0 1 2 2v5Z"/><path d="M18 9h2a2 2 0 0 1 2 2v11l-4-4h-6a2 2 0 0 1-2-2v-1"/></svg>
             </div>
             <div>
               <h4 className="font-bold text-[#2C2C2C] text-[13px] mb-0.5">24/7 Support</h4>
               <p className="text-[12px] text-[#6F6F6F]">We're here to help</p>
             </div>
          </div>
          <div className="flex items-start gap-3">
             <div className="mt-0.5 text-[#555B3F]">
               <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>
             </div>
             <div>
               <h4 className="font-bold text-[#2C2C2C] text-[13px] mb-0.5">Razorpay secure</h4>
               <p className="text-[12px] text-[#6F6F6F]">100% safe transactions</p>
             </div>
          </div>
        </div>

      </div>

      {/* Minimal Footer */}
      <div className="w-full bg-[#EBE9E0] py-6 px-10 absolute bottom-0 left-0 right-0 flex flex-col md:flex-row items-center justify-between text-[12px] font-medium text-[#6F6F6F]">
        <div className="font-bold text-[#2C2C2C]">ELEKHAJOKHA</div>
        <div className="flex items-center gap-6 mt-4 md:mt-0">
          <a href="#" className="hover:text-[#2C2C2C] transition-colors">Security Architecture</a>
          <a href="#" className="hover:text-[#2C2C2C] transition-colors">Privacy Protocol</a>
          <a href="#" className="hover:text-[#2C2C2C] transition-colors">Compliance</a>
          <a href="#" className="hover:text-[#2C2C2C] transition-colors">Support</a>
        </div>
        <div className="mt-4 md:mt-0 text-right">
          © {new Date().getFullYear()} ELEKHAJOKHA. Secure financial infrastructure.
        </div>
      </div>
      
      {/* Trial success popup */}
      {trialSuccess && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[24px] p-8 w-full max-w-[400px] text-center shadow-xl">
             <div className="w-14 h-14 bg-[#FAFAF8] border border-[#ECEAE4] rounded-full flex items-center justify-center mx-auto mb-5">
               <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#555B3F" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
             </div>
             <h3 className="text-[20px] font-bold text-[#2C2C2C] mb-2">Trial Started!</h3>
             <p className="text-[14px] text-[#6F6F6F] mb-6">
               Your <strong>15-day free trial</strong> is now active.<br/>Redirecting to dashboard...
             </p>
          </div>
        </div>
      )}

    </div>
  );
}