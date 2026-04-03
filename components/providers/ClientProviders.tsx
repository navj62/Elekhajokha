"use client";

import { LanguageProvider } from "./LanguageProvider";
import { ThemeProvider } from "./ThemeProvider";

export default function ClientProviders({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <LanguageProvider>{children}</LanguageProvider>
    </ThemeProvider>
  );
}
