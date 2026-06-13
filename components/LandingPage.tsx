// components/LandingPage.tsx
"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Building2, ShieldCheck, Users, Lock, Calculator,
  FileText, BarChart2, Coins, Check, LogIn,
} from "lucide-react";

export default function LandingPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen text-white dark:bg-gray-950 font-sans">

      {/* ── Navbar ─────────────────────────────────────────── */}
      <nav className="flex items-center justify-between px-8 py-4  border-b border-gray-100 bg-[#30302E] border-gray-100 sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-[#3b6d11] flex items-center justify-center">
            <Building2 size={16} className="text-green-100" />
          </div>
          <span className="text-sm font-medium text-white hover:text-gray-300">
            E-LekhaJokha
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="#features"
            className="px-4 py-1.5 text-sm text-white hover:text-gray-300 border border-gray-200 rounded-lg transition"
          >
            Features
          </Link>
          <Link
            href="#pricing"
            className="px-4 py-1.5 text-sm text-white hover:text-gray-300 border border-gray-200 rounded-lg transition"
          >
            Pricing
          </Link>
          <Link
            href="/sign-in"
            className="flex items-center gap-1.5 px-4 py-1.5 text-sm border bg-gray-50 rounded-lg text-gray-700 text-gray-300 transition"
          >
            <LogIn size={14} /> Sign in
          </Link>
          <Link
            href="/sign-up"
            className="px-4 py-1.5 text-sm bg-[#3b6d11] text-green-50 rounded-lg font-medium transition"
          >
            Get started →
          </Link>
        </div>
      </nav>

      {/* ── Hero ───────────────────────────────────────────── */}
      <section className="px-8 py-20 text-center bg-[#30302E] dark:bg-gray-950">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 text-[#3b6d11] dark:text-green-400 text-xs font-medium mb-6">
          <ShieldCheck size={12} /> Trusted by pawnshop owners
        </div>
        <h1 className="text-4xl font-medium text-gray-100 leading-tight max-w-2xl mx-auto mb-4">
          Manage your{" "}
          <span className="text-[#3b6d11]">pledge business</span>{" "}
          smarter
        </h1>
        <p className="text-base text-[#c2c0b6] max-w-lg mx-auto mb-8 leading-relaxed">
          E-LekhaJokha is a complete pawnshop management system — track customers,
          pledges, interest, and generate receipts in seconds.
        </p>
        <div className="flex items-center justify-center gap-3 flex-wrap">
          <Link
            href="/sign-up"
            className="px-7 py-2.5 bg-[#3b6d11] text-[#faf9f5] border-gray-200 rounded-lg text-sm font-medium transition"
          >
            Start free trial →
          </Link>
          <Link
            href="#features"
            className="px-7 py-2.5 border border-gray-200 text-[#faf9f5] rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-gray-800 transition"
          >
            See how it works
          </Link>
        </div>
      </section>

      {/* ── Stats ──────────────────────────────────────────── */}
      <div className="grid grid-cols-3 border-y border-gray-100 bg-[#2f2f2d]">
        {[
          { num: "15", label: "Days free trial" },
          { num: "∞",  label: "Customers & pledges" },
          { num: "PDF", label: "Receipts & reports" },
        ].map(({ num, label }, i) => (
          <div
            key={label}
            className={`py-6 text-center ${i < 2 ? "border-r border-gray-100 dark:border-gray-800" : ""}`}
          >
            <div className="text-2xl font-medium text-[#3b6d11]">{num}</div>
            <div className="text-xs text-[#c2c0b6] mt-1">{label}</div>
          </div>
        ))}
      </div>

      {/* ── Features ───────────────────────────────────────── */}
      <section id="features" className="px-8 py-16 bg-[#242422]">
        <p className="text-xs font-medium text-[#3b6d11] uppercase tracking-widest mb-2">
          Features
        </p>
        <h2 className="text-2xl font-medium text-gray-100 mb-2">
          Everything you need to run your shop
        </h2>
        <p className="text-sm text-[#c2c0b6] mb-8 max-w-lg">
          From customer onboarding to loan tracking and PDF receipts — all in one place.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {[
            {
              icon: <Users size={18} className="text-[#3b6d11]"/>,
              title: "Customer management",
              desc: "Add customers with photo, Aadhaar, address and full contact details.",
            },
            {
              icon: <Lock size={18} className="text-[#3b6d11]" />,
              title: "Pledge tracking",
              desc: "Track gold & silver pledges with item details, weight, purity and loan amounts.",
            },
            {
              icon: <Calculator size={18} className="text-[#3b6d11]" />,
              title: "Interest calculation",
              desc: "Auto-calculate compound or simple interest monthly, half-yearly or yearly.",
            },
            {
              icon: <FileText size={18} className="text-[#3b6d11]" />,
              title: "PDF receipts",
              desc: "Generate bilingual receipts with your shop name, terms & item photo.",
            },
            {
              icon: <BarChart2 size={18} className="text-[#3b6d11]" />,
              title: "Reports",
              desc: "Download customer and pledge reports as PDF with totals and summaries.",
            },
            {
              icon: <Coins size={18} className="text-[#3b6d11]" />,
              title: "Live gold rates",
              desc: "Real-time gold and silver market prices to calculate accurate LTV values.",
            },
          ].map(({ icon, title, desc }) => (
            <div
              key={title}
              className="bg-[#30302E] border border-gray-100 dark:border-gray-800 rounded-xl p-5"
            >
              <div className="w-9 h-9 rounded-lg bg-green-50 dark:bg-green-950 flex items-center justify-center mb-3">
                {icon}
              </div>
              <h3 className="text-sm font-medium text-white mb-1.5">
                {title}
              </h3>
              <p className="text-xs text-[#c2c0b6] leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>

        {/* Dashboard preview */}
        <div className="mt-8 bg-[#30302E] border border-gray-100 rounded-xl p-4">
          <div className="flex items-center gap-1.5 mb-4">
            <div className="w-2 h-2 rounded-full bg-red-400" />
            <div className="w-2 h-2 rounded-full bg-yellow-400" />
            <div className="w-2 h-2 rounded-full bg-green-500" />
          </div>
          <div className="grid grid-cols-3 gap-2 mb-4">
            {[
              { label: "Total customers", val: "24", tag: "↑ 3 this month", tagColor: "bg-green-50 dark:bg-green-950 text-[#3b6d11] dark:text-green-400" },
              { label: "Active pledges", val: "18", tag: "₹4,50,000 total", tagColor: "bg-green-50 dark:bg-green-950 text-[#3b6d11] dark:text-green-400" },
              { label: "Overdue", val: "3", tag: "Needs attention", tagColor: "bg-red-50 dark:bg-red-950 text-red-600 dark:text-red-400", valColor: "text-red-500" },
            ].map(({ label, val, tag, tagColor, valColor }) => (
              <div key={label} className="bg-[#30302E] border border-gray-100 dark:border-gray-700 rounded-lg p-3">
                <div className="text-xs text-[#c2c0b6] mb-1">{label}</div>
                <div className={`text-xl font-medium ${valColor ?? "text-white"}`}>{val}</div>
                <div className={`text-xs px-1.5 py-0.5 rounded mt-1 inline-block ${tagColor}`}>{tag}</div>
              </div>
            ))}
          </div>
          <div className="bg-[#30302E] border border-gray-100 rounded-lg overflow-hidden">
            <div className="grid grid-cols-3 px-3 py-2 border-b border-gray-100 text-xs font-medium text-white">
              <span>Customer</span><span>Loan amt</span><span>Status</span>
            </div>
            {[
              { name: "Ramesh Kumar", amt: "₹25,000", status: "Active", color: "bg-green-50 dark:bg-green-950 text-[#3b6d11] dark:text-green-400" },
              { name: "Sunita Devi",  amt: "₹15,000", status: "Released", color: "bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-400" },
              { name: "Mohan Lal",   amt: "₹40,000", status: "Active", color: "bg-green-50 dark:bg-green-950 text-[#3b6d11] dark:text-green-400" },
            ].map(({ name, amt, status, color }) => (
              <div key={name} className="grid grid-cols-3 px-3 py-2 border-b last:border-0 border-gray-50 text-xs text-[#c2c0b6]">
                <span>{name}</span>
                <span>{amt}</span>
                <span><span className={`px-1.5 py-0.5 rounded text-xs ${color}`}>{status}</span></span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing ────────────────────────────────────────── */}
      <section id="pricing" className="px-8 py-16 bg-[#242422]">
        <p className="text-xs font-medium text-[#3b6d11] uppercase tracking-widest mb-2">
          Pricing
        </p>
        <h2 className="text-2xl font-medium text-white mb-2">
          Simple, transparent pricing
        </h2>
        <p className="text-sm text-gray-300 mb-8">
          Start with a 15-day free trial. No credit card required.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl">
          {/* Half yearly */}
          <div className="bg-[#30302E] border border-gray-100 rounded-xl p-6">
            <div className="text-sm font-medium text-white mb-1">Half yearly</div>
            <div className="text-3xl font-medium text-white mb-1">
              ₹999 <span className="text-sm font-normal text-gray-300">/ 6 months</span>
            </div>
            <p className="text-xs text-gray-300 mb-5">Best for getting started</p>
            <ul className="space-y-2 mb-6">
              {["Unlimited customers", "Unlimited pledges", "PDF receipts & reports", "Live gold/silver rates"].map((f) => (
                <li key={f} className="flex items-center gap-2 text-xs text-gray-300">
                  <Check size={13} className="text-[#3b6d11] flex-shrink-0" /> {f}
                </li>
              ))}
            </ul>
            <Link
              href="/sign-up"
              className="block text-center w-full py-2 border border-gray-200 rounded-lg text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition"
            >
              Get started
            </Link>
          </div>

          {/* Yearly */}
          <div className="bg-[#30302E] border-2 border-green-600 dark:border-green-700 rounded-xl p-6">
            <div className="flex items-center justify-between mb-1">
              <div className="text-sm font-medium text-white">Yearly</div>
              <span className="text-xs bg-green-50 dark:bg-green-950 text-[#3b6d11] dark:text-green-400 px-2 py-0.5 rounded font-medium">
                Best value
              </span>
            </div>
            <div className="text-3xl font-medium text-white mb-1">
              ₹1,699 <span className="text-sm font-normal text-[#c2c0b6]">/ year</span>
            </div>
            <p className="text-xs text-[#c2c0b6] mb-5">Save ₹299 vs half yearly</p>
            <ul className="space-y-2 mb-6">
              {["Everything in half yearly", "Priority support", "Custom receipt terms", "Hindi & English receipts"].map((f) => (
                <li key={f} className="flex items-center gap-2 text-xs text-gray-300">
                  <Check size={13} className="text-[#3b6d11] flex-shrink-0" /> {f}
                </li>
              ))}
            </ul>
            <Link
              href="/sign-up"
              className="block text-center w-full py-2 bg-[#3b6d11] hover:bg-[#305a0e] text-green-50 rounded-lg text-sm font-medium transition"
            >
              Get started →
            </Link>
          </div>
        </div>
      </section>

      {/* ── CTA ────────────────────────────────────────────── */}
      <section className="px-8 py-16 text-center bg-[#30302E] border-t border-gray-100 ">
        <h2 className="text-2xl font-medium text-white mb-2">
          Start managing your shop today
        </h2>
        <p className="text-sm text-gray-300 mb-6">
          Join pawnshop owners who use E-LekhaJokha to save time and reduce errors.
        </p>
        <Link
          href="/sign-up"
          className="inline-block px-8 py-2.5 bg-[#3b6d11] hover:bg-[#305a0e] text-green-50 rounded-lg text-sm font-medium transition"
        >
          Start 15-day free trial →
        </Link>
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-3">
          No credit card required · Cancel anytime
        </p>
      </section>

      {/* ── Footer ─────────────────────────────────────────── */}
      <footer className="px-8 py-5 border-t border-gray-100 bg-[#30302E] flex items-center justify-between flex-wrap gap-2">
        <p className="text-xs text-gray-400 dark:text-gray-500">
          © 2026 E-LekhaJokha. All rights reserved.
        </p>
        <div className="flex gap-4">
          {["Privacy", "Terms", "Support"].map((l) => (
            <a key={l} href="#" className="text-xs text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition">
              {l}
            </a>
          ))}
        </div>
      </footer>
    </div>
  );
}