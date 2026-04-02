// components/SubscriptionGuard.tsx
"use client";

import { useEffect, useRef }  from "react";
import { useRouter }          from "next/navigation";
import { useAccess }          from "@/hooks/useAccess";
import {
  Loader2,
  Lock,
  Sparkles,
  Clock,
  AlertTriangle,
  RefreshCw,
} from "lucide-react";

interface SubscriptionGuardProps {
  children:     React.ReactNode;
  featureName?: string;
}

export default function SubscriptionGuard({
  children,
  featureName = "this feature",
}: SubscriptionGuardProps) {
  const router = useRouter();
  const { hasAccess, isLoading, status, reason, daysLeft, refetch } = useAccess();

  // ── Fix 6: Safe polling with intervalRef — prevents multiple intervals ────
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (status !== "processing") {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }
    intervalRef.current = setInterval(refetch, 4000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [status, refetch]);

  // ── Fix 3: Auto-refresh page when webhook fires and access becomes true ───
  // Stays on the same page — just re-renders with full access
  useEffect(() => {
    if (hasAccess && status === "active") {
      router.refresh();
    }
  }, [hasAccess, status, router]);

  // ── Fix 8: Lock documentElement not body — more reliable across browsers ──
  useEffect(() => {
    const shouldLock =
      !isLoading &&
      !hasAccess &&
      status !== "processing" &&
      status !== "server_error" &&
      status !== "error" &&
      status !== "account_suspended";

    document.documentElement.style.overflow = shouldLock ? "hidden" : "";
    return () => { document.documentElement.style.overflow = ""; };
  }, [isLoading, hasAccess, status]);

  // ── 1. Loading ────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="animate-spin text-gray-400" size={28} />
      </div>
    );
  }

  // ── 2. Server / network error ─────────────────────────────────────────────
  if (status === "server_error" || status === "error") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3 text-sm text-gray-500">
        <AlertTriangle size={22} className="text-red-400" />
        <p>Something went wrong. Please refresh the page.</p>
        <button
          onClick={() => window.location.reload()}
          className="flex items-center gap-1.5 text-xs underline text-gray-400 hover:text-gray-600 transition-colors"
        >
          <RefreshCw size={12} /> Refresh
        </button>
      </div>
    );
  }

  // ── 3. Account suspended ──────────────────────────────────────────────────
  if (status === "account_suspended") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3 text-sm text-gray-500">
        <Lock size={22} className="text-gray-400" />
        <p>Your account has been suspended. Please contact support.</p>
      </div>
    );
  }

  // ── Fix 5: Unauthenticated → redirect to sign-in ─────────────────────────
  if (status === "unauthenticated") {
    router.push("/sign-in");
    return null;
  }

  // ── 4. Payment processing — polling above transitions once webhook fires ──
  if (status === "processing") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center px-4">
        <Loader2 className="animate-spin text-green-500" size={32} />
        <div>
          <p className="text-base font-semibold text-gray-800">
            Verifying your payment…
          </p>
          <p className="text-sm text-gray-500 mt-1">
            This usually takes a few seconds. Please don&apos;t close this tab.
          </p>
        </div>
        {/* Fix 7: "Check again" disabled while polling is already running */}
        <button
          onClick={refetch}
          disabled={status === "processing"}
          className="text-xs text-gray-400 underline hover:text-gray-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Check again
        </button>
      </div>
    );
  }

  // ── 5. Has access → render children with contextual banners ──────────────
  if (hasAccess) {
    return (
      <div>
        {/* Trial — no end date (dev/test) */}
        {status === "trial" && daysLeft === null && (
          <div className="bg-blue-50 border-b border-blue-100 px-4 py-2.5 flex items-center justify-between gap-3 text-sm text-blue-800">
            <span>You&apos;re on a free trial.</span>
            <button
              onClick={() => router.push("/subscribe")}
              className="text-xs font-semibold underline shrink-0 hover:opacity-75 transition-opacity"
            >
              View plans
            </button>
          </div>
        )}

        {/* Fix 4: Stronger trial CTA when ≤5 days left */}
        {status === "trial" && daysLeft !== null && daysLeft <= 5 && (
          <div className="bg-yellow-50 border-b border-yellow-200 px-4 py-2.5 flex items-center justify-between gap-3 text-sm">
            <div className="flex items-center gap-2 text-yellow-800">
              <Clock size={14} className="shrink-0" />
              <span>
                Free trial ends in{" "}
                <strong>{daysLeft} day{daysLeft === 1 ? "" : "s"}</strong>.
                Upgrade before your trial ends to keep access.
              </span>
            </div>
            <button
              onClick={() => router.push("/subscribe")}
              className="text-xs font-semibold bg-yellow-600 hover:bg-yellow-700 text-white px-3 py-1.5 rounded-md shrink-0 transition-colors whitespace-nowrap"
            >
              Upgrade before trial ends
            </button>
          </div>
        )}

        {children}
      </div>
    );
  }

  // ── 6. No access → paywall ────────────────────────────────────────────────
  const isTrialExpired   = status === "trial_expired";
  const isExpired        = status === "expired";
  const isPaymentTimeout = status === "payment_timeout";
  const isHalted         = status === "inactive" && reason === "payment_failed";

  // Fix 1: shouldBlur only when no access AND not halted
  // Prevents any edge-case blur when hasAccess flickers
  const shouldBlur = !hasAccess && !isHalted;

  const title = isHalted
    ? "Payment Failed"
    : isTrialExpired
    ? "Trial Expired"
    : isExpired
    ? "Subscription Expired"
    : isPaymentTimeout
    ? "Payment Session Expired"
    : "Subscription Required";

  // Fix 2: Clearer payment timeout description with explicit action
  const description = isHalted
    ? "Your payment failed and access has been paused. Subscribe again to restore access to "
    : isTrialExpired
    ? "Your 15-day free trial has ended. Subscribe to continue using "
    : isExpired
    ? "Your subscription has expired. Renew to continue using "
    : isPaymentTimeout
    ? "Your payment session expired. Please try subscribing again to access "
    : "Subscribe to e-lekha-jokha to access ";

  const ctaLabel = isHalted
    ? "Retry Payment"
    : isExpired
    ? "Renew Subscription"
    : isTrialExpired
    ? "Subscribe Now"
    : isPaymentTimeout
    ? "Try Again"
    : "View Plans";

  // Fix 10: Richer feature list with value prop
  const FEATURES = [
    "Unlimited customers & pledges",
    "Interest calculator",
    "Full platform access",
    "Save time managing finances",
  ];

  // ── Halted: clean error screen, no blur ───────────────────────────────────
  if (isHalted) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-5 px-4 text-center">
        <div className="w-16 h-16 rounded-full bg-red-50 border-2 border-red-100 flex items-center justify-center">
          <AlertTriangle size={28} className="text-red-500" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-gray-900">{title}</h3>
          <p className="text-sm text-gray-500 mt-1.5 leading-relaxed max-w-xs">
            {description}
            <span className="font-medium text-gray-700">{featureName}</span>.
          </p>
        </div>
        <button
          onClick={() => router.push("/subscription")}
          className="bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-6 rounded-xl transition-colors flex items-center gap-2 text-sm"
        >
          <Sparkles size={15} />
          {ctaLabel}
        </button>
        {/* Fix 9: Urgency line */}
        <p className="text-xs text-red-500">
          Access will be restricted until you upgrade
        </p>
        <p className="text-xs text-gray-400">
          Starting at ₹999 · One-time payment · No auto-renewal
        </p>
      </div>
    );
  }

  // ── All others: blurred content + overlay ────────────────────────────────
  return (
    <div className="relative min-h-[60vh]">
      {/* Fix 1: shouldBlur correctly scoped */}
      {shouldBlur && (
        <div className="pointer-events-none select-none blur-sm opacity-40 overflow-hidden max-h-[60vh]">
          {children}
        </div>
      )}

      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 w-full max-w-sm p-8 flex flex-col items-center text-center gap-4">

          <div className="w-16 h-16 rounded-full bg-gray-50 border-2 border-gray-100 flex items-center justify-center">
            <Lock size={28} className="text-gray-500" />
          </div>

          <div>
            <h3 className="text-lg font-bold text-gray-900">{title}</h3>
            <p className="text-sm text-gray-500 mt-1.5 leading-relaxed">
              {description}
              <span className="font-medium text-gray-700">{featureName}</span>.
            </p>
          </div>

          {/* Fix 10: Richer features list */}
          <ul className="w-full space-y-2 text-left">
            {FEATURES.map((f) => (
              <li key={f} className="flex items-center gap-2.5 text-sm text-gray-600">
                <div className="w-4 h-4 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                  <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                    <path d="M1 4L3 6L7 2" stroke="#16a34a" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                {f}
              </li>
            ))}
          </ul>

          <button
            onClick={() => router.push("/subscription")}
            className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 rounded-xl transition-colors flex items-center justify-center gap-2 text-sm"
          >
            <Sparkles size={15} />
            {ctaLabel}
          </button>

          {/* Fix 9: Urgency line */}
          <p className="text-xs text-red-500">
            Access will be restricted until you upgrade
          </p>

          <p className="text-xs text-gray-400">
            Starting at ₹999 · One-time payment · No auto-renewal
          </p>
        </div>
      </div>
    </div>
  );
}