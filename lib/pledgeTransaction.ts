/**
 * Server-side rules for recording a part-payment / top-up Transaction
 * (POST /api/customers/[customerId]/pledges/[pledgeId]/transactions). They
 * mirror the pledge page's date input (max = today), so a direct API call
 * cannot record what the page would refuse.
 */
import { isIsoDay } from "@/lib/cashBookShared";
import { istDay } from "@/lib/inventorySale";

/**
 * `transactionDate` must be a strict YYYY-MM-DD calendar date, not after
 * today and not before the pledge date — both compared as IST calendar days.
 * Returns an error message, or null when the date is acceptable.
 */
export function transactionDateError(value: unknown, pledgeDate: Date, now: Date): string | null {
  if (!isIsoDay(value)) return "Transaction date must be a date (YYYY-MM-DD).";
  if (value > istDay(now)) return "Transaction date can't be in the future.";
  if (value < istDay(pledgeDate)) return "Transaction date can't be before the pledge date.";
  return null;
}
