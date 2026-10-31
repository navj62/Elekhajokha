// Loads .env (the DEV database). The production URL lives only in the
// gitignored .env.prod.local, which nothing loads by default — see CLAUDE.md
// "Running against production deliberately".
import "dotenv/config";
import { defineConfig, env } from "@prisma/config";
import { assertDbTarget } from "./lib/dbGuard";

// Prisma subcommands that never open a database connection. `generate` must
// stay unguarded: deploy builds run it with the production URL set.
// Anything else (migrate, db, studio, unknown) is guarded — fail closed.
const OFFLINE_COMMANDS = new Set(["generate", "validate", "format", "version", "init", "help", "debug"]);
const subcommand = process.argv.slice(2).find((a) => !a.startsWith("-"));
if (subcommand === undefined || !OFFLINE_COMMANDS.has(subcommand)) {
  assertDbTarget(process.env.DATABASE_URL, `prisma ${subcommand ?? ""}`.trim());
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    url: env("DATABASE_URL"),
  },
  migrations: {
    seed: "tsx prisma/seed-defaults.ts",
  },
});
