"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { SignOutButton, useUser } from "@clerk/nextjs";
import { useLanguage } from "@/components/providers/LanguageProvider";
import { useTheme } from "@/components/providers/ThemeProvider";
import {
  LayoutDashboard,
  UserPlus,
  Users,
  BarChart3,
  Settings,
  Bell,
  Menu,
  Sun,
  Moon,
  X,
  Search,
  HelpCircle,
  User,
} from "lucide-react";
import { SidebarProvider, useSidebar } from "@/components/sidebar/SidebarProvider";
import { Sidebar } from "@/components/sidebar/Sidebar";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <DashboardLayoutContent>{children}</DashboardLayoutContent>
    </SidebarProvider>
  );
}

function DashboardLayoutContent({ children }: { children: React.ReactNode }) {
  const { toggleMobile } = useSidebar();
  const { t } = useLanguage();
  const { theme } = useTheme();
  const { isLoaded, isSignedIn, user } = useUser();

  return (
    <div className="flex h-screen font-sans overflow-hidden" style={{ backgroundColor: "var(--main-bg)" }}>
      <Sidebar />

      {/* Main area */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Top bar */}
        <header className="flex items-center justify-between h-[58px] px-8 shrink-0" style={{ borderBottom: "1px solid var(--border-light)" }}>
          <button className="mr-4 lg:hidden" onClick={toggleMobile}>
            <Menu size={22} style={{ color: "var(--text-primary)" }} />
          </button>

          {/* Left: Search Box */}
          <div className="hidden md:flex flex-1 items-center max-w-[280px]">
            <div
              className="flex items-center w-full gap-2 px-3 py-[7px] rounded-full transition-all focus-within:ring-2 focus-within:ring-[#A2AB89]"
              style={{ backgroundColor: "var(--sidebar-bg)" }}
            >
              <Search size={13} style={{ color: "var(--text-muted)" }} />
              <input
                type="text"
                placeholder={t("search_placeholder")}
                className="w-full bg-transparent outline-none text-[12.5px] font-medium text-[var(--text-primary)] placeholder-[var(--text-muted)]"
              />
            </div>
          </div>

          {/* Center: Title */}
          <div className="flex-1 flex justify-center text-center">
          </div>

          {/* Right: Actions */}
          <div className="flex-1 flex items-center justify-end gap-4">
            <Link href="/notifications" className="relative transition-colors hover:opacity-70" style={{ color: "var(--text-secondary)" }}>
              <Bell size={17} strokeWidth={2} />
            </Link>
            <Link href="/help" className="transition-colors hover:opacity-70" style={{ color: "var(--text-secondary)" }}>
              <HelpCircle size={17} strokeWidth={2} />
            </Link>
            <Link href="/profile" className="w-[32px] h-[32px] rounded-full overflow-hidden border border-[var(--border-light)] shadow-sm flex items-center justify-center bg-[var(--sidebar-bg)] transition-transform hover:scale-105 active:scale-95">
              {isLoaded && isSignedIn && user?.imageUrl ? (
                <img src={user.imageUrl} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <User size={18} style={{ color: "var(--text-secondary)" }} />
              )}
            </Link>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto w-full mx-auto px-10 pb-12 pt-2">
          <div className="max-w-[1400px] w-full mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
