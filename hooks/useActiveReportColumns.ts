"use client";

// Active Pledges column picker — the hidden-column choice, remembered on this
// device only (localStorage, keyed by report + signed-in user). Never sent to
// the server except as the export's `columns` param.
//
// Read through useSyncExternalStore: the server snapshot is "nothing stored"
// (all columns), so the first client render matches the server HTML and the
// stored choice is applied right after hydration — no setState in an effect.
import { useCallback, useSyncExternalStore } from "react";
import { useUser } from "@clerk/nextjs";
import {
  activeColumnsStorageKey,
  parseStoredHiddenColumns,
  type ActiveColumnKey,
} from "@/lib/reports/activeColumns";

const listeners = new Set<() => void>();
// Last write per key in this tab. Wins over storage, so the choice still
// applies live when localStorage is blocked or full.
const memory = new Map<string, string>();

function subscribe(fn: () => void) {
  listeners.add(fn);
  window.addEventListener("storage", fn); // another tab changed it
  return () => {
    listeners.delete(fn);
    window.removeEventListener("storage", fn);
  };
}

function readRaw(key: string | null): string | null {
  if (!key) return null;
  const mem = memory.get(key);
  if (mem !== undefined) return mem;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeRaw(key: string, value: string | null) {
  memory.set(key, value ?? "");
  try {
    if (value === null) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, value);
  } catch {
    // Blocked or full — the in-memory copy keeps this tab working.
  }
  listeners.forEach((fn) => fn());
}

export function useActiveReportColumns() {
  const { user } = useUser();
  const key = user ? activeColumnsStorageKey(user.id) : null;

  // The raw string is the snapshot (stable between reads); parsed below.
  const raw = useSyncExternalStore(
    subscribe,
    () => readRaw(key),
    () => null
  );
  const hidden = parseStoredHiddenColumns(raw);

  const setHidden = useCallback(
    (next: readonly ActiveColumnKey[]) => {
      if (!key) return;
      writeRaw(key, next.length ? JSON.stringify(next) : null);
    },
    [key]
  );

  // false until Clerk has loaded the user — there's no storage key yet, so the
  // picker renders disabled rather than accepting clicks it would drop.
  return { hidden, setHidden, ready: key !== null };
}
