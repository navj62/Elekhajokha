/**
 * Server-side rules for recording an inventory sale. They mirror the sell
 * page's own checks (app/(UserDetails)/inventory/[id]/sell/page.tsx), so a
 * direct API call cannot record what the page would refuse.
 */

/** A date's calendar day in IST, as YYYY-MM-DD. */
function istDay(d: Date): string {
  return d.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
}

/**
 * Compared by IST calendar day, so a sale on the day of acquisition is
 * allowed whatever the time of day either timestamp carries.
 * Returns an error message, or null when the date is acceptable.
 */
export function saleDateError(soldAt: Date, acquiredAt: Date, now: Date): string | null {
  const day = istDay(soldAt);
  if (day < istDay(acquiredAt)) return "Sale date can't be before the item was acquired.";
  if (day > istDay(now)) return "Sale date can't be in the future.";
  return null;
}

/**
 * Optional; when given it must be exactly 10 digits — no spaces, symbols or
 * +91. Blank counts as not given (the route stores it as null).
 */
export function buyerMobileError(buyerMobile: unknown): string | null {
  if (typeof buyerMobile !== "string" || buyerMobile.trim() === "") return null;
  return /^\d{10}$/.test(buyerMobile) ? null : "Buyer mobile must be exactly 10 digits.";
}
