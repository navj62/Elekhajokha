"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  BarChart, Bar,
} from "recharts";
import {
  ArrowLeft, Send, Download, AlertTriangle, AlertCircle, RefreshCw, Loader2, Info
} from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Types — mirrors what the API returns                               */
/* ------------------------------------------------------------------ */
type RiskTier = "SAFE" | "WATCH" | "AT RISK" | "UNDERWATER";

interface ProcessedPledge {
  id:               string;
  name:             string;
  pledgeDate:       string;
  loanAmount:       number;
  amountOwed:       number;
  marketValue:      number | null;
  ltv:              number | null;
  risk:             RiskTier;
  daysToUnderwater: number | null;
  status:           "ACTIVE" | "RELEASED" | "OVERDUE";
  metalType:        "GOLD" | "SILVER";
  weight:           number;
}

interface Alert {
  pledgeId:         string;
  pledgeName:       string;
  risk:             RiskTier;
  ltv:              number | null;
  daysToUnderwater: number | null;
  message:          string;
}

interface SummaryData {
  customer: {
    id:                 string;
    name:               string;
    region:             string | null;
    riskScore:          number;
    totalActivePledges: number;
    lastPledgeDate:     string | null;
  };
  metrics: {
    totalLoanAmount:   number;
    totalAmountOwed:   number;
    totalGoldWeight:   number;
    totalSilverWeight: number;
    activePledges:     number;
    releasedPledges:   number;
    underwaterPledges: number;
    overallLTV:        number | null;
    totalMarketValue:  number;
    estimatedCoverage: number | null;
  };
  prices: {
    goldPerGram:   number | null;
    silverPerGram: number | null;
    updatedAt:     string | null;
  };
  pledges:         ProcessedPledge[];
  riskDistribution: { name: string; value: number; color: string }[];
  exposureData:    { name: string; gold: number; silver: number }[];
  ltvTrend:        { month: string; ltv: number; marketValue: number; amountOwed: number }[];
  alerts:          Alert[];
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                             */
/* ------------------------------------------------------------------ */
const inr = (n: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);

const inrCompact = (n: number) => {
  if (n >= 100000) return `₹${(n / 100000).toFixed(2)}L`;
  if (n >= 1000) return `₹${(n / 1000).toFixed(1)}k`;
  return `₹${n}`;
};

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

const getInitials = (name: string) =>
  name.split(" ").map(n => n[0]).join("").substring(0, 2).toUpperCase();

const RISK_CONFIG: Record<RiskTier, { label: string; bg: string; text: string; border: string }> = {
  SAFE:       { label: "Safe",       bg: "bg-[#E8EBD8]", text: "text-[#555B3F]", border: "border-[#D3D9BB]" },
  WATCH:      { label: "Watch",      bg: "bg-[#FDF4DC]", text: "text-[#8B6914]", border: "border-[#FDE6A8]" },
  "AT RISK":  { label: "At Risk",    bg: "bg-[#FFF4E5]", text: "text-[#B25E09]", border: "border-[#FFDAB3]" },
  UNDERWATER: { label: "Underwater", bg: "bg-[#FEE2E2]", text: "text-[#991B1B]", border: "border-[#FECACA]" },
};

function overallRiskTier(score: number): RiskTier {
  if (score < 60) return "SAFE";
  if (score < 75) return "WATCH";
  if (score < 90) return "AT RISK";
  return "UNDERWATER";
}

/* ------------------------------------------------------------------ */
/*  Components                                                          */
/* ------------------------------------------------------------------ */
function LTVArc({ pct }: { pct: number }) {
  const r = 60, cx = 90, cy = 90;
  const start = -210, end = start + Math.min(pct / 100, 1) * 240;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const arc   = (angle: number) => `${cx + r * Math.cos(toRad(angle))},${cy + r * Math.sin(toRad(angle))}`;
  const large = end - start > 180 ? 1 : 0;
  return (
    <div className="relative w-[180px] h-[110px] mx-auto">
      <svg width={180} height={110} viewBox="0 0 180 110">
        <path d={`M ${arc(start)} A ${r} ${r} 0 1 1 ${arc(start + 240)}`} fill="none" stroke="#ECEAE4" strokeWidth={12} strokeLinecap="round" />
        <path d={`M ${arc(start)} A ${r} ${r} 0 ${large} 1 ${arc(end)}`}  fill="none" stroke="#6B7150" strokeWidth={12} strokeLinecap="round" />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-end pb-3">
        <div className="text-[36px] font-semibold text-[#2C2C2C] leading-none tracking-tight">
          {pct.toFixed(1)}<span className="text-[20px] font-medium text-[#6F6F6F] ml-0.5">%</span>
        </div>
      </div>
    </div>
  );
}

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-[#ECEAE4] shadow-md rounded-[10px] p-3 text-[12px]">
      <p className="font-semibold mb-1.5 text-[#2C2C2C]">{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} style={{ color: p.color }} className="my-0.5 font-medium">
          {p.name}: {typeof p.value === "number" && p.value > 1000 ? inr(p.value) : `${p.value}%`}
        </p>
      ))}
    </div>
  );
}

/* ================================================================== */
/*  Page                                                                */
/* ================================================================== */
export default function FinancialSummaryPage() {
  const params     = useParams<{ customerId: string }>();
  const router     = useRouter();
  const customerId = params?.customerId;

  const [data,    setData]    = useState<SummaryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/customers/${customerId}/financial-summary`);
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || `Failed to load (${res.status})`);
      }
      setData(await res.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load summary");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { if (customerId) load(); }, [customerId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="animate-spin text-[#6B7150]" size={28} />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <p className="text-[13px] text-red-600 bg-red-50 px-4 py-2 rounded-lg">{error ?? "Something went wrong"}</p>
        <button
          onClick={load}
          className="flex items-center gap-2 text-[13px] border border-[#ECEAE4] rounded-[10px] px-4 py-2 hover:bg-[#F9F8F3]"
        >
          <RefreshCw size={14} /> Retry
        </button>
      </div>
    );
  }

  const { customer, metrics, prices, pledges, exposureData, ltvTrend, alerts } = data;
  
  // Refine risk distribution colors for the chart
  const riskColorMap: Record<string, string> = {
    "SAFE": "#6B7150",       // Olive
    "WATCH": "#C5A86D",      // Gold
    "AT RISK": "#DD8444",    // Orange
    "UNDERWATER": "#C45151", // Red
  };

  const refinedRiskDistribution = data.riskDistribution.map(r => ({
    ...r, color: riskColorMap[r.name] || "#ECEAE4"
  }));

  const atRiskCount = refinedRiskDistribution.find(r => r.name === "AT RISK")?.value || 0;

  return (
    <div className="max-w-[1200px] mx-auto pb-16 mt-4 font-sans text-[#2C2C2C]">

      {/* ── PAGE HEADER ── */}
      <div className="flex items-start justify-between mb-8">
        <div className="flex gap-4 items-start">
          <button
            onClick={() => router.back()}
            className="flex items-center justify-center w-10 h-10 shrink-0 bg-[#E8EBD8] rounded-full text-[#555B3F] hover:bg-[#D3D9BB] transition-colors mt-0.5"
          >
            <ArrowLeft size={18} strokeWidth={2.5} />
          </button>
          <div>
            <h1 className="text-[32px] font-semibold tracking-tight text-[#2C2C2C] leading-none mb-2">
              Financial Summary
            </h1>
            <p className="text-[14px] text-[#6F6F6F]">
              Risk & exposure overview
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 text-[13px] font-semibold text-[#2C2C2C] bg-white border border-[#ECEAE4] hover:bg-[#F9F8F3] px-4 py-2 rounded-[10px] shadow-sm transition-colors">
            <Download size={14} /> Export
          </button>
          <button className="flex items-center gap-2 text-[13px] font-semibold text-white bg-[#6B7150] hover:bg-[#585E42] px-4 py-2 rounded-[10px] shadow-sm transition-colors">
            <Send size={14} /> Send Summary
          </button>
        </div>
      </div>

      {/* ── HERO SECTION (3 Columns) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        
        {/* Left: Customer Profile Card */}
        <div className="bg-[#6B7150] rounded-[20px] p-6 text-white shadow-sm flex flex-col justify-between relative overflow-hidden">
          {/* Subtle bg pattern or shine can go here */}
          <div className="absolute top-0 right-0 p-5">
            <span className="bg-[#B9A364]/30 text-[#FDF4DC] border border-[#C5A86D]/40 text-[10px] font-bold tracking-widest uppercase px-3 py-1.5 rounded-full backdrop-blur-sm">
              {overallRiskTier(customer.riskScore)}
            </span>
          </div>

          <div>
            <div className="w-14 h-14 rounded-full bg-[#E8EBD8] flex items-center justify-center text-[18px] font-bold text-[#555B3F] mb-4 shadow-sm">
              {getInitials(customer.name)}
            </div>
            <h2 className="text-[24px] font-semibold tracking-tight mb-1">{customer.name}</h2>
            <div className="flex items-center gap-1.5 text-[13px] text-white/70">
              <span className="w-3.5 h-3.5 rounded-full border border-white/30 flex items-center justify-center text-[8px]">📍</span>
              {customer.region || "Location unknown"}
            </div>
          </div>

          <div className="mt-8 flex items-end justify-between border-t border-white/10 pt-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-[16px] font-bold text-[#6B7150]">
                {customer.riskScore}
              </div>
              <div>
                <p className="text-[10px] font-bold tracking-widest text-white/60 uppercase">Risk Score</p>
                <p className="text-[12px] font-medium text-white/90">Moderate monitoring</p>
              </div>
            </div>
          </div>

          <div className="mt-6 flex gap-6 text-[11px] font-medium text-white/60 uppercase tracking-wide">
            <div>
              <p className="mb-1 text-white/40">Customer Since</p>
              <p className="text-white">{fmtDate(data.pledges[data.pledges.length - 1]?.pledgeDate || new Date().toISOString())}</p>
            </div>
            <div>
              <p className="mb-1 text-white/40">Last Pledge</p>
              <p className="text-white">{customer.lastPledgeDate ? fmtDate(customer.lastPledgeDate) : "—"}</p>
            </div>
          </div>
        </div>

        {/* Center: LTV Gauge */}
        <div className="bg-white border border-[#ECEAE4] rounded-[20px] p-6 shadow-sm flex flex-col items-center justify-center text-center">
          <p className="text-[12px] font-bold tracking-widest text-[#8C8F7A] uppercase mb-6">Overall Portfolio LTV</p>
          <LTVArc pct={metrics.overallLTV ?? 0} />
          <p className="text-[13px] text-[#6F6F6F] mt-6 max-w-[200px] leading-relaxed">
            Current Loan-to-Value ratio sits slightly above target threshold.
          </p>
          <div className="mt-4 bg-[#F9F8F3] px-3 py-1.5 rounded-[8px] text-[11px] font-semibold text-[#8C8F7A]">
            SAFE THRESHOLD 70%
          </div>
        </div>

        {/* Right: Exposure Snapshot Card */}
        <div className="bg-white border border-[#ECEAE4] rounded-[20px] p-6 shadow-sm flex flex-col justify-between">
          <div className="grid grid-cols-2 gap-x-6 gap-y-8 flex-1">
            <div>
              <p className="text-[10px] font-bold tracking-widest text-[#8C8F7A] uppercase mb-1">Total Owed</p>
              <p className="text-[22px] font-semibold text-[#2C2C2C] tabular-nums leading-tight">{inr(metrics.totalAmountOwed)}</p>
              <p className="text-[11px] text-[#6F6F6F] mt-1">incl. accrued interest</p>
            </div>
            <div>
              <p className="text-[10px] font-bold tracking-widest text-[#8C8F7A] uppercase mb-1">Market Value</p>
              <p className="text-[22px] font-semibold text-[#2C2C2C] tabular-nums leading-tight">{inr(metrics.totalMarketValue)}</p>
              <p className="text-[11px] text-[#6F6F6F] mt-1">at current gold price</p>
            </div>
            <div>
              <p className="text-[10px] font-bold tracking-widest text-[#8C8F7A] uppercase mb-1">Coverage</p>
              <p className="text-[22px] font-semibold text-[#2C2C2C] tabular-nums leading-tight">
                {metrics.totalAmountOwed > 0 ? ((metrics.totalMarketValue / metrics.totalAmountOwed) * 100).toFixed(1) : 0}%
              </p>
              <p className="text-[11px] text-[#6F6F6F] mt-1">of owed amount</p>
            </div>
            <div>
              <p className="text-[10px] font-bold tracking-widest text-[#8C8F7A] uppercase mb-1">Total Loan Amount</p>
              <p className="text-[22px] font-semibold text-[#2C2C2C] tabular-nums leading-tight">{inr(metrics.totalLoanAmount)}</p>
              <p className="text-[11px] text-[#6F6F6F] mt-1">principal disbursed</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── PORTFOLIO METRICS STRIP ── */}
      <div className="bg-white border border-[#ECEAE4] rounded-[16px] shadow-sm mb-6 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 divide-y lg:divide-y-0 lg:divide-x divide-[#ECEAE4] overflow-hidden">
        {[
          { label: "Loan Amount",       value: inrCompact(metrics.totalLoanAmount) },
          { label: "Total Amount Owed", value: inrCompact(metrics.totalAmountOwed) },
          { label: "Active Pledges",    value: metrics.activePledges },
          { label: "Gold Weight",       value: `${metrics.totalGoldWeight.toFixed(0)}g` },
          { label: "Silver Weight",     value: `${metrics.totalSilverWeight.toFixed(0)}g` },
          { label: "At Risk",           value: atRiskCount, warn: true },
          { label: "Underwater",        value: metrics.underwaterPledges, err: true },
        ].map((m, i) => (
          <div key={i} className={`p-4 flex flex-col justify-center items-center text-center ${
            m.warn ? 'bg-[#FFF9F2] text-[#B25E09]' : 
            m.err ? 'bg-[#FEF2F2] text-[#991B1B]' : 
            'text-[#2C2C2C]'
          }`}>
            <span className={`text-[10px] font-bold tracking-widest uppercase mb-1 ${
              m.warn ? 'text-[#B25E09]/70' : 
              m.err ? 'text-[#991B1B]/70' : 
              'text-[#8C8F7A]'
            }`}>
              {m.label}
            </span>
            <span className="text-[18px] font-semibold tabular-nums">{m.value}</span>
          </div>
        ))}
      </div>

      {/* ── ANALYTICS SECTION ── */}
      <div className="grid grid-cols-1 lg:grid-cols-[70fr_30fr] gap-6 mb-6">
        
        {/* Left: LTV Trend Over Time */}
        <div className="bg-white border border-[#ECEAE4] rounded-[20px] p-6 shadow-sm">
          <div className="flex justify-between items-start mb-8">
            <div>
              <p className="text-[12px] font-bold tracking-widest text-[#8C8F7A] uppercase mb-1">LTV Trend Over Time</p>
              <p className="text-[13px] text-[#6F6F6F]">6-month exposure history</p>
            </div>
            <div className="flex gap-5">
              {[{ color: "#6B7150", label: "LTV %" }, { color: "#C5A86D", label: "Market Value" }, { color: "#94A3B8", label: "Amount Owed" }].map(l => (
                <span key={l.label} className="flex items-center gap-2 text-[12px] font-medium text-[#2C2C2C]">
                  <span className="w-3 h-1 rounded-full" style={{ backgroundColor: l.color }} />{l.label}
                </span>
              ))}
            </div>
          </div>
          <div className="h-72 w-full min-w-0">
            {ltvTrend.length > 0 ? (
              <ResponsiveContainer width="99%" height="100%">
                <AreaChart data={ltvTrend} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F4F3EE" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#8C8F7A" }} axisLine={false} tickLine={false} dy={10} />
                  <YAxis yAxisId="pct" orientation="right" tick={{ fontSize: 11, fill: "#8C8F7A" }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}%`} dx={10} />
                  <YAxis yAxisId="val" tick={{ fontSize: 11, fill: "#8C8F7A" }} axisLine={false} tickLine={false} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                  <Tooltip content={<ChartTooltip />} />
                  <Area yAxisId="pct" type="monotone" dataKey="ltv" name="LTV %" stroke="#6B7150" fill="none" strokeWidth={3} dot={{ r: 4, fill: "#white", strokeWidth: 2, stroke: "#6B7150" }} />
                  <Area yAxisId="val" type="monotone" dataKey="marketValue" name="Market value" stroke="#C5A86D" fill="none" strokeWidth={3} strokeDasharray="6 6" dot={false} />
                  <Area yAxisId="val" type="monotone" dataKey="amountOwed" name="Amount owed" stroke="#94A3B8" fill="none" strokeWidth={3} strokeDasharray="2 4" dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-[13px] text-[#8C8F7A]">Not enough history</div>
            )}
          </div>
        </div>

        {/* Right: Stacked Cards */}
        <div className="space-y-6">
          {/* Risk Distribution */}
          <div className="bg-white border border-[#ECEAE4] rounded-[20px] p-6 shadow-sm">
            <p className="text-[12px] font-bold tracking-widest text-[#8C8F7A] uppercase mb-4">Risk Distribution</p>
            <div className="h-32 w-full min-w-0 relative">
              <ResponsiveContainer width="99%" height="100%">
                <PieChart>
                  <Pie data={refinedRiskDistribution} cx="50%" cy="50%" innerRadius={40} outerRadius={60} paddingAngle={2} dataKey="value" stroke="none">
                    {refinedRiskDistribution.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Pie>
                  <Tooltip formatter={(v: any) => [`${v} pledge(s)`, ""]} content={<ChartTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-[20px] font-semibold text-[#2C2C2C] leading-none">{metrics.activePledges}</span>
                <span className="text-[9px] font-bold tracking-widest text-[#8C8F7A] uppercase mt-0.5">Total</span>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-y-2 gap-x-2">
              {refinedRiskDistribution.map(r => (
                <div key={r.name} className="flex items-center gap-1.5 text-[11px] font-medium text-[#6F6F6F]">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: r.color }} />
                  {titleCase(r.name)} ({r.value})
                </div>
              ))}
            </div>
          </div>

          {/* Exposure Profile */}
          <div className="bg-white border border-[#ECEAE4] rounded-[20px] p-6 shadow-sm">
            <p className="text-[12px] font-bold tracking-widest text-[#8C8F7A] uppercase mb-1">Exposure Profile</p>
            <p className="text-[11px] text-[#6F6F6F] mb-4">Loan vs Owed vs Market Value</p>
            
            <div className="flex gap-3 mb-4">
              {[{ color: "#C5A86D", label: "Gold" }, { color: "#94A3B8", label: "Silver" }].map(l => (
                <span key={l.label} className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-[#6F6F6F]">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: l.color }} />{l.label}
                </span>
              ))}
            </div>
            <div className="h-28 w-full min-w-0">
              <ResponsiveContainer width="99%" height="100%">
                <BarChart data={exposureData} barSize={16}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F4F3EE" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#8C8F7A" }} axisLine={false} tickLine={false} dy={5} />
                  <YAxis tick={{ fontSize: 10, fill: "#8C8F7A" }} axisLine={false} tickLine={false} width={30} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                  <Tooltip content={<ChartTooltip />} />
                  <Bar dataKey="gold"   name="Gold"   fill="#C5A86D" radius={[2, 2, 0, 0]} />
                  <Bar dataKey="silver" name="Silver" fill="#94A3B8" radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      {/* ── ACTIVE PLEDGES TABLE ── */}
      <div className="bg-white border border-[#ECEAE4] rounded-[20px] overflow-hidden shadow-sm mb-6">
        <div className="px-6 py-5 border-b border-[#ECEAE4]">
          <p className="text-[14px] font-bold tracking-widest text-[#8C8F7A] uppercase">Active Pledges</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-[13px] text-left">
            <thead className="bg-[#F9F8F3] border-b border-[#ECEAE4] text-[#8C8F7A] text-[10px] font-bold tracking-widest uppercase">
              <tr>
                <th className="px-6 py-3">Asset</th>
                <th className="px-6 py-3 text-right">Principal</th>
                <th className="px-6 py-3 text-right">Owed</th>
                <th className="px-6 py-3 text-right">Market Val</th>
                <th className="px-6 py-3 text-right">LTV</th>
                <th className="px-6 py-3">Risk</th>
                <th className="px-6 py-3 text-center">Days Left</th>
                <th className="px-6 py-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F4F3EE]">
              {pledges.map(p => {
                const rConf = RISK_CONFIG[p.risk];
                return (
                  <tr key={p.id} className="hover:bg-[#FCFBF8] transition-colors">
                    <td className="px-6 py-4 font-semibold text-[#2C2C2C]">{p.name}</td>
                    <td className="px-6 py-4 text-right tabular-nums text-[#6F6F6F]">{inr(p.loanAmount)}</td>
                    <td className="px-6 py-4 text-right font-medium tabular-nums text-[#2C2C2C]">{inr(p.amountOwed)}</td>
                    <td className="px-6 py-4 text-right tabular-nums text-[#C5A86D]">{p.marketValue ? inr(p.marketValue) : "—"}</td>
                    <td className="px-6 py-4 text-right font-semibold tabular-nums text-[#6B7150]">{p.ltv ? `${p.ltv.toFixed(0)}%` : "—"}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-2 py-0.5 rounded-[6px] text-[10px] font-bold uppercase tracking-wider ${rConf.bg} ${rConf.text} ${rConf.border}`}>
                        {rConf.label}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center tabular-nums text-[#6F6F6F]">
                      {p.daysToUnderwater !== null ? (p.daysToUnderwater > 0 ? `${p.daysToUnderwater}d` : "Overdue") : "—"}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="bg-[#E8EBD8] text-[#555B3F] text-[10px] font-bold tracking-widest uppercase px-2 py-0.5 rounded-[6px]">
                        {p.status}
                      </span>
                    </td>
                  </tr>
                );
              })}
              {pledges.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-6 py-8 text-center text-[#8C8F7A]">No active pledges</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── BOTTOM INSIGHTS SECTION ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Risk Alerts */}
        <div className="bg-white border border-[#ECEAE4] rounded-[20px] p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-6">
              <AlertCircle size={18} className="text-[#8C8F7A]" />
              <p className="text-[14px] font-bold tracking-widest text-[#2C2C2C] uppercase">Risk Alerts</p>
            </div>
            <div className="space-y-4 mb-6">
              {alerts.length > 0 ? alerts.map((a, i) => (
                <div key={i} className="bg-[#F9F8F3] border border-[#ECEAE4] p-4 rounded-[12px] flex gap-3">
                  {a.risk === "UNDERWATER" ? <AlertTriangle size={16} className="text-[#991B1B] mt-0.5 shrink-0" /> :
                   a.risk === "AT RISK"    ? <AlertTriangle size={16} className="text-[#B25E09] mt-0.5 shrink-0" /> :
                   <Info size={16} className="text-[#8B6914] mt-0.5 shrink-0" />}
                  <div>
                    <p className={`text-[12px] font-semibold mb-0.5 ${
                      a.risk === "UNDERWATER" ? "text-[#991B1B]" : 
                      a.risk === "AT RISK" ? "text-[#B25E09]" : "text-[#8B6914]"
                    }`}>
                      {a.pledgeName} {a.risk === "UNDERWATER" ? "liquidation risk" : "watchlist horizon"}
                    </p>
                    <p className="text-[12px] text-[#6F6F6F] leading-relaxed">{a.message}</p>
                  </div>
                </div>
              )) : (
                <div className="bg-[#F9F8F3] border border-[#ECEAE4] p-4 rounded-[12px] text-[13px] text-[#6F6F6F] text-center">
                  No critical alerts at this time.
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center justify-between border-t border-[#ECEAE4] pt-5 mt-auto">
            <p className="text-[11px] text-[#8C8F7A]">Last notification sent 2 days ago</p>
            <button className="bg-[#4D5335] hover:bg-[#3D4230] text-white text-[13px] font-semibold px-5 py-2.5 rounded-[12px] shadow-sm flex items-center gap-2 transition-colors">
              <Send size={14} /> Send Risk Summary
            </button>
          </div>
        </div>

        {/* Market Parameters */}
        <div className="bg-white border border-[#ECEAE4] rounded-[20px] p-6 shadow-sm">
          <p className="text-[14px] font-bold tracking-widest text-[#8C8F7A] uppercase mb-6">Market Parameters</p>
          <div className="bg-[#F9F8F3] border border-[#ECEAE4] rounded-[16px] overflow-hidden">
            <div className="divide-y divide-[#ECEAE4]">
              <div className="flex justify-between p-4 text-[13px]">
                <span className="text-[#6F6F6F] font-medium">Gold Rate (24k/10g)</span>
                <span className="font-semibold text-[#2C2C2C]">{prices.goldPerGram ? inr(prices.goldPerGram * 10) : "—"}</span>
              </div>
              <div className="flex justify-between p-4 text-[13px]">
                <span className="text-[#6F6F6F] font-medium">Silver Rate (kg)</span>
                <span className="font-semibold text-[#2C2C2C]">{prices.silverPerGram ? inr(prices.silverPerGram * 1000) : "—"}</span>
              </div>
              <div className="flex justify-between p-4 text-[13px]">
                <span className="text-[#6F6F6F] font-medium">Est. Liquidation Value</span>
                <span className="font-semibold text-[#2C2C2C]">{inr(metrics.totalMarketValue)}</span>
              </div>
              <div className="flex justify-between p-4 text-[13px]">
                <span className="text-[#6F6F6F] font-medium">Assumed Recovery Ratio</span>
                <span className="font-semibold text-[#2C2C2C]">1.2x</span>
              </div>
            </div>
            <div className="bg-[#F4F3EE] p-4 flex justify-between text-[14px]">
              <span className="text-[#8C8F7A] font-bold tracking-widest uppercase">Net Exposure Base</span>
              <span className="font-bold text-[#2C2C2C]">{inr(Math.max(0, metrics.totalAmountOwed - metrics.totalMarketValue))}</span>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}

function titleCase(str: string) {
  return str.toLowerCase().split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
}