// components/ReceiptModal.tsx
"use client";
import { useState } from "react";

type Props = {
  customerId: string;
  pledgeId: string;
};

export default function ReceiptModal({ customerId, pledgeId }: Props) {
  const [open, setOpen] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const openReceipt = async () => {
    setOpen(true);
    if (pdfUrl) return; // already loaded
    setLoading(true);
    try {
      const res = await fetch(`/api/customers/${customerId}/pledges/${pledgeId}/receipt`);
      if (!res.ok) throw new Error("Failed");
      const blob = await res.blob();
      setPdfUrl(window.URL.createObjectURL(blob));
    } catch (err) {
      console.error(err);
      alert("Failed to load receipt.");
      setOpen(false);
    } finally {
      setLoading(false);
    }
  };

  const download = () => {
    if (!pdfUrl) return;
    const a = document.createElement("a");
    a.href = pdfUrl;
    a.download = `receipt-${pledgeId.slice(-6)}.pdf`;
    a.click();
  };

  const close = () => {
    setOpen(false);
    if (pdfUrl) {
      window.URL.revokeObjectURL(pdfUrl);
      setPdfUrl(null);
    }
  };

  return (
    <>
      <button
        onClick={openReceipt}
        className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm px-3 py-1.5 rounded-lg transition"
      >
        View Receipt
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl flex flex-col" style={{ height: "90vh" }}>

            {/* Modal header */}
            <div className="flex items-center justify-between px-5 py-3 border-b">
              <h2 className="font-semibold text-gray-800">Receipt</h2>
              <div className="flex gap-2">
                <button
                  onClick={download}
                  disabled={!pdfUrl}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-sm px-3 py-1.5 rounded-lg disabled:opacity-40 transition"
                >
                  ⬇ Download
                </button>
                <button
                  onClick={close}
                  className="text-gray-500 hover:text-gray-800 text-xl px-2"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* PDF viewer */}
            <div className="flex-1 overflow-hidden rounded-b-xl">
              {loading ? (
                <div className="flex items-center justify-center h-full text-gray-400">
                  <span className="animate-spin inline-block w-6 h-6 border-2 border-gray-400 border-t-transparent rounded-full mr-2" />
                  Generating receipt…
                </div>
              ) : pdfUrl ? (
                <iframe
                  src={pdfUrl}
                  className="w-full h-full"
                  title="Receipt Preview"
                />
              ) : null}
            </div>
          </div>
        </div>
      )}
    </>
  );
}