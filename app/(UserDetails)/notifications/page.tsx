"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Bell, CheckCheck, ChevronDown } from "lucide-react";

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

const TIER_CONFIG: Record<RiskTier, { label: string; color: string; bg: string; dot: string; border: string }> = {
  SAFE:       { label: "Safe",       color: "#4A6741", bg: "#EDF3EB", dot: "#5A8555", border: "#B3CEB0" },
  WATCH:      { label: "Watch",      color: "#7A5C1E", bg: "#FBF4E3", dot: "#C9A84C", border: "#DFC98A" },
  AT_RISK:    { label: "At Risk",    color: "#8B3A3A", bg: "#FAF0EF", dot: "#C97070", border: "#DFB3B0" },
  UNDERWATER: { label: "Underwater", color: "#4A3A6B", bg: "#F3F0FA", dot: "#8B78C9", border: "#C3B8DF" },
};

const ALERT_ICON: Record<AlertType, string> = {
  CRITICAL:    "🚨",
  TIER_CHANGE: "⚠️",
  INFO:        "ℹ️",
};

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────

function formatItemNames(items: PledgeItem[]): string {
  if (!items || items.length === 0) return "Pledge";
  const names = items.map((item) =>
    item.itemName?.trim() ? item.itemName.trim() : toTitleCase(item.itemType)
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
  const router = useRouter();
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
    setAlerts((prev) => prev.filter((a) => a.id !== id));
    setUnreadCount((c) => Math.max(0, c - 1));
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
    <div style={{ minHeight: "100vh", background: "var(--main-bg)" }}>
      <div style={{ maxWidth: "760px", margin: "0 auto", padding: "28px 24px 48px" }}>

        {/* ── Back Button ── */}
        <button
          onClick={() => router.back()}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            marginBottom: "24px",
            padding: "7px 14px 7px 10px",
            borderRadius: "8px",
            border: "1px solid var(--border-light)",
            background: "var(--card-bg)",
            color: "var(--text-secondary)",
            fontSize: "13px",
            fontWeight: 500,
            cursor: "pointer",
            transition: "all 0.15s ease",
            boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = "var(--sidebar-bg)";
            (e.currentTarget as HTMLButtonElement).style.color = "var(--text-primary)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = "var(--card-bg)";
            (e.currentTarget as HTMLButtonElement).style.color = "var(--text-secondary)";
          }}
        >
          <ArrowLeft size={15} strokeWidth={2.2} />
          Back
        </button>

        {/* ── Page Header ── */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "28px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div style={{
              width: "40px",
              height: "40px",
              borderRadius: "10px",
              background: "var(--sidebar-active-bg)",
              display: "grid",
              placeItems: "center",
            }}>
              <Bell size={18} strokeWidth={2} style={{ color: "var(--primary-brand)" }} />
            </div>
            <div>
              <h1 style={{ fontSize: "20px", fontWeight: 700, color: "var(--text-primary)", margin: 0, letterSpacing: "-0.3px" }}>
                Notifications
              </h1>
              {unreadCount > 0 && (
                <p style={{ fontSize: "12.5px", color: "var(--text-secondary)", margin: "2px 0 0" }}>
                  {unreadCount} unread alert{unreadCount !== 1 ? "s" : ""}
                </p>
              )}
            </div>
          </div>

          {unreadCount > 0 && (
            <button
              onClick={markAllRead}
              disabled={markingRead}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "8px 14px",
                borderRadius: "8px",
                border: "1px solid var(--border-light)",
                background: "var(--card-bg)",
                color: "var(--primary-brand)",
                fontSize: "12.5px",
                fontWeight: 600,
                cursor: markingRead ? "not-allowed" : "pointer",
                opacity: markingRead ? 0.5 : 1,
                transition: "all 0.15s ease",
                boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
              }}
              onMouseEnter={(e) => {
                if (!markingRead) (e.currentTarget as HTMLButtonElement).style.background = "var(--sidebar-bg)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background = "var(--card-bg)";
              }}
            >
              <CheckCheck size={14} strokeWidth={2.2} />
              {markingRead ? "Marking…" : "Mark all read"}
            </button>
          )}
        </div>

        {/* ── Filters ── */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: "10px", marginBottom: "20px" }}>

          {/* Unread toggle */}
          <div style={{
            display: "flex",
            background: "var(--card-bg)",
            border: "1px solid var(--border-light)",
            borderRadius: "10px",
            padding: "3px",
            gap: "2px",
          }}>
            {(["all", "unread"] as FilterUnread[]).map((f) => (
              <button
                key={f}
                onClick={() => setFilterUnread(f)}
                style={{
                  padding: "6px 14px",
                  borderRadius: "8px",
                  border: "none",
                  fontSize: "12.5px",
                  fontWeight: 600,
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                  background: filterUnread === f ? "var(--primary-brand)" : "transparent",
                  color: filterUnread === f ? "#fff" : "var(--text-secondary)",
                }}
              >
                {f === "all" ? "All" : "Unread"}
                {f === "unread" && unreadCount > 0 && (
                  <span style={{
                    marginLeft: "6px",
                    background: filterUnread === "unread" ? "rgba(255,255,255,0.25)" : "var(--notif-badge)",
                    color: filterUnread === "unread" ? "#fff" : "var(--text-primary)",
                    fontSize: "11px",
                    fontWeight: 700,
                    borderRadius: "999px",
                    padding: "1px 7px",
                  }}>
                    {unreadCount}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Tier filters */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
            {(["all", "SAFE", "WATCH", "AT_RISK", "UNDERWATER"] as FilterTier[]).map((tier) => {
              const config   = tier !== "all" ? TIER_CONFIG[tier as RiskTier] : null;
              const isActive = filterTier === tier;
              return (
                <button
                  key={tier}
                  onClick={() => setFilterTier(tier)}
                  style={{
                    padding: "6px 13px",
                    borderRadius: "8px",
                    border: `1px solid ${isActive && config ? config.border : "var(--border-light)"}`,
                    fontSize: "12px",
                    fontWeight: 600,
                    cursor: "pointer",
                    transition: "all 0.15s ease",
                    background: isActive && config ? config.bg : "var(--card-bg)",
                    color: isActive && config ? config.color : "var(--text-secondary)",
                  }}
                >
                  {tier === "all" ? "All tiers" : TIER_CONFIG[tier as RiskTier].label}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Divider ── */}
        <div style={{ height: "1px", background: "var(--divider-soft)", marginBottom: "16px" }} />

        {/* ── List ── */}
        {loading ? (
          <SkeletonList />
        ) : visible.length === 0 ? (
          <EmptyState filter={filterUnread} />
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {visible.map((alert, i) => (
              <AlertCard key={alert.id} alert={alert} onRead={markOneRead} index={i} />
            ))}

            {hasMore && filterTier === "all" && (
              <button
                onClick={() => fetchAlerts(false)}
                disabled={loadingMore}
                style={{
                  width: "100%",
                  padding: "12px",
                  marginTop: "4px",
                  borderRadius: "10px",
                  border: "1px dashed var(--border-light)",
                  background: "transparent",
                  color: "var(--text-secondary)",
                  fontSize: "13px",
                  fontWeight: 500,
                  cursor: loadingMore ? "not-allowed" : "pointer",
                  opacity: loadingMore ? 0.5 : 1,
                  transition: "all 0.15s ease",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "6px",
                }}
              >
                <ChevronDown size={14} />
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

function AlertCard({ alert, onRead, index }: { alert: Alert; onRead: (id: string) => void; index: number }) {
  const tierConfig = TIER_CONFIG[alert.newTier];
  const itemLabel  = formatItemNames(alert.pledge.items);
  const [hovered, setHovered] = useState(false);

  const handleClick = () => onRead(alert.id);

  return (
    <Link
      href={`/customers/${alert.pledge.customerId}/pledges/${alert.pledge.id}`}
      onClick={handleClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: "relative",
        display: "block",
        background: hovered
          ? "var(--card-alt)"
          : !alert.isRead
          ? "var(--card-bg)"
          : "var(--card-bg)",
        borderRadius: "12px",
        border: `1px solid ${hovered ? "var(--secondary-light)" : !alert.isRead ? "var(--border-light)" : "var(--divider-soft)"}`,
        boxShadow: !alert.isRead
          ? hovered ? "0 4px 16px rgba(86,92,63,0.10)" : "0 2px 8px rgba(0,0,0,0.05)"
          : "none",
        textDecoration: "none",
        transition: "all 0.18s ease",
        opacity: alert.isRead ? 0.75 : 1,
        animationDelay: `${index * 40}ms`,
        animation: "fadeSlideUp 0.35s ease-out both",
      }}
    >
      {/* Unread indicator stripe */}
      {!alert.isRead && (
        <span style={{
          position: "absolute",
          left: 0,
          top: "12px",
          bottom: "12px",
          width: "3px",
          borderRadius: "0 3px 3px 0",
          background: "var(--primary-brand)",
        }} />
      )}

      <div style={{ padding: "14px 16px 14px 18px" }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: "12px" }}>

          {/* Alert icon */}
          <span style={{
            fontSize: "18px",
            lineHeight: 1,
            marginTop: "2px",
            flexShrink: 0,
            width: "32px",
            height: "32px",
            borderRadius: "8px",
            background: tierConfig.bg,
            display: "grid",
            placeItems: "center",
          }}>
            {ALERT_ICON[alert.alertType]}
          </span>

          <div style={{ flex: 1, minWidth: 0 }}>

            {/* Top row: customer · item | time */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px", marginBottom: "4px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "6px", minWidth: 0, overflow: "hidden" }}>
                <span style={{ fontWeight: 700, fontSize: "13.5px", color: "var(--text-primary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {alert.customer.name}
                </span>
                <span style={{ color: "var(--text-muted)", fontSize: "11px", flexShrink: 0 }}>·</span>
                <span style={{ fontSize: "12px", color: "var(--text-secondary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {itemLabel}
                </span>
              </div>
              <span style={{ fontSize: "11.5px", color: "var(--text-muted)", flexShrink: 0 }}>
                {formatRelativeTime(alert.createdAt)}
              </span>
            </div>

            {/* Message */}
            <p style={{ fontSize: "13px", color: "var(--text-secondary)", lineHeight: "1.5", margin: "0 0 10px" }}>
              {alert.message}
            </p>

            {/* Tier badges + metrics */}
            <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "6px" }}>

              {/* New tier badge */}
              <span style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "5px",
                padding: "3px 9px",
                borderRadius: "6px",
                fontSize: "11.5px",
                fontWeight: 700,
                background: tierConfig.bg,
                color: tierConfig.color,
                border: `1px solid ${tierConfig.border}`,
              }}>
                <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: tierConfig.dot, flexShrink: 0 }} />
                {tierConfig.label}
              </span>

              {/* Old tier badge */}
              {alert.oldTier && alert.oldTier !== alert.newTier && (
                <>
                  <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>from</span>
                  <span style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "5px",
                    padding: "3px 9px",
                    borderRadius: "6px",
                    fontSize: "11.5px",
                    fontWeight: 600,
                    background: TIER_CONFIG[alert.oldTier].bg,
                    color: TIER_CONFIG[alert.oldTier].color,
                    opacity: 0.65,
                  }}>
                    {TIER_CONFIG[alert.oldTier].label}
                  </span>
                </>
              )}

              {/* LTV */}
              {alert.pledge.lastCalculatedLtv && (
                <>
                  <span style={{ color: "var(--divider-soft)", fontSize: "12px" }}>·</span>
                  <span style={{ fontSize: "12px", color: "var(--text-secondary)" }}>
                    LTV <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>
                      {Number(alert.pledge.lastCalculatedLtv).toFixed(1)}%
                    </span>
                  </span>
                </>
              )}

              {/* Owed */}
              {alert.pledge.lastAmountOwed && (
                <>
                  <span style={{ color: "var(--divider-soft)", fontSize: "12px" }}>·</span>
                  <span style={{ fontSize: "12px", color: "var(--text-secondary)" }}>
                    Owed <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>
                      {formatCurrency(alert.pledge.lastAmountOwed)}
                    </span>
                  </span>
                </>
              )}

              {/* View pledge arrow */}
              <span style={{
                marginLeft: "auto",
                fontSize: "11.5px",
                color: hovered ? "var(--primary-brand)" : "var(--text-muted)",
                display: "flex",
                alignItems: "center",
                gap: "3px",
                transition: "color 0.15s",
                fontWeight: 500,
              }}>
                View pledge
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
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

// ─────────────────────────────────────────────
// SKELETON
// ─────────────────────────────────────────────

function SkeletonList() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
      {[...Array(5)].map((_, i) => (
        <div key={i} style={{
          background: "var(--card-bg)",
          borderRadius: "12px",
          border: "1px solid var(--divider-soft)",
          padding: "14px 16px",
        }}>
          <div style={{ display: "flex", gap: "12px" }}>
            <div className="skeleton" style={{ width: "32px", height: "32px", borderRadius: "8px", flexShrink: 0 }} />
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "8px" }}>
              <div className="skeleton" style={{ height: "13px", borderRadius: "6px", width: "35%" }} />
              <div className="skeleton" style={{ height: "12px", borderRadius: "6px", width: "78%" }} />
              <div className="skeleton" style={{ height: "11px", borderRadius: "6px", width: "50%" }} />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────
// EMPTY STATE
// ─────────────────────────────────────────────

function EmptyState({ filter }: { filter: FilterUnread }) {
  return (
    <div style={{ textAlign: "center", padding: "64px 0" }}>
      <div style={{
        width: "64px",
        height: "64px",
        borderRadius: "16px",
        background: "var(--sidebar-bg)",
        display: "grid",
        placeItems: "center",
        margin: "0 auto 16px",
        fontSize: "28px",
      }}>
        {filter === "unread" ? "✅" : "🔔"}
      </div>
      <p style={{ fontWeight: 700, fontSize: "15px", color: "var(--text-primary)", margin: "0 0 6px" }}>
        {filter === "unread" ? "All caught up!" : "No notifications yet"}
      </p>
      <p style={{ fontSize: "13px", color: "var(--text-muted)", margin: 0 }}>
        {filter === "unread" ? "No unread alerts right now" : "Risk tier changes will appear here"}
      </p>
    </div>
  );
}