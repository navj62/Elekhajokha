"use client";

// Toast — a small shared confirmation (role="status", 4 s auto-dismiss),
// anchored above the mobile bottom nav via --bottom-anchor.
//
// Cross-page hand-off: a page about to navigate calls queueToast(msg), which
// writes a ONE-SHOT, timestamped sessionStorage entry; the destination page
// calls consumeQueuedToast() on mount and renders <Toast />. The message can
// name a customer, so it is removed on read and ignored once older than
// QUEUE_TTL_MS — it never lingers if the destination page isn't reached. The message lives in a
// tiny external store (useSyncExternalStore), so no component calls setState
// inside an effect.
//
// (The inventory and notifications pages still have their own hand-rolled
// toasts; converting them is a separate task.)
import * as React from "react";
import Link from "next/link";

const STORAGE_KEY = "elj:toast";
const DURATION_MS = 4000;
export const QUEUE_TTL_MS = 10_000;

type QueuedToast = { msg: string; at: number };
/** Optional follow-up link shown after the message. */
export type ToastLink = { href: string; label: string };

let message: { msg: string; link?: ToastLink } | null = null;
let timer: ReturnType<typeof setTimeout> | null = null;
const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}

export function showToast(msg: string, link?: ToastLink) {
  message = { msg, link };
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => {
    message = null;
    timer = null;
    emit();
  }, DURATION_MS);
  emit();
}

/** Show `msg` on the NEXT page that calls consumeQueuedToast(). */
export function queueToast(msg: string) {
  try {
    const entry: QueuedToast = { msg, at: Date.now() };
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(entry));
  } catch {
    // Private mode / blocked storage: the action still succeeded, so a
    // missing confirmation is acceptable.
  }
}

/**
 * Reads and clears the queued message, if any, and shows it — unless it is
 * older than QUEUE_TTL_MS (or malformed), in which case it is just discarded.
 */
export function consumeQueuedToast(now = Date.now()) {
  let raw: string | null = null;
  try {
    raw = sessionStorage.getItem(STORAGE_KEY);
    if (raw === null) return;
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    return; // storage unavailable — nothing queued
  }
  try {
    const entry = JSON.parse(raw) as Partial<QueuedToast>;
    if (typeof entry.msg !== "string" || typeof entry.at !== "number") return;
    const age = now - entry.at;
    if (age < 0 || age > QUEUE_TTL_MS) return;
    showToast(entry.msg);
  } catch {
    /* malformed entry (e.g. the old plain-string format) — dropped */
  }
}

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

export function Toast() {
  const current = React.useSyncExternalStore(subscribe, () => message, () => null);
  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed inset-x-4 z-[46] flex justify-center lg:inset-x-auto lg:right-6"
      style={{ bottom: "calc(var(--bottom-anchor) + 1rem)" }}
    >
      {current && (
        <div className="pointer-events-auto flex max-w-[360px] flex-wrap items-center gap-x-3 gap-y-1 rounded-[12px] bg-primary px-4 py-3 text-[13px] font-semibold text-primary-foreground shadow-lg animate-in fade-in-0 slide-in-from-bottom-2 motion-reduce:animate-none">
          <span>{current.msg}</span>
          {current.link && (
            <Link href={current.link.href} className="font-bold underline underline-offset-2">
              {current.link.label}
            </Link>
          )}
        </div>
      )}
    </div>
  );
}

export default Toast;
