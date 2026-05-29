"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  BarChart, Bar,
} from "recharts";
import {
  ArrowLeft, Send, Download, IndianRupee, TrendingUp,
  Hexagon, Circle, FileText, AlertTriangle, Bell,
  BarChart3, XCircle, Clock, Loader2, RefreshCw,
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

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

const RISK_CONFIG: Record<RiskTier, { label: string; bg: string; text: string; border: string }> = {
  SAFE:       { label: "Safe",       bg: "bg-green-50",  text: "text-green-700",  border: "border-green-200"  },
  WATCH:      { label: "Watch",      bg: "bg-yellow-50", text: "text-yellow-700", border: "border-yellow-200" },
  "AT RISK":  { label: "At Risk",    bg: "bg-orange-50", text: "text-orange-700", border: "border-orange-200" },
  UNDERWATER: { label: "Underwater", bg: "bg-red-50",    text: "text-red-700",    border: "border-red-200"    },
};

function overallRiskTier(score: number): RiskTier {
  if (score < 60) return "SAFE";
  if (score < 75) return "WATCH";
  if (score < 90) return "AT RISK";
  return "UNDERWATER";
}

/* ------------------------------------------------------------------ */
/*  Sub-components                                                      */
/* ------------------------------------------------------------------ */
function RiskArc({ score }: { score: number }) {
  const tier  = overallRiskTier(score);
  const color = tier === "SAFE" ? "#22c55e" : tier === "WATCH" ? "#eab308" : tier === "AT RISK" ? "#f97316" : "#ef4444";
  const r = 52, cx = 70, cy = 70;
  const start = -210, end = start + (score / 100) * 240;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const arc   = (angle: number) => `${cx + r * Math.cos(toRad(angle))},${cy + r * Math.sin(toRad(angle))}`;
  const large = end - start > 180 ? 1 : 0;
  return (
    <svg width={140} height={110} viewBox="0 0 140 110">
      <path d={`M ${arc(start)} A ${r} ${r} 0 1 1 ${arc(start + 240)}`} fill="none" stroke="#f3f4f6" strokeWidth={10} strokeLinecap="round" />
      <path d={`M ${arc(start)} A ${r} ${r} 0 ${large} 1 ${arc(end)}`}  fill="none" stroke={color}   strokeWidth={10} strokeLinecap="round" />
      <text x={cx} y={cy + 6}  textAnchor="middle" fontSize={22} fontWeight={600} fill={color}>{score}</text>
      <text x={cx} y={cy + 22} textAnchor="middle" fontSize={11} fill="#6b7280">risk score</text>
    </svg>
  );
}

function MetricCard({ icon: Icon, label, value, sub, accent = false }: {
  icon: any; label: string; value: string; sub?: string; accent?: boolean;
}) {
  return (
    <div className={`p-5 rounded-xl border flex flex-col gap-1 ${accent ? "bg-gray-900 border-gray-800" : "bg-white border-gray-200 shadow-sm"}`}>
      <div className="flex items-center gap-2 mb-1">
        <Icon className={`w-4 h-4 ${accent ? "text-gray-400" : "text-gray-500"}`} />
        <span className={`text-xs font-medium ${accent ? "text-gray-400" : "text-gray-500"}`}>{label}</span>
      </div>
      <span className={`text-2xl font-semibold leading-tight ${accent ? "text-white" : "text-gray-900"}`}>{value}</span>
      {sub && <span className={`text-[11px] mt-0.5 ${accent ? "text-gray-500" : "text-gray-400"}`}>{sub}</span>}
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

/* ------------------------------------------------------------------ */
/*  Alert icon helper                                                   */
/* ------------------------------------------------------------------ */
function AlertIcon({ risk }: { risk: RiskTier }) {
  if (risk === "UNDERWATER") return <XCircle className="w-4 h-4 mt-0.5 shrink-0 text-red-600" />;
  if (risk === "AT RISK")    return <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0 text-orange-600" />;
  return <Clock className="w-4 h-4 mt-0.5 shrink-0 text-yellow-600" />;
}

function alertStyle(risk: RiskTier) {
  if (risk === "UNDERWATER") return { bg: "bg-red-50",    border: "border-red-200",    text: "text-red-600"    };
  if (risk === "AT RISK")    return { bg: "bg-orange-50", border: "border-orange-200", text: "text-orange-600" };
  return                            { bg: "bg-yellow-50", border: "border-yellow-200", text: "text-yellow-600" };
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

  /* ── Loading ── */
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="animate-spin text-gray-300" size={32} />
      </div>
    );
  }

  /* ── Error ── */
  if (error || !data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <p className="text-sm text-red-500">{error ?? "Something went wrong"}</p>
        <button
          onClick={load}
          className="flex items-center gap-2 text-sm border border-gray-200 rounded-lg px-4 py-2 hover:bg-gray-50"
        >
          <RefreshCw size={14} /> Retry
        </button>
      </div>
    );
  }

  const { customer, metrics, prices, pledges, riskDistribution, exposureData, ltvTrend, alerts } = data;
  const tier = overallRiskTier(customer.riskScore);

  /* ── Render ── */
  return (
    <div className="min-h-screen bg-slate-50 pb-16">

      {/* ── Sticky header ── */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.back()}
              className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" /> Back
            </button>
            <div className="w-px h-5 bg-gray-200" />
            <div>
              <p className="text-sm font-medium text-gray-900">Financial summary</p>
              <p className="text-[11px] text-gray-500">{customer.name} · Risk & exposure overview</p>
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

        {/* ── Hero card ── */}
        <div className="bg-white border border-gray-200 rounded-2xl p-8 mb-6 flex gap-8 flex-wrap items-center shadow-sm">

          {/* Left — customer + score */}
          <div className="flex-1 min-w-[280px]">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-sm font-semibold text-gray-600">
                {customer.name.split(" ").map(n => n[0]).join("")}
              </div>
              <div>
                <p className="text-base font-semibold text-gray-900">{customer.name}</p>
                <p className="text-xs text-gray-500">{customer.region ?? "—"}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 mb-5">
              <RiskBadge tier={tier} />
              <span className="text-xs text-gray-500">overall risk</span>
            </div>
            <RiskArc score={customer.riskScore} />
            <div className="flex gap-6 mt-3">
              <div>
                <p className="text-[11px] text-gray-500 mb-0.5">Active pledges</p>
                <p className="text-lg font-semibold text-gray-900">{customer.totalActivePledges}</p>
              </div>
              <div>
                <p className="text-[11px] text-gray-500 mb-0.5">Last pledge</p>
                <p className="text-lg font-semibold text-gray-900">
                  {customer.lastPledgeDate ? fmtDate(customer.lastPledgeDate) : "—"}
                </p>
              </div>
            </div>
          </div>

          <div className="w-px h-40 bg-gray-200 shrink-0 hidden md:block" />

          {/* Right — key metrics */}
          <div className="flex-[2] min-w-[400px] grid grid-cols-2 gap-4">
            <div className="bg-gray-50 rounded-xl p-5 border border-gray-100">
              <p className="text-xs text-gray-500 mb-1">Overall LTV</p>
              <p className={`text-3xl font-semibold ${
                metrics.overallLTV === null      ? "text-gray-400"
                : metrics.overallLTV > 90        ? "text-red-500"
                : metrics.overallLTV > 75        ? "text-orange-500"
                :                                  "text-green-500"
              }`}>
                {metrics.overallLTV !== null ? `${metrics.overallLTV}%` : "—"}
              </p>
              <p className="text-[11px] text-gray-500 mt-1">Safe threshold &lt; 70%</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-5 border border-gray-100">
              <p className="text-xs text-gray-500 mb-1">Total amount owed</p>
              <p className="text-2xl font-semibold text-gray-900">{inr(metrics.totalAmountOwed)}</p>
              <p className="text-[11px] text-gray-500 mt-1">incl. accrued interest</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-5 border border-gray-100">
              <p className="text-xs text-gray-500 mb-1">Total market value</p>
              <p className="text-2xl font-semibold text-gray-900">{inr(metrics.totalMarketValue)}</p>
              <p className="text-[11px] text-gray-500 mt-1">at current metal price</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-5 border border-gray-100">
              <p className="text-xs text-gray-500 mb-1">Liquidation coverage</p>
              <p className="text-3xl font-semibold text-green-500">
                {metrics.estimatedCoverage !== null ? `${metrics.estimatedCoverage}%` : "—"}
              </p>
              <p className="text-[11px] text-gray-500 mt-1">of owed amount</p>
            </div>
          </div>
        </div>

        {/* ── Metric cards ── */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
          <MetricCard icon={IndianRupee} label="Total loan amount" value={inr(metrics.totalLoanAmount)} sub="principal disbursed" />
          <MetricCard
            icon={TrendingUp} label="Total amount owed"
            value={inr(metrics.totalAmountOwed)}
            sub={metrics.totalLoanAmount > 0
              ? `+${(((metrics.totalAmountOwed - metrics.totalLoanAmount) / metrics.totalLoanAmount) * 100).toFixed(1)}% from principal`
              : undefined}
            accent
          />
          <MetricCard icon={Hexagon}       label="Gold weight"      value={`${metrics.totalGoldWeight.toFixed(3)}g`}   sub="net across all pledges" />
          <MetricCard icon={Circle}        label="Silver weight"    value={`${metrics.totalSilverWeight.toFixed(3)}g`} sub="net across all pledges" />
          <MetricCard icon={FileText}      label="Active pledges"   value={String(metrics.activePledges)}              sub="currently open" />
          <MetricCard icon={AlertTriangle} label="Underwater"       value={String(metrics.underwaterPledges)}          sub="LTV > 100%" />
        </div>

        {/* ── Charts row ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">

          {/* Donut */}
          <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
            <p className="text-sm font-semibold text-gray-900 mb-1">Pledge risk distribution</p>
            <p className="text-xs text-gray-500 mb-4">By risk tier across all pledges</p>
            {riskDistribution.length === 0 ? (
              <div className="h-56 flex items-center justify-center text-sm text-gray-400">No active pledges</div>
            ) : (
              <>
                <div className="flex gap-3 mb-4 flex-wrap">
                  {riskDistribution.map(r => (
                    <span key={r.name} className="flex items-center gap-1.5 text-xs text-gray-600">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: r.color }} />
                      {r.name} ({r.value})
                    </span>
                  ))}
                </div>
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={riskDistribution} cx="50%" cy="50%" innerRadius={65} outerRadius={95} paddingAngle={4} dataKey="value">
                        {riskDistribution.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                      </Pie>
                      <Tooltip formatter={(v: any) => [`${v} pledge(s)`, ""]} contentStyle={{ borderRadius: "8px", border: "1px solid #e5e7eb", fontSize: "12px" }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </>
            )}
          </div>

          {/* Bar */}
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
                <BarChart data={exposureData} barSize={48}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 12, fill: "#6b7280" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "#6b7280" }} axisLine={false} tickLine={false} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                  <Tooltip content={<ChartTooltip />} />
                  <Bar dataKey="gold"   name="Gold"   fill="#d4a017" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="silver" name="Silver" fill="#94a3b8" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* ── LTV trend — only shown if audit data exists ── */}
        {ltvTrend.length > 0 && (
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
                <AreaChart data={ltvTrend} margin={{ top: 5, right: 0, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="ltvGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#ef4444" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0}    />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 12, fill: "#6b7280" }} axisLine={false} tickLine={false} />
                  <YAxis yAxisId="pct" orientation="right" tick={{ fontSize: 11, fill: "#6b7280" }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}%`} />
                  <YAxis yAxisId="val" tick={{ fontSize: 11, fill: "#6b7280" }} axisLine={false} tickLine={false} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                  <Tooltip content={<ChartTooltip />} />
                  <Area yAxisId="pct" type="monotone" dataKey="ltv"         name="LTV %"        stroke="#ef4444" fill="url(#ltvGrad)" strokeWidth={2} dot={{ r: 4, fill: "#ef4444", strokeWidth: 0 }} />
                  <Area yAxisId="val" type="monotone" dataKey="marketValue" name="Market value" stroke="#d4a017" fill="none"           strokeWidth={2} strokeDasharray="4 4" dot={false} />
                  <Area yAxisId="val" type="monotone" dataKey="amountOwed"  name="Amount owed"  stroke="#3b82f6" fill="none"           strokeWidth={2} dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* ── Pledges table ── */}
        {pledges.filter(p => p.status !== "RELEASED").length > 0 && (
          <div className="bg-white border border-gray-200 rounded-xl mb-6 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-gray-200">
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
                <tbody className="divide-y divide-gray-100">
                  {pledges.filter(p => p.status !== "RELEASED").map((p) => (
                    <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-5 py-4 font-medium text-gray-900">{p.name}</td>
                      <td className="px-5 py-4 text-gray-600 tabular-nums">{inr(p.loanAmount)}</td>
                      <td className="px-5 py-4 font-semibold text-gray-900 tabular-nums">{inr(p.amountOwed)}</td>
                      <td className="px-5 py-4 text-gray-600 tabular-nums">
                        {p.marketValue !== null ? inr(p.marketValue) : "—"}
                      </td>
                      <td className={`px-5 py-4 font-semibold tabular-nums ${
                        p.ltv === null   ? "text-gray-400"
                        : p.ltv > 100   ? "text-red-500"
                        : p.ltv > 80    ? "text-orange-500"
                        :                 "text-green-500"
                      }`}>
                        {p.ltv !== null ? `${p.ltv.toFixed(1)}%` : "—"}
                      </td>
                      <td className="px-5 py-4"><RiskBadge tier={p.risk} /></td>
                      <td className={`px-5 py-4 font-medium tabular-nums ${
                        p.daysToUnderwater === null ? "text-green-500"
                        : p.daysToUnderwater === 0  ? "text-red-500"
                        : p.daysToUnderwater < 30   ? "text-orange-500"
                        :                             "text-gray-600"
                      }`}>
                        {p.daysToUnderwater === null ? "—" : p.daysToUnderwater === 0 ? "Underwater" : `${p.daysToUnderwater}d`}
                      </td>
                      <td className="px-5 py-4">
                        <span className={`text-[11px] px-2.5 py-1 rounded-md font-medium ${
                          p.status === "ACTIVE"  ? "bg-green-50 text-green-700"
                          : p.status === "OVERDUE" ? "bg-red-50 text-red-700"
                          :                          "bg-gray-100 text-gray-600"
                        }`}>
                          {p.status.charAt(0) + p.status.slice(1).toLowerCase()}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── Alerts + Market ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          {/* Alerts */}
          <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm flex flex-col">
            <div className="flex items-center gap-2 mb-5">
              <Bell className="w-4 h-4 text-gray-500" />
              <p className="text-sm font-semibold text-gray-900">Risk alerts</p>
              {alerts.length > 0 && (
                <span className="ml-auto text-xs bg-red-100 text-red-600 font-medium px-2 py-0.5 rounded-full">
                  {alerts.length}
                </span>
              )}
            </div>

            {alerts.length === 0 ? (
              <div className="flex-1 flex items-center justify-center py-8">
                <div className="text-center">
                  <p className="text-2xl mb-2">✅</p>
                  <p className="text-sm font-medium text-gray-700">All clear</p>
                  <p className="text-xs text-gray-400 mt-1">No risk alerts for this customer</p>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-3 flex-1">
                {alerts.map((a) => {
                  const s = alertStyle(a.risk);
                  return (
                    <div key={a.pledgeId} className={`${s.bg} border ${s.border} rounded-lg p-3 flex gap-3 items-start`}>
                      <AlertIcon risk={a.risk} />
                      <p className={`text-xs leading-relaxed font-medium ${s.text}`}>{a.message}</p>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="mt-5 pt-5 border-t border-gray-100">
              <button className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg border border-gray-200 bg-gray-50 hover:bg-gray-100 text-sm font-medium text-gray-900 transition-colors">
                <Send className="w-4 h-4" /> Send risk summary now
              </button>
            </div>
          </div>

          {/* Market parameters */}
          <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-5">
              <BarChart3 className="w-4 h-4 text-gray-500" />
              <p className="text-sm font-semibold text-gray-900">Market parameters</p>
              {prices.updatedAt && (
                <span className="ml-auto text-[10px] text-gray-400">
                  Updated {fmtDate(prices.updatedAt)}
                </span>
              )}
            </div>
            <div className="flex flex-col gap-1">
              {[
                {
                  label: "Gold price",
                  value: prices.goldPerGram ? `₹${prices.goldPerGram.toLocaleString("en-IN")}/g` : "—",
                  trend: null,
                },
                {
                  label: "Silver price",
                  value: prices.silverPerGram ? `₹${prices.silverPerGram.toLocaleString("en-IN")}/g` : "—",
                  trend: null,
                },
                {
                  label: "Liquidation value",
                  value: inr(metrics.totalMarketValue * 0.85),
                  trend: "at 85% recovery",
                },
                {
                  label: "Recovery ratio",
                  value: metrics.estimatedCoverage !== null ? `${metrics.estimatedCoverage}%` : "—",
                  trend: "of total owed",
                },
                {
                  label: "Net exposure",
                  value: inr(Math.max(0, metrics.totalAmountOwed - metrics.totalMarketValue * 0.85)),
                  trend: "risk capital at stake",
                },
              ].map((row, i) => (
                <div key={i} className={`flex justify-between items-center py-3 ${i < 4 ? "border-b border-gray-100" : ""}`}>
                  <span className="text-sm text-gray-500">{row.label}</span>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-gray-900">{row.value}</p>
                    {row.trend && (
                      <p className="text-[10px] font-medium mt-0.5 text-gray-400">{row.trend}</p>
                    )}
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