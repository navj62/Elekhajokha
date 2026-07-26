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

        // Keep track of the original segment value for the link path
        const originalSegment = segment;

        const label = (isUuid || isPrevCustomers) ? "customerid" : (
            routeLabels[segment] ?? segment
                .replace(/-/g, " ")
                .replace(/\b\w/g, (c) => c.toUpperCase())
        );

        // Generate the URL path up to the current segment
        const url = "/" + segments.slice(0, index + 1).join("/");

        return { label, url };
    });

    // If on the root/dashboard without segments, default to Dashboard
    const displayTrail = trail.length === 0 ? [{ label: "Dashboard", url: "/dashboard" }] : trail;

    return (
        <div className="flex items-center gap-2 text-sm">
            {/* Clickable Home/Brand Label */}
            <Link href="/dashboard" className="text-gray-500 font-medium hover:text-gray-800 transition-colors">
                Lekha-Jokha
            </Link>

            {displayTrail.map((item, index) => {
                const isLast = index === displayTrail.length - 1;
                return (
                    <div key={index} className="flex items-center gap-2">
                        <span className="text-gray-300">/</span>
                        {isLast ? (
                            // Last segment is not clickable (active page)
                            <span className="text-gray-800 font-semibold">
                                {item.label}
                            </span>
                        ) : (
                            // Clickable parent segments
                            <Link
                                href={item.url}
                                className="text-gray-500 font-medium hover:text-gray-800 transition-colors"
                            >
                                {item.label}
                            </Link>
                        )}
                    </div>
                );
            })}
        </div>
    );
}
