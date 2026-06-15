"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LucideIcon } from "lucide-react";
import { useSidebar } from "./SidebarProvider";
import { useLanguage } from "@/components/providers/LanguageProvider";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";

interface SidebarItemProps {
  labelKey: string;
  href: string;
  icon: LucideIcon | React.ElementType;
}

export function SidebarItem({ labelKey, href, icon: Icon }: SidebarItemProps) {
  const pathname = usePathname();
  const { isCollapsed, closeMobile } = useSidebar();
  const { t } = useLanguage();

  const isActive = pathname === href || (labelKey === "nav_dashboard" && pathname === "/dashboard");

  const linkContent = (
    <Link
      href={href}
      onClick={(e) => {
        e.stopPropagation();
        closeMobile();
      }}
      className={`group flex items-center ${
        isCollapsed ? "justify-center w-10 h-10" : "px-4 py-[10px] w-full"
      } rounded-[10px] text-[13.5px] font-semibold transition-all duration-200 ${
        isActive 
          ? "bg-[#5D6145] text-white shadow-sm" 
          : "text-[#5D6145] hover:bg-[#dcdcc4] hover:text-[#2C2C2C]"
      }`}
    >
      <Icon size={isCollapsed ? 20 : 18} strokeWidth={isActive ? 2.5 : 2} className="shrink-0" />
      <span 
        className={`ml-3 truncate transition-all duration-300 whitespace-nowrap ${
          isCollapsed ? "opacity-0 w-0" : "opacity-100 w-[120px]"
        }`}
      >
        {t(labelKey)}
      </span>
    </Link>
  );

  if (isCollapsed) {
    return (
      <TooltipProvider delayDuration={0}>
        <Tooltip>
          <TooltipTrigger asChild>{linkContent}</TooltipTrigger>
          <TooltipContent side="right" sideOffset={10} className="font-semibold text-xs">
            {t(labelKey)}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return linkContent;
}
