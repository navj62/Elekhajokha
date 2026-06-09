"use client";

import { Users, IndianRupee, type LucideIcon } from "lucide-react";
import {
  ComposedChart,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import type { CSSProperties } from "react";

/* ================================================================== */
/*  API response type (inline — mirrors /api/dashboard/monthly-performance) */
/* ================================================================== */

export interface SummaryMetric {
  current: number;
  previous: number;
  changePercent: number | null;
}

export interface MonthlyPerformanceMonth {
  month: string;
  label: string;
  pledgesAdded: number;
  pledgesReleased: number;
  loanAmountGiven: number;
  totalAmountReceived: number;
  newCustomers: number;
  totalInterestReceived: number;
}

export interface MonthlyPerformanceData {
  months: MonthlyPerformanceMonth[];
  summary: {
    pledgesAdded: SummaryMetric;
    pledgesReleased: SummaryMetric;
    loanAmountGiven: SummaryMetric;
    totalAmountReceived: SummaryMetric;
    newCustomers: SummaryMetric;
    totalInterestReceived: SummaryMetric;
  };
}

/* ================================================================== */
/*  Formatters (match existing dashboard conventions)                  */
/* ================================================================== */

// Abbreviated INR for axis ticks + summary values — ₹…Cr / ₹…L / ₹…K.
function formatCurrencyAbbr(n: number): string {
  if (n >= 10000000) return "₹" + (n / 10000000).toFixed(1) + "Cr";
  if (n >= 100000) return "₹" + (n / 100000).toFixed(0) + "L";
  if (n >= 1000) return "₹" + (n / 1000).toFixed(0) + "K";
  return "₹" + n;
}

// Full Indian-locale rupee value for tooltips (no decimals).
const inr = (n: number) => "₹" + n.toLocaleString("en-IN", { maximumFractionDigits: 0 });

const intl = (n: number) => n.toLocaleString("en-IN");

/* ================================================================== */
/*  Palette (from the Part-1 audit — do not theme these)               */
/* ================================================================== */

const COLOR_PRIMARY = "#565C3F"; // olive — primary bars
const COLOR_SECONDARY = "#DADBCF"; // secondary bars
const COLOR_MONEY_PRIMARY = "#8B9F5E"; // right-axis money bar 1
const COLOR_MONEY_SECONDARY = "#C4A882"; // right-axis money bar 2
const GRID_STROKE = "#ECEAE4";
const AXIS_TICK = "#9E9E9E";

const AXIS_TICK_STYLE = { fontSize: 12, fill: AXIS_TICK };

const cardStyle: CSSProperties = {
  backgroundColor: "var(--card-bg)",
  border: "1px solid var(--border-light)",
};

const tooltipBox: CSSProperties = {
  background: "#fff",
  border: "1px solid #ECEAE4",
  borderRadius: 10,
  padding: "10px 14px",
  boxShadow: "0 4px 16px rgba(0,0,0,0.08)",
  fontSize: 12,
  fontWeight: 500,
};

/* ================================================================== */
/*  Custom tooltips (typed — recharts injects active/payload/label)    */
/* ================================================================== */

interface TooltipEntry {
  name?: string;
  value?: number | string;
  color?: string;
  dataKey?: string | number;
}
interface ChartTooltipProps {
  active?: boolean;
  label?: string | number;
  payload?: ReadonlyArray<TooltipEntry>;
}

const MONEY_KEYS = new Set(["loanAmountGiven", "totalAmountReceived"]);

// Chart A — all four series, counts as integers, money as ₹ en-IN.
function ActivityTooltip({ active, payload, label }: ChartTooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div style={tooltipBox}>
      <p style={{ fontWeight: 700, marginBottom: 6, color: "#2C2C2C" }}>{label}</p>
      {payload.map((entry, i) => {
        const num = typeof entry.value === "number" ? entry.value : Number(entry.value ?? 0);
        const isMoney = MONEY_KEYS.has(String(entry.dataKey));
        return (
          <p key={i} style={{ color: entry.color, margin: "2px 0", fontSize: 12, fontWeight: 600 }}>
            {entry.name}: {isMoney ? inr(num) : intl(num)}
          </p>
        );
      })}
    </div>
  );
}

// Chart B — "{N} new customers".
function CustomersTooltip({ active, payload, label }: ChartTooltipProps) {
  if (!active || !payload?.length) return null;
  const num = Number(payload[0]?.value ?? 0);
  return (
    <div style={tooltipBox}>
      <p style={{ fontWeight: 700, marginBottom: 4, color: "#2C2C2C" }}>{label}</p>
      <p style={{ color: COLOR_PRIMARY, fontSize: 12, fontWeight: 600 }}>
        {intl(num)} new customers
      </p>
    </div>
  );
}

// Chart C — interest collected in Indian currency format.
function InterestTooltip({ active, payload, label }: ChartTooltipProps) {
  if (!active || !payload?.length) return null;
  const num = Number(payload[0]?.value ?? 0);
  return (
    <div style={tooltipBox}>
      <p style={{ fontWeight: 700, marginBottom: 4, color: "#2C2C2C" }}>{label}</p>
      <p style={{ color: COLOR_MONEY_PRIMARY, fontSize: 12, fontWeight: 600 }}>
        Interest: {inr(num)}
      </p>
    </div>
  );
}

/* ================================================================== */
/*  Shared bits                                                         */
/* ================================================================== */

function EmptyState({ icon: Icon, text }: { icon: LucideIcon; text: string }) {
  return (
    <div
      className="w-full h-full flex flex-col items-center justify-center"
      style={{ color: "var(--text-muted)" }}
    >
      <Icon size={32} className="mb-2 opacity-20" />
      <span className="text-[13px] font-medium">{text}</span>
    </div>
  );
}

function CardTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-3">
      <h3 className="text-[17px] font-bold" style={{ color: "var(--text-primary)" }}>
        {title}
      </h3>
      {subtitle && (
        <p className="text-[12px] font-medium mt-0.5" style={{ color: "var(--text-muted)" }}>
          {subtitle}
        </p>
      )}
    </div>
  );
}

const SUMMARY_METRICS: {
  key: keyof MonthlyPerformanceData["summary"];
  label: string;
  money: boolean;
}[] = [
  { key: "pledgesAdded", label: "Pledges Added", money: false },
  { key: "pledgesReleased", label: "Pledges Released", money: false },
  { key: "loanAmountGiven", label: "Loan Disbursed", money: true },
  { key: "totalAmountReceived", label: "Amount Received", money: true },
  { key: "newCustomers", label: "New Customers", money: false },
  { key: "totalInterestReceived", label: "Interest Collected", money: true },
];

function ChangeIndicator({ changePercent }: { changePercent: number | null }) {
  if (changePercent === null) {
    return (
      <span
        className="inline-flex px-2 py-0.5 rounded-md text-[10px] font-bold"
        style={{ backgroundColor: COLOR_PRIMARY, color: "#fff" }}
      >
        New
      </span>
    );
  }
  if (changePercent > 0) {
    return (
      <span className="text-[11px] font-bold" style={{ color: "#4CAF50" }}>
        ↑ {Math.abs(changePercent)}%
      </span>
    );
  }
  if (changePercent < 0) {
    return (
      <span className="text-[11px] font-bold" style={{ color: "#EF5350" }}>
        ↓ {Math.abs(changePercent)}%
      </span>
    );
  }
  return (
    <span className="text-[11px] font-bold" style={{ color: "var(--text-muted)" }}>
      —
    </span>
  );
}

/* ================================================================== */
/*  Main component                                                      */
/* ================================================================== */

export function MonthlyPerformanceCharts({ data }: { data: MonthlyPerformanceData }) {
  const { months, summary } = data;
  const hasCustomers = months.some((m) => m.newCustomers > 0);
  const hasInterest = months.some((m) => m.totalInterestReceived > 0);

  return (
    <div className="space-y-6">
      {/* Section header */}
      <div>
        <p
          className="text-[10px] font-bold tracking-wider uppercase"
          style={{ color: "var(--text-muted)" }}
        >
          Last 12 Months
        </p>
        <h2 className="text-[20px] font-bold mt-0.5" style={{ color: "var(--text-primary)" }}>
          Monthly Performance
        </h2>
      </div>

      {/* Chart A — dual-axis pledge & loan activity (full width) */}
      <div className="rounded-[18px] p-7" style={cardStyle}>
        <CardTitle
          title="Pledge & Loan Activity"
          subtitle="Pledge counts (left axis) vs loan value (right axis), month by month"
        />
        <ResponsiveContainer width="100%" height={320}>
          <ComposedChart data={months} barGap={2} barCategoryGap="18%">
            <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} vertical={false} />
            <XAxis dataKey="label" tick={AXIS_TICK_STYLE} axisLine={false} tickLine={false} />
            <YAxis
              yAxisId="left"
              tick={AXIS_TICK_STYLE}
              axisLine={false}
              tickLine={false}
              width={32}
              allowDecimals={false}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              tick={AXIS_TICK_STYLE}
              axisLine={false}
              tickLine={false}
              width={48}
              tickFormatter={(v: number) => formatCurrencyAbbr(v)}
            />
            <Tooltip content={<ActivityTooltip />} cursor={{ fill: "rgba(0,0,0,0.02)" }} />
            <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11, fontWeight: 600, paddingTop: 12 }} />
            <Bar yAxisId="left" dataKey="pledgesAdded" name="Pledges Added" fill={COLOR_PRIMARY} radius={[3, 3, 0, 0]} />
            <Bar yAxisId="left" dataKey="pledgesReleased" name="Pledges Released" fill={COLOR_SECONDARY} radius={[3, 3, 0, 0]} />
            <Bar yAxisId="right" dataKey="loanAmountGiven" name="Loan Disbursed" fill={COLOR_MONEY_PRIMARY} radius={[3, 3, 0, 0]} />
            <Bar yAxisId="right" dataKey="totalAmountReceived" name="Amount Received" fill={COLOR_MONEY_SECONDARY} radius={[3, 3, 0, 0]} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Charts B & C — half width each */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart B — New Customers */}
        <div className="rounded-[18px] p-7" style={cardStyle}>
          <CardTitle title="New Customers" subtitle="Customers added each month" />
          <div className="h-[240px]">
            {hasCustomers ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={months} barSize={22}>
                  <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} vertical={false} />
                  <XAxis dataKey="label" tick={AXIS_TICK_STYLE} axisLine={false} tickLine={false} />
                  <YAxis tick={AXIS_TICK_STYLE} axisLine={false} tickLine={false} width={30} allowDecimals={false} />
                  <Tooltip content={<CustomersTooltip />} cursor={{ fill: "rgba(0,0,0,0.02)" }} />
                  <Bar dataKey="newCustomers" name="New Customers" fill={COLOR_PRIMARY} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState icon={Users} text="No new customers in this period." />
            )}
          </div>
        </div>

        {/* Chart C — Interest Collected */}
        <div className="rounded-[18px] p-7" style={cardStyle}>
          <CardTitle title="Interest Collected" subtitle="Interest received on released pledges" />
          <div className="h-[240px]">
            {hasInterest ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={months} barSize={22}>
                  <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} vertical={false} />
                  <XAxis dataKey="label" tick={AXIS_TICK_STYLE} axisLine={false} tickLine={false} />
                  <YAxis
                    tick={AXIS_TICK_STYLE}
                    axisLine={false}
                    tickLine={false}
                    width={48}
                    tickFormatter={(v: number) => formatCurrencyAbbr(v)}
                  />
                  <Tooltip content={<InterestTooltip />} cursor={{ fill: "rgba(0,0,0,0.02)" }} />
                  <Bar dataKey="totalInterestReceived" name="Interest Collected" fill={COLOR_MONEY_PRIMARY} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState icon={IndianRupee} text="No interest collected in this period." />
            )}
          </div>
        </div>
      </div>

      {/* Summary cards — current month vs previous */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {SUMMARY_METRICS.map(({ key, label, money }) => {
          const m = summary[key];
          const value = money ? formatCurrencyAbbr(m.current) : intl(m.current);
          return (
            <div key={key} className="rounded-[16px] p-5" style={cardStyle}>
              <p
                className="text-[10px] font-bold tracking-wider uppercase"
                style={{ color: "var(--text-muted)" }}
              >
                {label}
              </p>
              <p className="text-[20px] font-bold mt-1 leading-none" style={{ color: "var(--text-primary)" }}>
                {value}
              </p>
              <div className="mt-2">
                <ChangeIndicator changePercent={m.changePercent} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
