"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { SignOutButton, useUser } from "@clerk/nextjs";
import { Bell, Globe, Moon, Sun, User } from "lucide-react";

import { useLanguage } from "@/components/providers/LanguageProvider";
import { useTheme } from "@/components/providers/ThemeProvider";
import Breadcrumb from "@/components/ui/Breadcrumb";
import MetalRateStrip from "@/components/inventory/MetalRateStrip";
import { navFor, isNavActive } from "./navConfig";
import BottomNav from "./BottomNav";
import MoreSheet from "./MoreSheet";
import CustomerPickerSheet from "./CustomerPickerSheet";

/* ------------------------------------------------------------------ */
/*  The one application shell.                                         */
/*                                                                     */
/*  Desktop (lg:+) : left sidebar + top bar                            */
/*  Mobile  (<lg)  : fixed bottom nav with centre FAB — the ONLY nav   */
/*                   surface. There is no hamburger/drawer; the theme, */
/*                   language and logout controls that live in the     */
/*                   sidebar are reachable via the More sheet.         */
/*                                                                     */
/*  Exactly one nav surface per breakpoint.                            */
/*                                                                     */
/*  Both nav surfaces read from navConfig, so they cannot diverge.     */
/*  Breakpoint is expressed in CSS, not a JS media query, so there is  */
/*  no hydration mismatch.                                            */
/* ------------------------------------------------------------------ */

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const { language, setLanguage, t } = useLanguage();
  const { theme, toggleTheme } = useTheme();
  const { isLoaded, isSignedIn, user } = useUser();

  const sidebarItems = navFor("sidebar");

  return (
    <div className="flex h-[100dvh] overflow-hidden font-sans" style={{ backgroundColor: "var(--background)" }}>
      {/* Sidebar — desktop only. On mobile the bottom nav is the sole nav
          surface, and the account controls that used to live here (theme,
          language, logout) are in the More sheet. */}
      <aside className="hidden w-[260px] shrink-0 flex-col border-r border-sidebar-border bg-sidebar lg:flex">
        <div className="flex flex-col px-8 pt-10 pb-3">
          <span className="text-[15px] font-bold" style={{ color: "var(--foreground)" }}>
            Lekha-Jokha
          </span>
          <span className="mt-0.5 text-[12px] font-medium" style={{ color: "var(--muted-foreground)" }}>
            {t("workspace")}
          </span>
        </div>
        <MetalRateStrip variant="compact" />

        <nav className="flex-1 space-y-1 overflow-y-auto px-4">
          {sidebarItems.map(({ key, href, icon: Icon }) => {
            const isActive = isNavActive(pathname, href);
            return (
              <Link
                key={href}
                href={href}
                aria-current={isActive ? "page" : undefined}
                className={`flex items-center gap-3 rounded-[10px] px-4 py-[10px] text-[13.5px] font-semibold transition-colors ${
                  isActive ? "bg-sidebar-accent" : "hover:bg-sidebar-hover"
                }`}
                style={{ color: isActive ? "var(--foreground)" : "var(--muted-foreground)" }}
              >
                <Icon size={18} strokeWidth={isActive ? 2.5 : 2} />
                <span>{t(key)}</span>
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto flex flex-col gap-3 p-6">
          <button
            onClick={toggleTheme}
            className="flex w-full items-center justify-center gap-2 rounded-full border border-sidebar-primary/20 px-4 py-3 text-[13.5px] font-bold transition-transform hover:-translate-y-[1px] active:scale-[0.98]"
            style={{ color: "var(--foreground)", backgroundColor: "transparent" }}
          >
            {theme === "light" ? (
              <Moon size={18} strokeWidth={2.5} className="text-sidebar-primary" />
            ) : (
              <Sun size={18} strokeWidth={2.5} className="text-sidebar-primary" />
            )}
            {theme === "light" ? "Dark Mode" : "Light Mode"}
          </button>

          <button
            onClick={() => setLanguage(language === "en" ? "hi" : "en")}
            className="flex w-full items-center justify-center gap-2 rounded-full border border-sidebar-primary/20 px-4 py-3 text-[13.5px] font-bold transition-transform hover:-translate-y-[1px] active:scale-[0.98]"
            style={{ color: "var(--foreground)", backgroundColor: "transparent" }}
          >
            <Globe size={18} strokeWidth={2.5} className="text-sidebar-primary" />
            {language === "en" ? t("switch_to_hindi") : t("switch_to_english")}
          </button>

          <SignOutButton>
            <button
              className="flex w-full items-center justify-center gap-2 rounded-full bg-sidebar-primary px-4 py-3 text-[13.5px] font-bold text-sidebar-primary-foreground shadow-md transition-transform hover:-translate-y-[1px] active:scale-[0.98]"
              style={{ boxShadow: "0 4px 14px color-mix(in srgb, var(--sidebar-primary) 25%, transparent)" }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#e3e3e3">
                <path d="M200-120q-33 0-56.5-23.5T120-200v-560q0-33 23.5-56.5T200-840h280v80H200v560h280v80H200Zm440-160-55-58 102-102H360v-80h327L585-622l55-58 200 200-200 200Z" />
              </svg>
              {t("log_out")}
            </button>
          </SignOutButton>
        </div>
      </aside>

      {/* Main area */}
      <div className="flex h-[100dvh] flex-1 flex-col overflow-hidden">
        <header
          className="flex h-[58px] shrink-0 items-center justify-between px-5 lg:px-8"
          style={{ borderBottom: "1px solid var(--border)" }}
        >
          <Breadcrumb />
          <div className="flex-1 flex justify-center text-center" />
          <div className="flex flex-1 items-center justify-end gap-4">
            <Link
              href="/notifications"
              aria-label="Notifications"
              className="relative transition-colors hover:opacity-70"
              style={{ color: "var(--muted-foreground)" }}
            >
              <Bell size={17} strokeWidth={2} />
            </Link>
            <Link
              href="/profile"
              aria-label="Profile"
              className="flex h-[32px] w-[32px] items-center justify-center overflow-hidden rounded-full border border-[var(--border)] bg-[var(--sidebar)] shadow-sm transition-transform hover:scale-105 active:scale-95"
            >
              {isLoaded && isSignedIn && user?.imageUrl ? (
                <img src={user.imageUrl} alt="Profile" className="h-full w-full object-cover" />
              ) : (
                <User size={18} style={{ color: "var(--muted-foreground)" }} />
              )}
            </Link>
          </div>
        </header>

        {/* Page content. Bottom padding clears the fixed mobile nav — <main> is
            the scroll container, so without this its last rows sit under it. */}
        <main className="mx-auto w-full flex-1 overflow-y-auto px-5 pt-2 pb-[calc(var(--bottom-nav-h)+env(safe-area-inset-bottom)+1rem)] lg:px-10 lg:pb-12">
          <div className="mx-auto w-full max-w-[1400px]">{children}</div>
        </main>
      </div>

      {/* Mobile-only nav surfaces */}
      <BottomNav onMore={() => setMoreOpen(true)} onCreate={() => setPickerOpen(true)} />
      <MoreSheet open={moreOpen} onOpenChange={setMoreOpen} />
      <CustomerPickerSheet open={pickerOpen} onOpenChange={setPickerOpen} />
    </div>
  );
}
