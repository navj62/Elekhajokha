// lib/dbGuard.ts
//
// Fail-closed guard for TOOLING that connects to a database: the Prisma CLI
// (via prisma.config.ts) and every script/seed under scripts/ and prisma/.
// It prints the host it is about to use and refuses any host that is not on
// the dev allowlist below unless ALLOW_PROD_DB=1 is set.
//
// NOT for lib/prisma.ts: the deployed app connects to production through that
// client on purpose, and must never be blocked by this.
//
// See CLAUDE.md "Running against production deliberately".

/**
 * Hosts tooling may use without ALLOW_PROD_DB=1. Neon endpoint names only
 * (the first label of the hostname, minus "-pooler") — never a full URL or a
 * credential. localhost covers CI's dummy URL.
 */
export const DEV_DB_HOSTS: readonly string[] = [
  "ep-old-firefly-aom5jlqq", // Neon dev branch
  "localhost",
  "127.0.0.1",
];

/** "ep-old-firefly-aom5jlqq-pooler.c-2.….neon.tech" → "ep-old-firefly-aom5jlqq". */
function endpointOf(hostname: string): string {
  return hostname.split(".")[0].replace(/-pooler$/, "");
}

export class DbGuardError extends Error {}

/**
 * Throws DbGuardError (before any connection is made) when `url` points at a
 * host outside DEV_DB_HOSTS and ALLOW_PROD_DB is not "1". An unparseable URL
 * is refused too. A missing URL is left to the caller — nothing can connect.
 */
export function assertDbTarget(url: string | undefined, caller: string): void {
  if (!url) return;

  let hostname: string;
  try {
    hostname = new URL(url).hostname;
  } catch {
    throw new DbGuardError(`[db-guard] ${caller}: DATABASE_URL is not a valid URL — refusing to run.`);
  }

  // Endpoint names only count on Neon's own domain; anything else must match exactly.
  const isDev =
    DEV_DB_HOSTS.includes(hostname) ||
    (hostname.endsWith(".neon.tech") && DEV_DB_HOSTS.includes(endpointOf(hostname)));

  if (isDev) {
    console.log(`[db-guard] ${caller}: using DEV database host ${hostname}`);
    return;
  }

  if (process.env.ALLOW_PROD_DB === "1") {
    console.warn(`[db-guard] ${caller}: using NON-DEV database host ${hostname} (ALLOW_PROD_DB=1)`);
    return;
  }

  throw new DbGuardError(
    [
      `[db-guard] ${caller}: REFUSED — ${hostname} is not a dev database host.`,
      `  Allowed without confirmation: ${DEV_DB_HOSTS.join(", ")} (lib/dbGuard.ts).`,
      `  To target this database deliberately, re-run with ALLOW_PROD_DB=1.`,
      `  See CLAUDE.md "Running against production deliberately".`,
    ].join("\n")
  );
}
