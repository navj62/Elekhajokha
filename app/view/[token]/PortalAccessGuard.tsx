"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function PortalAccessGuard({ token }: { token: string }) {
  const router = useRouter();

  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/portal-status/${token}`, {
          cache: "no-store",
        });
        if (res.status === 403 || res.status === 404) {
          router.refresh();
        }
      } catch (err) {
        console.error("Portal status check failed", err);
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [router, token]);

  return null;
}