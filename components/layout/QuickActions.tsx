"use client";

import React from "react";
import { Plus, Undo2 } from "lucide-react";

import { Sheet } from "@/components/ui/Sheet";
import CustomerPickerSheet, { type PickerMode } from "./CustomerPickerSheet";

/* ------------------------------------------------------------------ */
/*  Quick actions — Add Pledge / Release Pledge from anywhere.          */
/*                                                                      */
/*  AppShell provides this context and owns both sheets, so the mobile  */
/*  "+" (→ Quick actions sheet → picker) and the dashboard buttons      */
/*  (→ picker directly) open the very same picker.                      */
/*                                                                      */
/*  Focus: the element that started the flow is remembered and focus   */
/*  returns to it when the picker closes — including the "+" → Quick    */
/*  actions → picker hand-off, where Radix alone would aim focus at the */
/*  sheet that just closed.                                             */
/* ------------------------------------------------------------------ */

interface QuickActionsApi {
  openQuickActions: () => void;
  openPicker: (mode: PickerMode) => void;
}

const QuickActionsContext = React.createContext<QuickActionsApi | null>(null);

export function useQuickActions(): QuickActionsApi {
  const ctx = React.useContext(QuickActionsContext);
  if (!ctx) throw new Error("useQuickActions must be used inside <QuickActionsProvider>");
  return ctx;
}

const ACTIONS = [
  { mode: "add", title: "Add Pledge", hint: "Record a new loan", Icon: Plus },
  { mode: "release", title: "Release Pledge", hint: "Close one or more loans", Icon: Undo2 },
] as const;

export function QuickActionsProvider({ children }: { children: React.ReactNode }) {
  const [actionsOpen, setActionsOpen] = React.useState(false);
  const [pickerOpen, setPickerOpen] = React.useState(false);
  const [mode, setMode] = React.useState<PickerMode>("add");
  const returnFocus = React.useRef<HTMLElement | null>(null);
  const handingOff = React.useRef(false);

  const rememberTrigger = () => {
    const el = document.activeElement;
    returnFocus.current = el instanceof HTMLElement && el !== document.body ? el : null;
  };

  const api = React.useMemo<QuickActionsApi>(
    () => ({
      openQuickActions: () => {
        rememberTrigger();
        setActionsOpen(true);
      },
      openPicker: (m) => {
        rememberTrigger();
        setMode(m);
        setPickerOpen(true);
      },
    }),
    []
  );

  const chooseAction = (m: PickerMode) => {
    handingOff.current = true; // keep the remembered trigger; don't refocus it yet
    setActionsOpen(false);
    setMode(m);
    setPickerOpen(true);
  };

  const restoreFocus = (e: Event) => {
    const el = returnFocus.current;
    if (el && el.isConnected) {
      e.preventDefault();
      el.focus();
    }
  };

  return (
    <QuickActionsContext.Provider value={api}>
      {children}

      <Sheet
        open={actionsOpen}
        onOpenChange={setActionsOpen}
        title="Quick actions"
        size="sm"
        onCloseAutoFocus={(e) => {
          if (handingOff.current) {
            // The picker is opening — leave focus to it.
            handingOff.current = false;
            e.preventDefault();
          } else restoreFocus(e);
        }}
      >
        <ul className="-mx-1 flex flex-col gap-1 py-1">
          {ACTIONS.map(({ mode: m, title, hint, Icon }) => (
            <li key={m}>
              <button
                type="button"
                onClick={() => chooseAction(m)}
                className="flex min-h-16 w-full items-center gap-4 rounded-xl px-3 py-3 text-left transition-colors hover:bg-accent focus-visible:bg-accent focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
              >
                <span
                  aria-hidden="true"
                  className={`flex size-11 shrink-0 items-center justify-center rounded-full ${
                    m === "add" ? "bg-primary text-primary-foreground" : "border border-border bg-card-alt text-foreground"
                  }`}
                >
                  <Icon size={20} strokeWidth={2.4} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[15px] font-semibold text-foreground">{title}</span>
                  <span className="block text-[13px] text-muted-foreground">{hint}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      </Sheet>

      <CustomerPickerSheet
        open={pickerOpen}
        mode={mode}
        onOpenChange={setPickerOpen}
        onCloseAutoFocus={restoreFocus}
      />
    </QuickActionsContext.Provider>
  );
}
