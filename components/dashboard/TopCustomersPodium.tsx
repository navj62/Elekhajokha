"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { User, Trophy, Archive, IndianRupee } from "lucide-react";

export interface TopCustomer {
  id: string;
  name: string;
  mobile: string | null;
  customerImg: string | null;
  createdAt: string;
  totalLoanAmount: number;
  activePledges: number;
}

interface TopCustomersPodiumProps {
  data?: {
    byLoanTaken: TopCustomer[];
    byActivePledges: TopCustomer[];
  };
  t: (key: string) => string;
}

const formatCurrency = (val: number) => {
  if (val >= 10000000) return `₹${(val / 10000000).toFixed(2)}Cr`;
  if (val >= 100000) return `₹${(val / 100000).toFixed(2)}L`;
  if (val >= 1000) return `₹${(val / 1000).toFixed(1)}K`;
  return `₹${val.toLocaleString()}`;
};

const RANK_STYLES = [
  {
    // index 0 in displayOrder → Rank #2, Left
    bg: "#FF8A5B",
    gradientTo: "#e87a4e",
    glow: "0 0 28px rgba(255,138,91,0.25)",
    glowHover: "0 0 36px rgba(255,138,91,0.38)",
    height: 95,
    widthClass: "w-[30%]",
    label: "#2",
  },
  {
    // index 1 in displayOrder → Rank #1, Center
    bg: "#3F7D4C",
    gradientTo: "#356b41",
    glow: "0 0 35px rgba(63,125,76,0.30)",
    glowHover: "0 0 44px rgba(63,125,76,0.48)",
    height: 140,
    widthClass: "w-[38%]",
    label: "#1",
  },
  {
    // index 2 in displayOrder → Rank #3, Right
    bg: "#5668FF",
    gradientTo: "#4a5be0",
    glow: "0 0 25px rgba(86,104,255,0.22)",
    glowHover: "0 0 34px rgba(86,104,255,0.36)",
    height: 75,
    widthClass: "w-[30%]",
    label: "#3",
  },
];

export function TopCustomersPodium({ data, t }: TopCustomersPodiumProps) {
  const [tab, setTab] = useState<"loan" | "pledges">("loan");

  const customers =
    tab === "loan" ? data?.byLoanTaken || [] : data?.byActivePledges || [];

  // Strict order: Left=#2, Center=#1, Right=#3
  const displayOrder = [customers[1], customers[0], customers[2]];

  return (
    <div
      className="rounded-2xl flex flex-col w-full overflow-hidden"
      style={{
        height: 280,
        backgroundColor: "var(--card-bg)",
        border: "1px solid var(--border-light)",
      }}
    >
      {/* ── Header ── */}
      <div
        className="flex items-center justify-between shrink-0 border-b"
        style={{
          height: 52,
          padding: "12px 16px",
          borderColor: "var(--border-light)",
        }}
      >
        <div className="flex items-center gap-2">
          <Trophy size={15} className="text-[#3F7D4C]" />
          <h2
            className="text-[13px] font-bold whitespace-nowrap"
            style={{ color: "var(--text-primary)" }}
          >
            Top 3 Customers
          </h2>
        </div>

        <div
          className="flex p-[3px] rounded-lg shrink-0"
          style={{ backgroundColor: "var(--bg-secondary)", height: 32 }}
        >
          <button
            onClick={() => setTab("loan")}
            className={`px-3 text-[10px] font-bold rounded-md transition-all ${
              tab === "loan"
                ? "bg-white shadow-sm"
                : "opacity-50 hover:opacity-80"
            }`}
            style={{ color: "var(--text-primary)" }}
          >
            By Loan
          </button>
          <button
            onClick={() => setTab("pledges")}
            className={`px-3 text-[10px] font-bold rounded-md transition-all ${
              tab === "pledges"
                ? "bg-white shadow-sm"
                : "opacity-50 hover:opacity-80"
            }`}
            style={{ color: "var(--text-primary)" }}
          >
            By Pledges
          </button>
        </div>
      </div>

      {/* ── Podium Area ── */}
      <div
        className="relative flex-1"
        style={{ height: 210, padding: "8px 12px 14px" }}
      >
        {customers.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full opacity-40">
            <Trophy size={28} className="mb-1.5 text-gray-400" />
            <p
              className="text-[11px] font-medium"
              style={{ color: "var(--text-muted)" }}
            >
              No rankings yet
            </p>
          </div>
        ) : (
          <div className="flex items-end justify-center w-full h-full gap-[6px]">
            {displayOrder.map((c, i) => {
              const rank = RANK_STYLES[i];
              if (!c) return <div key={i} className={rank.widthClass} />;

              const metric =
                tab === "loan"
                  ? formatCurrency(c.totalLoanAmount)
                  : `${c.activePledges} pledges`;

              return (
                <Link
                  key={c.id}
                  href={`/customers/${c.id}`}
                  className={`group relative flex flex-col items-center justify-end ${rank.widthClass} cursor-pointer`}
                >
                  {/* ── Hover Tooltip (above podium) ── */}
                  <div
                    className="absolute left-1/2 -translate-x-1/2 opacity-0 translate-y-1 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-200 pointer-events-none z-50"
                    style={{ bottom: rank.height + 18 }}
                  >
                    <div className="bg-white rounded-xl shadow-lg border border-gray-100/80 py-3 px-3 flex flex-col items-center text-center"
                         style={{ width: 140 }}>
                      <div className="w-[36px] h-[36px] rounded-full overflow-hidden mb-1.5 bg-gray-50 flex items-center justify-center shrink-0 border border-gray-100">
                        {c.customerImg ? (
                          <Image
                            src={c.customerImg}
                            alt={c.name}
                            width={36}
                            height={36}
                            className="object-cover"
                          />
                        ) : (
                          <User size={16} className="text-gray-400" />
                        )}
                      </div>
                      <span className="text-[11px] font-bold text-gray-800 line-clamp-1 w-full">
                        {c.name}
                      </span>
                      <span className="text-[10px] font-semibold text-gray-500 mt-0.5">
                        {metric}
                      </span>
                    </div>
                    {/* triangle */}
                    <div className="w-2.5 h-2.5 bg-white border-b border-r border-gray-100/80 rotate-45 mx-auto -mt-[6px] shadow-sm" />
                  </div>

                  {/* ── Podium Block ── */}
                  <div
                    className="relative w-full rounded-t-2xl transition-all duration-200 group-hover:brightness-105"
                    style={{
                      height: rank.height,
                      background: `linear-gradient(180deg, ${rank.bg} 0%, ${rank.gradientTo} 100%)`,
                      boxShadow: rank.glow,
                      // soft inner shadow
                      filter: undefined,
                    }}
                  >
                    {/* inner top highlight */}
                    <div
                      className="absolute inset-x-0 top-0 rounded-t-2xl pointer-events-none"
                      style={{
                        height: "40%",
                        background:
                          "linear-gradient(180deg, rgba(255,255,255,0.12) 0%, transparent 100%)",
                      }}
                    />

                    {/* Rank Badge */}
                    <div
                      className="absolute left-1/2 -translate-x-1/2 w-[26px] h-[26px] rounded-full flex items-center justify-center text-[10px] font-bold bg-white shadow-sm z-10"
                      style={{
                        top: -10,
                        color: "#333",
                        border: "1px solid rgba(0,0,0,0.06)",
                      }}
                    >
                      {rank.label}
                    </div>

                    {/* Hover glow overlay */}
                    <div
                      className="absolute inset-0 rounded-t-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none"
                      style={{ boxShadow: rank.glowHover }}
                    />
                  </div>
                </Link>
              );
            })}
          </div>
        )}

        {/* ── Base Platform ── */}
        {customers.length > 0 && (
          <div
            className="absolute left-1/2 -translate-x-1/2 rounded-full"
            style={{
              width: "90%",
              height: 6,
              bottom: 8,
              backgroundColor: "#ECECEC",
            }}
          />
        )}
      </div>
    </div>
  );
}
