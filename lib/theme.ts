/**
 * Theme plumbing shared by the anti-FOUC inline script (app/layout.tsx) and
 * ThemeProvider. Both must agree, so they derive from the constants here.
 */

/** localStorage key holding the user's opt-in theme preference. */
export const THEME_STORAGE_KEY = "theme";

/**
 * Route prefixes that ALWAYS render light, regardless of the owner's stored
 * theme preference. These are the unauthenticated, outward-facing surfaces:
 *
 *   /view/*  — the customer pledge portal. Shop customers see this; they never
 *              chose a theme, and the page is hardcoded light throughout.
 *   /        — the marketing landing page (matched exactly, see below).
 *
 * We enforce this by never putting `.dark` on <html> for these paths, rather
 * than by overriding tokens on a wrapper element. That keeps <body> light too
 * (no dark overscroll gutter behind the portal card) and avoids maintaining a
 * duplicate copy of the light palette.
 */
export const FORCED_LIGHT_PREFIXES = ["/view"] as const;

/** True when `pathname` must render in light mode no matter what. */
export function isForcedLightPath(pathname: string): boolean {
  if (pathname === "/") return true;
  return FORCED_LIGHT_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}

/**
 * Blocking script injected as the first child of <body> so the stored theme is
 * applied BEFORE first paint — without it, dark-mode users get a full white
 * flash on every load while React hydrates.
 *
 * Kept dependency-free and wrapped in try/catch: it must never throw (Safari
 * private mode can make localStorage access itself throw), and it mirrors
 * isForcedLightPath() above using the same constants.
 */
export const THEME_INIT_SCRIPT = `(function(){try{var p=location.pathname;var forced=p==="/"||${JSON.stringify(
  FORCED_LIGHT_PREFIXES
)}.some(function(x){return p===x||p.indexOf(x+"/")===0});if(!forced&&localStorage.getItem(${JSON.stringify(
  THEME_STORAGE_KEY
)})==="dark"){document.documentElement.classList.add("dark")}}catch(e){}})()`;
