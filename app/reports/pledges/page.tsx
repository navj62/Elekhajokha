// app/reports/pledges/page.tsx
"use client";
import { useEffect, useState } from "react";

type Pledge = {
  index: number;
  customerName: string;
  pledgeDate: string;
  itemType: "GOLD" | "SILVER";
  itemName: string;
  loanAmount: number;
  status: "ACTIVE" | "RELEASED" | "OVERDUE";
  totalInterest: number | null;
  receivableAmount: number | null;
  itemPhoto: string | null;
};

const statusStyle: Record<string, string> = {
  ACTIVE:   "bg-green-100 text-green-700",
  RELEASED: "bg-gray-100 text-gray-600",
  OVERDUE:  "bg-red-100 text-red-700",
};

const typeStyle: Record<string, string> = {
  GOLD:   "bg-yellow-100 text-yellow-700",
  SILVER: "bg-slate-100 text-slate-600",
};

export default function PledgeReportPage() {
  const [pledges, setPledges]     = useState<Pledge[]>([]);
  const [loading, setLoading]     = useState(true);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    fetch("/api/reports/pledges")
      .then((res) => res.json())
      .then((data) => {
        const list = Array.isArray(data) ? data : [];
        setPledges(list);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const downloadPDF = async () => {
    setDownloading(true);
    try {
      const res = await fetch("/api/reports/pledges?format=pdf");
      if (!res.ok) {
        const errorText = await res.text();
        console.error("API error:", res.status, errorText);
        throw new Error("PDF generation failed");
      }
      const blob = await res.blob();
      const url  = window.URL.createObjectURL(blob);
      const a    = document.createElement("a");
      a.href     = url;
      a.download = "pledges.pdf";
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      alert("Failed to download PDF.");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Pledge Report</h1>
        <button
          onClick={downloadPDF}
          disabled={downloading}
          className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition disabled:opacity-50"
        >
          {downloading ? (
            <>
              <span className="animate-spin inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
              Generating…
            </>
          ) : (
            "⬇ Download PDF"
          )}
        </button>
      </div>

      <div className="rounded-xl border border-gray-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 text-gray-600 uppercase text-xs tracking-wider">
              <tr>
                <th className="px-3 py-3 w-10">#</th>
                <th className="px-3 py-3">Photo</th>
                <th className="px-3 py-3">Customer</th>
                <th className="px-3 py-3">Date</th>
                <th className="px-3 py-3">Item</th>
                <th className="px-3 py-3">Type</th>
                <th className="px-3 py-3 text-right">Loan</th>
                <th className="px-3 py-3 text-right">Interest</th>
                <th className="px-3 py-3 text-right">Receivable</th>
                <th className="px-3 py-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={10} className="px-4 py-8 text-center text-gray-400">
                    Loading…
                  </td>
                </tr>
              ) : pledges.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-8 text-center text-gray-400">
                    No pledges found.
                  </td>
                </tr>
              ) : (
                pledges.map((p) => (
                  <tr key={p.index} className="hover:bg-gray-50 transition">
                    <td className="px-3 py-3 text-gray-400">{p.index}</td>
                    <td className="px-3 py-3">
                      {p.itemPhoto ? (
                        <img
                          src={p.itemPhoto}
                          alt={p.itemName}
                          className="w-10 h-10 rounded-md object-cover border border-gray-200"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-md bg-gray-100 flex items-center justify-center text-gray-300 text-xs">
                          N/A
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-3 font-medium text-gray-800">
                      {p.customerName}
                    </td>
                    <td className="px-3 py-3 text-gray-500 whitespace-nowrap">
                      {p.pledgeDate}
                    </td>
                    <td className="px-3 py-3 text-gray-700">{p.itemName}</td>
                    <td className="px-3 py-3">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${typeStyle[p.itemType]}`}>
                        {p.itemType}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-right font-semibold text-gray-800">
                      ₹{p.loanAmount.toLocaleString("en-IN")}
                    </td>
                    <td className="px-3 py-3 text-right text-gray-600">
                      {p.totalInterest != null
                        ? `₹${p.totalInterest.toLocaleString("en-IN")}`
                        : "—"}
                    </td>
                    <td className="px-3 py-3 text-right font-semibold text-gray-800">
                      {p.receivableAmount != null
                        ? `₹${p.receivableAmount.toLocaleString("en-IN")}`
                        : "—"}
                    </td>
                    <td className="px-3 py-3 text-center">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${statusStyle[p.status]}`}>
                        {p.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <p className="text-xs text-gray-400 mt-3 text-right">
        {pledges.length} pledge{pledges.length !== 1 ? "s" : ""} total
      </p>
    </div>
  );
}