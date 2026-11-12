// lib/import/ai/fields.ts
//
// The fixed set of target fields the AI mapping step can assign a column to.
// Keys are generated from importFieldClassification in targetSchema.ts, so a
// field added there shows up here; the description table below is typed as
// exhaustive over the key union, so forgetting a description is a compile error.
//
// Prefixed keys avoid the clash between Customer.remark and Pledge.remark.
// customerRef is built by the importer from the name and is never mappable;
// pledgeRef IS mappable (a file's own pledge number).

import { importFieldClassification as C } from "../targetSchema";

type CustomerKey =
  | (typeof C.Customer.requiredFromOwner)[number]
  | (typeof C.Customer.optionalFromOwner)[number];

type PledgeKey =
  | Exclude<(typeof C.Pledge.importerKeys)[number], "customerRef">
  | (typeof C.Pledge.requiredFromOwner)[number]
  | keyof typeof C.Pledge.defaulted
  | (typeof C.Pledge.optionalFromOwner)[number];

type ItemKey =
  | (typeof C.PledgeItem.requiredFromOwner)[number]
  | (typeof C.PledgeItem.optionalFromOwner)[number];

export type FieldKey = `customer.${CustomerKey}` | `pledge.${PledgeKey}` | `item.${ItemKey}`;

const prefixed = (prefix: string, keys: readonly string[]): FieldKey[] =>
  keys.map((key) => `${prefix}.${key}` as FieldKey);

export const FIELD_KEYS: readonly FieldKey[] = [
  ...prefixed("customer", [...C.Customer.requiredFromOwner, ...C.Customer.optionalFromOwner]),
  ...prefixed("pledge", [
    ...C.Pledge.importerKeys.filter((key) => key !== "customerRef"),
    ...C.Pledge.requiredFromOwner,
    ...Object.keys(C.Pledge.defaulted),
    ...C.Pledge.optionalFromOwner,
  ]),
  ...prefixed("item", [...C.PledgeItem.requiredFromOwner, ...C.PledgeItem.optionalFromOwner]),
];

/** Fields the target schema requires from the owner (the file or an answer must supply them). */
const REQUIRED = new Set<string>([
  ...prefixed("customer", C.Customer.requiredFromOwner),
  ...prefixed("pledge", C.Pledge.requiredFromOwner),
  ...prefixed("item", C.PledgeItem.requiredFromOwner),
]);

export const isRequiredField = (key: FieldKey): boolean => REQUIRED.has(key);

export const FIELD_DESCRIPTIONS: Record<FieldKey, string> = {
  "customer.name": "The customer's full name.",
  "customer.region": "Village, town, city or area the customer is from.",
  "customer.address": "The customer's postal or residential address.",
  "customer.mobile": "The customer's mobile phone number.",
  "customer.gender": "The customer's gender (male, female, other).",
  "customer.aadharNo": "The customer's Aadhaar number. Map the column if it exists; its values are never shown to you.",
  "customer.remark": "Free-text note about the customer.",
  "customer.idProofImg": "https link to a picture of the customer's ID proof.",
  "customer.customerImg": "https link to a photo of the customer.",
  "pledge.pledgeRef": "The file's own pledge, loan, folio or ticket number that identifies one pledge. Not a running row number.",
  "pledge.pledgeDate": "Date the item was pledged and the loan given.",
  "pledge.loanAmount": "Principal loan amount given against the pledge, in rupees (not interest, not the amount receivable).",
  "pledge.interestRate": "Interest rate of the loan, as a percentage.",
  "pledge.compoundingDuration": "How often interest compounds: monthly, half-yearly or yearly.",
  "pledge.status": "Whether the pledge is open (active), released or sold.",
  "pledge.allowCompounding": "Yes/No: whether interest compounds.",
  "pledge.itemPhoto": "https link to a photo of the pledged items.",
  "pledge.remark": "Free-text note about the pledge.",
  "pledge.durationMonths": "Agreed loan duration in months.",
  "pledge.releaseDate": "Date the pledge was released (item returned to the customer).",
  "pledge.salePrice": "Price the pledged item was sold for, in rupees.",
  "item.itemType": "Kind of jewellery item, e.g. ring, chain, bangles, necklace.",
  "item.metalType": "Metal of the item: gold or silver.",
  "item.grossWeight": "Total weight of the item as weighed, in grams.",
  "item.netWeight": "Weight of the item excluding stones and other non-metal parts, in grams.",
  "item.purity": "Purity of the metal: a percentage, a karat (22K) or a touch value (916).",
  "item.itemName": "Description or name of the item as the owner wrote it.",
  "item.quantity": "Number of pieces of this item.",
};

export const LAYOUTS = ["ROW_PER_PLEDGE", "ROW_PER_ITEM", "CUSTOMERS_ONLY", "UNSURE"] as const;
export type Layout = (typeof LAYOUTS)[number];

export const LAYOUT_DESCRIPTIONS: Record<Layout, string> = {
  ROW_PER_PLEDGE: "each row is one pledge, with its item(s) described on that same row",
  ROW_PER_ITEM: "each row is one item; several rows can belong to the same pledge",
  CUSTOMERS_ONLY: "the file has customer columns but no pledge or item columns",
  UNSURE: "you cannot tell which of the above applies",
};
