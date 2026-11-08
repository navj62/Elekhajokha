"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/*  StickyActions — the one bottom action bar.                         */
/*                                                                     */
/*  < lg : fixed and full-bleed, anchored ABOVE the mobile bottom nav  */
/*         via --bottom-anchor (nav height + safe-area inset).         */
/*         z-30 per the z-contract in components/layout/navConfig.ts,  */
/*         so the nav (z-40) deliberately sits above this bar and the  */
/*         two can never trade places.                                 */
/*  lg:+ : static, in normal document flow. No fixed chrome, no        */
/*         offset, no shadow — it reads as a form footer.              */
/*                                                                     */
/*  This exists because four screens hand-rolled `fixed bottom-0 z-40` */
/*  bars that the bottom nav paints over: at 380px the pledge-add      */
/*  "Save Pledge" button was fully covered, and a tap on it landed on  */
/*  the nav's "More" button instead. Anything bottom-anchored on       */
/*  mobile goes through this component.                                */
/*                                                                     */
/*  Scope: the primitive owns positioning, safe-area and background.   */
/*  Buttons style themselves — pass them as children.                  */
/*                                                                     */
/*  A fixed bar is out of flow and would occlude the end of the page,  */
/*  so on mobile this also renders an in-flow spacer sized from the    */
/*  live bar height. It is measured rather than hard-coded so a bar    */
/*  that wraps to two lines still reserves the right space, and so     */
/*  consumers never have to add a matching `pb-*` of their own.        */
/* ------------------------------------------------------------------ */

/** useLayoutEffect that does not warn during SSR. */
const useIsoLayoutEffect = typeof window !== "undefined" ? React.useLayoutEffect : React.useEffect;

export interface StickyActionsProps {
  /** The action buttons. Right-aligned; they style themselves. */
  children: React.ReactNode;
  /**
   * Optional context pinned to the left of the actions — "3 selected",
   * "Unsaved changes". Layout only; the caller styles the text.
   */
  leading?: React.ReactNode;
  /**
   * Keep the bar pinned at lg:+ too — sticky to the bottom of the scrolling
   * <main> (so it never covers the sidebar) instead of sitting at the end of
   * the content. For long lists where the action belongs to a selection.
   */
  stickyOnDesktop?: boolean;
  className?: string;
}

export function StickyActions({ children, leading, stickyOnDesktop = false, className }: StickyActionsProps) {
  const barRef = React.useRef<HTMLDivElement>(null);
  const [barHeight, setBarHeight] = React.useState(0);

  useIsoLayoutEffect(() => {
    const el = barRef.current;
    if (!el) return;
    const measure = () => setBarHeight(el.offsetHeight);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <>
      {/* Reserves the space the fixed bar takes out of the scroll flow.
          Hidden at lg:, where the bar is already in flow. */}
      <div aria-hidden className="lg:hidden" style={{ height: barHeight }} />

      <div
        ref={barRef}
        data-slot="sticky-actions"
        className={cn(
          "fixed inset-x-0 bottom-[var(--bottom-anchor)] z-30",
          "flex items-center justify-end gap-3",
          "border-t border-border bg-card px-5 py-3",
          "shadow-[0_-4px_24px_rgb(0_0_0/0.05)]",
          stickyOnDesktop
            ? /* Pinned to the bottom of <main>'s scrollport on desktop. */
              "lg:sticky lg:bottom-0 lg:inset-x-auto lg:mt-4 lg:rounded-t-[16px] lg:border-x lg:px-6"
            : /* Back into normal flow on desktop. */
              "lg:static lg:z-auto lg:inset-x-auto lg:mt-2 lg:bg-transparent lg:px-0 lg:py-5 lg:shadow-none",
          className,
        )}
      >
        {leading ? <div className="mr-auto min-w-0">{leading}</div> : null}
        {children}
      </div>
    </>
  );
}

export default StickyActions;
