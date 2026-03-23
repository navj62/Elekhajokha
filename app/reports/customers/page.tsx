// app/reports/customers/page.tsx
"use client";
import { useEffect, useState } from "react";

type Customer = {
  id: string;
  name: string;
  mobile: string | null;
  address: string;
  pledgeCount: number;
  totalLoan: number;
};

export default function CustomerReportPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    fetch("/api/reports/customers")
      .then((res) => res.json())
    .then((data) => {
      const list = Array.isArray(data) ? data : [];
      setCustomers(list);
    })
    .catch(console.error)
    .finally(() => setLoading(false));
}, []);

  const downloadPDF = async () => {
    setDownloading(true);
    try {
      const res = await fetch("/api/reports/customers?format=pdf");
      if (!res.ok) {
        const errorText = await res.text();
        console.error("API error:", res.status, errorText);
        throw new Error("PDF generation failed");
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "customers.pdf";
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
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Customer Report</h1>
        <button
          onClick={downloadPDF}
          disabled={downloading}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition disabled:opacity-50"
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
        <table className="w-full text-sm text-left">
          <thead className="bg-gray-50 text-gray-600 uppercase text-xs tracking-wider">
            <tr>
              <th className="px-4 py-3 w-10">#</th>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Mobile</th>
              <th className="px-4 py-3">Address</th>
              <th className="px-4 py-3 text-center">Pledges</th>
              <th className="px-4 py-3 text-right">Total Loan</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                  Loading…
                </td>
              </tr>
            ) : customers.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                  No customers found.
                </td>
              </tr>
            ) : (
              customers.map((c, i) => (
                <tr key={c.id} className="hover:bg-gray-50 transition">
                  <td className="px-4 py-3 text-gray-400">{i + 1}</td>
                  <td className="px-4 py-3 font-medium text-gray-800">{c.name}</td>
                  <td className="px-4 py-3 text-gray-600">{c.mobile ?? "—"}</td>
                  <td className="px-4 py-3 text-gray-600">{c.address}</td>
                  <td className="px-4 py-3 text-center">
                    <span className="inline-block bg-blue-100 text-blue-700 text-xs font-semibold px-2 py-0.5 rounded-full">
                      {c.pledgeCount}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-gray-800">
                    ₹{c.totalLoan.toLocaleString("en-IN")}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-gray-400 mt-3 text-right">
        {customers.length} customer{customers.length !== 1 ? "s" : ""} total
      </p>
    </div>
  );
}