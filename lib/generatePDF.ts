// lib/generatePDF.ts
import PDFDocument from "pdfkit";

type Row = {
  index: number;
  name: string;
  mobile: string;
  pledgeCount: number;
  totalLoan: number;
};

export function generateCustomerPDF(title: string, rows: Row[]): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 40, size: "A4" });
    const chunks: Buffer[] = [];

    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const pageWidth = doc.page.width - 80; // 40 margin each side
    const col = {
      no:      { x: 40,  w: 30  },
      name:    { x: 70,  w: 160 },
      mobile:  { x: 230, w: 120 },
      pledges: { x: 350, w: 80  },
      total:   { x: 430, w: 130 },
    };
    const rowH = 24;

    // ── Header bar ──────────────────────────────────────────
    doc.rect(40, 40, pageWidth, 40).fill("#1e40af");
    doc
      .fillColor("white")
      .fontSize(18)
      .font("Helvetica-Bold")
      .text(title, 40, 52, { width: pageWidth, align: "center" });

    // ── Meta line ───────────────────────────────────────────
    const date = new Date().toLocaleDateString("en-IN", {
      day: "2-digit", month: "short", year: "numeric",
    });
    doc
      .fillColor("#6b7280")
      .fontSize(9)
      .font("Helvetica")
      .text(`Generated: ${date}   |   Total customers: ${rows.length}`, 40, 92, {
        width: pageWidth, align: "right",
      });

    // ── Table header ────────────────────────────────────────
    let y = 110;
    doc.rect(40, y, pageWidth, rowH).fill("#dbeafe");
    doc.fillColor("#1e3a8a").fontSize(9).font("Helvetica-Bold");
    doc.text("#",            col.no.x,      y + 7, { width: col.no.w,      align: "center" });
    doc.text("Customer Name",col.name.x,    y + 7, { width: col.name.w,    align: "left"   });
    doc.text("Mobile",       col.mobile.x,  y + 7, { width: col.mobile.w,  align: "left"   });
    doc.text("Pledges",      col.pledges.x, y + 7, { width: col.pledges.w, align: "center" });
    doc.text("Total Loan",   col.total.x,   y + 7, { width: col.total.w,   align: "right"  });

    // ── Table rows ──────────────────────────────────────────
    y += rowH;
    rows.forEach((r, i) => {
      // alternating row bg
      doc.rect(40, y, pageWidth, rowH).fill(i % 2 === 0 ? "#f9fafb" : "white");

      doc.fillColor("#374151").fontSize(9).font("Helvetica");
      doc.text(String(r.index),                          col.no.x,      y + 7, { width: col.no.w,      align: "center" });
      doc.text(r.name,                                   col.name.x,    y + 7, { width: col.name.w,    align: "left"   });
      doc.text(r.mobile || "—",                          col.mobile.x,  y + 7, { width: col.mobile.w,  align: "left"   });
      doc.text(String(r.pledgeCount),                    col.pledges.x, y + 7, { width: col.pledges.w, align: "center" });
      doc.text(`Rs.${r.totalLoan.toLocaleString("en-IN")}`, col.total.x, y + 7, { width: col.total.w,   align: "right"  });

      // row border
      doc.rect(40, y, pageWidth, rowH).strokeColor("#e5e7eb").lineWidth(0.5).stroke();
      y += rowH;

      // new page if needed
      if (y > doc.page.height - 60) {
        doc.addPage();
        y = 40;
      }
    });

    // ── Footer line ─────────────────────────────────────────
    const totalLoan = rows.reduce((s, r) => s + r.totalLoan, 0);
    doc.rect(40, y, pageWidth, rowH).fill("#dbeafe");
    doc.fillColor("#1e3a8a").fontSize(9).font("Helvetica-Bold");
    doc.text("Total",                                        col.name.x,    y + 7, { width: col.name.w,    align: "left"   });
    doc.text(String(rows.length),                            col.pledges.x, y + 7, { width: col.pledges.w, align: "center" });
    doc.text(`Rs.${totalLoan.toLocaleString("en-IN")}`,     col.total.x,   y + 7, { width: col.total.w,   align: "right"  });

    doc.end();
  });
}


// lib/generatePDF.ts  — add this function alongside generateCustomerPDF

type PledgeRow = {
  index: number;
  customerName: string;
  pledgeDate: string;
  itemType: string;
  itemName: string;
  loanAmount: number;
  status: string;
  totalInterest: number | null;
  receivableAmount: number | null;
  itemPhoto: string | null;
};

export function generatePledgePDF(title: string, rows: PledgeRow[]): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 40, size: "A4" });
    const chunks: Buffer[] = [];

    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const pageWidth = doc.page.width - 80;

    const statusColor = (s: string) => {
      if (s === "ACTIVE")   return "#16a34a";
      if (s === "OVERDUE")  return "#dc2626";
      return "#6b7280";
    };

    // ── Header bar ──────────────────────────────────────────
    doc.rect(40, 40, pageWidth, 40).fill("#065f46");
    doc
      .fillColor("white")
      .fontSize(18)
      .font("Helvetica-Bold")
      .text(title, 40, 52, { width: pageWidth, align: "center" });

    const date = new Date().toLocaleDateString("en-IN", {
      day: "2-digit", month: "short", year: "numeric",
    });
    doc
      .fillColor("#6b7280")
      .fontSize(9)
      .font("Helvetica")
      .text(
        `Generated: ${date}   |   Total pledges: ${rows.length}`,
        40, 92, { width: pageWidth, align: "right" }
      );

    // ── Column layout ───────────────────────────────────────
    const col = {
      no:         { x: 40,  w: 25  },
      customer:   { x: 65,  w: 95  },
      date:       { x: 160, w: 62  },
      item:       { x: 222, w: 80  },
      type:       { x: 302, w: 40  },
      loan:       { x: 342, w: 60  },
      interest:   { x: 402, w: 55  },
      receivable: { x: 457, w: 60  },
      status:     { x: 517, w: 38  }, // 517 + 38 = 555 = 40 margin + 515 ✓
    };
    const rowH = 26;

    // ── Table header ────────────────────────────────────────
    let y = 110;
    doc.rect(40, y, pageWidth, rowH).fill("#d1fae5");
    doc.fillColor("#065f46").fontSize(8).font("Helvetica-Bold");
    doc.text("#",           col.no.x,         y + 9, { width: col.no.w,         align: "center" });
    doc.text("Customer",    col.customer.x,   y + 9, { width: col.customer.w,   align: "left"   });
    doc.text("Date",        col.date.x,       y + 9, { width: col.date.w,       align: "left"   });
    doc.text("Item",        col.item.x,       y + 9, { width: col.item.w,       align: "left"   });
    doc.text("Type",        col.type.x,       y + 9, { width: col.type.w,       align: "center" });
    doc.text("Loan",        col.loan.x,       y + 9, { width: col.loan.w,       align: "right"  });
    doc.text("Interest",    col.interest.x,   y + 9, { width: col.interest.w,   align: "right"  });
    doc.text("Receivable",  col.receivable.x, y + 9, { width: col.receivable.w, align: "right"  });
    doc.text("Status",      col.status.x,     y + 9, { width: col.status.w,     align: "center" });
    y += rowH;

    // ── Table rows ──────────────────────────────────────────
    rows.forEach((r, i) => {
      if (y > doc.page.height - 60) {
        doc.addPage();
        y = 40;
      }

      doc.rect(40, y, pageWidth, rowH).fill(i % 2 === 0 ? "#f0fdf4" : "white");
      doc.rect(40, y, pageWidth, rowH).strokeColor("#e5e7eb").lineWidth(0.5).stroke();

      doc.fillColor("#374151").fontSize(8).font("Helvetica");
      doc.text(String(r.index),           col.no.x,         y + 9, { width: col.no.w,         align: "center" });
      doc.text(r.customerName,            col.customer.x,   y + 9, { width: col.customer.w,   align: "left"   });
      doc.text(r.pledgeDate,              col.date.x,       y + 9, { width: col.date.w,       align: "left"   });
      doc.text(r.itemName,                col.item.x,       y + 9, { width: col.item.w,       align: "left"   });
      doc.text(r.itemType,                col.type.x,       y + 9, { width: col.type.w,       align: "center" });
      doc.text(`Rs.${r.loanAmount.toLocaleString("en-IN")}`,
                                          col.loan.x,       y + 9, { width: col.loan.w,       align: "right"  });
      doc.text(r.totalInterest != null
        ? `Rs.${r.totalInterest.toLocaleString("en-IN")}` : "—",
                                          col.interest.x,   y + 9, { width: col.interest.w,   align: "right"  });
      doc.text(r.receivableAmount != null
        ? `Rs.${r.receivableAmount.toLocaleString("en-IN")}` : "—",
                                          col.receivable.x, y + 9, { width: col.receivable.w, align: "right"  });

      // coloured status text
      doc.fillColor(statusColor(r.status)).font("Helvetica-Bold");
      doc.text(r.status,                  col.status.x,     y + 9, { width: col.status.w,     align: "center" });

      y += rowH;
    });

    // ── Totals footer ───────────────────────────────────────
    if (y > doc.page.height - 60) { doc.addPage(); y = 40; }
    const totalLoan       = rows.reduce((s, r) => s + r.loanAmount, 0);
    const totalReceivable = rows.reduce((s, r) => s + (r.receivableAmount ?? 0), 0);
    doc.rect(40, y, pageWidth, rowH).fill("#d1fae5");
    doc.fillColor("#065f46").fontSize(8).font("Helvetica-Bold");
    doc.text("Total",
      col.customer.x, y + 9, { width: col.customer.w, align: "left" });
    doc.text(`Rs.${totalLoan.toLocaleString("en-IN")}`,
      col.loan.x,     y + 9, { width: col.loan.w,     align: "right" });
    doc.text(`Rs.${totalReceivable.toLocaleString("en-IN")}`,
      col.receivable.x, y + 9, { width: col.receivable.w, align: "right" });

    doc.end();
  });
}