"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { SignOutButton } from "@clerk/nextjs";
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
  Globe,
} from "lucide-react";
import { useState } from "react";

const navItems = [
  { labelKey: "nav_dashboard", href: "/dashboard", icon: LayoutDashboard },
  { labelKey: "nav_add_customers", href: "/add-customer", icon: UserPlus },
  { labelKey: "nav_customer", href: "/customers", icon: Users },
  { labelKey: "nav_reports", href: "/dashboard/reports", icon: BarChart3 },
  { labelKey: "nav_settings", href: "/dashboard/settings", icon: Settings },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { language, setLanguage, t } = useLanguage();
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="flex h-screen font-sans overflow-hidden" style={{ backgroundColor: "var(--main-bg)" }}>
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-black/40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex flex-col w-[260px] transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:flex ${sidebarOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        style={{ backgroundColor: "#F5F4E7", borderRight: "1px solid var(--border-light)" }}
      >
        <div className="flex flex-col px-8 pt-10 pb-10">
          <span className="text-[15px] font-bold" style={{ color: "var(--text-primary)" }}>Lekha-Jokha</span>
          <span className="text-[12px] font-medium mt-0.5" style={{ color: "var(--text-secondary)" }}>{t("workspace")}</span>
        </div>
        <button className="lg:hidden absolute top-10 right-6" onClick={() => setSidebarOpen(false)}>
          <X size={20} style={{ color: "var(--text-primary)" }} />
        </button>

        <nav className="flex-1 px-4 space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href || (item.labelKey === "nav_dashboard" && pathname === "/dashboard");
            const Icon = item.icon;
            return (
              <Link
                key={item.labelKey}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-[10px] rounded-[10px] text-[13.5px] font-semibold transition-colors ${isActive ? 'bg-[#A9A983]' : 'hover:bg-[#dcdcc4]'}`}
                style={{
                  color: isActive ? "var(--text-primary)" : "var(--text-secondary)",
                }}
                onClick={() => setSidebarOpen(false)}
              >
                <Icon size={18} strokeWidth={isActive ? 2.5 : 2} />
                <span>{t(item.labelKey)}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-6 flex flex-col gap-3 mt-auto">
          <button
            onClick={toggleTheme}
            className="w-full py-3 px-4 rounded-full flex gap-2 justify-center items-center text-[13.5px] font-bold transition-transform hover:-translate-y-[1px] active:scale-[0.98]"
            style={{
              color: "var(--text-primary)",
              backgroundColor: "transparent",
              border: "1px solid rgba(93, 97, 69, 0.2)",
            }}
          >
            {theme === "light" ? (
              <Moon size={18} strokeWidth={2.5} style={{ color: "#5D6145" }} />
            ) : (
              <Sun size={18} strokeWidth={2.5} style={{ color: "#5D6145" }} />
            )}
            {theme === "light" ? "Dark Mode" : "Light Mode"}
          </button>

          <button
            onClick={() => setLanguage(language === "en" ? "hi" : "en")}
            className="w-full py-3 px-4 rounded-full flex gap-2 justify-center items-center text-[13.5px] font-bold transition-transform hover:-translate-y-[1px] active:scale-[0.98]"
            style={{
              color: "var(--text-primary)",
              backgroundColor: "transparent",
              border: "1px solid rgba(93, 97, 69, 0.2)",
            }}
          >
            <Globe size={18} strokeWidth={2.5} style={{ color: "#5D6145" }} />
            {language === "en" ? t("switch_to_hindi") : t("switch_to_english")}
          </button>

          <SignOutButton>
            <button
              className="w-full py-3 px-4 rounded-full flex gap-2 justify-center items-center text-white text-[13.5px] font-bold shadow-md transition-transform hover:-translate-y-[1px] active:scale-[0.98]"
              style={{ background: "#5D6145", boxShadow: "0 4px 14px rgba(91, 97, 70, 0.25)" }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#e3e3e3"><path d="M200-120q-33 0-56.5-23.5T120-200v-560q0-33 23.5-56.5T200-840h280v80H200v560h280v80H200Zm440-160-55-58 102-102H360v-80h327L585-622l55-58 200 200-200 200Z" /></svg>{t("log_out")}
            </button>
          </SignOutButton>
        </div>
      </aside>

      {/* Main area */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Top bar */}
        <header className="flex items-center justify-between h-[84px] px-10 shrink-0">
          <button className="mr-4 lg:hidden" onClick={() => setSidebarOpen(true)}>
            <Menu size={22} style={{ color: "var(--text-primary)" }} />
          </button>

          {/* Left: Search Box */}
          <div className="hidden md:flex flex-1 items-center max-w-[320px]">
            <div
              className="flex items-center w-full gap-2 px-4 py-[10px] rounded-full transition-all focus-within:ring-2 focus-within:ring-[#A2AB89]"
              style={{ backgroundColor: "var(--sidebar-bg)" }}
            >
              <Search size={14} style={{ color: "var(--text-muted)" }} />
              <input
                type="text"
                placeholder={t("search_placeholder")}
                className="w-full bg-transparent outline-none text-[13px] font-medium text-[var(--text-primary)] placeholder-[var(--text-muted)]"
              />
            </div>
          </div>

          {/* Center: Title */}
          <div className="flex-1 flex justify-center text-center">
          </div>

          {/* Right: Actions */}
          <div className="flex-1 flex items-center justify-end gap-6">
            <button className="relative transition-colors hover:opacity-80 disabled" style={{ color: "var(--text-secondary)" }}>
              <Bell size={18} strokeWidth={2} />
            </button>
            <button className="transition-colors hover:opacity-80 disabled" style={{ color: "var(--text-secondary)" }}>
              <HelpCircle size={18} strokeWidth={2} />
            </button>

            <div className="flex items-center gap-3 pl-2">
              <span className="text-[13px] font-semibold hidden sm:inline" style={{ color: "var(--text-primary)" }}>{t("admin_user")}</span>
              <div className="w-8 h-8 rounded-full bg-black text-white flex items-center justify-center overflow-hidden border border-[var(--border-light)]">
                <img src="https://i.pravatar.cc/150?u=a042581f4e29026024d" alt="avatar" className="w-full h-full object-cover" />
              </div>
            </div>
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
