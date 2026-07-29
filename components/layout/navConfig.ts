import {
  LayoutDashboard,
  UserPlus,
  Users,
  BarChart3,
  Archive,
  Settings,
  ShoppingBag,
  Bell,
  ListChecks,

  type LucideIcon,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Single source of truth for navigation.                             */
/*                                                                     */
/*  Desktop sidebar and mobile bottom nav / More sheet are different    */
/*  SUBSETS of this one list — neither surface owns its own array, so   */
/*  adding a destination is a one-line change that updates both.        */
/*                                                                     */
/*    "sidebar" — desktop left sidebar (lg:+)                          */
/*    "bottom"  — mobile bottom nav bar (<lg), max 4                   */
/*    "more"    — mobile "More" bottom sheet (<lg)                     */
/* ------------------------------------------------------------------ */

export type NavSurface = "sidebar" | "bottom" | "more";

export interface NavItem {
  /** Key passed to t(). See TODO(i18n) notes below. */
  key: string;
  href: string;
  icon: LucideIcon;
  surfaces: readonly NavSurface[];
}

/**
 * Array order is the DESKTOP SIDEBAR order and must not be rearranged — it
 * reproduces the pre-existing sidebar exactly. Icons likewise: /reports, /ltv
 * and /pledgeList all share BarChart3 in the original design. (Giving them
 * distinct icons would be an improvement, but it is a visual change and out of
 * scope for this phase.) Mobile surfaces order themselves via SURFACE_ORDER.
 */
export const NAV: readonly NavItem[] = [
  { key: "nav_dashboard",     href: "/dashboard",     icon: LayoutDashboard, surfaces: ["sidebar", "bottom"] },
  { key: "nav_add_customers", href: "/add-customer",  icon: UserPlus,        surfaces: ["sidebar"] },
  { key: "nav_customer",      href: "/customers",     icon: Users,           surfaces: ["sidebar", "bottom"] },
  { key: "nav_reports",       href: "/reports",       icon: BarChart3,       surfaces: ["sidebar", "more"] },
  { key: "nav_inventory",     href: "/inventory",     icon: Archive,         surfaces: ["sidebar", "more"] },
  { key: "nav_settings",      href: "/profile",       icon: Settings,        surfaces: ["sidebar", "more"] },
  // TODO(i18n): "Buy Inventory" is a raw English label, not a translation key.
  { key: "Buy Inventory",     href: "/inventory/buy", icon: ShoppingBag,     surfaces: ["sidebar"] },
  // TODO(i18n): "ltv" is not a translation key — renders untranslated in Hindi.
  { key: "ltv",               href: "/ltv",           icon: BarChart3,       surfaces: ["sidebar"] },
  // TODO(i18n): "pledges" is not a translation key — renders untranslated in Hindi.
  { key: "pledges",           href: "/pledgeList",    icon: BarChart3,       surfaces: ["sidebar", "bottom"] },
  // TODO(i18n): no translation keys exist for these two. Following the existing
  // "Buy Inventory" precedent, the key doubles as the English label so t()
  // echoes something presentable rather than a lowercase slug.
  { key: "Notifications",     href: "/notifications", icon: Bell,            surfaces: ["more"] },
  { key: "Tasks",             href: "/tasks",         icon: ListChecks,      surfaces: ["more"] },
] as const;

/**
 * Per-surface display order. Empty = use NAV order (the sidebar). Mobile
 * surfaces need their own sequence without disturbing the sidebar.
 */
const SURFACE_ORDER: Record<NavSurface, readonly string[]> = {
  sidebar: [],
  bottom: ["/dashboard", "/pledgeList", "/customers"],
  more: ["/inventory", "/reports", "/notifications", "/tasks", "/profile"],
};

export function navFor(surface: NavSurface): NavItem[] {
  const items = NAV.filter((i) => i.surfaces.includes(surface));
  const order = SURFACE_ORDER[surface];
  if (!order.length) return items;
  return order
    .map((href) => items.find((i) => i.href === href))
    .filter((i): i is NavItem => Boolean(i));
}

/**
 * Active-route test, shared by both surfaces so they can never disagree.
 * Prefix match (not equality) so nested routes keep their parent highlighted —
 * e.g. /customers/abc/pledges/add keeps "Customers" active.
 */
export function isNavActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(href + "/");
}

/* ------------------------------------------------------------------ */
/*  FAB — the primary create action on mobile.                         */
/*                                                                     */
/*  There is no top-level /pledges/add route: pledge creation lives at */
/*  /customers/[customerId]/pledges/add and REQUIRES a customer. The   */
/*  FAB therefore opens a customer picker first, then routes to that   */
/*  customer's pledge-add page.                                        */
/* ------------------------------------------------------------------ */
export const pledgeAddHref = (customerId: string) => `/customers/${customerId}/pledges/add`;

/* ------------------------------------------------------------------ */
/*  Z-INDEX CONTRACT — mirrored in app/globals.css. Keep in sync.      */
/*                                                                     */
/*     0   page content                                                */
/*    30   sticky action bars (Phase 3 form submit)                    */
/*    40   mobile bottom nav                                           */
/*    45   bottom-nav FAB (raised above the bar)                       */
/*    50   sheet / dialog backdrop                                     */
/*    51   sheet / dialog content                                      */
/*                                                                     */
/*  Anything anchored to the bottom on mobile must clear the nav:      */
/*    bottom: calc(var(--bottom-nav-h) + env(safe-area-inset-bottom))  */
/* ------------------------------------------------------------------ */
export const Z = {
  stickyActions: 30,
  bottomNav: 40,
  fab: 45,
  sheetBackdrop: 50,
  sheetContent: 51,
} as const;
