"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { usePathname } from "next/navigation";
import { THEME_STORAGE_KEY, isForcedLightPath } from "@/lib/theme";

type Theme = "light" | "dark";

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>("light");
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();

  // Public, customer-facing routes always render light — see lib/theme.ts.
  // The preference itself is still read and persisted; only the applied
  // class is suppressed, so navigating back into the app restores dark.
  const forcedLight = isForcedLightPath(pathname ?? "/");

  useEffect(() => {
    // Dark mode is strictly OPT-IN. Do NOT fall back to
    // `prefers-color-scheme` — the page layer has no dark styling yet, so
    // auto-enabling dark for OS-dark users ships a broken UI to people who
    // never asked for it. Users opt in via the sidebar / More-sheet toggle.
    const stored = localStorage.getItem(THEME_STORAGE_KEY) as Theme | null;
    if (stored === "dark" || stored === "light") {
      setTheme(stored);
    }
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    localStorage.setItem(THEME_STORAGE_KEY, theme);
    document.documentElement.classList.toggle("dark", theme === "dark" && !forcedLight);
  }, [theme, mounted, forcedLight]);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => (prev === "light" ? "dark" : "light"));
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return ctx;
}
