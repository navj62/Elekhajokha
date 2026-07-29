"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { Search, User, ChevronRight } from "lucide-react";

import { Sheet } from "@/components/ui/Sheet";
import { pledgeAddHref } from "./navConfig";

/* ------------------------------------------------------------------ */
/*  A pledge cannot be created without a customer (there is no          */
/*  top-level /pledges/add route), so the FAB picks a customer first.   */
/*                                                                      */
/*  Reads the EXISTING GET /api/customers/search — no new or modified   */
/*  API route. Only id + name + region + pledgeCount are used.          */
/* ------------------------------------------------------------------ */

const TAKE = 50; // the route defaults to 5000; the picker only needs a page

interface PickerCustomer {
  id: string;
  name: string;
  region: string | null;
  pledgeCount: number;
}

export default function CustomerPickerSheet({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const router = useRouter();
  const [q, setQ] = React.useState("");
  const [rows, setRows] = React.useState<PickerCustomer[]>([]);
  const [state, setState] = React.useState<"idle" | "loading" | "error">("idle");

  // Debounced fetch, aborted on re-query/close so a slow response can never
  // overwrite a newer one.
  React.useEffect(() => {
    if (!open) return;
    const ac = new AbortController();
    const timer = setTimeout(() => {
      setState("loading");
      fetch(`/api/customers/search?q=${encodeURIComponent(q)}&take=${TAKE}`, {
        signal: ac.signal,
        cache: "no-store",
      })
        .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
        .then((d) => {
          setRows(Array.isArray(d?.customers) ? d.customers : []);
          setState("idle");
        })
        .catch((e) => {
          if (e?.name !== "AbortError") setState("error");
        });
    }, 250);
    return () => {
      ac.abort();
      clearTimeout(timer);
    };
  }, [q, open]);

  // Clear the query on close (an event, not an effect) so the next open starts
  // fresh without a synchronous setState inside an effect body.
  const handleOpenChange = React.useCallback(
    (o: boolean) => {
      if (!o) setQ("");
      onOpenChange(o);
    },
    [onOpenChange]
  );

  const pick = (id: string) => () => {
    handleOpenChange(false); // close before navigating
    router.push(pledgeAddHref(id));
  };

  return (
    <Sheet
      open={open}
      onOpenChange={handleOpenChange}
      title="New Pledge"
      description="Choose a customer to create the pledge for."
      size="sm"
    >
      <div className="sticky top-0 z-1 -mx-1 mb-2 bg-card pb-2">
        <div className="flex items-center gap-2 rounded-xl border border-border bg-background px-3">
          <Search size={16} className="shrink-0 text-muted-foreground-subtle" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search customers…"
            aria-label="Search customers"
            className="min-h-11 w-full bg-transparent text-[14px] text-foreground outline-none placeholder:text-muted-foreground-subtle"
          />
        </div>
      </div>

      {state === "error" && (
        <p className="py-6 text-center text-[13px] text-destructive">
          Could not load customers. Please try again.
        </p>
      )}

      {state === "loading" && rows.length === 0 && (
        <div className="space-y-2 py-2">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="skeleton h-11 w-full" />
          ))}
        </div>
      )}

      {state !== "error" && rows.length === 0 && state !== "loading" && (
        <p className="py-6 text-center text-[13px] text-muted-foreground">
          {q ? "No customers match that search." : "No customers yet."}
        </p>
      )}

      {rows.length > 0 && (
        <Sheet.List>
          {rows.map((c) => (
            <Sheet.Item
              key={c.id}
              data-customer-id={c.id}
              icon={<User size={18} />}
              label={
                <span className="flex flex-col">
                  <span className="truncate">{c.name}</span>
                  {c.region && (
                    <span className="truncate text-[12px] font-normal text-muted-foreground-subtle">
                      {c.region}
                    </span>
                  )}
                </span>
              }
              trailing={<ChevronRight size={16} />}
              onClick={pick(c.id)}
            />
          ))}
        </Sheet.List>
      )}
    </Sheet>
  );
}
