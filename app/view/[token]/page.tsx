// app/portal/[token]/page.tsx
import Image from "next/image";
import { prisma } from "@/lib/prisma";
import { calculateHybridInterest } from "@/lib/interest";
import type { CompoundingDuration, PledgeStatus } from "@prisma/client";

/* ------------------------------------------------------------------ */
/* Formatters                                                          */
/* ------------------------------------------------------------------ */

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);

const formatDate = (date: Date) =>
  new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);

function sanitiseTel(raw: string) {
  return raw.replace(/[^\d+]/g, "");
}

function isSafeImageUrl(url: string): boolean {
  try {
    const { protocol } = new URL(url);
    return protocol === "https:" || protocol === "http:";
  } catch {
    return false;
  }
}

/* ------------------------------------------------------------------ */
/* Age-based pledge urgency                                            */
/* ------------------------------------------------------------------ */

type PledgeAge = "fresh" | "warning" | "critical";

function getPledgeAge(pledgeDate: Date, status: PledgeStatus): PledgeAge {
  if (status === "RELEASED") return "fresh";
  const msPerMonth = 1000 * 60 * 60 * 24 * 30.44;
  const months = (Date.now() - pledgeDate.getTime()) / msPerMonth;
  if (months >= 12) return "critical";
  if (months >= 6) return "warning";
  return "fresh";
}

const AGE_STYLES: Record<
  PledgeAge,
  { border: string; banner: string; dot: string; label: string }
> = {
  fresh: {
    border: "border-gray-200",
    banner: "",
    dot: "bg-green-400",
    label: "",
  },
  warning: {
    border: "border-yellow-400",
    banner: "bg-yellow-50 border-b border-yellow-200",
    dot: "bg-yellow-400",
    label: "6+ months",
  },
  critical: {
    border: "border-red-400",
    banner: "bg-red-50 border-b border-red-200",
    dot: "bg-red-500",
    label: "Over 1 year",
  },
};

const STATUS_STYLES: Record<
  PledgeStatus,
  { label: string; className: string }
> = {
  ACTIVE: {
    label: "Active",
    className: "bg-green-100 text-green-700 border-green-200",
  },
  RELEASED: {
    label: "Closed",
    className: "bg-gray-100 text-gray-500 border-gray-200",
  },
  OVERDUE: {
    label: "Overdue",
    className: "bg-red-100 text-red-700 border-red-200",
  },
};

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

export default async function CustomerPortalPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  const customer = await prisma.customer.findUnique({
    where: { viewToken: token },
    include: {
      user: {
        select: { shopName: true, mobile: true },
      },
      pledges: {
        orderBy: { pledgeDate: "desc" },
        select: {
          id: true,
          pledgeDate: true,
          loanAmount: true,
          interestRate: true,
          compoundingDuration: true,
          allowCompounding: true,
          itemPhoto: true,
          status: true,
        },
      },
    },
  });

  /* Blocked / invalid */
  if (!customer || customer.isPortalBlocked) {
    return <AccessDenied />;
  }

  /* Process pledges */
  const currentDate = new Date();

  const processedPledges = customer.pledges.map((pledge) => {
    const loanAmount = pledge.loanAmount.toNumber();
    const annualInterestRate = pledge.interestRate.toNumber();

    let accruedInterest = 0;

    if (pledge.status !== "RELEASED") {
      const calc = calculateHybridInterest(
        loanAmount,
        annualInterestRate,
        pledge.pledgeDate,
        currentDate,
        pledge.allowCompounding,
        pledge.compoundingDuration as CompoundingDuration
      );
      accruedInterest = calc.totalInterest;
    }

    const age = getPledgeAge(pledge.pledgeDate, pledge.status);

    return {
      id: pledge.id,
      pledgeDate: pledge.pledgeDate,
      status: pledge.status,
      loanAmount,
      accruedInterest,
      itemPhoto:
        pledge.itemPhoto && isSafeImageUrl(pledge.itemPhoto)
          ? pledge.itemPhoto
          : null,
      age,
    };
  });

  const activePledges = processedPledges.filter(
    (p) => p.status !== "RELEASED"
  );

  const totalDue = activePledges.reduce(
    (sum, p) => sum + p.loanAmount + p.accruedInterest,
    0
  );

  return (
    <div className="min-h-screen bg-gray-50">

      {/* ── Top bar ─────────────────────────────────────────────── */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 md:px-6 h-14 flex items-center justify-between gap-4">

          <div className="flex items-center gap-2.5">
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            <span className="text-sm font-semibold text-gray-800 truncate">
              {customer.user.shopName ?? "Shop Portal"}
            </span>
          </div>

          {customer.user.mobile && (
            <a
              href={`tel:${sanitiseTel(customer.user.mobile)}`}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-600 hover:text-gray-900 border border-gray-200 rounded-full px-3 py-1.5 hover:bg-gray-50 transition-colors"
            >
              <PhoneIcon />
              {customer.user.mobile}
            </a>
          )}
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 md:px-6 py-8 space-y-8">

        {/* ── Summary ──────────────────────────────────────────── */}
        <section className="bg-white rounded-2xl border border-gray-200 p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-5">

          <div>
            <p className="text-xs text-gray-400 font-medium uppercase tracking-widest mb-1">
              Account
            </p>
            <h1 className="text-xl font-bold text-gray-900">{customer.name}</h1>
          </div>

          <div className="flex gap-3 flex-wrap">
            <Stat label="Active Pledges" value={String(activePledges.length)} />
            <Stat
              label="Total Outstanding"
              value={formatCurrency(totalDue)}
              accent
            />
          </div>
        </section>

        {/* ── Legend ───────────────────────────────────────────── */}
        <div className="flex items-center gap-4 px-1">
          <span className="text-xs text-gray-400 font-medium">
            Pledge age:
          </span>
          <span className="flex items-center gap-1.5 text-xs text-gray-600">
            <span className="w-2.5 h-2.5 rounded-full bg-green-400 inline-block" />
            Under 6 months
          </span>
          <span className="flex items-center gap-1.5 text-xs text-yellow-700">
            <span className="w-2.5 h-2.5 rounded-full bg-yellow-400 inline-block" />
            6 – 12 months
          </span>
          <span className="flex items-center gap-1.5 text-xs text-red-700">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block" />
            Over 1 year
          </span>
        </div>

        {/* ── Pledge Cards ─────────────────────────────────────── */}
        {processedPledges.length === 0 ? (
          <div className="bg-white rounded-2xl border border-dashed border-gray-300 p-16 text-center">
            <p className="text-4xl mb-3">📄</p>
            <p className="font-semibold text-gray-700">No pledge records</p>
            <p className="text-sm text-gray-400 mt-1">
              Your account has no pledges yet.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {processedPledges.map((pledge) => {
              const ageStyle = AGE_STYLES[pledge.age];
              const statusStyle = STATUS_STYLES[pledge.status];
              const isReleased = pledge.status === "RELEASED";

              return (
                <article
                  key={pledge.id}
                  className={`bg-white rounded-2xl border-2 overflow-hidden flex flex-col transition-all duration-200 hover:shadow-lg ${ageStyle.border} ${
                    isReleased ? "opacity-55 grayscale" : ""
                  }`}
                >
                  {/* Age banner (warning / critical only) */}
                  {ageStyle.banner && (
                    <div
                      className={`flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold ${ageStyle.banner} ${
                        pledge.age === "critical"
                          ? "text-red-700"
                          : "text-yellow-800"
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${ageStyle.dot}`}
                      />
                      {ageStyle.label}
                    </div>
                  )}

                  {/* Photo */}
                  {pledge.itemPhoto ? (
                    <div className="relative h-44 w-full bg-gray-100">
                      <Image
                        src={pledge.itemPhoto}
                        alt="Pledged item"
                        fill
                        className="object-cover"
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                      />
                    </div>
                  ) : (
                    <div className="h-32 w-full bg-gray-50 flex items-center justify-center border-b border-gray-100">
                      <GoldIcon />
                    </div>
                  )}

                  {/* Body */}
                  <div className="p-4 flex flex-col gap-4 flex-grow">

                    {/* Date + status badge */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`w-2 h-2 rounded-full ${ageStyle.dot}`}
                        />
                        <time
                          dateTime={pledge.pledgeDate.toISOString()}
                          className="text-xs font-medium text-gray-500"
                        >
                          {formatDate(pledge.pledgeDate)}
                        </time>
                      </div>

                      <span
                        className={`text-xs font-semibold border rounded-full px-2.5 py-0.5 ${statusStyle.className}`}
                      >
                        {statusStyle.label}
                      </span>
                    </div>

                    {/* Financials — active only */}
                    {isReleased ? (
                      <p className="text-xs text-gray-400 italic text-center py-2">
                        This pledge has been settled.
                      </p>
                    ) : (
                      <div className="space-y-2.5">
                        <FinancialRow
                          label="Loan Amount"
                          value={formatCurrency(pledge.loanAmount)}
                        />
                        <FinancialRow
                          label="Interest Till Date"
                          value={formatCurrency(pledge.accruedInterest)}
                          highlight
                        />
                        <div className="pt-2 border-t border-gray-100 flex justify-between items-center">
                          <span className="text-xs font-bold text-gray-700">
                            Total Due
                          </span>
                          <span className="text-sm font-bold text-gray-900">
                            {formatCurrency(
                              pledge.loanAmount + pledge.accruedInterest
                            )}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </main>

      {/* ── Footer ───────────────────────────────────────────────── */}
      <footer className="max-w-5xl mx-auto px-4 md:px-6 pb-10 mt-4">
        <p className="text-center text-xs text-gray-400">
          This portal shows real-time information. All amounts are in Indian
          Rupees (₹).
        </p>
      </footer>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Sub-components                                                      */
/* ------------------------------------------------------------------ */

function AccessDenied() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-sm bg-white border border-gray-200 rounded-2xl p-8 text-center shadow-sm">
        <div className="w-14 h-14 mx-auto rounded-full bg-red-100 flex items-center justify-center mb-5">
          <svg
            className="w-7 h-7 text-red-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M18.364 5.636L5.636 18.364M5.636 5.636l12.728 12.728"
            />
          </svg>
        </div>
        <h1 className="text-lg font-bold text-gray-900">Access Restricted</h1>
        <p className="text-sm text-gray-500 mt-2 leading-relaxed">
          This portal is unavailable or has been disabled. Please contact the
          shop directly.
        </p>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  accent = false,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div
      className={`rounded-xl px-4 py-3 min-w-[130px] border ${
        accent
          ? "bg-gray-900 border-gray-800"
          : "bg-gray-50 border-gray-200"
      }`}
    >
      <p
        className={`text-xs font-medium mb-0.5 ${
          accent ? "text-gray-400" : "text-gray-500"
        }`}
      >
        {label}
      </p>
      <p
        className={`text-lg font-bold tabular-nums ${
          accent ? "text-white" : "text-gray-900"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function FinancialRow({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="flex justify-between items-center text-sm">
      <span className="text-gray-500">{label}</span>
      <span
        className={`font-semibold tabular-nums ${
          highlight ? "text-amber-700" : "text-gray-800"
        }`}
      >
        {value}
      </span>
    </div>
  );
}

function PhoneIcon() {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="currentColor"
      className="w-3.5 h-3.5"
      aria-hidden="true"
    >
      <path
        fillRule="evenodd"
        d="M2 3.5A1.5 1.5 0 013.5 2h1.148a1.5 1.5 0 011.465 1.175l.716 3.223a1.5 1.5 0 01-1.052 1.767l-.933.267c-.41.117-.643.555-.48.95a11.542 11.542 0 006.254 6.254c.395.163.833-.07.95-.48l.267-.933a1.5 1.5 0 011.767-1.052l3.223.716A1.5 1.5 0 0118 15.352V16.5a1.5 1.5 0 01-1.5 1.5H15c-1.149 0-2.263-.15-3.326-.43A13.022 13.022 0 012.43 8.326 13.019 13.019 0 012 5V3.5z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function GoldIcon() {
  return (
    <svg
      viewBox="0 0 40 40"
      className="w-10 h-10 text-gray-300"
      fill="none"
      aria-hidden="true"
    >
      <circle cx="20" cy="20" r="18" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M13 20l4 4 10-10"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}