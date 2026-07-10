// components/LandingPage.tsx
"use client";
import Link from "next/link";
import {
  Building2, ShieldCheck, Users, Lock, Calculator,
  FileText, BarChart2, Coins, Check, LogIn, ArrowRight
} from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen text-[#24251f] bg-[#f4f3e8] font-sans antialiased selection:bg-[#737956]/20 selection:text-[#585e3c]">

      {/* ── Navbar ─────────────────────────────────────────── */}
      <nav className="flex items-center justify-between px-6 md:px-12 py-4 border-b border-[#e2e0d2] bg-[#f0eee1]/90 backdrop-blur-md sticky top-0 z-50">
        <div className="flex items-center gap-2.5 group cursor-pointer">
          <div className="w-9 h-9 rounded-xl bg-[#737956] flex items-center justify-center shadow-md shadow-[#737956]/10 transition-transform group-hover:scale-105">
            <Building2 size={18} className="text-[#f4f3e8]" />
          </div>
          <span className="text-base font-semibold tracking-tight text-[#24251f]">
            Lekha-Jokha
          </span>
        </div>
        
        <div className="flex items-center gap-4">
          <Link
            href="#features"
            className="hidden sm:inline-block px-4 py-2 text-sm text-[#5c5e54] hover:text-[#24251f] font-medium transition-colors"
          >
            Features
          </Link>
          <Link
            href="#pricing"
            className="hidden sm:inline-block px-4 py-2 text-sm text-[#5c5e54] hover:text-[#24251f] font-medium transition-colors"
          >
            Pricing
          </Link>
          <Link
            href="/sign-in"
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium border border-[#d6d4c5] hover:border-[#b8b6a5] bg-[#faf9f5] rounded-xl text-[#4a4c42] hover:text-[#24251f] transition-all"
          >
            <LogIn size={14} /> Sign in
          </Link>
          <Link
            href="/sign-up"
            className="px-4 py-2 text-sm bg-[#737956] hover:bg-[#5e6346] text-[#faf9f5] rounded-xl font-medium shadow-sm transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            Get started
          </Link>
        </div>
      </nav>

      {/* ── Hero ───────────────────────────────────────────── */}
      <section className="relative px-6 md:px-12 py-24 text-center overflow-hidden bg-gradient-to-b from-[#f0eee1] to-[#f4f3e8]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(115,121,86,0.06)_0%,transparent_60%)] pointer-events-none" />
        
        <div className="relative max-w-3xl mx-auto flex flex-col items-center">
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#737956]/10 border border-[#737956]/20 text-[#5e6346] text-xs font-semibold mb-8">
            <ShieldCheck size={14} /> Trusted by pawnshop owners across India
          </div>
          
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-[#24251f] tracking-tight leading-[1.15] mb-6">
            Manage your <span className="text-[#737956]">pledge business</span> smarter
          </h1>
          
          <p className="text-base md:text-lg text-[#5c5e54] max-w-xl mb-10 leading-relaxed">
            E-LekhaJokha is a complete financial workspace management system — track customers,
            pledges, interest models, and live market values.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
            <Link
              href="/sign-up"
              className="w-full sm:w-auto px-8 py-3.5 bg-[#737956] hover:bg-[#5e6346] text-[#faf9f5] rounded-xl font-medium shadow-md shadow-[#737956]/20 transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2"
            >
              Start free workspace <ArrowRight size={16} />
            </Link>
            <Link
              href="#features"
              className="w-full sm:w-auto px-8 py-3.5 border border-[#d6d4c5] hover:border-[#b8b6a5] text-[#4a4c42] rounded-xl text-sm font-medium bg-[#faf9f5]/60 hover:bg-[#faf9f5] transition-all"
            >
              See features
            </Link>
          </div>
        </div>
      </section>

      {/* ── Live Market Rates Ribbon ───────────────────────── */}
      <div className="max-w-6xl mx-auto px-6 md:px-12">
        <div className="flex flex-wrap items-center justify-center gap-6 px-6 py-3.5 bg-[#f0eee1] border border-[#e2e0d2] rounded-xl text-sm font-medium text-[#4a4c42]">
          <div className="flex items-center gap-2">
            <Coins size={16} className="text-[#737956]" />
            <span>Live Market Rates:</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-500" />
            <span>Gold: <span className="font-semibold text-[#24251f]">₹1,53,261.6 / 10g</span></span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-slate-400" />
            <span>Silver: <span className="font-semibold text-[#24251f]">₹242.61 / g</span></span>
          </div>
        </div>
      </div>

      {/* ── Stats Cards ────────────────────────────────────── */}
      <div className="max-w-6xl mx-auto px-6 md:px-12 mt-8">
        <div className="grid grid-cols-1 md:grid-cols-3 bg-[#faf9f5] border border-[#e2e0d2] rounded-2xl overflow-hidden shadow-sm">
          {[
            { num: "15 Days", label: "Risk-free trial, no card needed" },
            { num: "Unlimited", label: "Customers & secure pledge metrics" },
            { num: "Bilingual PDF", label: "Instant legal receipts & reports" },
          ].map(({ num, label }, i) => (
            <div
              key={label}
              className={`p-6 md:py-8 text-center flex flex-col justify-center ${
                i < 2 ? "border-b md:border-b-0 md:border-r border-[#e2e0d2]" : ""
              }`}
            >
              <div className="text-2xl font-bold text-[#24251f] tracking-tight">{num}</div>
              <div className="text-xs text-[#5c5e54] mt-1.5 font-semibold uppercase tracking-wider">{label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Features ───────────────────────────────────────── */}
      <section id="features" className="px-6 md:px-12 py-20 max-w-7xl mx-auto">
        <div className="mb-12">
          <p className="text-xs font-bold text-[#737956] uppercase tracking-widest mb-2">
            Features Workspace
          </p>
          <h2 className="text-3xl font-bold text-[#24251f] tracking-tight mb-3">
            Everything you need to run your shop
          </h2>
          <p className="text-sm md:text-base text-[#5c5e54] max-w-xl leading-relaxed">
            From easy customer onboarding to accurate gold tracking calculations and custom PDF receipts.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {[
            {
              icon: <Users size={20} className="text-[#737956]"/>,
              title: "Customer Management",
              desc: "Add records effortlessly with photos, Aadhaar validation profiles, custom addresses, and absolute data safety.",
            },
            {
              icon: <Lock size={20} className="text-[#737956]" />,
              title: "Pledge Tracking",
              desc: "Track gold & silver item details with meticulous precision across weight, purity parameters, and loan totals.",
            },
            {
              icon: <Calculator size={20} className="text-[#737956]" />,
              title: "Interest Calculation",
              desc: "Auto-calculate compound or basic simple interest parameters mapped across monthly, half-yearly or yearly variables.",
            },
            {
              icon: <FileText size={20} className="text-[#737956]" />,
              title: "PDF Receipts",
              desc: "Generate clean bilingual documents featuring your shop name, unique workspace terms, and attached item photos.",
            },
            {
              icon: <BarChart2 size={20} className="text-[#737956]" />,
              title: "Financial Reports",
              desc: "Instantly compile complete active loan portfolios and overview summaries directly into organized print documents.",
            },
            {
              icon: <Coins size={20} className="text-[#737956]" />,
              title: "Live Gold Rates",
              desc: "Real-time gold and silver spot rates delivered straight into your workspace engine for immediate LTV calculations.",
            },
          ].map(({ icon, title, desc }) => (
            <div
              key={title}
              className="bg-[#f0eee1] border border-[#e2e0d2] hover:border-[#d6d4c5] rounded-2xl p-6 transition-all duration-200 group"
            >
              <div className="w-10 h-10 rounded-xl bg-[#faf9f5] border border-[#e2e0d2] flex items-center justify-center mb-4 transition-colors group-hover:bg-[#737956]/10">
                {icon}
              </div>
              <h3 className="text-base font-bold text-[#24251f] mb-2 tracking-tight">
                {title}
              </h3>
              <p className="text-xs md:text-sm text-[#5c5e54] leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>

        {/* Dashboard preview matched to your snapshot */}
        <div className="mt-12 bg-[#faf9f5] border border-[#e2e0d2] rounded-2xl p-4 md:p-6 shadow-sm">
          <div className="flex items-center justify-between mb-5 border-b border-[#e2e0d2]/60 pb-4">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full bg-[#737956]/40" />
              <span className="text-xs text-[#5c5e54] font-semibold">Live Workspace Performance Preview</span>
            </div>
            <span className="text-xs font-mono px-2 py-0.5 bg-[#f0eee1] rounded border border-[#e2e0d2]">localhost:3000</span>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            {[
              { label: "Total Customers", val: "0", tag: "Workspace Clean", tagColor: "bg-[#f0eee1] text-[#5c5e54] border-[#e2e0d2]" },
              { label: "Active Pledges", val: "0", tag: "No active risk", tagColor: "bg-[#f0eee1] text-[#5c5e54] border-[#e2e0d2]" },
              { label: "Total Balance", val: "₹0", tag: "Synced Today", tagColor: "bg-[#737956]/10 text-[#5e6346] border-[#737956]/20" },
            ].map(({ label, val, tag, tagColor }) => (
              <div key={label} className="bg-[#f0eee1]/50 border border-[#e2e0d2] rounded-xl p-4 flex flex-col justify-between">
                <div>
                  <div className="text-xs text-[#5c5e54] font-semibold tracking-wide uppercase mb-1">{label}</div>
                  <div className="text-2xl md:text-3xl font-bold tracking-tight text-[#24251f]">{val}</div>
                </div>
                <div className={`text-xs px-2.5 py-1 rounded-md border font-medium mt-3 inline-block self-start ${tagColor}`}>{tag}</div>
              </div>
            ))}
          </div>

          <div className="bg-[#f0eee1]/30 border border-[#e2e0d2] rounded-xl p-6 text-center text-[#5c5e54] text-sm">
            No active pledge or workspace metrics registered yet.
          </div>
        </div>
      </section>

      {/* ── Pricing ────────────────────────────────────────── */}
      <section id="pricing" className="px-6 md:px-12 py-20 bg-[#f0eee1]/60 border-t border-[#e2e0d2]">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-xs font-bold text-[#737956] uppercase tracking-widest mb-2">
              Subscription Plans
            </p>
            <h2 className="text-3xl font-bold text-[#24251f] tracking-tight mb-3">
              Simple, transparent pricing
            </h2>
            <p className="text-sm text-[#5c5e54]">
              Start with a 15-day free trial. Unlock full metrics immediately.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto items-stretch">
            {/* Half yearly */}
            <div className="bg-[#faf9f5] border border-[#e2e0d2] rounded-2xl p-6 md:p-8 flex flex-col justify-between relative">
              <div>
                <div className="text-sm font-bold uppercase tracking-wider text-[#5c5e54] mb-1">Half Yearly</div>
                <div className="text-4xl font-extrabold text-[#24251f] tracking-tight mb-2">
                  ₹999 <span className="text-sm font-normal text-[#5c5e54]">/ 6 months</span>
                </div>
                <p className="text-xs text-[#5c5e54] mb-6 font-medium">Perfect for new expanding workspaces</p>
                <div className="h-px bg-[#e2e0d2] w-full mb-6" />
                <ul className="space-y-3.5 mb-8">
                  {["Unlimited customer folders", "Unlimited active pledges", "PDF receipts & reports", "Live currency & metal feeds"].map((f) => (
                    <li key={f} className="flex items-start gap-2.5 text-xs md:text-sm text-[#4a4c42]">
                      <Check size={16} className="text-[#737956] flex-shrink-0 mt-0.5" /> <span>{f}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <Link
                href="/sign-up"
                className="block text-center w-full py-3 border border-[#d6d4c5] hover:border-[#b8b6a5] rounded-xl text-sm font-medium text-[#4a4c42] bg-[#faf9f5] hover:bg-[#f0eee1] transition-all"
              >
                Get started
              </Link>
            </div>

            {/* Yearly */}
            <div className="bg-[#faf9f5] border-2 border-[#737956] rounded-2xl p-6 md:p-8 flex flex-col justify-between relative shadow-sm">
              <div className="absolute -top-3 right-6 bg-[#737956] text-[#faf9f5] text-xs px-3 py-1 rounded-full font-bold tracking-wide uppercase">
                Best Value
              </div>
              <div>
                <div className="text-sm font-bold uppercase tracking-wider text-[#737956] mb-1">Yearly Plan</div>
                <div className="text-4xl font-extrabold text-[#24251f] tracking-tight mb-2">
                  ₹1,699 <span className="text-sm font-normal text-[#5c5e54]">/ year</span>
                </div>
                <p className="text-xs text-[#5e6346] mb-6 font-semibold">Save ₹299 vs regular adjustments</p>
                <div className="h-px bg-[#e2e0d2] w-full mb-6" />
                <ul className="space-y-3.5 mb-8">
                  {["Everything in half yearly access", "Priority engineering workspace help", "Custom structural receipt parameters", "Hindi & English smart printouts"].map((f) => (
                    <li key={f} className="flex items-start gap-2.5 text-xs md:text-sm text-[#4a4c42]">
                      <Check size={16} className="text-[#737956] flex-shrink-0 mt-0.5" /> <span>{f}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <Link
                href="/sign-up"
                className="block text-center w-full py-3 bg-[#737956] hover:bg-[#5e6346] text-[#faf9f5] rounded-xl text-sm font-semibold transition-all shadow-sm"
              >
                Get started now →
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA ────────────────────────────────────────────── */}
      <section className="px-6 md:px-12 py-20 text-center relative overflow-hidden border-t border-[#e2e0d2]">
        <div className="relative max-w-2xl mx-auto">
          <h2 className="text-3xl font-bold text-[#24251f] tracking-tight mb-3">
            Start managing your shop today
          </h2>
          <p className="text-sm text-[#5c5e54] mb-8 max-w-md mx-auto">
            Experience complete control over loan accounts, customer analytics, and receipts.
          </p>
          <Link
            href="/sign-up"
            className="inline-flex items-center gap-2 px-8 py-3.5 bg-[#737956] hover:bg-[#5e6346] text-[#faf9f5] rounded-xl font-semibold shadow-md shadow-[#737956]/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            Start 15-day free trial <ArrowRight size={16} />
          </Link>
          <p className="text-xs text-[#8a8c80] mt-4 font-medium">
            No upfront credit card verification · Cancel options available instantly
          </p>
        </div>
      </section>

      {/* ── Footer ─────────────────────────────────────────── */}
      <footer className="px-6 md:px-12 py-6 border-t border-[#e2e0d2] bg-[#f0eee1] flex flex-col sm:flex-row items-center justify-between gap-4">
        <p className="text-xs text-[#8a8c80]">
          © 2026 Lekha-Jokha. All financial workspace rights reserved.
        </p>
        <div className="flex gap-6">
          {["Privacy Policy", "Terms of Use", "Workspace Support"].map((l) => (
            <a key={l} href="#" className="text-xs text-[#8a8c80] hover:text-[#24251f] font-medium transition-colors">
              {l}
            </a>
          ))}
        </div>
      </footer>
    </div>
  );
}