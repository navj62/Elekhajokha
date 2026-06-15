"use client";

import { LanguageProvider } from "./LanguageProvider";
import { ThemeProvider } from "./ThemeProvider";
import { AlertProvider } from "./AlertProvider";

export default function ClientProviders({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <AlertProvider>
          {children}
        </AlertProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
}
