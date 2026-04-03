"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useLanguage } from "@/components/providers/LanguageProvider";
import { getStatusKey } from "@/lib/translations";

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
  const params = useParams<{ customerId: string; pledgeId: string }>();
  const customerId = params?.customerId;
  const pledgeId = params?.pledgeId;
  const router = useRouter();
  const { language, t } = useLanguage();
  const locale = language === "hi" ? "hi-IN" : "en-IN";

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
          throw new Error(payload?.error || t("unable_to_load_pledge"));
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
    return date.toLocaleDateString(locale);
  };

  if (!pledgeId) {
    return (
      <div className="max-w-5xl mx-auto p-6">
        <p className="text-sm text-gray-500">{t("pledge_id_missing")}</p>
      </div>
    );
  }

  const isActive = data?.pledge.status === "ACTIVE";

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      <div>
        <Link
          href={customerId ? `/customers/${customerId}` : "/customers"}
          className="text-sm text-gray-500 hover:underline"
        >
          {t("back_to_customer_arrow")}
        </Link>
        <h1 className="text-2xl font-bold mt-2">{t("pledge_details")}</h1>
      </div>

      {loading ? (
        <div className="space-y-6">
          <section className="border rounded-2xl p-5 bg-white shadow-sm">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex items-center gap-4">
                <div className="skeleton" style={{ width: "80px", height: "80px", borderRadius: "16px" }} />
                <div>
                  <div className="skeleton" style={{ width: "160px", height: "18px", marginBottom: "8px" }} />
                  <div className="skeleton" style={{ width: "120px", height: "14px" }} />
                </div>
              </div>
              <div className="flex gap-2">
                <div className="skeleton" style={{ width: "70px", height: "36px", borderRadius: "4px" }} />
                <div className="skeleton" style={{ width: "80px", height: "36px", borderRadius: "4px" }} />
                <div className="skeleton" style={{ width: "100px", height: "36px", borderRadius: "4px" }} />
              </div>
            </div>
          </section>
          <section className="border rounded-2xl bg-white shadow-sm overflow-hidden">
            <div className="divide-y">
              {[...Array(14)].map((_, i) => (
                <div key={i} className="grid grid-cols-2 gap-4 px-6 py-4">
                  <div className="skeleton" style={{ width: "100px", height: "14px" }} />
                  <div className="skeleton" style={{ width: "140px", height: "14px" }} />
                </div>
              ))}
            </div>
          </section>
        </div>
      ) : error ? (
        <Alert variant="destructive">
          <AlertTitle>{t("unable_to_load_pledge")}</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : !data ? (
        <p className="text-sm text-gray-500">{t("pledge_not_found")}</p>
      ) : (
        <div className="space-y-6">
          <section className="border rounded-2xl p-5 bg-white shadow-sm">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex items-center gap-4">
                <div className="h-20 w-20 rounded-2xl bg-gray-100 flex items-center justify-center overflow-hidden">
                  {data.pledge.itemPhoto ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={data.pledge.itemPhoto} alt={data.pledge.itemName} className="h-full w-full object-cover" />
                  ) : (
                    <span className="text-gray-400 text-xl font-semibold">
                      {data.pledge.itemName.charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>
                <div>
                  <h2 className="text-lg font-semibold">{data.pledge.itemName}</h2>
                  <p className="text-sm text-gray-500">
                    {t("customer_label")}: {data.pledge.customer.name} &bull; ID: #{data.pledge.customer.id.substring(0,8).toUpperCase()}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <button type="button" className="bg-yellow-600 text-white px-4 py-2 rounded text-sm hover:bg-yellow-700">
                  {t("edit")}
                </button>
                <button
                  type="button"
                  disabled={!isActive}
                  onClick={() => router.push(`/customers/${customerId}/pledges/${pledgeId}/release`)}
                  className="bg-green-600 text-white px-4 py-2 rounded text-sm hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {t("release_label")}
                </button>
                <button type="button" className="bg-gray-600 text-white px-4 py-2 rounded text-sm hover:bg-gray-700">
                  {t("view_receipt")}
                </button>
              </div>
            </div>
          </section>

          <section className="border rounded-2xl bg-white shadow-sm overflow-hidden">
            <div className="divide-y">
              <DetailRow label={t("user_id")} value={data.user.id} />
              <DetailRow label={t("user_name")} value={data.user.username || "—"} />
              <DetailRow label={t("customer_name_label")} value={data.pledge.customer.name} />
              <DetailRow label={t("address")} value={data.pledge.customer.address} />
              <DetailRow label={t("col_loan_amount")} value={`₹ ${data.pledge.loanAmount}`} />
              <DetailRow label={t("col_pledge_date")} value={formatDate(data.pledge.pledgeDate)} />
              <DetailRow label={t("col_release_date")} value={formatDate(data.pledge.releaseDate)} />
              <DetailRow label={t("interest_rate")} value={data.pledge.interestRate} />
              <DetailRow label={t("item_name")} value={data.pledge.itemName} />
              <DetailRow label={t("item_type_label")} value={data.pledge.itemType} />
              <DetailRow label={t("purity")} value={data.pledge.purity} />
              <DetailRow label={t("gross_weight_label")} value={data.pledge.grossWeight} />
              <DetailRow label={t("net_weight_label")} value={data.pledge.netWeight} />
              <DetailRow label={t("status_label")} value={t(getStatusKey(data.pledge.status))} />
              <DetailRow label={t("remark")} value={data.pledge.remark || "—"} />
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

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-2 gap-4 px-6 py-4 text-sm">
      <p className="text-gray-500">{label}</p>
      <p className="font-medium text-gray-800">{value}</p>
    </div>
  );
}