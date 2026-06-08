// lib/razorpaySubscription.ts
//
// Single source of truth for "does this Razorpay subscription represent PAID
// access?" — used by verify-payment, the /api/access self-heal, the webhook,
// and the reconciliation script so they can never disagree.
//
// The product sells one-time access via Razorpay Subscriptions with
// `total_count: 1`. After the single charge is collected the subscription
// settles to `completed` within seconds (it never rests at `active`). So
// `completed` with `paid_count >= 1` is a SUCCESS terminal state here, NOT an
// expiry — treat it as paid and grant access until `current_end`.
//
// Param types are a permissive structural subset so any caller (typed SDK
// object or untyped webhook JSON) can pass its subscription straight through.

interface RazorpaySubscriptionLike {
  status?: string | null;
  paid_count?: number | null;
  current_end?: number | null;
}

/** True when Razorpay reports this subscription as paid/live. */
export function subscriptionGrantsAccess(sub: RazorpaySubscriptionLike): boolean {
  if (sub.status === "active" || sub.status === "authenticated") return true;
  // total_count=1 one-time charge that actually collected money.
  if (sub.status === "completed" && Number(sub.paid_count ?? 0) >= 1) return true;
  return false;
}

/** Access-expiry from Razorpay's own clock (Unix seconds → Date), or null. */
export function subscriptionEndDate(sub: RazorpaySubscriptionLike): Date | null {
  return sub.current_end ? new Date(Number(sub.current_end) * 1000) : null;
}
