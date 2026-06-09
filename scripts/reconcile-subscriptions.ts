// scripts/reconcile-subscriptions.ts
//
// One-off reconciliation for users who paid Razorpay but whose DB row never
// reached `active` (verify-payment never ran / webhook couldn't reach the box).
//
// It is CONSERVATIVE: it only flips a user to `active` if Razorpay itself
// reports the subscription `active`/`authenticated`. Anything else is logged
// and left untouched for a human to decide.
//
// Run (dry-run first — does everything EXCEPT write):
//   DOTENV_CONFIG_PATH=.env npx tsx -r dotenv/config scripts/reconcile-subscriptions.ts --dry-run
//   DOTENV_CONFIG_PATH=.env npx tsx -r dotenv/config scripts/reconcile-subscriptions.ts

import Razorpay from "razorpay";
import { prisma } from "@/lib/prisma";
import { SubscriptionStatus } from "@prisma/client";
import { subscriptionGrantsAccess, subscriptionEndDate } from "@/lib/razorpaySubscription";

const DRY_RUN = process.argv.includes("--dry-run");

interface ReportRow {
  user: string;
  oldStatus: string;
  razorpayStatus: string;
  action: string;
  endDate: string;
}

async function main() {
  const key_id     = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
  const key_secret = process.env.RAZORPAY_KEY_SECRET;
  if (!key_id || !key_secret) {
    console.error("✗ Missing Razorpay keys (NEXT_PUBLIC_RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET).");
    process.exit(1);
  }
  const razorpay = new Razorpay({ key_id, key_secret });

  console.log(
    DRY_RUN
      ? "── RECONCILE (DRY RUN — no writes) ──"
      : "── RECONCILE (LIVE — will write) ──"
  );

  // 1. Candidates: have a Razorpay subscription id but are not active in our DB.
  const users = await prisma.user.findMany({
    where: {
      razorpaySubscriptionId: { not: null },
      subscriptionStatus:     { not: SubscriptionStatus.active },
    },
    select: {
      id:                     true,
      clerkUserId:            true,
      username:               true,
      subscriptionStatus:     true,
      razorpaySubscriptionId: true,
    },
  });

  console.log(`Found ${users.length} candidate user(s).\n`);

  const report: ReportRow[] = [];

  for (const u of users) {
    const subId = u.razorpaySubscriptionId!; // not-null by the query filter
    let razorpayStatus = "UNKNOWN";
    let action = "none";
    let endIso = "";

    // 2. Authoritative status straight from Razorpay.
    try {
      const sub = await razorpay.subscriptions.fetch(subId);
      razorpayStatus = sub.status ?? "UNKNOWN";

      // 3. Only heal when Razorpay confirms the subscription is paid — live
      //    (active/authenticated) OR a completed one-time charge. See
      //    lib/razorpaySubscription.
      if (subscriptionGrantsAccess(sub)) {
        const endDate = subscriptionEndDate(sub);
        endIso = endDate ? endDate.toISOString() : "(none)";

        if (DRY_RUN) {
          action = "WOULD activate";
        } else {
          await prisma.user.update({
            where: { id: u.id },
            data: {
              subscriptionStatus:  SubscriptionStatus.active,
              subscriptionEndDate: endDate,
              lastGraceExpiredAt:  null,
            },
          });
          action = "ACTIVATED";
        }
      } else {
        // 4. Anything else — leave the row alone, just surface it.
        action = `skipped (razorpay=${razorpayStatus})`;
      }
    } catch (err) {
      razorpayStatus = "FETCH_FAILED";
      action = "skipped (fetch error)";
      console.error(
        `  ! fetch failed for ${u.username} (${subId}):`,
        err instanceof Error ? err.message : err
      );
    }

    report.push({
      user:           `${u.username} (${u.clerkUserId})`,
      oldStatus:      u.subscriptionStatus,
      razorpayStatus,
      action,
      endDate:        endIso,
    });
  }

  // 5. Summary table.
  console.log("\n── Summary ──");
  console.table(report);

  const activated = report.filter((r) => r.action === "ACTIVATED" || r.action === "WOULD activate").length;
  const skipped   = report.length - activated;
  console.log(
    `\n${DRY_RUN ? "[dry-run] would activate" : "activated"}: ${activated}   ·   skipped/untouched: ${skipped}`
  );
  if (DRY_RUN && activated > 0) {
    console.log("Re-run without --dry-run to apply these activations.");
  }

  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
