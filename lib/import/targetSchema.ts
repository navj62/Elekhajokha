import { z } from "zod";

/**
 * Import target schemas for Customer, Pledge and PledgeItem.
 *
 * These validate rows AFTER the column-mapping and cleanup step (step 2).
 * They do not read Excel files and do not write to the database.
 *
 * Contract with the normalizer (step 2), which must run BEFORE these schemas:
 *  - Dates      -> "YYYY-MM-DD" strings. Excel Date objects and serial numbers
 *                  are rejected here on purpose (never guess dd/mm vs mm/dd).
 *  - Numbers    -> plain text like "12500.50": no thousands separators
 *                  (including Indian "1,25,000"), no currency symbols, no
 *                  leading "." (use "0.5"). Round Excel float noise
 *                  (0.30000000000000004) before validating.
 *  - Purity     -> percent, e.g. 22K becomes 91.6, 916 becomes 91.6.
 *  - Mobile     -> digits only, without +91 or a leading 0.
 *  - Rates      -> percent PER YEAR. Ask the owner when a file looks monthly.
 *  - Names      -> build customerRef with normalizeNameKey().
 *
 * Money, weight, purity and rate stay as strings. Convert to Prisma.Decimal
 * only in the database layer; never do floating-point math on them.
 *
 * netWeightOfMetal and the pledge-level gold/silver totals are computed by the
 * existing application rules. Do not calculate them here.
 *
 * Missing required fields surface as invalid_type / invalid_union issues.
 * In your issue formatter, if the raw row has no value for issue.path[0],
 * show "This field is required" instead of the library's message.
 */

// -----------------------------------------------------------------------------
// Tunable constants. Match DECIMALS to the @db.Decimal(p, s) in schema.prisma.
// LIMITS are sanity limits meant to catch unit mistakes; they are not rules of
// the business, so tune them against your real data.
// -----------------------------------------------------------------------------

const DECIMALS = { money: 2, weight: 3, percent: 2, months: 2 } as const;

const LIMITS = {
  money: 100_000_000, // 10 crore rupees
  weight: 100_000, // grams per item; same limit as the existing pledge route
  percent: 100,
  months: 600,
} as const;

/**
 * Not a validation rule. The issues engine turns a gold item above this weight
 * into a question for the owner ("Is this weight in grams?").
 */
export const PLAUSIBLE_GOLD_ITEM_MAX_GRAMS = 5_000;

const EARLIEST_DATE = "1990-01-01";

// Prisma enum values. Keep in sync with schema.prisma (add a test that compares
// them with the generated enums). OVERDUE is deliberately absent: the app never
// writes it, so an import must not create it.
const METAL_TYPES = ["GOLD", "SILVER"] as const;
const COMPOUNDING_DURATIONS = ["MONTHLY", "HALFYEARLY", "YEARLY"] as const;
const PLEDGE_STATUSES = ["ACTIVE", "RELEASED", "SOLD"] as const;
const GENDERS = ["male", "female", "other"] as const;
const GENDER_LABEL = { male: "Male", female: "Female", other: "Other" } as const;

// -----------------------------------------------------------------------------
// Cell helpers
// -----------------------------------------------------------------------------

function blankToUndefined(value: unknown): unknown {
  if (value === null || value === undefined) return undefined;
  if (typeof value === "string" && value.trim() === "") return undefined;
  return value;
}

/**
 * Turns blank cells ("", "   ", null) into missing keys on the whole row, so
 * every optional field can be a plain .optional() and every required field
 * reports as missing.
 */
function stripBlanks<S extends z.ZodTypeAny>(schema: S) {
  return z.preprocess((raw) => {
    if (raw === null || typeof raw !== "object" || Array.isArray(raw)) return raw;
    return Object.fromEntries(
      Object.entries(raw as Record<string, unknown>).map(([key, value]) => [
        key,
        blankToUndefined(value),
      ]),
    );
  }, schema);
}

/** Excel stores phone numbers etc. as numbers; accept both, always output text. */
const text = z
  .union([z.string(), z.number()])
  .transform((value) => String(value).trim());

const requiredText = (max = 200) =>
  text.pipe(
    z
      .string()
      .min(1, "This field is required")
      .max(max, `At most ${max} characters`),
  );

const optionalText = (max = 500) => requiredText(max).optional();

const httpsUrl = text
  .pipe(
    z
      .string()
      .max(2048)
      .refine((value) => /^https:\/\/\S+$/.test(value), "Enter a valid https:// link"),
  )
  .optional();

/** Positive decimal as text, with a decimal-place limit and an upper bound. */
function decimal(options: { maxDecimals: number; max: number }) {
  return text.pipe(
    z.string().superRefine((value, ctx) => {
      const fail = (message: string) => ctx.addIssue({ code: "custom", message });
      if (!/^\d+(\.\d+)?$/.test(value)) {
        return fail("Enter a positive number such as 12500.50");
      }
      if (Number(value) <= 0) return fail("Must be greater than zero");
      const places = value.split(".")[1]?.length ?? 0;
      if (places > options.maxDecimals) {
        return fail(`At most ${options.maxDecimals} decimal places`);
      }
      if (Number(value) > options.max) return fail(`Must not exceed ${options.max}`);
    }),
  );
}

function isRealDate(value: string): boolean {
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

/** Tomorrow in UTC, so a date typed "today" in India is never called future. */
function latestAllowedDate(): string {
  return new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

/** Strict "YYYY-MM-DD", a real calendar date, within a sensible range. */
const isoDate = text.pipe(
  z.string().superRefine((value, ctx) => {
    const fail = (message: string) => ctx.addIssue({ code: "custom", message });
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return fail("Use the format YYYY-MM-DD");
    if (!isRealDate(value)) return fail("Not a real calendar date");
    if (value < EARLIEST_DATE) return fail(`Date is before ${EARLIEST_DATE}`);
    if (value > latestAllowedDate()) return fail("Date is in the future");
  }),
);

function upperEnum<T extends readonly [string, ...string[]]>(values: T) {
  return text.transform((value) => value.toUpperCase()).pipe(z.enum(values));
}

/** Parses Yes/No style cells explicitly: Boolean("false") is true in JS. */
const excelBoolean = z
  .union([z.boolean(), z.number(), z.string()])
  .transform((value, ctx) => {
    if (typeof value === "boolean") return value;
    const normalized = String(value).trim().toLowerCase();
    if (["true", "yes", "y", "1"].includes(normalized)) return true;
    if (["false", "no", "n", "0"].includes(normalized)) return false;
    ctx.addIssue({ code: "custom", message: "Use Yes or No" });
    return z.NEVER;
  })
  .optional();

/** Customers are identified by name only, so the key is the normalized name. */
export function normalizeNameKey(name: string): string {
  return name.normalize("NFC").trim().replace(/\s+/g, " ").toLowerCase();
}

// -----------------------------------------------------------------------------
// Customer
// -----------------------------------------------------------------------------

export const CustomerImportSchema = stripBlanks(
  z
    .object({
      // File-local key built by the importer (see normalizeNameKey). Not saved.
      customerRef: requiredText(200),

      // Required in Prisma.
      name: requiredText(200),
      region: requiredText(200),
      address: requiredText(500),

      // Optional.
      mobile: text
        .pipe(z.string().regex(/^[6-9]\d{9}$/, "Enter a 10-digit Indian mobile number"))
        .optional(),
      gender: text
        .transform((value) => value.toLowerCase())
        .pipe(z.enum(GENDERS))
        .transform((value) => GENDER_LABEL[value])
        .optional(),
      // Sensitive: never send to the AI mapping step, never write to logs.
      aadharNo: text
        .pipe(z.string().regex(/^\d{12}$/, "Aadhaar must be 12 digits"))
        .optional(),
      remark: optionalText(1000),

      // Only usable as https links; local file paths are meaningless.
      idProofImg: httpsUrl,
      customerImg: httpsUrl,
    })
    .strict(),
);

// -----------------------------------------------------------------------------
// PledgeItem
// -----------------------------------------------------------------------------

const weight = decimal({ maxDecimals: DECIMALS.weight, max: LIMITS.weight });

const quantity = z
  .union([z.number(), z.string().regex(/^\d+$/, "Enter a whole number")])
  .transform(Number)
  .pipe(z.number().int().min(1).max(10_000))
  .default(1);

export const PledgeItemImportSchema = stripBlanks(
  z
    .object({
      itemType: requiredText(100),
      metalType: upperEnum(METAL_TYPES),
      grossWeight: weight,
      netWeight: weight,
      purity: decimal({ maxDecimals: DECIMALS.percent, max: LIMITS.percent }),

      itemName: optionalText(200),
      quantity,
    })
    .strict()
    .superRefine((item, ctx) => {
      if (Number(item.netWeight) > Number(item.grossWeight)) {
        ctx.addIssue({
          code: "custom",
          path: ["netWeight"],
          message: "Net weight cannot exceed gross weight",
        });
      }
    }),
);

// -----------------------------------------------------------------------------
// Pledge (with its items)
// -----------------------------------------------------------------------------

export const PledgeImportSchema = stripBlanks(
  z
    .object({
      // File-local keys. Not saved. The importer resolves them to real IDs.
      customerRef: requiredText(200),
      pledgeRef: requiredText(100),

      // Financial terms are never guessed. If the file has no rate or
      // compounding column, ask the owner once and apply the answer file-wide.
      pledgeDate: isoDate,
      loanAmount: decimal({ maxDecimals: DECIMALS.money, max: LIMITS.money }),
      interestRate: decimal({ maxDecimals: DECIMALS.percent, max: LIMITS.percent }), // % per year
      compoundingDuration: upperEnum(COMPOUNDING_DURATIONS),
      status: upperEnum(PLEDGE_STATUSES).default("ACTIVE"),

      // Optional.
      allowCompounding: excelBoolean,
      itemPhoto: httpsUrl,
      remark: optionalText(1000),
      durationMonths: decimal({ maxDecimals: DECIMALS.months, max: LIMITS.months }).optional(),
      releaseDate: isoDate.optional(),
      salePrice: decimal({ maxDecimals: DECIMALS.money, max: LIMITS.money }).optional(),

      items: z.array(PledgeItemImportSchema).min(1, "A pledge needs at least one item"),
    })
    .strict()
    .superRefine((pledge, ctx) => {
      const add = (field: string, message: string) =>
        ctx.addIssue({ code: "custom", path: [field], message });

      if (pledge.status === "ACTIVE") {
        if (pledge.releaseDate) add("releaseDate", "An ACTIVE pledge cannot have a release date");
        if (pledge.salePrice) add("salePrice", "An ACTIVE pledge cannot have a sale price");
      }
      if (pledge.status === "RELEASED") {
        if (!pledge.releaseDate) add("releaseDate", "Required when status is RELEASED");
        if (pledge.salePrice) add("salePrice", "A RELEASED pledge cannot have a sale price");
      }
      if (pledge.status === "SOLD" && !pledge.salePrice) {
        add("salePrice", "Required when status is SOLD");
      }
      if (pledge.releaseDate && pledge.releaseDate < pledge.pledgeDate) {
        add("releaseDate", "Release date is before the pledge date");
      }
    }),
);

// -----------------------------------------------------------------------------
// Inferred types for the mapping and import code
// -----------------------------------------------------------------------------

export type CustomerImport = z.infer<typeof CustomerImportSchema>;
export type PledgeItemImport = z.infer<typeof PledgeItemImportSchema>;
export type PledgeImport = z.infer<typeof PledgeImportSchema>;

// -----------------------------------------------------------------------------
// Field classification reference (from schema.prisma)
// -----------------------------------------------------------------------------

export const importFieldClassification = {
  Customer: {
    importerKeys: ["customerRef"],
    requiredFromOwner: ["name", "region", "address"],
    optionalFromOwner: [
      "mobile",
      "gender",
      "aadharNo",
      "remark",
      "idProofImg",
      "customerImg",
    ],
    computedByApp: [],
    systemManaged: [
      "id",
      "userId",
      "viewToken",
      "isPinned",
      "isPortalBlocked",
      "deletedAt",
      "createdAt",
      "updatedAt",
      "pledges",
      "alerts",
      "cashEntries",
    ],
  },
  Pledge: {
    importerKeys: ["customerRef", "pledgeRef"],
    requiredFromOwner: [
      "pledgeDate",
      "loanAmount",
      "interestRate",
      "compoundingDuration",
    ],
    defaulted: { status: "ACTIVE" },
    optionalFromOwner: [
      "allowCompounding",
      "itemPhoto",
      "remark",
      "durationMonths",
      "releaseDate",
      "salePrice",
    ],
    computedByApp: [
      "netWeightOfGold",
      "netWeightOfSilver",
      "totalInterest",
      "receivableAmount",
      "lastCalculatedLtv",
      "lastRiskTier",
      "lastEvaluatedAt",
      "lastAmountOwed",
      "lastMarketValue",
    ],
    systemManaged: [
      "id",
      "customerId",
      "calculationVersion",
      "createdAt",
      "updatedAt",
      "pledgeAudits",
      "customer",
      "transactions",
      "alerts",
      "inventoryItem",
      "cashEntries",
    ],
  },
  PledgeItem: {
    importerKeys: [],
    requiredFromOwner: ["itemType", "metalType", "grossWeight", "netWeight", "purity"],
    optionalFromOwner: ["itemName", "quantity"],
    computedByApp: ["netWeightOfMetal"],
    systemManaged: ["id", "pledgeId", "createdAt", "pledge"],
  },
} as const;