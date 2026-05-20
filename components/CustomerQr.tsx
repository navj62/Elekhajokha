"use client";

import { QRCodeCanvas } from "qrcode.react";

export default function CustomerQR({ link }: { link: string }) {
  return (
    <div className="flex flex-col items-center gap-2">
      <p className="text-xs text-gray-400">Scan to open</p>

      <div className="p-2 bg-white border rounded-lg">
        <QRCodeCanvas value={link} size={120} />
      </div>
    </div>
  );
}