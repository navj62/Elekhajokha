"use client";

import { useEffect, useState } from "react";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  BarChart,
  Bar,
} from "recharts";
import {
  ArrowLeft,
  Send,
  Download,
  IndianRupee,
  TrendingUp,
  Hexagon,
  Circle,
  FileText,
  AlertTriangle,
  Bell,
  BarChart3,
  XCircle,
  Clock
} from "lucide-react";

type RiskTier = "SAFE" | "WATCH" | "AT RISK" | "UNDERWATER";

interface ProcessedPledge {
  id: string;
  name: string;
  pledgeDate: string;
  loanAmount: number;
  amountOwed: number;
  marketValue: number;
  ltv: number;
  risk: RiskTier;
  daysToUnderwater: number | null;
  status: "ACTIVE" | "RELEASED" | "OVERDUE";
  metalType: "GOLD" | "SILVER";
  weight: number;
}

const CUSTOMER = {
  name: "Navya Jain",
  region: "Madhya Pradesh",
  riskScore: 62,
  totalActivePledges: 5,
  lastPledgeDate: "17 May 2026",
};

const METRICS = {
  totalLoanAmount: 485000,
  totalAmountOwed: 541200,
  totalGoldWeight: 142.5,
  totalSilverWeight: 0,
  activePledges: 5,
  underwaterPledges: 1,
  overallLTV: 78.4,
  totalMarketValue: 690000,
  estimatedCoverage: 91.2,
};

const PLEDGES: ProcessedPledge[] = [
  { id: "1", name: "Gold Necklace", pledgeDate: "Jan 2026", loanAmount: 120000, amountOwed: 138500, marketValue: 210000, ltv: 66, risk: "SAFE", daysToUnderwater: null, status: "ACTIVE", metalType: "GOLD", weight: 42 },
  { id: "2", name: "Gold Bangle Set", pledgeDate: "Mar 2026", loanAmount: 95000, amountOwed: 107200, marketValue: 130000, ltv: 82, risk: "WATCH", daysToUnderwater: 68, status: "ACTIVE", metalType: "GOLD", weight: 31 },
  { id: "3", name: "Gold Chain", pledgeDate: "Jun 2026", loanAmount: 80000, amountOwed: 94100, marketValue: 98000, ltv: 96, risk: "AT RISK", daysToUnderwater: 18, status: "ACTIVE", metalType: "GOLD", weight: 28 },
  { id: "4", name: "Gold Ring", pledgeDate: "Aug 2026", loanAmount: 45000, amountOwed: 52400, marketValue: 48000, ltv: 109, risk: "UNDERWATER", daysToUnderwater: 0, status: "OVERDUE", metalType: "GOLD", weight: 14 },
  { id: "5", name: "Gold Earrings", pledgeDate: "Nov 2026", loanAmount: 145000, amountOwed: 149000, marketValue: 204000, ltv: 73, risk: "WATCH", daysToUnderwater: 90, status: "ACTIVE", metalType: "GOLD", weight: 27.5 },
];

const RISK_DISTRIBUTION = [
  { name: "Safe", value: 1, color: "#22c55e" },
  { name: "Watch", value: 2, color: "#eab308" },
  { name: "At Risk", value: 1, color: "#f97316" },
  { name: "Underwater", value: 1, color: "#ef4444" },
];

const LTV_TREND = [
  { month: "Nov", ltv: 58, marketValue: 710000, amountOwed: 415000 },
  { month: "Dec", ltv: 62, marketValue: 695000, amountOwed: 432000 },
  { month: "Jan", ltv: 67, marketValue: 720000, amountOwed: 481000 },
  { month: "Feb", ltv: 71, marketValue: 705000, amountOwed: 498000 },
  { month: "Mar", ltv: 75, marketValue: 698000, amountOwed: 521000 },
  { month: "Apr", ltv: 78, marketValue: 690000, amountOwed: 541200 },
];

const EXPOSURE_DATA = [
  { name: "Loan", gold: 485000, silver: 0 },
  { name: "Owed", gold: 541200, silver: 0 },
  { name: "Market", gold: 690000, silver: 0 },
];

const inr = (n: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);

const RISK_CONFIG: Record<RiskTier, { label: string; bg: string; text: string; border: string }> = {
  SAFE:       { label: "Safe",       bg: "bg-green-50", text: "text-green-700", border: "border-green-200" },
  WATCH:      { label: "Watch",      bg: "bg-yellow-50", text: "text-yellow-700", border: "border-yellow-200" },
  "AT RISK":  { label: "At Risk",    bg: "bg-orange-50", text: "text-orange-700", border: "border-orange-200" },
  UNDERWATER: { label: "Underwater", bg: "bg-red-50", text: "text-red-700", border: "border-red-200" },
};

function overallRiskTier(score: number): RiskTier {
  if (score < 60) return "SAFE";
  if (score < 75) return "WATCH";
  if (score < 90) return "AT RISK";
  return "UNDERWATER";
}

function RiskArc({ score }: { score: number }) {
  const tier = overallRiskTier(score);
  const color = tier === "SAFE" ? "#22c55e" : tier === "WATCH" ? "#eab308" : tier === "AT RISK" ? "#f97316" : "#ef4444";
  const r = 52, cx = 70, cy = 70;
  const start = -210, end = start + (score / 100) * 240;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const arc = (angle: number) => `${cx + r * Math.cos(toRad(angle))},${cy + r * Math.sin(toRad(angle))}`;
  const large = end - start > 180 ? 1 : 0;
  const bgEnd = start + 240;
  const bgLarge = 1;

  return (
    <svg width={140} height={110} viewBox="0 0 140 110">
      <path d={`M ${arc(start)} A ${r} ${r} 0 ${bgLarge} 1 ${arc(bgEnd)}`} fill="none" stroke="#f3f4f6" strokeWidth={10} strokeLinecap="round" />
      <path d={`M ${arc(start)} A ${r} ${r} 0 ${large} 1 ${arc(end)}`} fill="none" stroke={color} strokeWidth={10} strokeLinecap="round" />
      <text x={cx} y={cy + 6} textAnchor="middle" fontSize={22} fontWeight={600} fill={color}>{score}</text>
      <text x={cx} y={cy + 22} textAnchor="middle" fontSize={11} fill="#6b7280">risk score</text>
    </svg>
  );
}

function MetricCard({ icon: Icon, label, value, sub, accent = false }: { icon: any; label: string; value: string; sub?: string; accent?: boolean }) {
  return (
    <div className={`p-5 rounded-xl border flex flex-col gap-1 ${accent ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200 shadow-sm'}`}>
      <div className="flex items-center gap-2 mb-1">
        <Icon className={`w-4 h-4 ${accent ? 'text-gray-400' : 'text-gray-500'}`} />
        <span className={`text-xs font-medium ${accent ? 'text-gray-400' : 'text-gray-500'}`}>{label}</span>
      </div>
      <span className={`text-2xl font-semibold leading-tight ${accent ? 'text-white' : 'text-gray-900'}`}>{value}</span>
      {sub && <span className={`text-[11px] mt-0.5 ${accent ? 'text-gray-500' : 'text-gray-400'}`}>{sub}</span>}
    </div>
  );
}

function RiskBadge({ tier }: { tier: RiskTier }) {
  const c = RISK_CONFIG[tier];
  return (
    <span className={`${c.bg} ${c.text} ${c.border} border rounded-md px-2.5 py-1 text-xs font-medium`}>
      {c.label}
    </span>
  );
}

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-200 shadow-lg rounded-lg p-3 text-xs">
      <p className="font-medium mb-1 text-gray-900">{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} style={{ color: p.color }} className="my-0.5">
          {p.name}: {typeof p.value === "number" && p.value > 1000 ? inr(p.value) : `${p.value}%`}
        </p>
      ))}
    </div>
  );
}

export default function FinancialSummaryPage() {
  const tier = overallRiskTier(CUSTOMER.riskScore);

  return (
    <div className="min-h-screen bg-slate-50 pb-16">
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 transition-colors">
              <ArrowLeft className="w-4 h-4" /> Back
            </button>
            <div className="w-px h-5 bg-gray-200" />
            <div>
              <p className="text-sm font-medium text-gray-900">Financial summary</p>
              <p className="text-[11px] text-gray-500">Risk & exposure overview</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button className="flex items-center gap-2 text-sm px-4 py-2 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-gray-900 font-medium transition-colors">
              <Send className="w-4 h-4" /> Send summary
            </button>
            <button className="flex items-center gap-2 text-sm px-4 py-2 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-gray-900 font-medium transition-colors">
              <Download className="w-4 h-4" /> Export
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-6">
        <div className="bg-white border border-gray-200 rounded-2xl p-8 mb-6 flex gap-8 flex-wrap items-center shadow-sm">
          <div className="flex-1 min-w-[280px]">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-sm font-semibold text-gray-600">
                {CUSTOMER.name.split(" ").map(n => n[0]).join("")}
              </div>
              <div>
                <p className="text-base font-semibold text-gray-900">{CUSTOMER.name}</p>
                <p className="text-xs text-gray-500">{CUSTOMER.region}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 mb-5">
              <RiskBadge tier={tier} />
              <span className="text-xs text-gray-500">overall risk</span>
            </div>
            <RiskArc score={CUSTOMER.riskScore} />
            <div className="flex gap-6 mt-3">
              <div>
                <p className="text-[11px] text-gray-500 mb-0.5">Active pledges</p>
                <p className="text-lg font-semibold text-gray-900">{CUSTOMER.totalActivePledges}</p>
              </div>
              <div>
                <p className="text-[11px] text-gray-500 mb-0.5">Last pledge</p>
                <p className="text-lg font-semibold text-gray-900">{CUSTOMER.lastPledgeDate}</p>
              </div>
            </div>
          </div>

          <div className="w-px h-40 bg-gray-200 shrink-0 hidden md:block" />

          <div className="flex-[2] min-w-[400px] grid grid-cols-2 gap-4">
            <div className="bg-gray-50 rounded-xl p-5 border border-gray-100">
              <p className="text-xs text-gray-500 mb-1">Overall LTV</p>
              <p className={`text-3xl font-semibold ${METRICS.overallLTV > 90 ? "text-red-500" : METRICS.overallLTV > 75 ? "text-orange-500" : "text-green-500"}`}>
                {METRICS.overallLTV}%
              </p>
              <p className="text-[11px] text-gray-500 mt-1">Safe threshold &lt; 70%</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-5 border border-gray-100">
              <p className="text-xs text-gray-500 mb-1">Total amount owed</p>
              <p className="text-2xl font-semibold text-gray-900">{inr(METRICS.totalAmountOwed)}</p>
              <p className="text-[11px] text-gray-500 mt-1">incl. accrued interest</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-5 border border-gray-100">
              <p className="text-xs text-gray-500 mb-1">Total market value</p>
              <p className="text-2xl font-semibold text-gray-900">{inr(METRICS.totalMarketValue)}</p>
              <p className="text-[11px] text-gray-500 mt-1">at current gold price</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-5 border border-gray-100">
              <p className="text-xs text-gray-500 mb-1">Liquidation coverage</p>
              <p className="text-3xl font-semibold text-green-500">{METRICS.estimatedCoverage}%</p>
              <p className="text-[11px] text-gray-500 mt-1">of owed amount</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
          <MetricCard icon={IndianRupee} label="Total loan amount" value={inr(METRICS.totalLoanAmount)} sub="principal disbursed" />
          <MetricCard icon={TrendingUp} label="Total amount owed" value={inr(METRICS.totalAmountOwed)} sub={`+${(((METRICS.totalAmountOwed - METRICS.totalLoanAmount) / METRICS.totalLoanAmount) * 100).toFixed(1)}% from principal`} accent />
          <MetricCard icon={Hexagon} label="Gold weight" value={`${METRICS.totalGoldWeight}g`} sub="net across all pledges" />
          <MetricCard icon={Circle} label="Silver weight" value={`${METRICS.totalSilverWeight}g`} sub="net across all pledges" />
          <MetricCard icon={FileText} label="Active pledges" value={String(METRICS.activePledges)} sub="currently open" />
          <MetricCard icon={AlertTriangle} label="Underwater" value={String(METRICS.underwaterPledges)} sub="LTV > 100%" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
            <p className="text-sm font-semibold text-gray-900 mb-1">Pledge risk distribution</p>
            <p className="text-xs text-gray-500 mb-4">By risk tier across all pledges</p>
            <div className="flex gap-3 mb-4 flex-wrap">
              {RISK_DISTRIBUTION.map(r => (
                <span key={r.name} className="flex items-center gap-1.5 text-xs text-gray-600">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: r.color }} />
                  {r.name} ({r.value})
                </span>
              ))}
            </div>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={RISK_DISTRIBUTION} cx="50%" cy="50%" innerRadius={65} outerRadius={95} paddingAngle={4} dataKey="value">
                    {RISK_DISTRIBUTION.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Pie>
                  <Tooltip formatter={(v: any) => [`${v} pledge(s)`, ""]} contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb', fontSize: '12px' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
            <p className="text-sm font-semibold text-gray-900 mb-1">Exposure breakdown</p>
            <p className="text-xs text-gray-500 mb-4">Loan vs owed vs market value</p>
            <div className="flex gap-4 mb-4">
              {[{ color: "#d4a017", label: "Gold" }, { color: "#94a3b8", label: "Silver" }].map(l => (
                <span key={l.label} className="flex items-center gap-1.5 text-xs text-gray-600">
                  <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: l.color }} />{l.label}
                </span>
              ))}
            </div>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={EXPOSURE_DATA} barSize={48}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 12, fill: "#6b7280" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "#6b7280" }} axisLine={false} tickLine={false} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                  <Tooltip content={<ChartTooltip />} />
                  <Bar dataKey="gold" name="Gold" fill="#d4a017" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="silver" name="Silver" fill="#94a3b8" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-6 mb-6 shadow-sm">
          <div className="flex justify-between items-start mb-6">
            <div>
              <p className="text-sm font-semibold text-gray-900 mb-1">LTV trend over time</p>
              <p className="text-xs text-gray-500">6-month exposure history</p>
            </div>
            <div className="flex gap-4">
              {[{ color: "#ef4444", label: "LTV %" }, { color: "#d4a017", label: "Market value" }, { color: "#3b82f6", label: "Amount owed" }].map(l => (
                <span key={l.label} className="flex items-center gap-1.5 text-xs text-gray-600">
                  <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: l.color }} />{l.label}
                </span>
              ))}
            </div>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={LTV_TREND} margin={{ top: 5, right: 0, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="ltvGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 12, fill: "#6b7280" }} axisLine={false} tickLine={false} />
                <YAxis yAxisId="pct" orientation="right" domain={[50, 90]} tick={{ fontSize: 11, fill: "#6b7280" }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}%`} />
                <YAxis yAxisId="val" domain={[380000, 750000]} tick={{ fontSize: 11, fill: "#6b7280" }} axisLine={false} tickLine={false} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                <Tooltip content={<ChartTooltip />} />
                <Area yAxisId="pct" type="monotone" dataKey="ltv" name="LTV %" stroke="#ef4444" fill="url(#ltvGrad)" strokeWidth={2} dot={{ r: 4, fill: "#ef4444", strokeWidth: 0 }} />
                <Area yAxisId="val" type="monotone" dataKey="marketValue" name="Market value" stroke="#d4a017" fill="none" strokeWidth={2} strokeDasharray="4 4" dot={false} />
                <Area yAxisId="val" type="monotone" dataKey="amountOwed" name="Amount owed" stroke="#3b82f6" fill="none" strokeWidth={2} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl mb-6 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-gray-200 bg-white">
            <p className="text-sm font-semibold text-gray-900 mb-1">Active pledges</p>
            <p className="text-xs text-gray-500">Real-time financial position per pledge</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left border-collapse">
              <thead className="bg-[#D49A2A] text-white">
                <tr>
                  {["Pledge", "Loan amount", "Amount owed", "Market value", "LTV %", "Risk tier", "Days left", "Status"].map(h => (
                    <th key={h} className="px-5 py-3 font-medium text-xs tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {PLEDGES.map((p) => (
                  <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-4 font-medium text-gray-900">{p.name}</td>
                    <td className="px-5 py-4 text-gray-600">{inr(p.loanAmount)}</td>
                    <td className="px-5 py-4 font-semibold text-gray-900">{inr(p.amountOwed)}</td>
                    <td className="px-5 py-4 text-gray-600">{inr(p.marketValue)}</td>
                    <td className={`px-5 py-4 font-semibold ${p.ltv > 100 ? "text-red-500" : p.ltv > 80 ? "text-orange-500" : "text-green-500"}`}>{p.ltv}%</td>
                    <td className="px-5 py-4"><RiskBadge tier={p.risk} /></td>
                    <td className={`px-5 py-4 font-medium ${p.daysToUnderwater === null ? "text-green-500" : p.daysToUnderwater === 0 ? "text-red-500" : p.daysToUnderwater < 30 ? "text-orange-500" : "text-gray-600"}`}>
                      {p.daysToUnderwater === null ? "—" : p.daysToUnderwater === 0 ? "Underwater" : `${p.daysToUnderwater}d`}
                    </td>
                    <td className="px-5 py-4">
                      <span className={`text-[11px] px-2.5 py-1 rounded-md font-medium ${p.status === "ACTIVE" ? "bg-green-50 text-green-700" : p.status === "OVERDUE" ? "bg-red-50 text-red-700" : "bg-gray-100 text-gray-600"}`}>
                        {p.status.charAt(0) + p.status.slice(1).toLowerCase()}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm flex flex-col">
            <div className="flex items-center gap-2 mb-5">
              <Bell className="w-4 h-4 text-gray-500" />
              <p className="text-sm font-semibold text-gray-900">Risk alerts</p>
            </div>
            <div className="flex flex-col gap-3 flex-1">
              {[
                { Icon: AlertTriangle, color: "text-orange-600", bg: "bg-orange-50", border: "border-orange-200", text: "Gold Chain may go underwater in 18 days" },
                { Icon: XCircle, color: "text-red-600", bg: "bg-red-50", border: "border-red-200", text: "Gold Ring is currently underwater — action required" },
                { Icon: Clock, color: "text-yellow-600", bg: "bg-yellow-50", border: "border-yellow-200", text: "Gold Bangle Set approaching risk threshold" },
              ].map((a, i) => (
                <div key={i} className={`${a.bg} border ${a.border} rounded-lg p-3 flex gap-3 items-start`}>
                  <a.Icon className={`w-4 h-4 mt-0.5 shrink-0 ${a.color}`} />
                  <p className={`text-xs leading-relaxed font-medium ${a.color}`}>{a.text}</p>
                </div>
              ))}
            </div>
            <div className="mt-5 pt-5 border-t border-gray-100">
              <div className="flex justify-between text-xs text-gray-500 mb-3 font-medium">
                <span>Last notification sent</span><span>2 days ago</span>
              </div>
              <button className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg border border-gray-200 bg-gray-50 hover:bg-gray-100 text-sm font-medium text-gray-900 transition-colors">
                <Send className="w-4 h-4" /> Send risk summary now
              </button>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-5">
              <BarChart3 className="w-4 h-4 text-gray-500" />
              <p className="text-sm font-semibold text-gray-900">Market parameters</p>
            </div>
            <div className="flex flex-col gap-1">
              {[
                { label: "Gold price", value: "₹7,320/g", trend: "+1.2%", up: true },
                { label: "Silver price", value: "₹91/g", trend: "-0.3%", up: false },
                { label: "Liquidation value", value: inr(METRICS.totalMarketValue * 0.85), trend: "at 85% recovery" },
                { label: "Recovery ratio", value: `${METRICS.estimatedCoverage}%`, trend: "of total owed" },
                { label: "Net exposure", value: inr(METRICS.totalAmountOwed - METRICS.totalMarketValue * 0.85), trend: "risk capital at stake" },
              ].map((row, i) => (
                <div key={i} className={`flex justify-between items-center py-3 ${i < 4 ? "border-b border-gray-100" : ""}`}>
                  <span className="text-sm text-gray-500">{row.label}</span>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-gray-900">{row.value}</p>
                    <p className={`text-[10px] font-medium mt-0.5 ${row.trend?.includes("+") ? "text-green-500" : row.trend?.includes("-") ? "text-red-500" : "text-gray-400"}`}>
                      {row.trend}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}