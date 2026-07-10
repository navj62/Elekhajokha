import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Installed Claude Code skill scripts — third-party tooling, not app source.
    // (Should be gitignored per CLAUDE.md; ignored here so their .cjs helpers
    // don't pollute the project lint gate.)
    ".claude/**",
  ]),
]);

export default eslintConfig;
