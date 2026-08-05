"use client";

import React, {
    useState,
    useEffect,
    useRef,
    useCallback,
    useMemo,
} from "react";
import {
    Search,
    X,
    MapPin,
    Users,
    ChevronRight,
    ArrowLeft,
    Phone,
    IndianRupee,
    Archive,
    User,
} from "lucide-react";
import { useRouter } from "next/navigation";

/* ================================================================== */
/*  Types                                                               */
/* ================================================================== */

interface RegionItem {
    name: string;
    customerCount: number;
    activePledges: number;
}

interface CustomerItem {
    id: string;
    name: string;
    mobile: string | null;
    customerImg: string | null;
    region: string;
    activePledges: number;
    totalLoanAmount: number;
}

interface SearchRegionResult {
    name: string;
    customerCount: number;
    activePledges: number;
    previewCustomers: Omit<CustomerItem, "region">[];
}

interface SearchResult {
    matchedRegions: SearchRegionResult[];
    directCustomerMatches: CustomerItem[];
}

interface Props {
    open: boolean;
    onClose: () => void;
}

/* ================================================================== */
/*  Design Tokens                                                       */
/* ================================================================== */

const OLIVE = "#565C3F";
const OLIVE_LIGHT = "#EAEDDA";
const OLIVE_HOVER = "#F5F6EF";
const BORDER = "#ECEAE4";
const TEXT_PRIMARY = "#2C2C2C";
const TEXT_SECONDARY = "#7A7A6D";
const TEXT_MUTED = "#A3A393";
const CARD_BG = "#FAFAF6";
const WHITE = "#FFFFFF";

/* ================================================================== */
/*  Helpers                                                             */
/* ================================================================== */

function getInitials(name: string): string {
    return name
        .split(" ")
        .map((w) => w[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);
}

function formatCurrency(n: number): string {
    if (n >= 10000000) return "₹" + (n / 10000000).toFixed(1) + "Cr";
    if (n >= 100000) return "₹" + (n / 100000).toFixed(1) + "L";
    if (n >= 1000) return "₹" + (n / 1000).toFixed(1) + "K";
    return "₹" + n.toLocaleString("en-IN");
}

/* ================================================================== */
/*  Skeleton Loaders                                                    */
/* ================================================================== */

function RegionSkeleton() {
    return (
        <div className="space-y-1 p-3">
            {Array.from({ length: 6 }).map((_, i) => (
                <div
                    key={i}
                    className="flex items-center justify-between rounded-xl px-4 py-3"
                    style={{ backgroundColor: CARD_BG }}
                >
                    <div className="flex items-center gap-3">
                        <div
                            className="w-8 h-8 rounded-lg animate-pulse"
                            style={{ backgroundColor: BORDER }}
                        />
                        <div
                            className="h-3 rounded animate-pulse"
                            style={{ width: 80 + i * 12, backgroundColor: BORDER }}
                        />
                    </div>
                    <div
                        className="h-5 w-8 rounded-full animate-pulse"
                        style={{ backgroundColor: BORDER }}
                    />
                </div>
            ))}
        </div>
    );
}

function CustomerSkeleton() {
    return (
        <div className="space-y-2 p-4">
            {Array.from({ length: 4 }).map((_, i) => (
                <div
                    key={i}
                    className="flex items-center gap-3 rounded-xl px-4 py-3"
                    style={{ backgroundColor: CARD_BG }}
                >
                    <div
                        className="w-10 h-10 rounded-full animate-pulse"
                        style={{ backgroundColor: BORDER }}
                    />
                    <div className="flex-1 space-y-2">
                        <div
                            className="h-3 rounded animate-pulse"
                            style={{ width: 100 + i * 20, backgroundColor: BORDER }}
                        />
                        <div
                            className="h-2 rounded animate-pulse"
                            style={{ width: 60, backgroundColor: BORDER }}
                        />
                    </div>
                    <div
                        className="h-5 w-14 rounded-full animate-pulse"
                        style={{ backgroundColor: BORDER }}
                    />
                </div>
            ))}
        </div>
    );
}

/* ================================================================== */
/*  Empty States                                                        */
/* ================================================================== */

function EmptyState({
    icon: Icon,
    text,
}: {
    icon: React.ElementType;
    text: string;
}) {
    return (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
            <div
                className="w-12 h-12 rounded-full flex items-center justify-center"
                style={{ backgroundColor: CARD_BG }}
            >
                <Icon size={20} style={{ color: TEXT_MUTED }} />
            </div>
            <p
                className="text-[13px] font-medium text-center"
                style={{ color: TEXT_MUTED }}
            >
                {text}
            </p>
        </div>
    );
}

/* ================================================================== */
/*  Customer Row                                                        */
/* ================================================================== */

function CustomerRow({
    customer,
    onClick,
}: {
    customer: CustomerItem | Omit<CustomerItem, "region">;
    onClick: () => void;
}) {
    const c = customer;
    return (
        <button
            onClick={onClick}
            className="w-full flex items-center gap-3 rounded-xl px-4 py-3 text-left transition-all duration-150"
            style={{ backgroundColor: "transparent" }}
            onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = OLIVE_HOVER;
                e.currentTarget.style.transform = "translateY(-1px)";
                e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.04)";
            }}
            onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "transparent";
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "none";
            }}
        >
            {/* Avatar */}
            {c.customerImg ? (
                <img
                    src={c.customerImg}
                    alt={c.name}
                    className="w-10 h-10 rounded-full object-cover flex-shrink-0"
                    style={{ border: `2px solid ${BORDER}` }}
                />
            ) : (
                <div
                    className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 text-[11px] font-bold"
                    style={{ backgroundColor: OLIVE_LIGHT, color: OLIVE }}
                >
                    {getInitials(c.name)}
                </div>
            )}

            {/* Info */}
            <div className="flex-1 min-w-0">
                <p
                    className="text-[13px] font-semibold truncate"
                    style={{ color: TEXT_PRIMARY }}
                >
                    {c.name}
                </p>
                <div className="flex items-center gap-3 mt-0.5">
                    {c.mobile && (
                        <span
                            className="flex items-center gap-1 text-[11px]"
                            style={{ color: TEXT_SECONDARY }}
                        >
                            <Phone size={10} />
                            {c.mobile}
                        </span>
                    )}
                    {"region" in c && (c as CustomerItem).region && (
                        <span
                            className="flex items-center gap-1 text-[11px]"
                            style={{ color: TEXT_SECONDARY }}
                        >
                            <MapPin size={10} />
                            {(c as CustomerItem).region}
                        </span>
                    )}
                </div>
            </div>

            {/* Stats */}
            <div className="flex items-center gap-3 flex-shrink-0">
                <div className="text-right">
                    <p
                        className="text-[12px] font-bold"
                        style={{ color: TEXT_PRIMARY }}
                    >
                        {formatCurrency(c.totalLoanAmount)}
                    </p>
                    <p className="text-[10px]" style={{ color: TEXT_MUTED }}>
                        {c.activePledges} pledge{c.activePledges !== 1 ? "s" : ""}
                    </p>
                </div>
                {c.activePledges > 0 ? (
                    <span
                        className="px-2 py-0.5 rounded-full text-[9px] font-bold"
                        style={{ backgroundColor: "#E8F5E9", color: "#2E7D32" }}
                    >
                        Active
                    </span>
                ) : (
                    <span
                        className="px-2 py-0.5 rounded-full text-[9px] font-bold"
                        style={{ backgroundColor: "#F1F3F5", color: "#4B5563" }}
                    >
                        Released
                    </span>
                )}
            </div>
        </button>
    );
}

/* ================================================================== */
/*  Main Overlay Component                                              */
/* ================================================================== */

export function RegionsExplorerOverlay({ open, onClose }: Props) {
    const router = useRouter();
    const searchRef = useRef<HTMLInputElement>(null);
    const leftPanelRef = useRef<HTMLDivElement>(null);
    const rightPanelRef = useRef<HTMLDivElement>(null);
    const backdropRef = useRef<HTMLDivElement>(null);

    // ---- State ----
    const [query, setQuery] = useState("");
    const [debouncedQuery, setDebouncedQuery] = useState("");
    const [selectedRegion, setSelectedRegion] = useState<string | null>(null);
    const [keyboardIdx, setKeyboardIdx] = useState(-1);

    // Regions
    const [regions, setRegions] = useState<RegionItem[]>([]);
    const [regionsLoading, setRegionsLoading] = useState(false);
    const [regionsCursor, setRegionsCursor] = useState<number | null>(0);

    // Customers
    const [customers, setCustomers] = useState<CustomerItem[]>([]);
    const [customersLoading, setCustomersLoading] = useState(false);
    const [customersCursor, setCustomersCursor] = useState<number | null>(0);

    // Search
    const [searchResult, setSearchResult] = useState<SearchResult | null>(null);
    const [searchLoading, setSearchLoading] = useState(false);

    // Mobile: stacked navigation
    const [mobilePanel, setMobilePanel] = useState<"regions" | "customers">(
        "regions",
    );

    const isSearching = debouncedQuery.length > 0;

    // ---- Debounce search ----
    useEffect(() => {
        const timer = setTimeout(() => setDebouncedQuery(query), 300);
        return () => clearTimeout(timer);
    }, [query]);

    // ---- Auto-focus search on open ----
    useEffect(() => {
        if (open) {
            setTimeout(() => searchRef.current?.focus(), 100);
            // Reset state
            setQuery("");
            setDebouncedQuery("");
            setSelectedRegion(null);
            setRegions([]);
            setRegionsCursor(0);
            setCustomers([]);
            setCustomersCursor(0);
            setSearchResult(null);
            setMobilePanel("regions");
            setKeyboardIdx(-1);
        }
    }, [open]);

    // ---- ESC to close ----
    useEffect(() => {
        if (!open) return;
        const handler = (e: KeyboardEvent) => {
            if (e.key === "Escape") {
                e.preventDefault();
                onClose();
            }
        };
        window.addEventListener("keydown", handler);
        return () => window.removeEventListener("keydown", handler);
    }, [open, onClose]);

    // ---- Keyboard navigation ----
    useEffect(() => {
        if (!open || isSearching) return;
        const handler = (e: KeyboardEvent) => {
            if (e.key === "ArrowDown") {
                e.preventDefault();
                setKeyboardIdx((prev) => Math.min(prev + 1, regions.length - 1));
            } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setKeyboardIdx((prev) => Math.max(prev - 1, 0));
            } else if (e.key === "Enter" && keyboardIdx >= 0 && regions[keyboardIdx]) {
                e.preventDefault();
                handleRegionClick(regions[keyboardIdx].name);
            }
        };
        window.addEventListener("keydown", handler);
        return () => window.removeEventListener("keydown", handler);
    }, [open, isSearching, keyboardIdx, regions]);

    // ---- Fetch regions ----
    const fetchRegions = useCallback(
        async (cursor: number, append = false) => {
            setRegionsLoading(true);
            try {
                const res = await fetch(
                    `/api/dashboard/regions-explorer?mode=regions&cursor=${cursor}&limit=15`,
                );
                if (!res.ok) throw new Error();
                const data = await res.json();
                setRegions((prev) => (append ? [...prev, ...data.regions] : data.regions));
                setRegionsCursor(data.nextCursor);
                // Auto-select first region if none selected
                if (!append && !selectedRegion && data.regions.length > 0) {
                    handleRegionClick(data.regions[0].name);
                }
            } catch {
                // silent
            } finally {
                setRegionsLoading(false);
            }
        },
        [selectedRegion],
    );

    // ---- Fetch customers ----
    const fetchCustomers = useCallback(
        async (region: string, cursor: number, append = false) => {
            setCustomersLoading(true);
            try {
                const res = await fetch(
                    `/api/dashboard/regions-explorer?mode=customers&region=${encodeURIComponent(region)}&cursor=${cursor}&limit=15`,
                );
                if (!res.ok) throw new Error();
                const data = await res.json();
                setCustomers((prev) =>
                    append ? [...prev, ...data.customers] : data.customers,
                );
                setCustomersCursor(data.nextCursor);
            } catch {
                // silent
            } finally {
                setCustomersLoading(false);
            }
        },
        [],
    );

    // ---- Search ----
    const fetchSearch = useCallback(async (q: string) => {
        setSearchLoading(true);
        try {
            const res = await fetch(
                `/api/dashboard/regions-explorer?mode=search&q=${encodeURIComponent(q)}`,
            );
            if (!res.ok) throw new Error();
            const data: SearchResult = await res.json();
            setSearchResult(data);
        } catch {
            // silent
        } finally {
            setSearchLoading(false);
        }
    }, []);

    // ---- Load regions on open ----
    useEffect(() => {
        if (open && !isSearching) {
            fetchRegions(0);
        }
    }, [open]);

    // ---- Search effect ----
    useEffect(() => {
        if (!open) return;
        if (debouncedQuery.length > 0) {
            fetchSearch(debouncedQuery);
        } else {
            setSearchResult(null);
        }
    }, [debouncedQuery, open, fetchSearch]);

    // ---- Region click ----
    const handleRegionClick = useCallback(
        (regionName: string) => {
            setSelectedRegion(regionName);
            setCustomers([]);
            setCustomersCursor(0);
            setMobilePanel("customers");
            setKeyboardIdx(regions.findIndex((r) => r.name === regionName));
            fetchCustomers(regionName, 0);
        },
        [regions, fetchCustomers],
    );

    // ---- Customer click ----
    const handleCustomerClick = useCallback(
        (customerId: string) => {
            onClose();
            router.push(`/customers/${customerId}`);
        },
        [onClose, router],
    );

    // ---- Infinite scroll: regions ----
    const handleRegionsScroll = useCallback(
        (e: React.UIEvent<HTMLDivElement>) => {
            if (regionsLoading || regionsCursor === null) return;
            const el = e.currentTarget;
            if (el.scrollHeight - el.scrollTop - el.clientHeight < 80) {
                fetchRegions(regionsCursor, true);
            }
        },
        [regionsLoading, regionsCursor, fetchRegions],
    );

    // ---- Infinite scroll: customers ----
    const handleCustomersScroll = useCallback(
        (e: React.UIEvent<HTMLDivElement>) => {
            if (customersLoading || customersCursor === null || !selectedRegion) return;
            const el = e.currentTarget;
            if (el.scrollHeight - el.scrollTop - el.clientHeight < 80) {
                fetchCustomers(selectedRegion, customersCursor, true);
            }
        },
        [customersLoading, customersCursor, selectedRegion, fetchCustomers],
    );

    // ---- Outside click ----
    const handleBackdropClick = useCallback(
        (e: React.MouseEvent) => {
            if (e.target === backdropRef.current) {
                onClose();
            }
        },
        [onClose],
    );

    // ---- Selected region info ----
    const selectedRegionInfo = useMemo(
        () => regions.find((r) => r.name === selectedRegion),
        [regions, selectedRegion],
    );

    // ---- Don't render when closed ----
    if (!open) return null;

    return (
        <div
            ref={backdropRef}
            onClick={handleBackdropClick}
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
            style={{
                backgroundColor: "rgba(0,0,0,0.28)",
                backdropFilter: "blur(4px)",
                WebkitBackdropFilter: "blur(4px)",
                animation: "regionsOverlayFadeIn 180ms ease-out",
            }}
        >
            {/* Inline animation keyframes */}
            <style>{`
        @keyframes regionsOverlayFadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes regionsSlideUp {
          from { opacity: 0; transform: translateY(16px) scale(0.98); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>

            {/* ---- Modal Container ---- */}
            <div
                className="flex flex-col overflow-hidden"
                style={{
                    width: 720,
                    maxWidth: "92vw",
                    height: "78vh",
                    maxHeight: "calc(100vh - 48px)",
                    backgroundColor: WHITE,
                    borderRadius: 24,
                    boxShadow:
                        "0 24px 80px rgba(0,0,0,0.16), 0 8px 24px rgba(0,0,0,0.08)",
                    animation: "regionsSlideUp 240ms ease-out",
                }}
            >
                {/* ============================================================ */}
                {/*  Section 1: Search Header                                     */}
                {/* ============================================================ */}
                <div
                    className="flex-shrink-0 flex items-center gap-3 px-5"
                    style={{
                        height: 72,
                        borderBottom: `1px solid ${BORDER}`,
                    }}
                >
                    <Search size={18} style={{ color: TEXT_MUTED, flexShrink: 0 }} />
                    <input
                        ref={searchRef}
                        type="text"
                        placeholder="Search region or customer..."
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        className="flex-1 bg-transparent outline-none text-[14px] font-medium"
                        style={{ color: TEXT_PRIMARY }}
                    />
                    {query && (
                        <button
                            onClick={() => {
                                setQuery("");
                                searchRef.current?.focus();
                            }}
                            className="p-1 rounded-lg transition-colors duration-150"
                            onMouseEnter={(e) =>
                                (e.currentTarget.style.backgroundColor = CARD_BG)
                            }
                            onMouseLeave={(e) =>
                                (e.currentTarget.style.backgroundColor = "transparent")
                            }
                        >
                            <X size={14} style={{ color: TEXT_MUTED }} />
                        </button>
                    )}
                    <button
                        onClick={onClose}
                        className="p-1.5 rounded-lg transition-colors duration-150 flex-shrink-0 cursor-pointer"
                        style={{ backgroundColor: CARD_BG }}
                        onMouseEnter={(e) =>
                            (e.currentTarget.style.backgroundColor = BORDER)
                        }
                        onMouseLeave={(e) =>
                            (e.currentTarget.style.backgroundColor = CARD_BG)
                        }
                    >
                        <X size={14} style={{ color: TEXT_SECONDARY }} />
                    </button>
                </div>

                {/* ============================================================ */}
                {/*  Section 2: Main Body                                         */}
                {/* ============================================================ */}
                <div className="flex-1 min-h-0 overflow-hidden">
                    {isSearching ? (
                        /* ---- Search Results Mode ---- */
                        <div className="h-full overflow-y-auto px-5 py-4">
                            {searchLoading ? (
                                <CustomerSkeleton />
                            ) : !searchResult ||
                                (searchResult.matchedRegions.length === 0 &&
                                    searchResult.directCustomerMatches.length === 0) ? (
                                <EmptyState icon={Search} text="No matches found" />
                            ) : (
                                <div className="space-y-5">
                                    {/* Matched Regions */}
                                    {searchResult.matchedRegions.length > 0 && (
                                        <div>
                                            <p
                                                className="text-[10px] font-bold tracking-wider uppercase mb-3 px-1"
                                                style={{ color: TEXT_MUTED }}
                                            >
                                                Matching Regions
                                            </p>
                                            <div className="space-y-2">
                                                {searchResult.matchedRegions.map((r) => (
                                                    <div
                                                        key={r.name}
                                                        className="rounded-xl overflow-hidden"
                                                        style={{
                                                            border: `1px solid ${BORDER}`,
                                                            backgroundColor: CARD_BG,
                                                        }}
                                                    >
                                                        {/* Region header */}
                                                        <button
                                                            onClick={() => {
                                                                setQuery("");
                                                                setDebouncedQuery("");
                                                                // Add region to list if not present, then select
                                                                setRegions((prev) => {
                                                                    const exists = prev.some(
                                                                        (x) => x.name === r.name,
                                                                    );
                                                                    if (!exists) {
                                                                        return [
                                                                            {
                                                                                name: r.name,
                                                                                customerCount: r.customerCount,
                                                                                activePledges: r.activePledges,
                                                                            },
                                                                            ...prev,
                                                                        ];
                                                                    }
                                                                    return prev;
                                                                });
                                                                handleRegionClick(r.name);
                                                            }}
                                                            className="w-full flex items-center justify-between px-4 py-3 transition-colors duration-150"
                                                            onMouseEnter={(e) =>
                                                            (e.currentTarget.style.backgroundColor =
                                                                OLIVE_HOVER)
                                                            }
                                                            onMouseLeave={(e) =>
                                                            (e.currentTarget.style.backgroundColor =
                                                                "transparent")
                                                            }
                                                        >
                                                            <div className="flex items-center gap-3">
                                                                <div
                                                                    className="w-8 h-8 rounded-lg flex items-center justify-center"
                                                                    style={{
                                                                        backgroundColor: OLIVE_LIGHT,
                                                                    }}
                                                                >
                                                                    <MapPin
                                                                        size={14}
                                                                        style={{ color: OLIVE }}
                                                                    />
                                                                </div>
                                                                <div className="text-left">
                                                                    <p
                                                                        className="text-[13px] font-bold"
                                                                        style={{ color: TEXT_PRIMARY }}
                                                                    >
                                                                        {r.name}
                                                                    </p>
                                                                    <p
                                                                        className="text-[11px]"
                                                                        style={{ color: TEXT_SECONDARY }}
                                                                    >
                                                                        {r.customerCount} customer
                                                                        {r.customerCount !== 1 ? "s" : ""} ·{" "}
                                                                        {r.activePledges} active
                                                                    </p>
                                                                </div>
                                                            </div>
                                                            <ChevronRight
                                                                size={14}
                                                                style={{ color: TEXT_MUTED }}
                                                            />
                                                        </button>

                                                        {/* Preview customers */}
                                                        {r.previewCustomers.length > 0 && (
                                                            <div
                                                                className="px-2 pb-2"
                                                                style={{
                                                                    borderTop: `1px solid ${BORDER}`,
                                                                }}
                                                            >
                                                                {r.previewCustomers.map((c) => (
                                                                    <CustomerRow
                                                                        key={c.id}
                                                                        customer={c}
                                                                        onClick={() => handleCustomerClick(c.id)}
                                                                    />
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Direct Customer Matches */}
                                    {searchResult.directCustomerMatches.length > 0 && (
                                        <div>
                                            <p
                                                className="text-[10px] font-bold tracking-wider uppercase mb-3 px-1"
                                                style={{ color: TEXT_MUTED }}
                                            >
                                                Customers
                                            </p>
                                            <div
                                                className="rounded-xl overflow-hidden"
                                                style={{
                                                    border: `1px solid ${BORDER}`,
                                                    backgroundColor: CARD_BG,
                                                }}
                                            >
                                                {searchResult.directCustomerMatches.map((c) => (
                                                    <CustomerRow
                                                        key={c.id}
                                                        customer={c}
                                                        onClick={() => handleCustomerClick(c.id)}
                                                    />
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    ) : (
                        /* ---- Split Panel Mode ---- */
                        <>
                            {/* Desktop: side-by-side */}
                            <div className="hidden md:flex h-full">
                                {/* Left Panel — Regions */}
                                <div
                                    ref={leftPanelRef}
                                    className="h-full overflow-y-auto"
                                    style={{
                                        width: "40%",
                                        borderRight: `1px solid ${BORDER}`,
                                    }}
                                    onScroll={handleRegionsScroll}
                                >
                                    <div
                                        className="sticky top-0 z-10 px-5 py-3"
                                        style={{
                                            backgroundColor: WHITE,
                                            borderBottom: `1px solid ${BORDER}`,
                                        }}
                                    >
                                        <p
                                            className="text-[10px] font-bold tracking-wider uppercase"
                                            style={{ color: TEXT_MUTED }}
                                        >
                                            Regions
                                        </p>
                                    </div>

                                    {regionsLoading && regions.length === 0 ? (
                                        <RegionSkeleton />
                                    ) : regions.length === 0 ? (
                                        <EmptyState icon={MapPin} text="No regions available" />
                                    ) : (
                                        <div className="p-2 space-y-0.5">
                                            {regions.map((r, idx) => (
                                                <button
                                                    key={r.name}
                                                    onClick={() => handleRegionClick(r.name)}
                                                    className="w-full flex items-center justify-between rounded-xl px-4 py-3 text-left transition-all duration-150 cursor-pointer"
                                                    style={{
                                                        backgroundColor:
                                                            selectedRegion === r.name
                                                                ? OLIVE_LIGHT
                                                                : keyboardIdx === idx
                                                                    ? OLIVE_HOVER
                                                                    : "transparent",
                                                        ...(selectedRegion === r.name
                                                            ? {
                                                                boxShadow: `inset 3px 0 0 ${OLIVE}`,
                                                            }
                                                            : {}),
                                                    }}
                                                    onMouseEnter={(e) => {
                                                        if (selectedRegion !== r.name)
                                                            e.currentTarget.style.backgroundColor =
                                                                OLIVE_HOVER;
                                                    }}
                                                    onMouseLeave={(e) => {
                                                        if (selectedRegion !== r.name)
                                                            e.currentTarget.style.backgroundColor =
                                                                "transparent";
                                                    }}
                                                >
                                                    <div className="flex items-center gap-3 min-w-0">
                                                        <div
                                                            className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                                                            style={{
                                                                backgroundColor:
                                                                    selectedRegion === r.name ? OLIVE : CARD_BG,
                                                            }}
                                                        >
                                                            <MapPin
                                                                size={14}
                                                                style={{
                                                                    color:
                                                                        selectedRegion === r.name ? WHITE : OLIVE,
                                                                }}
                                                            />
                                                        </div>
                                                        <div className="min-w-0">
                                                            <p
                                                                className="text-[12px] font-bold truncate"
                                                                style={{
                                                                    color:
                                                                        selectedRegion === r.name
                                                                            ? OLIVE
                                                                            : TEXT_PRIMARY,
                                                                }}
                                                            >
                                                                {r.name}
                                                            </p>
                                                            <p
                                                                className="text-[10px]"
                                                                style={{ color: TEXT_MUTED }}
                                                            >
                                                                {r.activePledges} active
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <span
                                                        className="px-2 py-0.5 rounded-full text-[10px] font-bold flex-shrink-0"
                                                        style={{
                                                            backgroundColor:
                                                                selectedRegion === r.name ? OLIVE : CARD_BG,
                                                            color:
                                                                selectedRegion === r.name ? WHITE : TEXT_PRIMARY,
                                                        }}
                                                    >
                                                        {r.customerCount}
                                                    </span>
                                                </button>
                                            ))}
                                            {regionsLoading && (
                                                <div className="flex justify-center py-3">
                                                    <div
                                                        className="w-5 h-5 rounded-full border-2 border-t-transparent animate-spin"
                                                        style={{ borderColor: `${OLIVE} transparent ${OLIVE} ${OLIVE}` }}
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* Right Panel — Customers */}
                                <div
                                    ref={rightPanelRef}
                                    className="h-full overflow-y-auto"
                                    style={{ width: "60%" }}
                                    onScroll={handleCustomersScroll}
                                >
                                    {selectedRegion ? (
                                        <>
                                            <div
                                                className="sticky top-0 z-10 px-5 py-3 flex items-center justify-between"
                                                style={{
                                                    backgroundColor: WHITE,
                                                    borderBottom: `1px solid ${BORDER}`,
                                                }}
                                            >
                                                <div>
                                                    <p
                                                        className="text-[13px] font-bold"
                                                        style={{ color: TEXT_PRIMARY }}
                                                    >
                                                        {selectedRegion}
                                                    </p>
                                                    <p className="text-[11px]" style={{ color: TEXT_SECONDARY }}>
                                                        {selectedRegionInfo?.customerCount ?? "…"} customer
                                                        {(selectedRegionInfo?.customerCount ?? 0) !== 1
                                                            ? "s"
                                                            : ""}
                                                    </p>
                                                </div>
                                                <div
                                                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold"
                                                    style={{ backgroundColor: OLIVE_LIGHT, color: OLIVE }}
                                                >
                                                    <Archive size={10} />
                                                    {selectedRegionInfo?.activePledges ?? 0} active
                                                </div>
                                            </div>

                                            <div className="p-2">
                                                {customersLoading && customers.length === 0 ? (
                                                    <CustomerSkeleton />
                                                ) : customers.length === 0 ? (
                                                    <EmptyState
                                                        icon={Users}
                                                        text="No customers found in this region"
                                                    />
                                                ) : (
                                                    <div className="space-y-0.5">
                                                        {customers.map((c) => (
                                                            <CustomerRow
                                                                key={c.id}
                                                                customer={c}
                                                                onClick={() => handleCustomerClick(c.id)}
                                                            />
                                                        ))}
                                                        {customersLoading && (
                                                            <div className="flex justify-center py-3">
                                                                <div
                                                                    className="w-5 h-5 rounded-full border-2 border-t-transparent animate-spin"
                                                                    style={{ borderColor: `${OLIVE} transparent ${OLIVE} ${OLIVE}` }}
                                                                />
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </>
                                    ) : (
                                        <EmptyState
                                            icon={MapPin}
                                            text="Select a region to view customers"
                                        />
                                    )}
                                </div>
                            </div>

                            {/* Mobile: stacked panels */}
                            <div className="flex md:hidden flex-col h-full">
                                {mobilePanel === "regions" ? (
                                    <div className="h-full overflow-y-auto" onScroll={handleRegionsScroll}>
                                        <div
                                            className="sticky top-0 z-10 px-5 py-3"
                                            style={{
                                                backgroundColor: WHITE,
                                                borderBottom: `1px solid ${BORDER}`,
                                            }}
                                        >
                                            <p
                                                className="text-[10px] font-bold tracking-wider uppercase"
                                                style={{ color: TEXT_MUTED }}
                                            >
                                                Regions
                                            </p>
                                        </div>
                                        {regionsLoading && regions.length === 0 ? (
                                            <RegionSkeleton />
                                        ) : regions.length === 0 ? (
                                            <EmptyState icon={MapPin} text="No regions available" />
                                        ) : (
                                            <div className="p-2 space-y-0.5">
                                                {regions.map((r) => (
                                                    <button
                                                        key={r.name}
                                                        onClick={() => handleRegionClick(r.name)}
                                                        className="w-full flex items-center justify-between rounded-xl px-4 py-3.5 text-left transition-all duration-150"
                                                        style={{ backgroundColor: "transparent" }}
                                                        onMouseEnter={(e) =>
                                                        (e.currentTarget.style.backgroundColor =
                                                            OLIVE_HOVER)
                                                        }
                                                        onMouseLeave={(e) =>
                                                        (e.currentTarget.style.backgroundColor =
                                                            "transparent")
                                                        }
                                                    >
                                                        <div className="flex items-center gap-3">
                                                            <div
                                                                className="w-9 h-9 rounded-lg flex items-center justify-center"
                                                                style={{ backgroundColor: OLIVE_LIGHT }}
                                                            >
                                                                <MapPin size={15} style={{ color: OLIVE }} />
                                                            </div>
                                                            <div>
                                                                <p
                                                                    className="text-[13px] font-bold"
                                                                    style={{ color: TEXT_PRIMARY }}
                                                                >
                                                                    {r.name}
                                                                </p>
                                                                <p
                                                                    className="text-[11px]"
                                                                    style={{ color: TEXT_SECONDARY }}
                                                                >
                                                                    {r.activePledges} active pledge
                                                                    {r.activePledges !== 1 ? "s" : ""}
                                                                </p>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <span
                                                                className="px-2.5 py-1 rounded-full text-[11px] font-bold"
                                                                style={{
                                                                    backgroundColor: CARD_BG,
                                                                    color: TEXT_PRIMARY,
                                                                }}
                                                            >
                                                                {r.customerCount}
                                                            </span>
                                                            <ChevronRight
                                                                size={14}
                                                                style={{ color: TEXT_MUTED }}
                                                            />
                                                        </div>
                                                    </button>
                                                ))}
                                                {regionsLoading && (
                                                    <div className="flex justify-center py-3">
                                                        <div
                                                            className="w-5 h-5 rounded-full border-2 border-t-transparent animate-spin"
                                                            style={{ borderColor: `${OLIVE} transparent ${OLIVE} ${OLIVE}` }}
                                                        />
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div
                                        className="h-full overflow-y-auto"
                                        onScroll={handleCustomersScroll}
                                    >
                                        {/* Mobile back header */}
                                        <div
                                            className="sticky top-0 z-10 px-4 py-3 flex items-center gap-3"
                                            style={{
                                                backgroundColor: WHITE,
                                                borderBottom: `1px solid ${BORDER}`,
                                            }}
                                        >
                                            <button
                                                onClick={() => setMobilePanel("regions")}
                                                className="p-1.5 rounded-lg transition-colors"
                                                style={{ backgroundColor: CARD_BG }}
                                            >
                                                <ArrowLeft size={14} style={{ color: TEXT_PRIMARY }} />
                                            </button>
                                            <div>
                                                <p
                                                    className="text-[13px] font-bold"
                                                    style={{ color: TEXT_PRIMARY }}
                                                >
                                                    {selectedRegion}
                                                </p>
                                                <p
                                                    className="text-[10px]"
                                                    style={{ color: TEXT_SECONDARY }}
                                                >
                                                    {selectedRegionInfo?.customerCount ?? 0} customers
                                                </p>
                                            </div>
                                        </div>

                                        <div className="p-2">
                                            {customersLoading && customers.length === 0 ? (
                                                <CustomerSkeleton />
                                            ) : customers.length === 0 ? (
                                                <EmptyState
                                                    icon={Users}
                                                    text="No customers found in this region"
                                                />
                                            ) : (
                                                <div className="space-y-0.5">
                                                    {customers.map((c) => (
                                                        <CustomerRow
                                                            key={c.id}
                                                            customer={c}
                                                            onClick={() => handleCustomerClick(c.id)}
                                                        />
                                                    ))}
                                                    {customersLoading && (
                                                        <div className="flex justify-center py-3">
                                                            <div
                                                                className="w-5 h-5 rounded-full border-2 border-t-transparent animate-spin"
                                                                style={{ borderColor: `${OLIVE} transparent ${OLIVE} ${OLIVE}` }}
                                                            />
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}