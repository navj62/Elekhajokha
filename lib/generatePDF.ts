// lib/generatePDF.ts  ← shared helper
import PDFDocument from "pdfkit";

export function generatePDF(title: string, rows: string[]): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument();
    const chunks: Buffer[] = [];

    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    doc.text(title, { align: "center" });
    doc.moveDown();
    rows.forEach((row) => doc.text(row));
    doc.end();
  });
}