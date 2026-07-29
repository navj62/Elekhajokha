"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { MoreHorizontal, Plus } from "lucide-react";

import { cn } from "@/lib/utils";
import { useLanguage } from "@/components/providers/LanguageProvider";
import { navFor, isNavActive } from "./navConfig";

/* ------------------------------------------------------------------ */
/*  Mobile bottom navigation: 4 destinations + a raised centre FAB.     */
/*  Hidden at lg:+ where the sidebar takes over. Items come from        */
/*  navConfig's "bottom" surface, so this never forks the nav list.     */
/*                                                                      */
/*  Height is --bottom-nav-h (56px) plus the iOS safe-area inset;       */
/*  see the z-index contract in navConfig.ts.                           */
/* ------------------------------------------------------------------ */

export default function BottomNav({
  onMore,
  onCreate,
}: {
  onMore: () => void;
  onCreate: () => void;
}) {
  const pathname = usePathname();
  const { t } = useLanguage();
  const items = navFor("bottom");
  const [keyboardOpen, setKeyboardOpen] = React.useState(false);

  /* On-screen keyboards cover a bottom-fixed bar and steal vertical space on
     form screens, so hide the nav while a text field is focused. Restricted to
     free-text fields — buttons, links and checkboxes must not hide the nav. */
  React.useEffect(() => {
    const isTextField = (el: EventTarget | null) => {
      const n = el as HTMLElement | null;
      if (!n) return false;
      const tag = n.tagName;
      if (tag === "TEXTAREA" || tag === "SELECT") return true;
      if (tag !== "INPUT") return n.isContentEditable === true;
      const type = (n as HTMLInputElement).type;
      return !["checkbox", "radio", "button", "submit", "reset", "range", "file", "color"].includes(type);
    };
    const onIn = (e: FocusEvent) => { if (isTextField(e.target)) setKeyboardOpen(true); };
    const onOut = () => setKeyboardOpen(false);
    document.addEventListener("focusin", onIn);
    document.addEventListener("focusout", onOut);
    return () => {
      document.removeEventListener("focusin", onIn);
      document.removeEventListener("focusout", onOut);
    };
  }, []);

  const cell =
    "relative flex min-h-11 min-w-11 flex-1 flex-col items-center justify-center gap-0.5 pt-1.5 text-[10px] font-semibold transition-colors";

  return (
    <nav
      data-slot="bottom-nav"
      data-keyboard-open={keyboardOpen ? "true" : undefined}
      aria-label="Primary"
      className={cn(
        "fixed inset-x-0 bottom-0 z-40 lg:hidden",
        "border-t border-sidebar-border bg-sidebar",
        "pb-[env(safe-area-inset-bottom)]",
        "transition-transform duration-200",
        keyboardOpen && "translate-y-full"
      )}
      style={{ height: "calc(var(--bottom-nav-h) + env(safe-area-inset-bottom))" }}
    >
      <div className="flex h-[var(--bottom-nav-h)] items-stretch">
        {items.slice(0, 2).map(({ key, href, icon: Icon }) => {
          const active = isNavActive(pathname, href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              data-active={active ? "true" : undefined}
              className={cn(cell, active ? "text-sidebar-primary" : "text-muted-foreground")}
            >
              {active && (
                <span className="absolute inset-x-4 top-0 h-[3px] rounded-b-full bg-sidebar-primary" />
              )}
              <Icon size={20} strokeWidth={active ? 2.6 : 2} />
              <span className="max-w-full truncate px-1">{t(key)}</span>
            </Link>
          );
        })}

        {/* Centre FAB — raised above the bar, primary create action */}
        <div className="relative flex w-16 shrink-0 items-start justify-center">
          <button
            type="button"
            onClick={onCreate}
            aria-label="New pledge"
            data-slot="bottom-nav-fab"
            className="absolute -top-5 z-45 flex size-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg ring-4 ring-sidebar transition-transform active:scale-95"
          >
            <Plus size={26} strokeWidth={2.5} />
          </button>
        </div>

        {items.slice(2, 3).map(({ key, href, icon: Icon }) => {
          const active = isNavActive(pathname, href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              data-active={active ? "true" : undefined}
              className={cn(cell, active ? "text-sidebar-primary" : "text-muted-foreground")}
            >
              {active && (
                <span className="absolute inset-x-4 top-0 h-[3px] rounded-b-full bg-sidebar-primary" />
              )}
              <Icon size={20} strokeWidth={active ? 2.6 : 2} />
              <span className="max-w-full truncate px-1">{t(key)}</span>
            </Link>
          );
        })}

        <button
          type="button"
          onClick={onMore}
          data-slot="bottom-nav-more"
          className={cn(cell, "text-muted-foreground")}
        >
          <MoreHorizontal size={20} strokeWidth={2} />
          {/* TODO(i18n): no "more" translation key — t() would echo the raw key. */}
          <span className="max-w-full truncate px-1">More</span>
        </button>
      </div>
    </nav>
  );
}
