"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Loader2, CheckCircle } from "lucide-react";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

import {
  Alert,
  AlertDescription,
} from "@/components/ui/alert";

import { Badge } from "@/components/ui/badge";

import { useLanguage } from "@/components/providers/LanguageProvider";
import { getStatusKey } from "@/lib/translations";

/* ------------------------------------------------------------------ */

interface Pledge {
  id: string;
  pledgeDate: string;
  loanAmount: number;
  itemType: string;
  itemName: string;
  grossWeight: number;
  netWeight: number;
  purity: number;
  interestRate: number;
  compoundingDuration: "MONTHLY" | "QUARTERLY" | "YEARLY";
  status: string;
  remark: string | null;
  itemPhoto: string | null;

  customer: {
    id: string;
    name: string;
    address: string;
  };
}

const COMPOUNDING_OPTIONS = [
  { value: "MONTHLY", n: 12 },
  { value: "QUARTERLY", n: 4 },
  { value: "YEARLY", n: 1 },
];

/* ------------------------------------------------------------------ */

function monthsAndDays(from: Date, to: Date) {
  let years = to.getFullYear() - from.getFullYear();
  let months = to.getMonth() - from.getMonth();
  let days = to.getDate() - from.getDate();

  if (days < 0) {
    months -= 1;

    const prevMonth = new Date(
      to.getFullYear(),
      to.getMonth(),
      0
    );

    days += prevMonth.getDate();
  }

  if (months < 0) {
    years -= 1;
    months += 12;
  }

  return {
    totalMonths: years * 12 + months,
    days,
  };
}

/* ------------------------------------------------------------------ */

function calcSimpleInterest(
  principal: number,
  annualRate: number,
  fromDate: Date,
  toDate: Date,
  roundHalfMonth: boolean
) {
  const { totalMonths, days } = monthsAndDays(fromDate, toDate);

  let months = totalMonths;

  if (roundHalfMonth) {
    // < 15 days leftover → +0 month
    // ≥ 15 days leftover → +1 month
    if (days >= 15) {
      months += 1;
    }
  } else {
    months = totalMonths + days / 30.4375;
  }

  months = Math.max(1, months);

  const monthlyRate = annualRate / 12 / 100;

  const interest =
    principal * monthlyRate * months;

  return {
    months: Math.round(months * 100) / 100,

    totalInterest:
      Math.round(interest * 100) / 100,

    receivableAmount:
      Math.round((principal + interest) * 100) /
      100,
  };
}

/* ------------------------------------------------------------------ */

function calcCompoundInterest(
  principal: number,
  annualRate: number,
  compounding: string,
  fromDate: Date,
  toDate: Date
) {
  const option = COMPOUNDING_OPTIONS.find(
    (o) => o.value === compounding
  );

  const n = option?.n ?? 12;

  const r = annualRate / 100;

  const msPerDay = 1000 * 60 * 60 * 24;

  const days = Math.floor(
    (toDate.getTime() - fromDate.getTime()) /
    msPerDay
  );

  const t = days / 365;

  const amount =
    principal * Math.pow(1 + r / n, n * t);

  const totalInterest = amount - principal;

  return {
    days,

    totalInterest:
      Math.round(totalInterest * 100) / 100,

    receivableAmount:
      Math.round(amount * 100) / 100,
  };
}

/* ================================================================== */

export default function ReleasePledgePage() {
  const params = useParams<{
    customerId: string;
    pledgeId: string;
  }>();

  const router = useRouter();

  const { language, t } = useLanguage();

  const locale =
    language === "hi" ? "hi-IN" : "en-IN";

  function fmt(n: number) {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 2,
    }).format(n);
  }

  const [pledge, setPledge] =
    useState<Pledge | null>(null);

  const [fetching, setFetching] =
    useState(true);

  const [fetchErr, setFetchErr] =
    useState("");

  const today = new Date()
    .toISOString()
    .split("T")[0];

  const [releaseDate, setReleaseDate] =
    useState(today);

  const [compounding, setCompounding] =
    useState("MONTHLY");

  const [useCompound, setUseCompound] =
    useState(false);

  const [roundHalfMonth, setRoundHalfMonth] =
    useState(false);

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  const [released, setReleased] =
    useState(false);

  const compoundingLabels: Record<
    string,
    string
  > = {
    MONTHLY: t("monthly"),
    QUARTERLY: t("quarterly"),
    YEARLY: t("yearly"),
  };

  /* ------------------------------------------------------------------ */

  useEffect(() => {
    if (!params.pledgeId) return;

    fetch(`/api/pledges/${params.pledgeId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) {
          throw new Error(data.error);
        }

        setPledge(data.pledge);

        setCompounding(
          data.pledge.compoundingDuration
        );
      })
      .catch((e) => setFetchErr(e.message))
      .finally(() => setFetching(false));
  }, [params.pledgeId]);

  /* ------------------------------------------------------------------ */

  const isBeforePledge = pledge
    ? new Date(releaseDate) <
    new Date(pledge.pledgeDate)
    : false;

  const simpleCalc =
    pledge && !isBeforePledge
      ? calcSimpleInterest(
        Number(pledge.loanAmount),
        Number(pledge.interestRate),
        new Date(pledge.pledgeDate),
        new Date(releaseDate),
        roundHalfMonth
      )
      : null;

  const compoundCalc =
    pledge && !isBeforePledge
      ? calcCompoundInterest(
        Number(pledge.loanAmount),
        Number(pledge.interestRate),
        compounding,
        new Date(pledge.pledgeDate),
        new Date(releaseDate)
      )
      : null;

  const calc = useCompound
    ? compoundCalc
    : simpleCalc;

  /* ------------------------------------------------------------------ */

  async function handleRelease() {
    if (!pledge || !calc) return;

    setError("");
    setLoading(true);

    try {
      const res = await fetch(
        `/api/pledges/${pledge.id}`,
        {
          method: "PATCH",

          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
            releaseDate,
            totalInterest:
              calc.totalInterest,
            receivableAmount:
              calc.receivableAmount,
            compoundingDuration:
              compounding,
            status: "RELEASED",
          }),
        }
      );

      if (!res.ok) {
        const data = await res.json();

        throw new Error(
          data.error ||
          "Failed to release pledge"
        );
      }

      setReleased(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  /* ------------------------------------------------------------------ */

  if (fetching) {
    return (
      <div className="max-w-2xl mx-auto p-6 space-y-6">
        <div>
          <div
            className="skeleton"
            style={{
              width: "140px",
              height: "14px",
              marginBottom: "12px",
            }}
          />

          <div
            className="skeleton"
            style={{
              width: "200px",
              height: "28px",
              marginBottom: "6px",
            }}
          />

          <div
            className="skeleton"
            style={{
              width: "220px",
              height: "14px",
            }}
          />
        </div>
      </div>
    );
  }

  /* ------------------------------------------------------------------ */

  if (fetchErr || !pledge) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <Alert variant="destructive">
          <AlertDescription>
            {fetchErr ||
              t("pledge_not_found")}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  /* ------------------------------------------------------------------ */

  if (released) {
    return (
      <div className="max-w-2xl mx-auto p-6 flex flex-col items-center gap-4 min-h-[40vh] justify-center text-center">
        <CheckCircle
          size={52}
          className="text-green-500"
        />

        <h2 className="text-2xl font-bold">
          {t("pledge_released")}
        </h2>

        <p className="text-gray-500 text-sm">
          {t("pledge_released_desc", {
            name: pledge.customer.name,
          })}
        </p>

        <Button
          onClick={() =>
            router.push(
              `/customers/${params.customerId}`
            )
          }
        >
          {t("back_to_cust_btn")}
        </Button>
      </div>
    );
  }

  /* ------------------------------------------------------------------ */

  const pledgeDateFormatted = new Date(
    pledge.pledgeDate
  ).toLocaleDateString(locale, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  /* ------------------------------------------------------------------ */

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <div>
        <Link
          href={`/customers/${params.customerId}/pledges/${params.pledgeId}`}
          className="text-sm text-gray-500 hover:underline"
        >
          {t("back_to_pledge")}
        </Link>

        <div className="flex items-center gap-3 mt-2">
          <h1 className="text-2xl font-bold">
            {t("release_pledge")}
          </h1>

          <Badge
            variant={
              pledge.status === "ACTIVE"
                ? "default"
                : "secondary"
            }
          >
            {t(
              getStatusKey(pledge.status)
            )}
          </Badge>
        </div>

        <p className="text-sm text-gray-500 mt-1">
          {t("review_confirm")}
        </p>
      </div>
    </div>
  );
}

function DetailRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex justify-between py-2 border-b last:border-0 text-sm">
      <span className="text-gray-500">
        {label}
      </span>

      <span className="font-medium text-right">
        {value}
      </span>
    </div>
  );
}