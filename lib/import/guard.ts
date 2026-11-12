// lib/import/guard.ts
//
// The one gate every import API route calls first. proxy.ts only checks
// sign-in, so the feature flag, the subscription and the tenant id are all
// enforced here, on the server.
//
// Order matters:
//   1. flag off        → 404, before auth or any DB read, so a disabled
//                        feature looks like a route that does not exist
//   2. no session      → 401
//   3. no DB user      → 403
//   4. suspended       → 403
//   5. no subscription → 402
//   6. ok              → the internal User.id to scope every query by
//
// Error bodies are generic and carry a stable code only: no personal data,
// no error messages, no stack traces.

import { NextResponse } from "next/server";
import { isImportFeatureEnabled } from "@/lib/import/featureFlag";
import { resolveImportUser } from "@/lib/import/auth";
import { evaluateImportAccess } from "@/lib/import/subscription";

export type ImportGuardResult =
  | { ok: true; userId: string }
  | { ok: false; response: NextResponse };

function deny(status: number, error: string, code: string): ImportGuardResult {
  return { ok: false, response: NextResponse.json({ error, code }, { status }) };
}

export async function requireImportAccess(): Promise<ImportGuardResult> {
  if (!isImportFeatureEnabled()) return deny(404, "Not Found", "NOT_FOUND");

  try {
    const resolved = await resolveImportUser();
    if (resolved.kind === "unauthenticated") return deny(401, "Unauthorized", "UNAUTHORIZED");
    if (resolved.kind === "no_user") return deny(403, "Forbidden", "NO_ACCOUNT");

    const access = evaluateImportAccess(resolved.user, new Date());
    if (access.status === "account_suspended") {
      return deny(403, "Forbidden", "ACCOUNT_SUSPENDED");
    }
    if (!access.hasAccess) {
      return deny(402, "Subscription required", "SUBSCRIPTION_REQUIRED");
    }

    return { ok: true, userId: resolved.user.id };
  } catch (err) {
    // Error class name only: no message, which could carry query context.
    console.error("[import/guard] failed:", err instanceof Error ? err.name : "unknown");
    return deny(500, "Server Error", "SERVER_ERROR");
  }
}
