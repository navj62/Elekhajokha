"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";

// ─────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────

type RiskTier  = "SAFE" | "WATCH" | "AT_RISK" | "UNDERWATER";
type AlertType = "CRITICAL" | "TIER_CHANGE" | "INFO";

interface PledgeItem {
  itemName:  string | null;
  itemType:  string;
  metalType: string;
}

interface Alert {
  id: string;
  newTier:   RiskTier;
  oldTier:   RiskTier | null;
  alertType: AlertType;
  message:   string;
  isRead:    boolean;
  createdAt: string;
  customer: { id: string; name: string };
  pledge: {
    id: string;
    customerId: string;
    lastCalculatedLtv: string | null;
    lastAmountOwed:    string | null;
    items:             PledgeItem[];
  };
}

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

function formatItemNames(items: PledgeItem[]): string {
  if (!items || items.length === 0) return "Pledge";
  const names = items.map((item) =>
    item.itemName?.trim()
      ? item.itemName.trim()
      : item.itemType.charAt(0) + item.itemType.slice(1).toLowerCase().replace(/_/g, " ")
  );
  if (names.length <= 2) return names.join(", ");
  return `${names[0]}, ${names[1]} +${names.length - 2} more`;
}

// Older alerts baked the raw pledge id into the message ("Pledge <id> moved
// to …"). Swap that exact prefix for the human item label. New alerts already
// use the label, so the replace is a harmless no-op for them.
function displayMessage(alert: Alert, itemLabel: string): string {
  return alert.message.replace(`Pledge ${alert.pledge.id}`, itemLabel);
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

// ─────────────────────────────────────────────
// BELL ICON
// ─────────────────────────────────────────────

function BellIcon({ hasUnread }: { hasUnread: boolean }) {
  return (
    <svg
      width="20" height="20" viewBox="0 0 24 24"
      fill="none" stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round"
      className={hasUnread ? "animate-[ring_0.5s_ease-in-out]" : ""}
    >
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  );
}

// ─────────────────────────────────────────────
// NOTIFICATION BELL
// ─────────────────────────────────────────────

export function NotificationBell() {
  const [open, setOpen]               = useState(false);
  const [alerts, setAlerts]           = useState<Alert[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading]         = useState(false);
  const [markingRead, setMarkingRead] = useState(false);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef   = useRef<HTMLButtonElement>(null);

  const fetchAlerts = useCallback(async () => {
    setLoading(true);
    try {
      const res  = await fetch("/api/notifications?take=8");
      const data = await res.json();
      setAlerts(data.alerts ?? []);
      setUnreadCount(data.unreadCount ?? 0);
    } finally {
      setLoading(false);
    }
  }, []);

  // Poll badge count every 60s when closed
  useEffect(() => {
    fetchAlerts();
    const interval = setInterval(async () => {
      if (open) return;
      const res  = await fetch("/api/notifications?take=1");
      const data = await res.json();
      setUnreadCount(data.unreadCount ?? 0);
    }, 60_000);
    return () => clearInterval(interval);
  }, [fetchAlerts, open]);

  // Refetch when dropdown opens
  useEffect(() => { if (open) fetchAlerts(); }, [open, fetchAlerts]);

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (
        dropdownRef.current && !dropdownRef.current.contains(e.target as Node) &&
        !buttonRef.current?.contains(e.target as Node)
      ) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // Close on Escape
  useEffect(() => {
    function handleKey(e: KeyboardEvent) { if (e.key === "Escape") setOpen(false); }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, []);

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

  // Delete a single notification — optimistic, refetch on failure to resync.
  const deleteOne = async (id: string) => {
    const target = alerts.find((a) => a.id === id);
    if (!target) return;
    setAlerts((prev) => prev.filter((a) => a.id !== id));
    if (!target.isRead) setUnreadCount((c) => Math.max(0, c - 1));
    try {
      const res = await fetch("/api/notifications", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: [id] }),
      });
      if (!res.ok) throw new Error("delete failed");
    } catch {
      fetchAlerts(); // resync from server on failure
    }
  };

  // Clear every notification — confirm first, optimistic, rollback on failure.
  const clearAll = async () => {
    if (alerts.length === 0) return;
    if (!window.confirm("Delete all notifications? This cannot be undone.")) return;
    const prevAlerts = alerts;
    const prevUnread = unreadCount;
    setAlerts([]);
    setUnreadCount(0);
    try {
      const res = await fetch("/api/notifications", { method: "DELETE" });
      if (!res.ok) throw new Error("delete failed");
    } catch {
      setAlerts(prevAlerts);   // rollback
      setUnreadCount(prevUnread);
    }
  };

  const hasUnread = unreadCount > 0;

  return (
    <div className="relative">
      {/* Bell button */}
      <button
        ref={buttonRef}
        onClick={() => setOpen((v) => !v)}
        aria-label={`Notifications${hasUnread ? `, ${unreadCount} unread` : ""}`}
        className={`relative flex items-center justify-center w-9 h-9 rounded-xl transition-all ${
          open ? "bg-[#f3f4f6] text-[#1a1a1a]" : "text-[#6b7280] hover:bg-[#f9fafb] hover:text-[#1a1a1a]"
        }`}
      >
        <BellIcon hasUnread={hasUnread} />
        {hasUnread && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center bg-[#ef4444] text-white text-[10px] font-bold rounded-full px-1 leading-none">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div
          ref={dropdownRef}
          className="absolute right-0 top-11 w-[400px] bg-white rounded-2xl shadow-xl border border-[#e5e7eb] z-50 overflow-hidden"
          style={{ animation: "dropIn 0.15s ease-out" }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-[#f3f4f6]">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-[#1a1a1a] text-sm">Notifications</span>
              {hasUnread && (
                <span className="bg-[#ef4444] text-white text-[10px] font-bold rounded-full px-1.5 py-0.5 leading-none">
                  {unreadCount}
                </span>
              )}
            </div>
            <div className="flex items-center gap-3">
              {hasUnread && (
                <button
                  onClick={markAllRead}
                  disabled={markingRead}
                  className="text-xs text-[#4f46e5] hover:text-[#4338ca] font-medium disabled:opacity-50 transition-colors"
                >
                  {markingRead ? "Marking…" : "Mark all read"}
                </button>
              )}
              {alerts.length > 0 && (
                <button
                  onClick={clearAll}
                  className="text-xs text-[#dc2626] hover:text-[#b91c1c] font-medium transition-colors"
                >
                  Clear all
                </button>
              )}
            </div>
          </div>

          {/* Body */}
          <div className="max-h-[420px] overflow-y-auto">
            {loading ? (
              <DropdownSkeleton />
            ) : alerts.length === 0 ? (
              <DropdownEmpty />
            ) : (
              <ul>
                {alerts.map((alert, i) => (
                  <li key={alert.id}>
                    <DropdownItem alert={alert} onRead={markOneRead} onDelete={deleteOne} onClose={() => setOpen(false)} />
                    {i < alerts.length - 1 && <div className="mx-4 h-px bg-[#f3f4f6]" />}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-[#f3f4f6] px-4 py-2.5">
            <Link
              href="/notifications"
              onClick={() => setOpen(false)}
              className="flex items-center justify-center gap-1.5 text-sm text-[#4f46e5] hover:text-[#4338ca] font-medium transition-colors py-0.5"
            >
              View all notifications
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
        </div>
      )}

      <style>{`
        @keyframes dropIn {
          from { opacity: 0; transform: translateY(-6px) scale(0.98); }
          to   { opacity: 1; transform: translateY(0)   scale(1); }
        }
        @keyframes ring {
          0%, 100% { transform: rotate(0deg); }
          20%       { transform: rotate(-15deg); }
          40%       { transform: rotate(15deg); }
          60%       { transform: rotate(-10deg); }
          80%       { transform: rotate(10deg); }
        }
      `}</style>
    </div>
  );
}

// ─────────────────────────────────────────────
// DROPDOWN ITEM — links directly to pledge
// ─────────────────────────────────────────────

function DropdownItem({ alert, onRead, onDelete, onClose }: {
  alert:    Alert;
  onRead:   (id: string) => void;
  onDelete: (id: string) => void;
  onClose:  () => void;
}) {
  const tierConfig = TIER_CONFIG[alert.newTier];
  const itemLabel  = formatItemNames(alert.pledge.items);

  const handleClick = () => {
    onRead(alert.id);
    onClose();
  };

  // The delete button must live OUTSIDE the <Link> — a <button> nested in an
  // <a> is invalid HTML — so it's a sibling revealed on hover.
  return (
    <div className="relative group">
    <Link
      href={`/customers/${alert.pledge.customerId}/pledges/${alert.pledge.id}`}
      onClick={handleClick}
      className={`flex items-start gap-3 px-4 py-3 transition-colors hover:bg-[#fafafa] ${
        !alert.isRead ? "bg-[#fafafa]" : ""
      }`}
    >
      <span className="text-base leading-none mt-0.5 shrink-0">
        {ALERT_ICON[alert.alertType]}
      </span>

      <div className="flex-1 min-w-0">
        {/* Customer · item name · time */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-1 min-w-0">
            <span className="text-xs font-semibold text-[#1a1a1a] truncate">
              {alert.customer.name}
            </span>
            <span className="text-[#d1d5db] text-[10px] shrink-0">·</span>
            <span className="text-[10px] text-[#9ca3af] truncate">
              {itemLabel}
            </span>
          </div>
          {/* Time fades on hover so the delete button can take its spot */}
          <span className="text-[10px] text-[#9ca3af] shrink-0 mt-px transition-opacity group-hover:opacity-0">
            {formatRelativeTime(alert.createdAt)}
          </span>
        </div>

        {/* Message */}
        <p className="text-xs text-[#6b7280] leading-snug mt-0.5 line-clamp-2">
          {displayMessage(alert, itemLabel)}
        </p>

        {/* Tier + LTV */}
        <div className="flex items-center gap-2 mt-1.5">
          <span
            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold"
            style={{ backgroundColor: tierConfig.bg, color: tierConfig.color }}
          >
            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: tierConfig.dot }} />
            {tierConfig.label}
          </span>
          {alert.pledge.lastCalculatedLtv && (
            <span className="text-[10px] text-[#9ca3af]">
              LTV <span className="text-[#6b7280] font-medium">
                {Number(alert.pledge.lastCalculatedLtv).toFixed(1)}%
              </span>
            </span>
          )}
          {alert.pledge.lastAmountOwed && (
            <span className="text-[10px] text-[#9ca3af]">
              Owed <span className="text-[#6b7280] font-medium">
                ₹{Number(alert.pledge.lastAmountOwed).toLocaleString("en-IN", { maximumFractionDigits: 0 })}
              </span>
            </span>
          )}
        </div>
      </div>

      {!alert.isRead && (
        <span className="w-2 h-2 rounded-full bg-[#4f46e5] shrink-0 mt-1.5 transition-opacity group-hover:opacity-0" />
      )}
    </Link>

      {/* Delete button — sibling of the Link (valid HTML), revealed on hover. */}
      <button
        type="button"
        onClick={() => onDelete(alert.id)}
        aria-label="Delete notification"
        title="Delete notification"
        className="absolute top-2.5 right-2.5 z-10 flex items-center justify-center w-6 h-6 rounded-md text-[#9ca3af] opacity-0 group-hover:opacity-100 focus:opacity-100 focus:outline-none hover:bg-[#fef2f2] hover:text-[#dc2626] transition-all"
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="3 6 5 6 21 6" />
          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
          <line x1="10" y1="11" x2="10" y2="17" />
          <line x1="14" y1="11" x2="14" y2="17" />
        </svg>
      </button>
    </div>
  );
}

function DropdownSkeleton() {
  return (
    <div className="divide-y divide-[#f3f4f6]">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="flex items-start gap-3 px-4 py-3">
          <div className="w-5 h-5 rounded bg-[#f3f4f6] animate-pulse shrink-0 mt-0.5" />
          <div className="flex-1 space-y-2">
            <div className="h-3 bg-[#f3f4f6] rounded animate-pulse w-1/3" />
            <div className="h-3 bg-[#f3f4f6] rounded animate-pulse w-4/5" />
            <div className="h-3 bg-[#f3f4f6] rounded animate-pulse w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}

function DropdownEmpty() {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <span className="text-3xl mb-3">🔔</span>
      <p className="text-sm font-medium text-[#374151]">All clear</p>
      <p className="text-xs text-[#9ca3af] mt-1">Risk tier changes will appear here</p>
    </div>
  );
}