// lib/import/normalize/decimal.ts
//
// Tiny exact-decimal helpers on strings (BigInt underneath). The import keeps
// money, weight, purity and rate as strings (docs/import-feature.md §3), so
// nothing here ever touches a JS float.

const ZERO = BigInt(0);
const ONE = BigInt(1);
const TWO = BigInt(2);
const TEN = BigInt(10);

/** 10^places without the ** operator (the project TS target is below ES2020). */
export function pow10(places: number): bigint {
  let result = ONE;
  for (let i = 0; i < places; i++) result = result * TEN;
  return result;
}

/** Whole number as a Scaled value with no decimals. */
export function wholeNumber(n: number): Scaled {
  return { n: BigInt(n), scale: 0 };
}

export type Scaled = { n: bigint; scale: number };

/** "12.50" -> { n: 1250, scale: 2 } (n is a bigint). Input must be unsigned digits with an optional fraction. */
export function parseDecimal(text: string): Scaled | null {
  const match = /^(\d*)(?:\.(\d*))?$/.exec(text);
  if (!match || (match[1] === "" && (match[2] ?? "") === "")) return null;
  const frac = match[2] ?? "";
  return { n: BigInt((match[1] || "0") + frac), scale: frac.length };
}

export function formatDecimal(value: Scaled): string {
  const negative = value.n < ZERO;
  const digits = (negative ? -value.n : value.n).toString().padStart(value.scale + 1, "0");
  const intPart = value.scale === 0 ? digits : digits.slice(0, digits.length - value.scale);
  const fracPart = value.scale === 0 ? "" : digits.slice(digits.length - value.scale);
  return `${negative ? "-" : ""}${intPart}${fracPart ? "." + fracPart : ""}`;
}

/** Rounds half up to `places` decimals (never adds places: "4" stays "4"). */
export function roundDecimal(value: Scaled, places: number): Scaled {
  if (value.scale <= places) return value;
  const drop = pow10(value.scale - places);
  const half = drop / TWO;
  const sign = value.n < ZERO ? -ONE : ONE;
  const abs = value.n < ZERO ? -value.n : value.n;
  return { n: sign * ((abs + half) / drop), scale: places };
}

/** Pads to exactly `places` decimals ("75" -> "75.0" with places 1). */
export function padDecimal(value: Scaled, places: number): Scaled {
  if (value.scale >= places) return value;
  return { n: value.n * pow10(places - value.scale), scale: places };
}

export function multiply(a: Scaled, b: Scaled): Scaled {
  return { n: a.n * b.n, scale: a.scale + b.scale };
}

/** a / divisor, rounded half up to `places` decimals. divisor must be a positive integer. */
export function divideInt(a: Scaled, divisor: bigint, places: number): Scaled {
  const factor = pow10(places);
  const numerator = a.n * factor;
  const denominator = divisor * pow10(a.scale);
  const quotient = numerator / denominator;
  const remainder = numerator % denominator;
  const rounded = remainder * TWO >= denominator ? quotient + ONE : quotient;
  return { n: rounded, scale: places };
}

/** Drops trailing zeros in the fraction: "4.500" -> "4.5", "4.000" -> "4". */
export function trimDecimal(text: string): string {
  if (!text.includes(".")) return text;
  return text.replace(/\.?0+$/, "");
}

export function isZero(value: Scaled): boolean {
  return value.n === ZERO;
}
