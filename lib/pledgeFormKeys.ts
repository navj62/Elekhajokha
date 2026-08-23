/**
 * Single source of truth for the create-pledge FormData contract between
 * app/(CustomersDetails)/customers/[customerId]/pledges/add/page.tsx and
 * app/api/customers/[customerId]/pledges/route.ts. Update both call sites
 * together when this changes.
 */
export const PLEDGE_FORM_REQUIRED_KEYS = [
  "pledgeDate",
  "loanAmount",
  "interestRate",
  "compoundingDuration",
  "items",
] as const;

export const PLEDGE_FORM_OPTIONAL_KEYS = ["remark", "itemPhoto"] as const;
