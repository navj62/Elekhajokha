"use client";

// Shop pledge defaults — the three optional fields shown in onboarding and on
// the profile page's "Pledge Defaults" card. They only pre-fill the
// new-pledge form; "Not set" / a blank rate means no default.
import { checkInterestRate } from "@/lib/interestRate";
import {
  PLEDGE_DEFAULT_FIELDS,
  type CompoundingDurationValue,
  type PledgeDefaults,
} from "@/lib/pledgeDefaults";

export type PledgeDefaultsValue = {
  rate: string;                               // "" = no default
  allowCompounding: "" | "on" | "off";        // "" = no default
  duration: "" | CompoundingDurationValue;    // "" = no default
};

export const EMPTY_PLEDGE_DEFAULTS: PledgeDefaultsValue = { rate: "", allowCompounding: "", duration: "" };

export function pledgeDefaultsFromApi(d: Partial<PledgeDefaults> | null | undefined): PledgeDefaultsValue {
  return {
    rate: d?.defaultInterestRate != null ? String(d.defaultInterestRate) : "",
    allowCompounding: d?.defaultAllowCompounding == null ? "" : d.defaultAllowCompounding ? "on" : "off",
    duration: d?.defaultCompoundingDuration ?? "",
  };
}

/** Appends all three fields; an empty value means "clear this default". */
export function appendPledgeDefaults(fd: FormData, v: PledgeDefaultsValue) {
  fd.append(PLEDGE_DEFAULT_FIELDS.rate, v.rate.trim());
  fd.append(PLEDGE_DEFAULT_FIELDS.allowCompounding, v.allowCompounding === "" ? "" : String(v.allowCompounding === "on"));
  fd.append(PLEDGE_DEFAULT_FIELDS.duration, v.duration);
}

/** Inline message for a non-empty rate that breaks the rule; null when fine or blank. */
export function pledgeDefaultRateError(rate: string): string | null {
  if (!rate.trim()) return null;
  const check = checkInterestRate(rate);
  return check.ok ? null : check.message;
}

function Segmented<T extends string>({
  label, options, value, onChange,
}: {
  label: string;
  options: readonly { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-1 bg-card-alt p-1 rounded-[12px] border border-border">
      {options.map((o) => {
        const selected = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(o.value)}
            className={`flex-1 min-w-[72px] min-h-11 px-2 text-[13px] font-semibold rounded-[8px] transition-colors ${
              selected ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

const COMPOUNDING_OPTIONS = [
  { value: "", label: "Not set" },
  { value: "on", label: "On" },
  { value: "off", label: "Off" },
] as const;

const DURATION_OPTIONS = [
  { value: "", label: "Not set" },
  { value: "MONTHLY", label: "Monthly" },
  { value: "HALFYEARLY", label: "Half-Yearly" },
  { value: "YEARLY", label: "Yearly" },
] as const;

export default function PledgeDefaultsFields({
  idPrefix, value, onChange,
}: {
  idPrefix: string;
  value: PledgeDefaultsValue;
  onChange: (next: PledgeDefaultsValue) => void;
}) {
  const rateId = `${idPrefix}-default-rate`;
  const rateError = pledgeDefaultRateError(value.rate);
  const labelCls = "block text-[12px] font-semibold text-foreground mb-2";

  return (
    <div className="space-y-5">
      <div>
        <label htmlFor={rateId} className={labelCls}>Interest rate (% p.a.)</label>
        <input
          id={rateId}
          type="text"
          inputMode="decimal"
          placeholder="Not set — e.g. 12"
          value={value.rate}
          aria-invalid={!!rateError}
          aria-describedby={rateError ? `${rateId}-err` : undefined}
          onChange={(e) => {
            const v = e.target.value;
            if (v === "" || /^\d*\.?\d*$/.test(v)) onChange({ ...value, rate: v });
          }}
          className={`w-full min-h-11 rounded-[12px] border bg-card px-4 py-2.5 text-[14px] text-foreground placeholder:text-muted-foreground-subtle focus:outline-none focus:ring-2 focus:ring-primary/40 ${
            rateError ? "border-destructive" : "border-border"
          }`}
        />
        {rateError && (
          <p id={`${rateId}-err`} className="mt-1.5 text-[12px] text-destructive">
            {rateError} Must be above 0 and at most 100.
          </p>
        )}
      </div>

      <div>
        <span className={labelCls}>Compound interest</span>
        <Segmented
          label="Compound interest"
          options={COMPOUNDING_OPTIONS}
          value={value.allowCompounding}
          onChange={(allowCompounding) => onChange({ ...value, allowCompounding })}
        />
      </div>

      <div>
        <span className={labelCls}>Compounding duration</span>
        <Segmented
          label="Compounding duration"
          options={DURATION_OPTIONS}
          value={value.duration}
          onChange={(duration) => onChange({ ...value, duration })}
        />
        <p className="mt-1.5 text-[12px] text-muted-foreground">Used when compounding is on.</p>
      </div>
    </div>
  );
}
