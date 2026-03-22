// app/reports/pledges/page.tsx
"use client";
import { useEffect, useState } from "react";

type Pledge = {
  id: string;
  loanAmount: string;   // Decimal comes back as string from Prisma
  status: "ACTIVE" | "RELEASED" | "OVERDUE";
  pledgeDate: string;
  itemType: "GOLD" | "SILVER";
  itemName: string;
  customer: {
    name: string;
    mobile: string | null;
  };
};

export default function PledgeReportPage() {
  const [pledges, setPledges] = useState<Pledge[]>([]);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    fetch("/api/pledges")
      .then((res) => res.json())
      .then((data) => {
        const list = Array.isArray(data) ? data : (data.data ?? data.pledges ?? []);
        setPledges(list);
      })
      .catch(console.error);
  }, []);

  const downloadPDF = async () => {
    setDownloading(true);
    try {
      const res = await fetch("/api/reports/pledges");
      if (!res.ok) {
        const errorText = await res.text();
        console.error("API error:", res.status, errorText);
        throw new Error("PDF generation failed");
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
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
    <div className="p-6">
      <h1 className="text-xl font-bold mb-4">Pledges</h1>
      <button
        onClick={downloadPDF}
        disabled={downloading}
        className="bg-green-600 text-white px-4 py-2 mb-4 rounded disabled:opacity-50"
      >
        {downloading ? "Generating…" : "Download PDF"}
      </button>
      <table className="border w-full">
        <thead>
          <tr>
            <th>Customer</th>
            <th>Loan Amount</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {pledges.map((p) => (
            <tr key={p.id}>
              {/* <td>{p.customer.name}</td> */}
              <td>₹{p.loanAmount}</td>
              <td>{p.status}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}