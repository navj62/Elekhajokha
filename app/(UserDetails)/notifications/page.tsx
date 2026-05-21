"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";

// ─────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────

type RiskTier = "SAFE" | "WATCH" | "AT_RISK" | "UNDERWATER";
type AlertType = "TIER_CHANGE" | "CRITICAL" | "INFO";

interface PledgeItem {
  itemName: string | null;
  itemType: string;
  metalType: string;
}

interface Alert {
  id: string;
  oldTier: RiskTier | null;
  newTier: RiskTier;
  alertType: AlertType;
  message: string;
  isRead: boolean;
  createdAt: string;
  pledge: {
    id: string;
    customerId: string;
    loanAmount: string;
    lastCalculatedLtv: string | null;
    lastMarketValue: string | null;
    lastAmountOwed: string | null;
    items: PledgeItem[];
  };
  customer: { id: string; name: string };
}

type FilterUnread = "all" | "unread";
type FilterTier   = "all" | RiskTier;

// ─────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────

const TIER_CONFIG: Record<RiskTier, { label: string; color: string; bg: string; dot: string }> = {
  SAFE:       { label: "Safe",       color: "#16a34a", bg: "#f0fdf4", dot: "#22c55e" },
  WATCH:      { label: "Watch",      color: "#d97706", bg: "#fffbeb", dot: "#f59e0b" },
  AT_RISK:    { label: "At Risk",    color: "#dc2626", bg: "#fef2f2", dot: "#ef4444" },
  UNDERWATER: { label: "Underwater", color: "#7c3aed", bg: "#faf5ff", dot: "#8b5cf6" },
};

const ALERT_ICON: Record<AlertType, string> = {
  CRITICAL:    "🚨",
  TIER_CHANGE: "⚠️",
  INFO:        "ℹ️",
};

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────

// "Gold Chain, Ring +1 more" from items array
function formatItemNames(items: PledgeItem[]): string {
  if (!items || items.length === 0) return "Pledge";

  const names = items.map((item) =>
    item.itemName?.trim()
      ? item.itemName.trim()
      : toTitleCase(item.itemType)
  );

  if (names.length <= 2) return names.join(", ");
  return `${names[0]}, ${names[1]} +${names.length - 2} more`;
}

function toTitleCase(str: string) {
  return str.charAt(0) + str.slice(1).toLowerCase().replace(/_/g, " ");
}

function formatRelativeTime(dateStr: string): string {
  const diff  = Date.now() - new Date(dateStr).getTime();
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days  = Math.floor(diff / 86400000);
  if (mins  < 1)  return "just now";
  if (mins  < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days  < 7)  return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

function formatCurrency(val: string | null): string {
  if (!val) return "—";
  return "₹" + Number(val).toLocaleString("en-IN", { maximumFractionDigits: 0 });
}

// ─────────────────────────────────────────────
// PAGE
// ─────────────────────────────────────────────

export default function NotificationsPage() {
  const [alerts, setAlerts]           = useState<Alert[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading]         = useState(true);
  const [markingRead, setMarkingRead] = useState(false);
  const [hasMore, setHasMore]         = useState(false);
  const [nextCursor, setNextCursor]   = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [filterUnread, setFilterUnread] = useState<FilterUnread>("all");
  const [filterTier,   setFilterTier]   = useState<FilterTier>("all");

  const fetchAlerts = useCallback(async (reset = true) => {
    if (reset) setLoading(true);
    else setLoadingMore(true);

    try {
      const params = new URLSearchParams({ take: "20" });
      if (filterUnread === "unread") params.set("unreadOnly", "true");
      if (!reset && nextCursor)      params.set("cursor", nextCursor);

      const res  = await fetch(`/api/notifications?${params}`);
      const data = await res.json();
      setAlerts((prev) => reset ? data.alerts : [...prev, ...data.alerts]);
      setUnreadCount(data.unreadCount);
      setHasMore(data.hasMore);
      setNextCursor(data.nextCursor);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [filterUnread, nextCursor]);

  useEffect(() => { fetchAlerts(true); }, [filterUnread]);

  const markAllRead = async () => {
    setMarkingRead(true);
    await fetch("/api/notifications/read", { method: "PATCH" });
    setAlerts((prev) => prev.map((a) => ({ ...a, isRead: true })));
    setUnreadCount(0);
    setMarkingRead(false);
  };

  const markOneRead = async (id: string) => {
    if (alerts.find((a) => a.id === id)?.isRead) return;
    // Optimistically remove from list immediately — no waiting for API
    setAlerts((prev) => prev.filter((a) => a.id !== id));
    setUnreadCount((c) => Math.max(0, c - 1));
    // Fire-and-forget — persist in background
    fetch("/api/notifications/read", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: [id] }),
    });
  };

  const visible = filterTier === "all"
    ? alerts
    : alerts.filter((a) => a.newTier === filterTier);

  return (
    <div className="min-h-screen bg-[#f8f7f4]">
      <div className="max-w-3xl mx-auto px-4 py-8">

        {/* Header */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="text-2xl font-semibold text-[#1a1a1a] tracking-tight">
              Notifications
            </h1>
            {unreadCount > 0 && (
              <p className="text-sm text-[#6b7280] mt-1">
                {unreadCount} unread alert{unreadCount !== 1 ? "s" : ""}
              </p>
            )}
          </div>
          {unreadCount > 0 && (
            <button
              onClick={markAllRead}
              disabled={markingRead}
              className="text-sm text-[#4f46e5] hover:text-[#4338ca] font-medium disabled:opacity-50 transition-colors"
            >
              {markingRead ? "Marking…" : "Mark all read"}
            </button>
          )}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2 mb-6">
          <div className="flex bg-white border border-[#e5e7eb] rounded-lg p-0.5 gap-0.5">
            {(["all", "unread"] as FilterUnread[]).map((f) => (
              <button
                key={f}
                onClick={() => setFilterUnread(f)}
                className={`px-3 py-1.5 text-sm rounded-md font-medium transition-all ${
                  filterUnread === f
                    ? "bg-[#1a1a1a] text-white"
                    : "text-[#6b7280] hover:text-[#1a1a1a]"
                }`}
              >
                {f === "all" ? "All" : "Unread"}
                {f === "unread" && unreadCount > 0 && (
                  <span className="ml-1.5 bg-[#ef4444] text-white text-xs rounded-full px-1.5 py-0.5">
                    {unreadCount}
                  </span>
                )}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap gap-1.5">
            {(["all", "SAFE", "WATCH", "AT_RISK", "UNDERWATER"] as FilterTier[]).map((tier) => {
              const config   = tier !== "all" ? TIER_CONFIG[tier as RiskTier] : null;
              const isActive = filterTier === tier;
              return (
                <button
                  key={tier}
                  onClick={() => setFilterTier(tier)}
                  style={isActive && config ? { backgroundColor: config.bg, color: config.color, borderColor: config.color } : {}}
                  className={`px-3 py-1.5 text-sm rounded-lg border font-medium transition-all ${
                    isActive
                      ? "border-current"
                      : "bg-white border-[#e5e7eb] text-[#6b7280] hover:border-[#d1d5db] hover:text-[#374151]"
                  }`}
                >
                  {tier === "all" ? "All tiers" : TIER_CONFIG[tier as RiskTier].label}
                </button>
              );
            })}
          </div>
        </div>

        {/* List */}
        {loading ? (
          <SkeletonList />
        ) : visible.length === 0 ? (
          <EmptyState filter={filterUnread} />
        ) : (
          <div className="space-y-2">
            {visible.map((alert) => (
              <AlertCard key={alert.id} alert={alert} onRead={markOneRead} />
            ))}
            {hasMore && filterTier === "all" && (
              <button
                onClick={() => fetchAlerts(false)}
                disabled={loadingMore}
                className="w-full py-3 text-sm text-[#6b7280] hover:text-[#374151] font-medium transition-colors disabled:opacity-50"
              >
                {loadingMore ? "Loading…" : "Load more"}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// ALERT CARD
// ─────────────────────────────────────────────

function AlertCard({ alert, onRead }: { alert: Alert; onRead: (id: string) => void }) {
  const tierConfig = TIER_CONFIG[alert.newTier];
  const itemLabel  = formatItemNames(alert.pledge.items);

  const handleClick = () => onRead(alert.id);

  return (
    // ← entire card is a link to the pledge detail page
    <Link
      href={`/customers/${alert.pledge.customerId}/pledges/${alert.pledge.id}`}
      onClick={handleClick}
      className={`relative block bg-white rounded-xl border transition-all group ${
        !alert.isRead
          ? "border-[#e5e7eb] shadow-sm hover:shadow-md"
          : "border-[#f3f4f6] hover:border-[#e5e7eb]"
      }`}
    >
      {!alert.isRead && (
        <span className="absolute top-4 right-4 w-2 h-2 rounded-full bg-[#4f46e5]" />
      )}

      <div className="p-4">
        <div className="flex items-start gap-3">
          <span className="text-lg leading-none mt-0.5 shrink-0">
            {ALERT_ICON[alert.alertType]}
          </span>

          <div className="flex-1 min-w-0">
            {/* Customer + item name + time */}
            <div className="flex items-center justify-between gap-2 mb-0.5">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="font-semibold text-[#1a1a1a] text-sm truncate">
                  {alert.customer.name}
                </span>
                <span className="text-[#d1d5db] text-xs shrink-0">·</span>
                <span className="text-xs text-[#6b7280] truncate">
                  {itemLabel}
                </span>
              </div>
              <span className="text-xs text-[#9ca3af] shrink-0">
                {formatRelativeTime(alert.createdAt)}
              </span>
            </div>

            {/* Message */}
            <p className="text-sm text-[#4b5563] leading-snug mb-3">
              {alert.message}
            </p>

            {/* Tier + metrics */}
            <div className="flex flex-wrap items-center gap-2">
              <span
                className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-semibold"
                style={{ backgroundColor: tierConfig.bg, color: tierConfig.color }}
              >
                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: tierConfig.dot }} />
                {tierConfig.label}
              </span>

              {alert.oldTier && alert.oldTier !== alert.newTier && (
                <>
                  <span className="text-xs text-[#d1d5db]">from</span>
                  <span
                    className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-medium opacity-60"
                    style={{ backgroundColor: TIER_CONFIG[alert.oldTier].bg, color: TIER_CONFIG[alert.oldTier].color }}
                  >
                    {TIER_CONFIG[alert.oldTier].label}
                  </span>
                </>
              )}

              {alert.pledge.lastCalculatedLtv && (
                <>
                  <span className="text-[#e5e7eb] text-xs">·</span>
                  <span className="text-xs text-[#6b7280]">
                    LTV <span className="font-medium text-[#374151]">
                      {Number(alert.pledge.lastCalculatedLtv).toFixed(1)}%
                    </span>
                  </span>
                </>
              )}

              {alert.pledge.lastAmountOwed && (
                <>
                  <span className="text-[#e5e7eb] text-xs">·</span>
                  <span className="text-xs text-[#6b7280]">
                    Owed <span className="font-medium text-[#374151]">
                      {formatCurrency(alert.pledge.lastAmountOwed)}
                    </span>
                  </span>
                </>
              )}

              {/* View pledge arrow */}
              <span className="ml-auto text-xs text-[#9ca3af] group-hover:text-[#4f46e5] transition-colors flex items-center gap-0.5">
                View pledge
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </span>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}

function SkeletonList() {
  return (
    <div className="space-y-2">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="bg-white rounded-xl border border-[#f3f4f6] p-4">
          <div className="flex gap-3">
            <div className="w-7 h-7 rounded-lg bg-[#f3f4f6] animate-pulse shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-[#f3f4f6] rounded animate-pulse w-1/3" />
              <div className="h-3 bg-[#f3f4f6] rounded animate-pulse w-4/5" />
              <div className="h-3 bg-[#f3f4f6] rounded animate-pulse w-2/4" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyState({ filter }: { filter: FilterUnread }) {
  return (
    <div className="text-center py-20">
      <div className="text-4xl mb-4">{filter === "unread" ? "✅" : "🔔"}</div>
      <p className="text-[#374151] font-medium">
        {filter === "unread" ? "All caught up" : "No notifications yet"}
      </p>
      <p className="text-sm text-[#9ca3af] mt-1">
        {filter === "unread" ? "No unread alerts right now" : "Risk tier changes will appear here"}
      </p>
    </div>
  );
}