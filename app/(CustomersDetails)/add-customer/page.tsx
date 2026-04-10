"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import SubscriptionGuard from "@/components/SubscriptionGuard";
import { AlertTriangle, CheckCircle2, Loader2 } from "lucide-react";

interface SimilarCustomer {
  id:     string;
  name:   string;
  mobile: string | null;
}

export default function AddCustomerPage() {
  const router = useRouter(); // ✅ for redirect after success

  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");

  /* ── Duplicate check ──────────────────────────────────────────── */
  const [nameInput,        setNameInput]        = useState("");
  const [similarCustomers, setSimilarCustomers] = useState<SimilarCustomer[]>([]);
  const [checkStatus,      setCheckStatus]      = useState<"idle" | "checking" | "done">("idle");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (nameInput.trim().length < 2) {
      setSimilarCustomers([]);
      setCheckStatus("idle");
      return;
    }

    setCheckStatus("checking");

    debounceRef.current = setTimeout(async () => {
      try {
        const res  = await fetch(
          `/api/customers/check-duplicate?name=${encodeURIComponent(nameInput.trim())}`
        );
        const data = await res.json();
        setSimilarCustomers(data.matches ?? []);
        setCheckStatus("done");
      } catch {
        setCheckStatus("done"); // non-critical — silently fail
      }
    }, 500);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [nameInput]);

  /* ── Submit ──────────────────────────────────────────────────── */
  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/add-customer", {
        method: "POST",
        body:   new FormData(e.currentTarget),
      });

      const data = await res.json();

      if (res.ok) {
        // ✅ Redirect to customers list — no alert()
        router.push("/customers");
      } else {
        setError(data.error || "Something went wrong");
      }
    } catch {
      setError("Network error — please try again");
    } finally {
      setLoading(false);
    }
  }

  /* ================================================================ */
  return (
    <SubscriptionGuard featureName="Add Customer">
      <div className="max-w-2xl mx-auto p-6">
        <h1 className="text-2xl font-bold mb-6">Add New Customer</h1>

        <form onSubmit={handleSubmit} className="space-y-4">

          {/* ── Full Name with live duplicate check ─────────────── */}
          <div>
            <label className="block font-medium mb-1">
              Full Name <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                name="name"
                required
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                className="w-full border p-2 rounded pr-8"
                placeholder="Enter customer name"
              />
              {checkStatus === "checking" && (
                <Loader2 className="absolute right-2 top-2.5 w-4 h-4 animate-spin text-gray-400" />
              )}
              {checkStatus === "done" && similarCustomers.length === 0 && nameInput.length >= 2 && (
                <CheckCircle2 className="absolute right-2 top-2.5 w-4 h-4 text-green-500" />
              )}
              {checkStatus === "done" && similarCustomers.length > 0 && (
                <AlertTriangle className="absolute right-2 top-2.5 w-4 h-4 text-amber-500" />
              )}
            </div>

            {checkStatus === "done" && similarCustomers.length > 0 && (
              <div className="mt-2 rounded-md border border-amber-200 bg-amber-50 p-3">
                <p className="text-sm font-medium text-amber-800 flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  {similarCustomers.length === 1
                    ? "A customer with a similar name already exists:"
                    : `${similarCustomers.length} customers with similar names exist:`}
                </p>
                <ul className="mt-2 space-y-1">
                  {similarCustomers.map((c) => (
                    <li key={c.id} className="text-sm text-amber-700 flex items-center justify-between">
                      <span className="font-medium">{c.name}</span>
                      {c.mobile && <span className="text-amber-500 text-xs">{c.mobile}</span>}
                    </li>
                  ))}
                </ul>
                <p className="mt-2 text-xs text-amber-600">
                  You can still proceed — this is just a heads-up.
                </p>
              </div>
            )}
          </div>

          {/* ── Address ──────────────────────────────────────────── */}
          <div>
            <label className="block font-medium mb-1">
              Address <span className="text-red-500">*</span>
            </label>
            <textarea
              name="address"
              required
              className="w-full border p-2 rounded"
              placeholder="Enter full address"
            />
          </div>

          {/* ── Region ───────────────────────────────────────────── */}
          <div>
            <label className="block font-medium mb-1">
              Region <span className="text-red-500">*</span>
            </label>
            <input
              name="region"
              required
              className="w-full border p-2 rounded"
              placeholder="City / Area / Locality"
            />
          </div>

          {/* ── Mobile ───────────────────────────────────────────── */}
          <div>
            <label className="block font-medium mb-1">Mobile Number</label>
            <input
              name="mobile"
              type="tel"
              maxLength={10}
              pattern="\d{10}"
              title="Enter a valid 10-digit mobile number"
              className="w-full border p-2 rounded"
              placeholder="10 digit mobile number"
            />
          </div>

          {/* ── Aadhaar ──────────────────────────────────────────── */}
          <div>
            <label className="block font-medium mb-1">Aadhaar Number</label>
            <input
              name="aadhaarNo"   // ✅ matches API: fd.get("aadhaarNo")
              maxLength={12}
              className="w-full border p-2 rounded"
              placeholder="XXXX XXXX XXXX"
            />
          </div>

          {/* ── Gender ───────────────────────────────────────────── */}
          <div>
            <label className="block font-medium mb-1">Gender</label>
            <select name="gender" className="w-full border p-2 rounded">
              <option value="">Select</option>
              {/* ✅ Values match schema enum: Male | Female | Other */}
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Other">Other</option>
            </select>
          </div>

          {/* ── Customer Photo ───────────────────────────────────── */}
          <div>
            <label className="block font-medium mb-1">Customer Photo</label>
            <input
              name="userImg"
              type="file"
              accept="image/*"
              className="w-full"
            />
          </div>

          {/* ── ID Proof ─────────────────────────────────────────── */}
          <div>
            <label className="block font-medium mb-1">ID Proof Image</label>
            <input
              name="idProofImg"
              type="file"
              accept="image/*"
              className="w-full"
            />
          </div>

          {/* ── Remarks ──────────────────────────────────────────── */}
          <div>
            <label className="block font-medium mb-1">Remarks</label>
            <textarea
              name="remarks"
              className="w-full border p-2 rounded"
              placeholder="Optional notes"
            />
          </div>

          {/* ── Error ────────────────────────────────────────────── */}
          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
              {error}
            </p>
          )}

          {/* ── Submit ───────────────────────────────────────────── */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-black text-white p-2 rounded hover:opacity-90 disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            {loading ? "Saving..." : "Add Customer"}
          </button>

        </form>
      </div>
    </SubscriptionGuard>
  );
}