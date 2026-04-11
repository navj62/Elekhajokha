"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */
type Pledge = {
  id:          string;
  status:      "ACTIVE" | "RELEASED" | "OVERDUE";
  pledgeDate:  string;
  loanAmount:  string;
  releaseDate: string | null;
  itemLabel:   string | null; // formatted by API: itemName || "Necklace (Gold)"
  itemCount:   number;        // total PledgeItems
};

type CustomerDetail = {
  id:          string;
  name:        string;
  address:     string;        // ✅ kept
  region:      string;        // ✅ added
  mobile:      string | null;
  aadharNo:    string | null;
  remark:      string | null;
  customerImg: string | null;
  idProofImg:  string | null;
  pledges:     Pledge[];
};


/* ------------------------------------------------------------------ */
/*  Helpers                                                             */
/* ------------------------------------------------------------------ */
function formatDate(value?: string | null) {
  if (!value) return "—";
  const d = new Date(value);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-IN", {
    day: "2-digit", month: "short", year: "numeric",
  });
}

function fmt(amount: string | number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency", currency: "INR", maximumFractionDigits: 2,
  }).format(Number(amount));
}

const STATUS_STYLES: Record<string, string> = {
  ACTIVE:   "bg-green-100 text-green-700",
  RELEASED: "bg-gray-100  text-gray-600",
  OVERDUE:  "bg-red-100   text-red-700",
};

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
      STATUS_STYLES[status] ?? "bg-gray-100 text-gray-600"
    }`}>
      {status.charAt(0) + status.slice(1).toLowerCase()}
    </span>
  );
}

/* ================================================================== */
/*  Page                                                                */
/* ================================================================== */
export default function CustomerDetailPage() {
  const params     = useParams<{ customerId: string }>();
  const customerId = params?.customerId;

  const [customer,   setCustomer]   = useState<CustomerDetail | null>(null);
  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState<string | null>(null);
  const [toastMsg,   setToastMsg]   = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const toastRef = useRef<NodeJS.Timeout | null>(null);

  function showToast(msg: string) {
    setToastMsg(msg);
    if (toastRef.current) clearTimeout(toastRef.current);
    toastRef.current = setTimeout(() => setToastMsg(null), 4000);
  }

  
  /* ---- Load ---------------------------------------------------- */
  useEffect(() => {
    if (!customerId) return;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/customers/${customerId}`, {
        cache: "no-store", // ✅ ADD HERE
      });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || "Unable to load customer.");
        setCustomer(data.customer);
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Unexpected error";
        setError(msg);
        showToast(msg);
      } finally {
        setLoading(false);
      }
    };
    load();
    return () => { if (toastRef.current) clearTimeout(toastRef.current); };
  }, [customerId]);

  /* ---- Delete pledge ------------------------------------------ */
  async function handleDelete(pledgeId: string) {
    if (!customer) return;
    if (!window.confirm("Delete this pledge? This cannot be undone.")) return;
    setDeletingId(pledgeId);
    try {
      const res  = await fetch(`/api/pledges/${pledgeId}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Unable to delete pledge.");
      setCustomer({
        ...customer,
        pledges: customer.pledges.filter((p) => p.id !== pledgeId),
      });
      showToast("Pledge deleted.");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Unexpected error");
    } finally {
      setDeletingId(null);
    }
  }

  if (!customerId) {
    return (
      <div className="max-w-5xl mx-auto p-6">
        <p className="text-sm text-gray-500">Customer ID not provided.</p>
      </div>
    );
  }

  /* ================================================================ */
  /*  Render                                                            */
  /* ================================================================ */
  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">

      {/* Header */}
      <div>
        <Link href="/customers" className="text-sm text-gray-500 hover:underline">
          ← Back to Customers
        </Link>
        <h1 className="text-2xl font-bold mt-2">Customer Details</h1>
      </div>

      {loading ? (
        <p className="text-sm text-gray-500">Loading…</p>
      ) : error ? (
        <Alert variant="destructive">
          <AlertTitle>Unable to load customer</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : !customer ? (
        <p className="text-sm text-gray-500">Customer not found.</p>
      ) : (
        <div className="space-y-6">

          {/* Profile card */}
          <section className="border rounded-2xl p-5 bg-white shadow-sm flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden shrink-0">
                {customer.customerImg ? (
                  <img
                    src={customer.customerImg}
                    alt={customer.name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span className="text-gray-400 text-xl font-semibold">
                    {customer.name.charAt(0).toUpperCase()}
                  </span>
                )}
              </div>
              <div>
                <h2 className="text-lg font-semibold">{customer.name}</h2>
                {/* ✅ Show region as subtitle under name */}
                <p className="text-sm text-gray-500">{customer.region}</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className="border border-gray-300 px-4 py-2 rounded text-sm hover:bg-gray-50"
              >
                Change Photo
              </button>
              <Link
                href={`/customers/${customerId}/pledges/add`}
                className="bg-yellow-600 text-white px-4 py-2 rounded text-sm hover:bg-yellow-700"
              >
                Add Pledge
              </Link>
              <button
                type="button"
                className="bg-yellow-600 text-white px-4 py-2 rounded text-sm hover:bg-yellow-700"
              >
                Edit
              </button>
            </div>
          </section>

          {/* Customer info */}
          <section className="border rounded-2xl p-5 bg-white shadow-sm">
            <div className="grid gap-4 sm:grid-cols-2 text-sm text-gray-600">
              <div className="space-y-1">
                <p className="text-xs uppercase text-gray-400">Mobile</p>
                <p className="font-medium text-gray-800">{customer.mobile || "—"}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs uppercase text-gray-400">Aadhaar</p>
                <p className="font-medium text-gray-800">{customer.aadharNo || "—"}</p>
              </div>
              {/* ✅ Both address and region shown */}
              <div className="space-y-1">
                <p className="text-xs uppercase text-gray-400">Address</p>
                <p className="font-medium text-gray-800">{customer.address}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs uppercase text-gray-400">Region</p>
                <p className="font-medium text-gray-800">{customer.region}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs uppercase text-gray-400">ID Proof</p>
                <p className="font-medium text-gray-800">
                  {customer.idProofImg ? "Uploaded" : "—"}
                </p>
              </div>
              <div className="space-y-1 sm:col-span-2">
                <p className="text-xs uppercase text-gray-400">Remark</p>
                <p className="font-medium text-gray-800">{customer.remark || "—"}</p>
              </div>
            </div>
          </section>

          {/* Pledge list */}
          <section className="border rounded-2xl p-5 bg-white shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Pledges</h3>
              <span className="text-sm text-gray-400">
                {customer.pledges.length} total
              </span>
            </div>

            {customer.pledges.length === 0 ? (
              <p className="text-sm text-gray-500">No pledges yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="bg-yellow-600 text-white">
                      <th className="text-left px-4 py-3 font-semibold">Pledge Date</th>
                      <th className="text-left px-4 py-3 font-semibold">Release Date</th>
                      {/* ✅ itemLabel replaces itemName */}
                      <th className="text-left px-4 py-3 font-semibold">Item</th>
                      <th className="text-left px-4 py-3 font-semibold">Loan Amount</th>
                      <th className="text-left px-4 py-3 font-semibold">Status</th>
                      <th className="text-left px-4 py-3 font-semibold">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {customer.pledges.map((pledge) => (
                      <tr key={pledge.id} className="border-b last:border-b-0 hover:bg-gray-50">
                        <td className="px-4 py-3 text-gray-700">
                          {formatDate(pledge.pledgeDate)}
                        </td>
                        <td className="px-4 py-3 text-gray-600">
                          {formatDate(pledge.releaseDate)}
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-medium text-gray-800">
                            {pledge.itemLabel || "—"}
                          </p>
                          {/* ✅ Show item count if more than 1 */}
                          {pledge.itemCount > 1 && (
                            <p className="text-xs text-gray-400">
                              +{pledge.itemCount - 1} more item{pledge.itemCount > 2 ? "s" : ""}
                            </p>
                          )}
                        </td>
                        <td className="px-4 py-3 font-medium text-gray-800">
                          {fmt(pledge.loanAmount)}
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadge status={pledge.status} />
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-2">
                            <Link
                              href={`/customers/${customerId}/pledges/${pledge.id}`}
                              className="bg-yellow-600 text-white px-3 py-1.5 rounded text-xs hover:bg-yellow-700"
                            >
                              View
                            </Link>
                            <button
                              type="button"
                              onClick={() => handleDelete(pledge.id)}
                              disabled={
                                deletingId === pledge.id ||
                                pledge.status === "RELEASED"
                              }
                              className="bg-rose-500 text-white px-3 py-1.5 rounded text-xs hover:bg-rose-600 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {deletingId === pledge.id ? "Deleting…" : "Delete"}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

        </div>
      )}

      {/* Toast */}
      {toastMsg && (
        <div className="fixed bottom-6 right-6 z-50 rounded-lg bg-gray-900 text-white px-4 py-3 shadow-lg text-sm">
          {toastMsg}
        </div>
      )}
    </div>
  );
}