"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { useClerk } from "@clerk/nextjs";
import { ChevronRight, Globe, LogOut, Moon, Sun } from "lucide-react";

import { Sheet } from "@/components/ui/Sheet";
import { useLanguage } from "@/components/providers/LanguageProvider";
import { useTheme } from "@/components/providers/ThemeProvider";
import { navFor } from "./navConfig";

/**
 * Secondary navigation for mobile — everything that does not fit in the
 * 4-slot bottom bar, plus the account controls (theme / language / logout)
 * that live in the desktop sidebar. Since the sidebar is desktop-only, this
 * sheet is the ONLY way to reach those three on mobile.
 *
 * Route items come from navConfig's "more" surface; account controls are a
 * visually separated section below them.
 */
export default function MoreSheet({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const router = useRouter();
  const { t, language, setLanguage } = useLanguage();
  const { theme, toggleTheme } = useTheme();
  const { signOut } = useClerk();
  const items = navFor("more");

  const go = (href: string) => () => {
    onOpenChange(false); // close before navigating so it never persists across routes
    router.push(href);
  };

  return (
    // TODO(i18n): "More" has no translation key; t() would echo the raw key.
    <Sheet open={open} onOpenChange={onOpenChange} title="More" size="sm">
      <Sheet.List>
        {items.map(({ key, href, icon: Icon }) => (
          <Sheet.Item
            key={href}
            icon={<Icon size={18} />}
            label={t(key)}
            trailing={<ChevronRight size={16} />}
            onClick={go(href)}
          />
        ))}
      </Sheet.List>

      {/* Account controls — settings, not navigation, so visually separated. */}
      <div className="mt-2 border-t border-border pt-2">
        <Sheet.List>
          {/* Theme and language toggle in place: the sheet stays open so the
              change is visible immediately and the label updates. */}
          <Sheet.Item
            data-slot-action="theme"
            icon={theme === "light" ? <Moon size={18} /> : <Sun size={18} />}
            // TODO(i18n): no translation keys for these; the desktop sidebar
            // hardcodes the same English strings.
            label={theme === "light" ? "Dark Mode" : "Light Mode"}
            onClick={toggleTheme}
          />
          <Sheet.Item
            data-slot-action="language"
            icon={<Globe size={18} />}
            label={language === "en" ? t("switch_to_hindi") : t("switch_to_english")}
            onClick={() => setLanguage(language === "en" ? "hi" : "en")}
          />
          <Sheet.Item
            data-slot-action="logout"
            icon={<LogOut size={18} />}
            label={t("log_out")}
            /* Destructive must stay dominant in every state. Sheet.Item's base
               hover:text-accent-foreground is a different variant key from
               text-destructive, so twMerge does not treat them as conflicting
               and the generic hover would win — killing the destructive signal
               at the exact moment the user is about to tap. Overriding at the
               same variant+property lets twMerge resolve in our favour. */
            className="text-destructive hover:bg-destructive/10 hover:text-destructive focus-visible:ring-destructive/40"
            onClick={() => {
              onOpenChange(false);
              void signOut();
            }}
          />
        </Sheet.List>
      </div>
    </Sheet>
  );
}
