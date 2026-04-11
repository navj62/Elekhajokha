"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useAuth } from "@clerk/nextjs";

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */
type AccessStatus =
  | "active"
  | "trial"
  | "processing"
  | "payment_timeout"
  | "expired"
  | "trial_expired"
  | "inactive"
  | "invalid_state"
  | "account_suspended"
  | "unauthenticated"
  | "user_not_found"
  | "server_error"
  | "error"
  | null;

interface AccessState {
  hasAccess: boolean;
  isLoading: boolean;
  status:    AccessStatus;
  reason:    string | null;
  daysLeft:  number | null;
  plan:      string | null;
  endDate:   Date   | null;
}

interface UseAccessReturn extends AccessState {
  refetch: () => Promise<void>;
}

const DEFAULT: AccessState = {
  hasAccess: false,
  isLoading: true,
  status:    null,
  reason:    null,
  daysLeft:  null,
  plan:      null,
  endDate:   null,
};

/* ------------------------------------------------------------------ */
/*  Hook                                                                */
/* ------------------------------------------------------------------ */
export function useAccess(): UseAccessReturn {
  const { userId, isLoaded } = useAuth();
  const [state, setState]    = useState<AccessState>(DEFAULT);

  const cancelledRef   = useRef(false);
  const isInitialFetch = useRef(true);
  const fetchingRef    = useRef(false);  // dedup guard — prevents race conditions

  const fetchAccess = useCallback(async () => {
    // Skip if a fetch is already in-flight
    // Prevents race conditions when tab focus + manual refetch fire simultaneously
    if (fetchingRef.current) return;
    fetchingRef.current = true;

    // Only show spinner on first fetch — background refetches update silently
    if (isInitialFetch.current) {
      setState((s) => ({ ...s, isLoading: true }));
    }

    try {
      const res = await fetch("/api/access");

      // Always parse JSON regardless of HTTP status code.
      // The access route returns meaningful data on 402, 403, 404 etc.
      // Throwing on !res.ok would convert all of these to status: "error".
      let data: Record<string, unknown> = {};
      try {
        data = await res.json();
      } catch {
        throw new Error("Failed to parse access response");
      }

      if (!cancelledRef.current) {
        setState({
          hasAccess: typeof data.hasAccess === "boolean" ? data.hasAccess             : false,
          isLoading: false,
          status:    typeof data.status    === "string"  ? data.status as AccessStatus : null,
          reason:    typeof data.reason    === "string"  ? data.reason                 : null,
          daysLeft:  typeof data.daysLeft  === "number"  ? data.daysLeft               : null,
          plan:      typeof data.plan      === "string"  ? data.plan                   : null,
          endDate:   typeof data.endDate   === "string"  ? new Date(data.endDate)      : null,
        });
      }
    } catch {
      if (!cancelledRef.current) {
        // Preserve previous hasAccess on network error —
        // an active paying user should NOT get blocked by a network blip
        setState((s) => ({
          ...s,
          isLoading: false,
          status:    "error",
          reason:    "network_error",
        }));
      }
    } finally {
      isInitialFetch.current = false;
      fetchingRef.current    = false;
    }
  }, []); // ✅ stable — no deps, never recreated

  /* ── Initial fetch + re-fetch on auth change ─────────────────────── */
  useEffect(() => {
    cancelledRef.current = false;

    if (!isLoaded) return;

    if (!userId) {
      setState({ ...DEFAULT, isLoading: false, status: "unauthenticated", reason: null });
      return;
    }

    isInitialFetch.current = true;
    fetchAccess();

    return () => { cancelledRef.current = true; };
  }, [userId, isLoaded, fetchAccess]);

  /* ── Re-fetch when tab becomes visible ───────────────────────────── */
  useEffect(() => {
    if (!userId) return;

    function handleVisibility() {
      if (document.visibilityState === "visible" && !cancelledRef.current) {
        fetchAccess();
      }
    }

    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, [userId, fetchAccess]);

  return { ...state, refetch: fetchAccess };
}