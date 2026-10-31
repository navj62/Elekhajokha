// lib/interestRate.ts
//
// The one interest-rate rule, shared by the new-pledge form, the pledge POST,
// onboarding and the settings page: a number above 0 and at most 100 (% p.a.),
// with at most 2 decimal places (Pledge.interestRate and
// User.defaultInterestRate are both Decimal(5,2) — more places would be
// silently rounded by Postgres). Client-safe: no Prisma import.

export const INTEREST_RATE_MAX = 100;

// "12", "12.", "12.5", "12.34", ".5" — digits only, never exponent/sign forms.
const RATE_SHAPE = /^(?:\d+\.?\d{0,2}|\.\d{1,2})$/;
const ANY_DECIMAL = /^(?:\d+\.?\d*|\.\d+)$/;

export type InterestRateCheck =
  | { ok: true; value: string } // normalised, e.g. "12.5" — safe for Decimal storage
  | { ok: false; message: string };

export function checkInterestRate(raw: unknown): InterestRateCheck {
  const s = String(raw ?? "").trim();
  if (!s) return { ok: false, message: "Enter the interest rate." };
  if (!ANY_DECIMAL.test(s)) return { ok: false, message: "Interest rate must be a number." };
  if (!RATE_SHAPE.test(s)) return { ok: false, message: "Interest rate can have at most 2 decimal places." };
  const n = Number(s);
  if (!(n > 0)) return { ok: false, message: "Interest rate must be greater than 0." };
  if (n > INTEREST_RATE_MAX) return { ok: false, message: `Interest rate must be at most ${INTEREST_RATE_MAX}.` };
  return { ok: true, value: String(n) };
}
