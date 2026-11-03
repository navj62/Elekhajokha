import { DM_Sans } from "next/font/google";

// DM Sans for the dashboard and tasks pages. Self-hosted by next/font at build
// time — no runtime request to Google Fonts. One instance shared by both pages.
export const dmSans = DM_Sans({ subsets: ["latin"], weight: ["400", "500", "600", "700"], display: "swap" });
