-- Cash book (lib/cashBook.ts), follow-up to 20261031210006_cash_book.
--
-- The cash book starts at go-live: no entries are backfilled for imported or
-- historical pledges, releases, sales or transactions, and the ledger-import
-- scripts never write cash entries. Opening cash on the first day is entered
-- by the owner.
--
-- Amounts are never negative — direction carries the sign. A PLEDGE_SOLD
-- entry may be 0 ("debt settled, no cash"), so >= 0, not > 0. Prisma does
-- not model CHECK constraints, so this lives only here.
ALTER TABLE "cash_entries"
  ADD CONSTRAINT "cash_entries_amount_check"
  CHECK ("amount" >= 0 AND "originalAmount" >= 0);
