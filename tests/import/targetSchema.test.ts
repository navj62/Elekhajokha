import { test } from "vitest";
import assert from "node:assert/strict";
import type { ZodType, output } from "zod";
import {
  CustomerImportSchema,
  PledgeImportSchema,
  PledgeItemImportSchema,
  normalizeNameKey,
} from "../../lib/import/targetSchema";
// ---- helpers ---------------------------------------------------------------

const customer = {
  customerRef: "ramesh sharma",
  name: "Ramesh Sharma",
  region: "Bhubaneswar",
  address: "12 Station Road",
};

const item = {
  itemType: "Chain",
  metalType: "gold",
  grossWeight: "12.5",
  netWeight: "12.1",
  purity: "91.6",
};

const pledge = {
  customerRef: "ramesh sharma",
  pledgeRef: "p1",
  pledgeDate: "2024-11-05",
  loanAmount: "50000",
  interestRate: "18",
  compoundingDuration: "monthly",
  items: [item],
};

function paths(result: { success: boolean; error?: { issues: { path: PropertyKey[] }[] } }) {
  return result.success ? [] : result.error!.issues.map((i) => i.path.join("."));
}

function accepts<S extends ZodType>(schema: S, input: unknown): output<S> {
  const result = schema.safeParse(input);
  assert.equal(result.success, true, JSON.stringify(result.error?.issues));
  return result.data as output<S>;
}

function rejects(schema: ZodType, input: unknown, path: string) {
  const result = schema.safeParse(input);
  assert.equal(result.success, false, "expected a validation error");
  assert.ok(paths(result).includes(path), `expected an issue at "${path}", got ${paths(result)}`);
}

// ---- customer --------------------------------------------------------------

test("customer: minimal valid row", () => {
  accepts(CustomerImportSchema, customer);
});

test("customer: blank optional cells become undefined", () => {
  const data = accepts(CustomerImportSchema, {
    ...customer,
    mobile: "",
    gender: null,
    remark: "   ",
  });
  assert.equal(data.mobile, undefined);
  assert.equal(data.gender, undefined);
  assert.equal(data.remark, undefined);
});

test("customer: Excel numeric mobile becomes text", () => {
  const data = accepts(CustomerImportSchema, { ...customer, mobile: 9876543210 });
  assert.equal(data.mobile, "9876543210");
});

test("customer: bad mobile, bad aadhaar, blank required field", () => {
  rejects(CustomerImportSchema, { ...customer, mobile: "12345" }, "mobile");
  rejects(CustomerImportSchema, { ...customer, aadharNo: "1234" }, "aadharNo");
  rejects(CustomerImportSchema, { ...customer, name: "   " }, "name");
});

test("customer: gender is normalized, unknown keys are rejected", () => {
  assert.equal(accepts(CustomerImportSchema, { ...customer, gender: "MALE" }).gender, "Male");
  const result = CustomerImportSchema.safeParse({ ...customer, nickname: "x" });
  assert.equal(result.success, false);
});

test("normalizeNameKey collapses spaces and case", () => {
  assert.equal(normalizeNameKey("  Ramesh   SHARMA "), "ramesh sharma");
});

// ---- dates -----------------------------------------------------------------

test("dates: only real YYYY-MM-DD strings pass", () => {
  accepts(PledgeImportSchema, pledge);
  rejects(PledgeImportSchema, { ...pledge, pledgeDate: "13/11/2024" }, "pledgeDate");
  rejects(PledgeImportSchema, { ...pledge, pledgeDate: "05/11/2024" }, "pledgeDate");
  rejects(PledgeImportSchema, { ...pledge, pledgeDate: "2024-02-30" }, "pledgeDate");
  rejects(PledgeImportSchema, { ...pledge, pledgeDate: 45231 }, "pledgeDate"); // Excel serial
  rejects(PledgeImportSchema, { ...pledge, pledgeDate: "2999-01-01" }, "pledgeDate");
  rejects(PledgeImportSchema, { ...pledge, pledgeDate: "1980-01-01" }, "pledgeDate");
});

// ---- numbers ---------------------------------------------------------------

test("numbers: must be positive, bounded and within decimal places", () => {
  rejects(PledgeImportSchema, { ...pledge, loanAmount: "-500" }, "loanAmount");
  rejects(PledgeImportSchema, { ...pledge, loanAmount: "0" }, "loanAmount");
  rejects(PledgeImportSchema, { ...pledge, loanAmount: "12500.123" }, "loanAmount");
  rejects(PledgeImportSchema, { ...pledge, loanAmount: "1,25,000" }, "loanAmount");
  rejects(PledgeImportSchema, { ...pledge, interestRate: "120" }, "interestRate");
  rejects(PledgeImportSchema, { ...pledge, interestRate: "0" }, "interestRate");
  accepts(PledgeImportSchema, { ...pledge, loanAmount: 12500.1 });
});

// ---- items -----------------------------------------------------------------

test("item: net weight cannot exceed gross weight", () => {
  rejects(PledgeItemImportSchema, { ...item, netWeight: "13" }, "netWeight");
});

test("item: weight limit matches the app (100,000 g); heavy gold is not an error", () => {
  rejects(PledgeItemImportSchema, { ...item, grossWeight: "100001", netWeight: "100" }, "grossWeight");
  // Above PLAUSIBLE_GOLD_ITEM_MAX_GRAMS: valid here, the issues engine asks the owner.
  accepts(PledgeItemImportSchema, { ...item, grossWeight: "6000", netWeight: "5900" });
});

test("item: purity out of range, metal case, quantity default", () => {
  rejects(PledgeItemImportSchema, { ...item, purity: "916" }, "purity");
  const data = accepts(PledgeItemImportSchema, item);
  assert.equal(data.metalType, "GOLD");
  assert.equal(data.quantity, 1);
  assert.equal(accepts(PledgeItemImportSchema, { ...item, quantity: "2" }).quantity, 2);
  rejects(PledgeItemImportSchema, { ...item, quantity: 0 }, "quantity");
});

// ---- pledge ----------------------------------------------------------------

test("pledge: status defaults to ACTIVE, OVERDUE is rejected", () => {
  assert.equal(accepts(PledgeImportSchema, pledge).status, "ACTIVE");
  rejects(PledgeImportSchema, { ...pledge, status: "overdue" }, "status");
});

test("pledge: status and date rules", () => {
  rejects(PledgeImportSchema, { ...pledge, status: "RELEASED" }, "releaseDate");
  rejects(PledgeImportSchema, { ...pledge, releaseDate: "2024-12-01" }, "releaseDate");
  rejects(PledgeImportSchema, { ...pledge, status: "SOLD" }, "salePrice");
  rejects(
    PledgeImportSchema,
    { ...pledge, status: "RELEASED", releaseDate: "2024-10-01" },
    "releaseDate",
  );
  accepts(PledgeImportSchema, { ...pledge, status: "RELEASED", releaseDate: "2024-12-01" });
  accepts(PledgeImportSchema, { ...pledge, status: "SOLD", salePrice: "65000" });
});

test("pledge: needs items, and item errors carry a path", () => {
  rejects(PledgeImportSchema, { ...pledge, items: [] }, "items");
  rejects(
    PledgeImportSchema,
    { ...pledge, items: [{ ...item, netWeight: "99" }] },
    "items.0.netWeight",
  );
});

test("pledge: Yes/No cells are parsed explicitly", () => {
  assert.equal(accepts(PledgeImportSchema, { ...pledge, allowCompounding: "No" }).allowCompounding, false);
  assert.equal(accepts(PledgeImportSchema, { ...pledge, allowCompounding: "Y" }).allowCompounding, true);
  rejects(PledgeImportSchema, { ...pledge, allowCompounding: "maybe" }, "allowCompounding");
});

test("pledge: missing financial terms are errors, not guesses", () => {
  // The named key is pulled out only to drop it from the rest object.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { interestRate, ...withoutRate } = pledge;
  rejects(PledgeImportSchema, withoutRate, "interestRate");
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { compoundingDuration, ...withoutCompounding } = pledge;
  rejects(PledgeImportSchema, withoutCompounding, "compoundingDuration");
});