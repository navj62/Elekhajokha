import type { Metadata } from "next";
import { Noto_Sans } from "next/font/google";
import "./globals.css";
import { ClerkProvider } from "@clerk/nextjs";
import ClientProviders from "@/components/providers/ClientProviders";

const notoSans = Noto_Sans({
  variable: "--font-noto-sans",
  subsets: ["latin", "devanagari"],
  weight: ["400", "500", "600", "700", "800"],
});

/**
 * Runs before first paint to avoid a light-theme flash for dark-mode users.
 * Deliberately dependency-free and defensive — it must never throw, since a
 * throw here would abort parsing of the rest of the inline script.
 */
const THEME_INIT_SCRIPT = `(function(){try{if(localStorage.getItem("theme")==="dark"){document.documentElement.classList.add("dark")}}catch(e){}})()`;

export const metadata: Metadata = {
  title: "E-Lekha-Jokha",
  description: "Finance SaaS",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider>
      <html lang="en" suppressHydrationWarning>
        <body className={`${notoSans.variable} antialiased`} style={{ fontFamily: "var(--font-noto-sans), 'Noto Sans', sans-serif" }}>
          {/* Anti-FOUC: apply the stored theme BEFORE first paint. Must stay
              synchronous and blocking (no defer/async) and must stay the first
              child of <body>. Keep the storage key in sync with ThemeProvider. */}
          <script
            dangerouslySetInnerHTML={{
              __html: THEME_INIT_SCRIPT,
            }}
          />
          <ClientProviders>
            {children}
          </ClientProviders>
        </body>
      </html>
    </ClerkProvider>
  );
}