"use client";

import React, { useState } from "react";
import Image from "next/image";
import { SignOutButton } from "@clerk/nextjs";
import { useLanguage } from "@/components/providers/LanguageProvider";
import { useTheme } from "@/components/providers/ThemeProvider";
import { useSidebar } from "./SidebarProvider";
import { SidebarItem } from "./SidebarItem";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from "@/components/ui/tooltip";
import { Switch } from "@/components/ui/switch";
import {
  LayoutDashboard,
  UserPlus,
  Users,
  TrendingUp,
  LogOut,
  Moon,
  Sun,
  PanelLeft,
  PanelRightClose,
  BarChart,
  X,
} from "lucide-react";

function PledgeIcon({
  size,
  className,
  onClick,
}: {
  size?: number | string;
  className?: string;
  onClick?: React.MouseEventHandler<HTMLImageElement>;
}) {
  const [active, setActive] = useState(false);

  const handleClick = (e: React.MouseEvent<HTMLImageElement>) => {
    setActive(!active);
    onClick?.(e);
  };

  return (
    <Image
      src="/pledgeicon.png"
      alt="Pledge"
      width={Number(size) || 18}
      height={Number(size) || 18}
      onClick={handleClick}
      className={`cursor-pointer transition-all duration-200 ${active ? "brightness-0 invert" : ""
        } ${className || ""}`}
    />
  );
}

const navItems = [
  { labelKey: "nav_dashboard", href: "/dashboard", icon: LayoutDashboard },
  { labelKey: "nav_add_customers", href: "/add-customer", icon: UserPlus },
  { labelKey: "nav_customer", href: "/customers", icon: Users },
  { labelKey: "nav_reports", href: "/reports", icon: BarChart },
  { labelKey: "ltv", href: "/ltv", icon: TrendingUp },
  { labelKey: "pledges", href: "/pledgeList", icon: PledgeIcon },
];

function KreditLogo() {
  return (
    <div className="relative flex items-center justify-center w-12 h-12 rounded-md shrink-0">
      <Image
        src="/kreditLogo.png"
        alt="Kredit Logo"
        width={48}
        height={48}
        className="object-contain"
      />
    </div>
  );
}

export function Sidebar() {
  const { t } = useLanguage();
  const { theme, toggleTheme } = useTheme();
  const { isCollapsed, toggleCollapse, isMobileOpen, closeMobile } =
    useSidebar();

  const isDarkMode = theme === "dark";

  return (
    <>
      {/* Mobile overlay */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 lg:hidden transition-opacity duration-300"
          onClick={closeMobile}
        />
      )}

      {/* Sidebar */}
      <aside
        onClick={() => {
          if (isCollapsed && !isMobileOpen) {
            toggleCollapse();
          }
        }}
        className={`group fixed inset-y-0 left-0 z-50 flex flex-col transform transition-all duration-300 ease-in-out lg:translate-x-0 lg:static ${isMobileOpen ? "translate-x-0" : "-translate-x-full"
          } ${isCollapsed ? "w-[72px] cursor-e-resize" : "w-[260px]"
          } relative`}
        style={{
          backgroundColor: "#E9E9D7",
          borderRight: "1px solid var(--border-light)",
        }}
      >
        {/* Header */}
        <div
          className={`flex items-center w-full pt-8 pb-8 ${isCollapsed
            ? "justify-center flex-col px-0 gap-6"
            : "px-6 justify-between"
            }`}
        >
          <div className="flex items-center justify-between w-full">
            <div
              className={`relative flex items-center justify-center shrink-0 w-12 h-12 ${isCollapsed ? "mx-auto" : ""
                }`}
            >
              <div
                className={`absolute inset-0 flex items-center justify-center transition-opacity duration-200 ${isCollapsed
                  ? "opacity-100 group-hover:opacity-0"
                  : "opacity-100"
                  }`}
              >
                <KreditLogo />
              </div>

              {isCollapsed && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleCollapse();
                  }}
                  className="absolute inset-0 flex items-center justify-center bg-[#E9E9D7] rounded-md text-[#5D6145] transition-all duration-200 opacity-0 group-hover:opacity-100 cursor-e-resize hover:bg-[#dcdcc4]"
                >
                  <PanelRightClose size={24} />
                </button>
              )}
            </div>

            {!isCollapsed && (
              <span className="text-[17px] font-bold whitespace-nowrap ml-3 flex-1">
                Kredit
              </span>
            )}

            {!isCollapsed && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toggleCollapse();
                }}
                className="text-[#5D6145] hover:bg-[#dcdcc4] flex justify-center items-center w-10 h-10 rounded-[10px]"
              >
                <PanelLeft size={20} />
              </button>
            )}
          </div>

          {/* Mobile close */}
          <button
            className="lg:hidden absolute top-8 right-6"
            onClick={closeMobile}
          >
            <X size={20} />
          </button>
        </div>

        {/* Navigation */}
        <nav
          className={`flex-1 overflow-y-auto overflow-x-hidden ${isCollapsed
            ? "px-4 flex flex-col items-center"
            : "px-4"
            } space-y-4`}
        >
          {navItems.map((item) => (
            <SidebarItem key={item.labelKey} {...item} />
          ))}
        </nav>

        {/* Bottom */}
        <div
          className={`flex flex-col pb-6 pt-4 ${isCollapsed ? "items-center px-4" : "px-6"
            } gap-4 mt-auto`}
        >
          {/* Theme Toggle */}
          {isCollapsed ? (
            <TooltipProvider delayDuration={0}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={toggleTheme}
                    className="flex justify-center items-center w-10 h-10 rounded-full hover:bg-[#dcdcc4]"
                  >
                    {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right">
                  {isDarkMode ? "Light Mode" : "Dark Mode"}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ) : (
            <div className="flex items-center justify-between py-2">
              <div className="flex items-center gap-3 text-[13.5px] font-semibold">
                {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
                <span>{isDarkMode ? "Light Mode" : "Dark Mode"}</span>
              </div>
              <Switch checked={isDarkMode} onCheckedChange={toggleTheme} />
            </div>
          )}

          {/* Logout */}
          <SignOutButton>
            <button className="w-full py-3 px-4 rounded-[50px] flex gap-3 justify-center items-center text-white text-[13.5px] font-bold bg-[#5D6145]">
              <LogOut size={18} />
              {!isCollapsed && t("log_out")}
            </button>
          </SignOutButton>
        </div>
      </aside>
    </>
  );
}