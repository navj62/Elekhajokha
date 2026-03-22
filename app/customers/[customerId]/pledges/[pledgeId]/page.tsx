"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

type PledgeDetail = {
  id: string;
  pledgeDate: string;
  releaseDate: string | null;
  loanAmount: string;
  interestRate: string;
  itemName: string;
  itemType: string;
  purity: string;
  grossWeight: string;
  netWeight: string;
  remark: string | null;
  itemPhoto: string | null;
  status: string;
  customer: {
    id: string;
    name: string;
    address: string;
  };
};

type PledgeResponse = {
  pledge: PledgeDetail;
  user: { id: string; username: string | null };
};

export default function PledgeDetailPage() {
  // ✅ Read both customerId and pledgeId from params
  const params = useParams<{ customerId: string; pledgeId: string }>();
  const customerId = params?.customerId;
  const pledgeId = params?.pledgeId;
  const router = useRouter();

  const [data, setData] = useState<PledgeResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!pledgeId) return;
    const loadPledge = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/pledges/${pledgeId}`);
        const payload = await res.json();
        if (!res.ok) {
          throw new Error(payload?.error || "Unable to load pledge details.");
        }
        setData(payload);
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

    loadPledge();
    return () => { if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current); };
  }, [pledgeId]);

  const formatDate = (value?: string | null) => {
    if (!value) return "—";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "—";
    return date.toLocaleDateString();
  };

  if (!pledgeId) {
    return (
      <div className="max-w-5xl mx-auto p-6">
        <p className="text-sm text-gray-500">Pledge ID not provided.</p>
      </div>
    );
  }

  // ✅ Check if pledge is active
  const isActive = data?.pledge.status === "ACTIVE";

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      <div>
        <Link
          href={customerId ? `/customers/${customerId}` : "/customers"}
          className="text-sm text-gray-500 hover:underline"
        >
          ← Back to Customer
        </Link>
        <h1 className="text-2xl font-bold mt-2">Pledge Details</h1>
      </div>

      {loading ? (
        <p>Loading...</p>
      ) : error ? (
        <Alert variant="destructive">
          <AlertTitle>Unable to load pledge</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : !data ? (
        <p className="text-sm text-gray-500">Pledge not found.</p>
      ) : (
        <div className="space-y-6">
          <section className="border rounded-2xl p-5 bg-white shadow-sm">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex items-center gap-4">
                <div className="h-20 w-20 rounded-2xl bg-gray-100 flex items-center justify-center overflow-hidden">
                  {data.pledge.itemPhoto ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={data.pledge.itemPhoto}
                      alt={data.pledge.itemName}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span className="text-gray-400 text-xl font-semibold">
                      {data.pledge.itemName.charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>
                <div>
                  <h2 className="text-lg font-semibold">{data.pledge.itemName}</h2>
                  <p className="text-sm text-gray-500">
                    Customer: {data.pledge.customer.name}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className="bg-yellow-600 text-white px-4 py-2 rounded text-sm hover:bg-yellow-700"
                >
                  Edit
                </button>

                {/* ✅ Fixed release button — uses router, disabled when not ACTIVE */}
                <button
                  type="button"
                  disabled={!isActive}
                  onClick={() =>
                    router.push(`/customers/${customerId}/pledges/${pledgeId}/release`)
                  }
                  className="bg-green-600 text-white px-4 py-2 rounded text-sm hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Release
                </button>

                <button
                  type="button"
                  className="bg-gray-600 text-white px-4 py-2 rounded text-sm hover:bg-gray-700"
                >
                  View Receipt
                </button>
              </div>
            </div>
          </section>

          <section className="border rounded-2xl bg-white shadow-sm overflow-hidden">
            <div className="divide-y">
              <div className="grid grid-cols-2 gap-4 px-6 py-4 text-sm">
                <p className="text-gray-500">User Id</p>
                <p className="font-medium text-gray-800">{data.user.id}</p>
              </div>
              <div className="grid grid-cols-2 gap-4 px-6 py-4 text-sm">
                <p className="text-gray-500">User Name</p>
                <p className="font-medium text-gray-800">{data.user.username || "—"}</p>
              </div>
              <div className="grid grid-cols-2 gap-4 px-6 py-4 text-sm">
                <p className="text-gray-500">Customer Name</p>
                <p className="font-medium text-gray-800">{data.pledge.customer.name}</p>
              </div>
              <div className="grid grid-cols-2 gap-4 px-6 py-4 text-sm">
                <p className="text-gray-500">Address</p>
                <p className="font-medium text-gray-800">{data.pledge.customer.address}</p>
              </div>
              <div className="grid grid-cols-2 gap-4 px-6 py-4 text-sm">
                <p className="text-gray-500">Loan Amount</p>
                <p className="font-medium text-gray-800">₹ {data.pledge.loanAmount}</p>
              </div>
              <div className="grid grid-cols-2 gap-4 px-6 py-4 text-sm">
                <p className="text-gray-500">Pledge Date</p>
                <p className="font-medium text-gray-800">{formatDate(data.pledge.pledgeDate)}</p>
              </div>
              <div className="grid grid-cols-2 gap-4 px-6 py-4 text-sm">
                <p className="text-gray-500">Release Date</p>
                <p className="font-medium text-gray-800">{formatDate(data.pledge.releaseDate)}</p>
              </div>
              <div className="grid grid-cols-2 gap-4 px-6 py-4 text-sm">
                <p className="text-gray-500">Interest Rate</p>
                <p className="font-medium text-gray-800">{data.pledge.interestRate}</p>
              </div>
              <div className="grid grid-cols-2 gap-4 px-6 py-4 text-sm">
                <p className="text-gray-500">Item Name</p>
                <p className="font-medium text-gray-800">{data.pledge.itemName}</p>
              </div>
              <div className="grid grid-cols-2 gap-4 px-6 py-4 text-sm">
                <p className="text-gray-500">Item Type</p>
                <p className="font-medium text-gray-800">{data.pledge.itemType}</p>
              </div>
              <div className="grid grid-cols-2 gap-4 px-6 py-4 text-sm">
                <p className="text-gray-500">Purity</p>
                <p className="font-medium text-gray-800">{data.pledge.purity}</p>
              </div>
              <div className="grid grid-cols-2 gap-4 px-6 py-4 text-sm">
                <p className="text-gray-500">Gross Weight</p>
                <p className="font-medium text-gray-800">{data.pledge.grossWeight}</p>
              </div>
              <div className="grid grid-cols-2 gap-4 px-6 py-4 text-sm">
                <p className="text-gray-500">Net Weight</p>
                <p className="font-medium text-gray-800">{data.pledge.netWeight}</p>
              </div>
              <div className="grid grid-cols-2 gap-4 px-6 py-4 text-sm">
                <p className="text-gray-500">Status</p>
                <p className="font-medium text-gray-800">{data.pledge.status}</p>
              </div>
              <div className="grid grid-cols-2 gap-4 px-6 py-4 text-sm">
                <p className="text-gray-500">Remark</p>
                <p className="font-medium text-gray-800">{data.pledge.remark || "—"}</p>
              </div>
            </div>
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