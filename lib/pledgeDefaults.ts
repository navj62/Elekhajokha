// lib/pledgeDefaults.ts
//
// Shop-level pledge defaults (User.defaultInterestRate /
// defaultAllowCompounding / defaultCompoundingDuration). They only PRE-FILL
// the new-pledge form — every pledge stores its own values, and nothing here
// ever touches an existing pledge. Client-safe: no Prisma import.
import { checkInterestRate } from "@/lib/interestRate";

export const COMPOUNDING_DURATIONS = ["MONTHLY", "HALFYEARLY", "YEARLY"] as const;
export type CompoundingDurationValue = (typeof COMPOUNDING_DURATIONS)[number];

/** Shape returned by GET /api/pledge-defaults. Null = no default set. */
export type PledgeDefaults = {
  defaultInterestRate: string | null;
  defaultAllowCompounding: boolean | null;
  defaultCompoundingDuration: CompoundingDurationValue | null;
};

/** Form field names, shared by onboarding and the settings card. */
export const PLEDGE_DEFAULT_FIELDS = {
  rate: "defaultInterestRate",
  allowCompounding: "defaultAllowCompounding",
  duration: "defaultCompoundingDuration",
} as const;

export type PledgeDefaultsUpdate = Partial<{
  defaultInterestRate: string | null; // string → Prisma Decimal
  defaultAllowCompounding: boolean | null;
  defaultCompoundingDuration: CompoundingDurationValue | null;
}>;

/**
 * Reads the three defaults from FormData. Per field:
 *   absent  → left out of `data` (unchanged)
 *   ""      → null (clears that default)
 *   valid   → the value
 *   invalid → left out of `data`, message added to `errors`
 * Never throws — onboarding relies on that (see app/api/onboarding).
 */
export function parsePledgeDefaults(fd: FormData): { data: PledgeDefaultsUpdate; errors: string[] } {
  const data: PledgeDefaultsUpdate = {};
  const errors: string[] = [];
  const read = (k: string) => {
    const v = fd.get(k);
    return typeof v === "string" ? v.trim() : v === null ? undefined : "";
  };

  const rate = read(PLEDGE_DEFAULT_FIELDS.rate);
  if (rate !== undefined) {
    if (rate === "") data.defaultInterestRate = null;
    else {
      const check = checkInterestRate(rate);
      if (check.ok) data.defaultInterestRate = check.value;
      else errors.push(`Default interest rate: ${check.message}`);
    }
  }

  const allow = read(PLEDGE_DEFAULT_FIELDS.allowCompounding);
  if (allow !== undefined) {
    if (allow === "") data.defaultAllowCompounding = null;
    else if (allow === "true" || allow === "false") data.defaultAllowCompounding = allow === "true";
    else errors.push("Default compounding must be on or off.");
  }

  const duration = read(PLEDGE_DEFAULT_FIELDS.duration);
  if (duration !== undefined) {
    if (duration === "") data.defaultCompoundingDuration = null;
    else if ((COMPOUNDING_DURATIONS as readonly string[]).includes(duration))
      data.defaultCompoundingDuration = duration as CompoundingDurationValue;
    else errors.push("Default compounding duration must be Monthly, Half-Yearly or Yearly.");
  }

  return { data, errors };
}
