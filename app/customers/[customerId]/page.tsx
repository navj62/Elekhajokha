"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

type Pledge = {
  id: string;
  itemName: string;
  status: string;
  pledgeDate: string;
  loanAmount: string;
  releaseDate: string | null;
};

type CustomerDetail = {
  id: string;
  name: string;
  address: string;
  mobile: string | null;
  aadharNo: string | null;
  remark: string | null;
  customerImg: string | null;
  idProofImg: string | null;
  pledges: Pledge[];
};

export default function CustomerDetailPage() {
  const params = useParams<{ customerId: string }>();
  const customerId = params?.customerId;
  const [customer, setCustomer] = useState<CustomerDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    if (!customerId) return;
    const loadCustomer = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/customers/${customerId}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || "Unable to load customer details.");
        setCustomer(data.customer);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unexpected error";
        setError(message);
        setToastMessage(message);
        if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
        toastTimeoutRef.current = setTimeout(() => setToastMessage(null), 4000);
      } finally {
        setLoading(false);
      }
    };

    loadCustomer();
    return () => { if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current); };
  }, [customerId]);

  if (!customerId) {
    return (
      <div className="max-w-5xl mx-auto p-6">
        <p className="text-sm text-gray-500">Customer ID not provided.</p>
      </div>
    );
  }

  const formatDate = (value?: string | null) => {
    if (!value) return "—";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "—";
    return date.toLocaleDateString();
  };

  const showToast = (message: string) => {
    setToastMessage(message);
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    toastTimeoutRef.current = setTimeout(() => setToastMessage(null), 4000);
  };

  const handleDelete = async (pledgeId: string) => {
    if (!customer) return;
    const confirmed = window.confirm("Delete this pledge? This action cannot be undone.");
    if (!confirmed) return;
    setDeletingId(pledgeId);
    try {
      const res = await fetch(`/api/pledges/${pledgeId}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Unable to delete pledge.");
      setCustomer({
        ...customer,
        pledges: customer.pledges.filter((pledge) => pledge.id !== pledgeId),
      });
      showToast("Pledge deleted.");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unexpected error";
      showToast(message);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <Link href="/customers" className="text-sm text-gray-500 hover:underline">
            ← Back to Customers
          </Link>
          <h1 className="text-2xl font-bold mt-2">Customer Details</h1>
        </div>
      </div>

      {loading ? (
        <p>Loading...</p>
      ) : error ? (
        <Alert variant="destructive">
          <AlertTitle>Unable to load customer</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : !customer ? (
        <p className="text-sm text-gray-500">Customer not found.</p>
      ) : (
        <div className="space-y-6">
          <section className="border rounded-2xl p-5 bg-white shadow-sm flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden">
                {customer.customerImg ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={customer.customerImg} alt={customer.name}
                    className="h-full w-full object-cover" />
                ) : (
                  <span className="text-gray-400 text-xl font-semibold">
                    {customer.name.charAt(0).toUpperCase()}
                  </span>
                )}
              </div>
              <div>
                <h2 className="text-lg font-semibold">{customer.name}</h2>
                <p className="text-sm text-gray-500">Customer ID: {customer.id}</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button"
                className="border border-gray-300 px-4 py-2 rounded text-sm hover:bg-gray-50">
                Change Photo
              </button>
              {/* ✅ Updated from add-pledge → pledges/add */}
              <Link
                href={`/customers/${customerId}/pledges/add`}
                className="bg-yellow-600 text-white px-4 py-2 rounded text-sm hover:bg-yellow-700"
              >
                Add Item
              </Link>
              <button type="button"
                className="bg-yellow-600 text-white px-4 py-2 rounded text-sm hover:bg-yellow-700">
                Edit
              </button>
            </div>
          </section>

          <section className="border rounded-2xl p-5 bg-white shadow-sm">
            <div className="grid gap-4 sm:grid-cols-2 text-sm text-gray-600">
              <div className="space-y-1">
                <p className="text-xs uppercase text-gray-400">Mobile</p>
                <p className="font-medium text-gray-800">{customer.mobile || "—"}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs uppercase text-gray-400">ID Proof</p>
                <p className="font-medium text-gray-800">
                  {customer.idProofImg ? "Uploaded" : "—"}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-xs uppercase text-gray-400">Address</p>
                <p className="font-medium text-gray-800">{customer.address}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs uppercase text-gray-400">Aadhar</p>
                <p className="font-medium text-gray-800">{customer.aadharNo || "—"}</p>
              </div>
              <div className="space-y-1 sm:col-span-2">
                <p className="text-xs uppercase text-gray-400">Remark</p>
                <p className="font-medium text-gray-800">{customer.remark || "—"}</p>
              </div>
            </div>
          </section>

          <section className="border rounded-2xl p-5 bg-white shadow-sm space-y-4">
            <h3 className="text-lg font-semibold">Item List</h3>
            {customer.pledges.length === 0 ? (
              <p className="text-sm text-gray-500">No pledges added yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="bg-yellow-600 text-white">
                      <th className="text-left px-4 py-3 font-semibold">Pledge Date</th>
                      <th className="text-left px-4 py-3 font-semibold">Release Date</th>
                      <th className="text-left px-4 py-3 font-semibold">Item Name</th>
                      <th className="text-left px-4 py-3 font-semibold">Loan Amount</th>
                      <th className="text-left px-4 py-3 font-semibold">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {customer.pledges.map((pledge) => (
                      <tr key={pledge.id} className="border-b last:border-b-0">
                        <td className="px-4 py-3 font-medium text-green-700">
                          {formatDate(pledge.pledgeDate)}
                        </td>
                        <td className="px-4 py-3 text-gray-600">
                          {formatDate(pledge.releaseDate)}
                        </td>
                        <td className="px-4 py-3 font-medium text-green-700">
                          {pledge.itemName}
                        </td>
                        <td className="px-4 py-3 font-medium text-green-700">
                          ₹ {pledge.loanAmount}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-2">
                            {/* ✅ Updated from /pledges/${id} → /customers/${customerId}/pledges/${id} */}
                            <Link
                              href={`/customers/${customerId}/pledges/${pledge.id}`}
                              className="bg-yellow-600 text-white px-3 py-1.5 rounded text-xs hover:bg-yellow-700"
                            >
                              View
                            </Link>
                            <button
                              type="button"
                              onClick={() => handleDelete(pledge.id)}
                              disabled={deletingId === pledge.id}
                              className="bg-rose-500 text-white px-3 py-1.5 rounded text-xs hover:bg-rose-600 disabled:opacity-60 disabled:cursor-not-allowed"
                            >
                              {deletingId === pledge.id ? "Deleting..." : "Delete"}
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

      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 rounded-lg bg-gray-900 text-white px-4 py-3 shadow-lg text-sm">
          {toastMessage}
        </div>
      )}
    </div>
  );
}