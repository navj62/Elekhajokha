// app/reports/customers/page.tsx
"use client";
import { useEffect, useState } from "react";

type Customer = { id: string; name: string; mobile: string; address: string };

export default function CustomerReportPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    fetch("/api/customers")
      .then((res) => res.json())
      .then((data) => {
      // Handles { data: [] }, { customers: [] }, or a bare array
      const list = Array.isArray(data) ? data : (data.data ?? data.customers ?? []);
      setCustomers(list);
    })
    .catch(console.error);
  }, []);

  const downloadPDF = async () => {
    setDownloading(true);
    try {
      const res = await fetch("/api/reports/customers");
      if (!res.ok) throw new Error("PDF generation failed");
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "customers.pdf";
      a.click();
      window.URL.revokeObjectURL(url); // ← prevents memory leak
    } catch (err) {
      console.error(err);
      alert("Failed to download PDF.");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-xl font-bold mb-4">Customers</h1>
      <button
        onClick={downloadPDF}
        disabled={downloading}
        className="bg-blue-600 text-white px-4 py-2 mb-4 rounded disabled:opacity-50"
      >
        {downloading ? "Generating…" : "Download PDF"}
      </button>
      <table className="border w-full">
        <thead>
          <tr>
            <th>Name</th><th>Mobile</th><th>Address</th>
          </tr>
        </thead>
        <tbody>
          {customers.map((c) => (
            <tr key={c.id}>
              <td>{c.name}</td>
              <td>{c.mobile}</td>
              <td>{c.address}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}