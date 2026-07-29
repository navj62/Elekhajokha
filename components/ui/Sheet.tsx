"use client";

import * as React from "react";
import { Dialog as DialogPrimitive } from "radix-ui";
import { X } from "lucide-react";

import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/*  Sheet — one primitive, two presentations.                          */
/*                                                                     */
/*  < lg : slide-up bottom sheet (drag / handle / ✕ / backdrop)        */
/*  lg:+ : centered modal dialog (✕ / backdrop / Esc)                  */
/*                                                                     */
/*  The breakpoint is expressed in CSS (`lg:` variants) rather than a  */
/*  JS media query, so there is no hydration mismatch and no flash of  */
/*  the wrong presentation. Radix supplies focus trap, Esc, scroll     */
/*  lock and ARIA wiring.                                              */
/*                                                                     */
/*  z-index contract (see components/layout/navConfig.ts):             */
/*    content 0 · sticky action bar 30 · bottom nav 40 · FAB 45        */
/*    · sheet backdrop 50 · sheet content 51                           */
/*  A sheet therefore always covers the bottom nav and FAB.            */
/* ------------------------------------------------------------------ */

type SheetSize = "sm" | "md" | "lg" | "full";
type SheetSide = "responsive" | "bottom" | "center";

const SIZE_CLASS: Record<SheetSize, string> = {
  sm: "lg:max-w-[380px]",
  md: "lg:max-w-[480px]",
  lg: "lg:max-w-[640px]",
  full: "lg:max-w-[calc(100vw-4rem)]",
};

/** Drag must exceed this fraction of sheet height (or be a fast flick) to dismiss. */
const DRAG_DISMISS_RATIO = 0.25;
const FLICK_VELOCITY = 0.5; // px per ms

export interface SheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Required for accessibility. Use `header` to replace the whole bar. */
  title: React.ReactNode;
  description?: React.ReactNode;
  children?: React.ReactNode;
  /** Sticky action slot. Omit for no footer bar. */
  footer?: React.ReactNode;
  /** Desktop max-width only — mobile is always full-bleed. */
  size?: SheetSize;
  /** Escape hatch to force one presentation regardless of viewport. */
  side?: SheetSide;
  /** false disables backdrop-tap, Esc, drag and hides ✕ (e.g. in-flight submit). */
  dismissible?: boolean;
  /** Replaces the default title bar entirely. */
  header?: React.ReactNode;
  className?: string;
  bodyClassName?: string;
}

export function Sheet({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  size = "md",
  side = "responsive",
  dismissible = true,
  header,
  className,
  bodyClassName,
}: SheetProps) {
  const contentRef = React.useRef<HTMLDivElement>(null);
  const drag = React.useRef<{ startY: number; startT: number; active: boolean }>({
    startY: 0,
    startT: 0,
    active: false,
  });
  const [dragY, setDragY] = React.useState(0);

  const isBottom = side !== "center";
  const isCentered = side !== "bottom";

  /* -------- drag-to-dismiss (mobile bottom sheet only) -------------- */
  const resetDrag = React.useCallback(() => {
    drag.current.active = false;
    setDragY(0);
  }, []);

  const onPointerDown = (e: React.PointerEvent) => {
    if (!dismissible || !isBottom) return;
    // Capture the pointer: the handle is a thin strip, so without this the
    // pointer leaves it within a few px and move/up stop firing on this node.
    e.currentTarget.setPointerCapture?.(e.pointerId);
    // Clear any offset left over from a previous drag, so no effect is needed
    // to reset it when the sheet closes.
    setDragY(0);
    // Only start a drag from the handle/header, never from scrollable body.
    drag.current = { startY: e.clientY, startT: performance.now(), active: true };
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!drag.current.active) return;
    const dy = e.clientY - drag.current.startY;
    // Rubber-band upward drags so the sheet feels anchored.
    setDragY(dy < 0 ? dy / 4 : dy);
  };

  const onPointerUp = (e: React.PointerEvent) => {
    if (!drag.current.active) return;
    const dy = e.clientY - drag.current.startY;
    const dt = performance.now() - drag.current.startT;
    const height = contentRef.current?.offsetHeight ?? 1;
    const flick = dt > 0 && dy / dt > FLICK_VELOCITY;
    if (dy > height * DRAG_DISMISS_RATIO || (flick && dy > 40)) {
      resetDrag();
      onOpenChange(false);
      return;
    }
    resetDrag();
  };

  const blockIfLocked = (e: Event) => {
    if (!dismissible) e.preventDefault();
  };

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay
          data-slot="sheet-overlay"
          className={cn(
            "fixed inset-0 z-50 bg-black/40 backdrop-blur-[2px]",
            "data-[state=open]:animate-in data-[state=open]:fade-in-0",
            "data-[state=closed]:animate-out data-[state=closed]:fade-out-0"
          )}
        />
        <DialogPrimitive.Content
          ref={contentRef}
          data-slot="sheet-content"
          onEscapeKeyDown={blockIfLocked}
          onPointerDownOutside={blockIfLocked}
          onInteractOutside={blockIfLocked}
          style={open && dragY ? { transform: `translateY(${dragY}px)`, transition: "none" } : undefined}
          className={cn(
            "fixed z-51 flex flex-col overflow-hidden bg-card text-card-foreground shadow-2xl",
            "max-h-[85dvh] focus:outline-none",
            isBottom && [
              "inset-x-0 bottom-0 w-full rounded-t-[22px] border-t border-border",
              "data-[state=open]:animate-in data-[state=open]:slide-in-from-bottom",
              "data-[state=closed]:animate-out data-[state=closed]:slide-out-to-bottom",
            ],
            isCentered && [
              "lg:inset-0 lg:m-auto lg:h-fit lg:w-full lg:rounded-[22px] lg:border lg:border-border",
              "lg:data-[state=open]:zoom-in-95 lg:data-[state=closed]:zoom-out-95",
              "lg:data-[state=open]:slide-in-from-bottom-0 lg:data-[state=closed]:slide-out-to-bottom-0",
              SIZE_CLASS[size],
            ],
            className
          )}
        >
          {/* Drag handle — mobile affordance, also the drag surface */}
          {isBottom && (
            <div
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerCancel={resetDrag}
              className={cn(
                "flex shrink-0 justify-center pt-3 pb-1",
                isCentered && "lg:hidden",
                dismissible ? "cursor-grab touch-none active:cursor-grabbing" : "cursor-default"
              )}
            >
              <div className="h-1 w-9 rounded-full bg-border" />
            </div>
          )}

          {/* Header */}
          {header ?? (
            <div className="flex shrink-0 items-start gap-3 px-5 pt-3 pb-3 lg:px-6 lg:pt-5">
              <div className="min-w-0 flex-1">
                <DialogPrimitive.Title className="text-[17px] leading-tight font-bold text-foreground">
                  {title}
                </DialogPrimitive.Title>
                {description ? (
                  <DialogPrimitive.Description className="mt-1 text-[13px] text-muted-foreground">
                    {description}
                  </DialogPrimitive.Description>
                ) : (
                  <DialogPrimitive.Description className="sr-only">{title}</DialogPrimitive.Description>
                )}
              </div>
              {dismissible && (
                <DialogPrimitive.Close
                  aria-label="Close"
                  className="-mr-1.5 -mt-1 inline-flex size-11 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
                >
                  <X size={18} />
                </DialogPrimitive.Close>
              )}
            </div>
          )}

          {/* Body — the only scrolling region */}
          <div
            className={cn(
              "min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-4 lg:px-6",
              !footer && "pb-[max(1rem,env(safe-area-inset-bottom))]",
              bodyClassName
            )}
          >
            {children}
          </div>

          {/* Sticky footer */}
          {footer && (
            <div className="flex shrink-0 items-center justify-end gap-2.5 border-t border-border bg-card px-5 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] lg:px-6 lg:pb-3">
              {footer}
            </div>
          )}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

/* ------------------------------------------------------------------ */
/*  Sheet.List / Sheet.Item — tappable rows for list-style sheets.      */
/*  Minimal surface by design: icon + label + optional trailing node.   */
/*  No active/selected state until a real consumer needs it.            */
/* ------------------------------------------------------------------ */

export interface SheetListProps extends React.ComponentProps<"ul"> {
  children?: React.ReactNode;
}

function SheetList({ className, ...props }: SheetListProps) {
  return <ul data-slot="sheet-list" className={cn("-mx-1 flex flex-col py-1", className)} {...props} />;
}

export interface SheetItemProps extends Omit<React.ComponentProps<"button">, "children"> {
  icon?: React.ReactNode;
  label: React.ReactNode;
  /** Optional trailing node — chevron, count, badge. */
  trailing?: React.ReactNode;
}

function SheetItem({ icon, label, trailing, className, ...props }: SheetItemProps) {
  return (
    <li>
      <button
        type="button"
        data-slot="sheet-item"
        className={cn(
          // min-h-11 = 44px touch target
          "flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-left text-[14px] font-medium text-foreground transition-colors",
          "hover:bg-accent hover:text-accent-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none",
          "disabled:pointer-events-none disabled:opacity-50",
          className
        )}
        {...props}
      >
        {icon && (
          <span className="flex size-5 shrink-0 items-center justify-center text-muted-foreground">{icon}</span>
        )}
        <span className="min-w-0 flex-1 truncate">{label}</span>
        {trailing && <span className="shrink-0 text-muted-foreground-subtle">{trailing}</span>}
      </button>
    </li>
  );
}

Sheet.List = SheetList;
Sheet.Item = SheetItem;

export default Sheet;
