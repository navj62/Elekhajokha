import { defineConfig } from "vitest/config";
import path from "path";

// Minimal Vitest setup for pure-function unit tests (no React/DOM needed).
// The `@` alias mirrors tsconfig's `@/*` -> repo root so tests can import
// `@/lib/...` exactly like the app does.
export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
  },
});
