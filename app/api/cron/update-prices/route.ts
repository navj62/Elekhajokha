// app/api/cron/update-prices/route.ts

import { updatePrices } from "@/lib/storePrices";

/**
 * GET /api/cron/update-prices
 *
 * Triggered by cron-job.org every 2 hours.
 * Secured with a Bearer token — set CRON_SECRET in your env.
 */
export async function GET(req: Request) {
  const calledAt = new Date().toISOString();
  console.log(`🕐 Cron /update-prices triggered at ${calledAt}`);

  /* ---- Auth -------------------------------------------------------- */
  const secret = process.env.CRON_SECRET;

  // Fail closed — if CRON_SECRET is not configured, reject all requests
  if (!secret) {
    console.error("❌ CRON_SECRET env var is not set");
    return Response.json(
      { success: false, error: "Server misconfiguration" },
      { status: 500 }
    );
  }

  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${secret}`) {
    console.warn("⛔ Unauthorized cron attempt");
    return Response.json(
      { success: false, error: "Unauthorized" },
      { status: 401 }
    );
  }

  /* ---- Run pipeline ------------------------------------------------ */
  try {
    const result = await updatePrices();

    if (result?.skipped) {
      return Response.json({
        success: true,
        skipped: true,
        message:   "Skipped — updated too recently",
        calledAt,
      });
    }

    return Response.json({
      success:  true,
      skipped:  false,
      data:     result,
      calledAt,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error(`❌ Cron update-prices failed at ${calledAt}:`, message);

    return Response.json(
      { success: false, error: message, calledAt },
      { status: 500 }
    );
  }
}