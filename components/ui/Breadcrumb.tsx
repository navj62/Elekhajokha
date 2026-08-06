"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";


const routeLabels: Record<string, string> = {
    "": "Dashboard",
    "dashboard": "Dashboard",
    "customers": "Customer",
    "add-customers": "Add Customers",
    "reports": "Reports",
    "inventory": "Inventory",
    "profile": "Profile",
    "ltv": "Itv",
    "pledges": "Pledges",
};

export default function Breadcrumb() {
    const pathname = usePathname(); // e.g. "/pledges" or "/customers/123"
    const segments = pathname.split("/").filter(Boolean);

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

    const trail = segments.map((segment, index) => {
        const isUuid = uuidRegex.test(segment);
        const isPrevCustomers = index > 0 && segments[index - 1] === "customers";
        const isPrevPledges = index > 0 && segments[index - 1] === "pledges";

        // Keep track of the original segment value for the link path
        const originalSegment = segment;

        let label = routeLabels[segment] ?? segment
            .replace(/-/g, " ")
            .replace(/\b\w/g, (c) => c.toUpperCase());

        if (isUuid || isPrevCustomers || isPrevPledges) {
            label = isPrevPledges ? "pledgeid" : "customerid";
        }

        // Generate the URL path up to the current segment
        const url = "/" + segments.slice(0, index + 1).join("/");
        const clickable = segment !== "pledges";

        return { label, url, clickable };
    });

    // If on the root/dashboard without segments, default to Dashboard
    const displayTrail = trail.length === 0 ? [{ label: "Dashboard", url: "/dashboard", clickable: true }] : trail;

    return (
        <div className="flex items-center gap-2 text-sm">
            {/* Clickable Home/Brand Label */}
            <Link href="/dashboard" className="text-muted-foreground-subtle font-medium hover:text-foreground transition-colors">
                Lekha-Jokha
            </Link>

            {displayTrail.map((item, index) => {
                const isLast = index === displayTrail.length - 1;
                const isClickable = item.clickable && !isLast;

                return (
                    <div key={index} className="flex items-center gap-2">
                        <span className="text-muted-foreground-subtle/40">/</span>
                        {isClickable ? (
                            // Clickable parent segments
                            <Link
                                href={item.url}
                                className="text-muted-foreground-subtle font-medium hover:text-foreground transition-colors"
                            >
                                {item.label}
                            </Link>
                        ) : (
                            // Non-clickable segments or last segment
                            <span className={isLast ? "text-foreground font-semibold" : "text-muted-foreground-subtle font-medium"}>
                                {item.label}
                            </span>
                        )}
                    </div>
                );
            })}
        </div>
    );
}
