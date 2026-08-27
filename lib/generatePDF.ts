// lib/generatePDF.ts
import path from "path";
import PDFDocument from "pdfkit";

type Row = {
  index: number;
  name: string;
  mobile: string;
  pledgeCount: number;
  totalLoan: number;
  createdAt: string;
  riskScore: number;
  riskTier: string;
};

function riskHex(tier: string): string {
  switch (tier) {
    case "SAFE":     return "#16a34a";
    case "WATCH":    return "#d97706";
    case "AT_RISK":  return "#ea580c";
    case "CRITICAL": return "#dc2626";
    default:         return "#6b7280";
  }
}

// ── Column layout (portrait A4, content x: 40→555, total 515pt) ──
// No(20) Name(110) Mobile(85) AddedOn(72) Pledges(45) Loan(90) Risk(93) = 515
const CUSTOMER_COL = {
  no:      { x: 40,  w: 20  },
  name:    { x: 60,  w: 110 },
  mobile:  { x: 170, w: 85  },
  addedon: { x: 255, w: 72  },
  pledges: { x: 327, w: 45  },
  loan:    { x: 372, w: 90  },
  risk:    { x: 462, w: 93  },
};

export function generateCustomerPDF(title: string, rows: Row[]): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 40, size: "A4" });
    const chunks: Buffer[] = [];

    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const pageWidth = doc.page.width - 80; // 40 margin each side
    const col = CUSTOMER_COL;
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
    doc.fillColor("#1e3a8a").fontSize(8).font("Helvetica-Bold");
    doc.text("#",            col.no.x,      y + 7, { width: col.no.w,      align: "center" });
    doc.text("Customer Name",col.name.x,    y + 7, { width: col.name.w,    align: "left"   });
    doc.text("Mobile",       col.mobile.x,  y + 7, { width: col.mobile.w,  align: "left"   });
    doc.text("Added On",     col.addedon.x, y + 7, { width: col.addedon.w, align: "left"   });
    doc.text("Pledges",      col.pledges.x, y + 7, { width: col.pledges.w, align: "center" });
    doc.text("Total Loan",   col.loan.x,    y + 7, { width: col.loan.w,    align: "right"  });
    doc.text("Risk Score",   col.risk.x,    y + 7, { width: col.risk.w,    align: "right"  });

    // ── Table rows ──────────────────────────────────────────
    y += rowH;
    rows.forEach((r, i) => {
      if (y > doc.page.height - 60) {
        doc.addPage();
        y = 40;
      }

      doc.rect(40, y, pageWidth, rowH).fill(i % 2 === 0 ? "#f9fafb" : "white");
      doc.rect(40, y, pageWidth, rowH).strokeColor("#e5e7eb").lineWidth(0.5).stroke();

      doc.fillColor("#374151").fontSize(8).font("Helvetica");
      doc.text(String(r.index),                                col.no.x,      y + 7, { width: col.no.w,      align: "center" });
      doc.text(r.name,                                         col.name.x,    y + 7, { width: col.name.w,    align: "left"   });
      doc.text(r.mobile || "—",                                col.mobile.x,  y + 7, { width: col.mobile.w,  align: "left"   });
      doc.text(r.createdAt,                                    col.addedon.x, y + 7, { width: col.addedon.w, align: "left"   });
      doc.text(String(r.pledgeCount),                          col.pledges.x, y + 7, { width: col.pledges.w, align: "center" });
      doc.text(`Rs.${Math.round(r.totalLoan).toLocaleString("en-IN")}`, col.loan.x, y + 7, { width: col.loan.w, align: "right" });

      // Risk score colored by tier
      const tierLabel = r.riskTier === "AT_RISK" ? "AT RISK" : r.riskTier;
      doc.fillColor(riskHex(r.riskTier)).font("Helvetica-Bold");
      doc.text(`${r.riskScore} ${tierLabel}`,                  col.risk.x,    y + 7, { width: col.risk.w,    align: "right"  });

      y += rowH;
    });

    // ── Footer line ─────────────────────────────────────────
    if (y > doc.page.height - 60) { doc.addPage(); y = 40; }
    const totalLoan = rows.reduce((s, r) => s + r.totalLoan, 0);
    doc.rect(40, y, pageWidth, rowH).fill("#dbeafe");
    doc.fillColor("#1e3a8a").fontSize(8).font("Helvetica-Bold");
    doc.text("Total",                                          col.name.x,    y + 7, { width: col.name.w,    align: "left"   });
    doc.text(String(rows.length),                              col.pledges.x, y + 7, { width: col.pledges.w, align: "center" });
    doc.text(`Rs.${Math.round(totalLoan).toLocaleString("en-IN")}`, col.loan.x, y + 7, { width: col.loan.w, align: "right" });

    doc.end();
  });
}


// lib/generatePDF.ts  — add this function alongside generateCustomerPDF

type PledgeRow = {
  index: number;
  customerName: string;
  pledgeDate: string;
  releaseDate: string | null;
  itemType: string;
  itemName: string;
  netWeight: number;
  netWeightOfGold: number;
  netWeightOfSilver: number;
  loanAmount: number;
  interestAccrued: number;
  receivableAmount: number | null;
  marketValue: number | null;
  ltv: number | null;
  status: string;
};

// LTV thresholds mirror the financial-summary web colors.
function ltvHex(ltv: number | null): string {
  if (ltv === null) return "#9ca3af";
  if (ltv < 65) return "#4D6B2A";
  if (ltv <= 75) return "#8A6B17";
  if (ltv <= 90) return "#9A4B14";
  return "#B91C1C";
}

export function generatePledgePDF(
  title: string,
  rows: PledgeRow[],
  variant: "active" | "released" = "active"
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 40, size: "A4" });
    const chunks: Buffer[] = [];

    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const pageWidth = doc.page.width - 80;

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

    // ── Column layout (portrait A4, content x: 40→555, total 515pt) ──
    // Active:   Customer(90) Date(55) Pledge(55) GoldWt(42) SilverWt(42)
    //           Loan(65) Interest(60) Receivable(70) LTV(36) = 515pt
    // Released: Customer(82) Date(52) Released(52) Pledge(45) NetWt(42)
    //           Loan(63) Interest(59) Receivable(70) LTV(50) = 515pt
    const isReleased = variant === "released";
    const col = isReleased
      ? {
          customer:   { x: 40,  w: 82 },
          date:       { x: 122, w: 52 },
          released:   { x: 174, w: 52 },
          pledge:     { x: 226, w: 45 },
          netwt:      { x: 271, w: 42 },
          loan:       { x: 313, w: 63 },
          interest:   { x: 376, w: 59 },
          receivable: { x: 435, w: 70 },
          ltv:        { x: 505, w: 50 },
        }
      : {
          customer:   { x: 40,  w: 90 },
          date:       { x: 130, w: 55 },
          pledge:     { x: 185, w: 55 },
          goldwt:     { x: 240, w: 42 },
          silverwt:   { x: 282, w: 42 },
          loan:       { x: 324, w: 65 },
          interest:   { x: 389, w: 60 },
          receivable: { x: 449, w: 70 },
          ltv:        { x: 519, w: 36 },
        };
    const rowH = 30;

    const rupees = (n: number) => `Rs.${Math.round(n).toLocaleString("en-IN")}`;

    // ── Table header ────────────────────────────────────────
    let y = 110;
    doc.rect(40, y, pageWidth, rowH).fill("#d1fae5");
    doc.fillColor("#065f46").fontSize(8).font("Helvetica-Bold");

    if (isReleased) {
      const rc = col as typeof col & {
        released: { x: number; w: number };
        pledge:   { x: number; w: number };
        netwt:    { x: number; w: number };
      };
      doc.text("Customer",   rc.customer.x,   y + 9, { width: rc.customer.w,   align: "left"  });
      doc.text("Date",       rc.date.x,       y + 9, { width: rc.date.w,       align: "left"  });
      doc.text("Released",   rc.released.x,   y + 9, { width: rc.released.w,   align: "left"  });
      doc.text("Pledge",     rc.pledge.x,     y + 9, { width: rc.pledge.w,     align: "left"  });
      doc.text("Net Wt",     rc.netwt.x,      y + 9, { width: rc.netwt.w,      align: "right" });
      doc.text("Loan",       rc.loan.x,       y + 9, { width: rc.loan.w,       align: "right" });
      doc.text("Interest",   rc.interest.x,   y + 9, { width: rc.interest.w,   align: "right" });
      doc.text("Receivable", rc.receivable.x, y + 9, { width: rc.receivable.w, align: "right" });
      doc.text("LTV",        rc.ltv.x,        y + 9, { width: rc.ltv.w,        align: "right" });
    } else {
      const ac = col as typeof col & {
        pledge:   { x: number; w: number };
        goldwt:   { x: number; w: number };
        silverwt: { x: number; w: number };
      };
      doc.text("Customer",   ac.customer.x,   y + 9, { width: ac.customer.w,   align: "left"  });
      doc.text("Date",       ac.date.x,       y + 9, { width: ac.date.w,       align: "left"  });
      doc.text("Pledge",     ac.pledge.x,     y + 9, { width: ac.pledge.w,     align: "left"  });
      doc.text("Gold Wt",    ac.goldwt.x,     y + 9, { width: ac.goldwt.w,     align: "right" });
      doc.text("Silver Wt",  ac.silverwt.x,   y + 9, { width: ac.silverwt.w,   align: "right" });
      doc.text("Loan",       ac.loan.x,       y + 9, { width: ac.loan.w,       align: "right" });
      doc.text("Interest",   ac.interest.x,   y + 9, { width: ac.interest.w,   align: "right" });
      doc.text("Receivable", ac.receivable.x, y + 9, { width: ac.receivable.w, align: "right" });
      doc.text("LTV",        ac.ltv.x,        y + 9, { width: ac.ltv.w,        align: "right" });
    }
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

      if (isReleased) {
        const rc = col as typeof col & {
          released: { x: number; w: number };
          pledge:   { x: number; w: number };
          netwt:    { x: number; w: number };
        };
        doc.text(r.customerName,                                     rc.customer.x,   y + 9, { width: rc.customer.w,   align: "left"  });
        doc.text(r.pledgeDate,                                       rc.date.x,       y + 9, { width: rc.date.w,       align: "left"  });
        doc.text(r.releaseDate ?? "—",                               rc.released.x,   y + 9, { width: rc.released.w,   align: "left"  });
        doc.text(r.itemName,                                         rc.pledge.x,     y + 9, { width: rc.pledge.w,     align: "left"  });
        doc.text(r.netWeight > 0 ? `${r.netWeight.toFixed(2)}g` : "—",
                                                                     rc.netwt.x,      y + 9, { width: rc.netwt.w,      align: "right" });
        doc.text(rupees(r.loanAmount),                               rc.loan.x,       y + 9, { width: rc.loan.w,       align: "right" });
        doc.text(r.interestAccrued > 0 ? rupees(r.interestAccrued) : "—",
                                                                     rc.interest.x,   y + 9, { width: rc.interest.w,   align: "right" });
        doc.text(r.receivableAmount != null ? rupees(r.receivableAmount) : "—",
                                                                     rc.receivable.x, y + 9, { width: rc.receivable.w, align: "right" });
        doc.fillColor(ltvHex(r.ltv)).font("Helvetica-Bold");
        doc.text(r.ltv != null ? `${r.ltv.toFixed(1)}%` : "—",     rc.ltv.x,        y + 9, { width: rc.ltv.w,        align: "right" });
      } else {
        const ac = col as typeof col & {
          pledge:   { x: number; w: number };
          goldwt:   { x: number; w: number };
          silverwt: { x: number; w: number };
        };
        doc.text(r.customerName,                                     ac.customer.x,   y + 9, { width: ac.customer.w,   align: "left"  });
        doc.text(r.pledgeDate,                                       ac.date.x,       y + 9, { width: ac.date.w,       align: "left"  });
        doc.text(r.itemName,                                         ac.pledge.x,     y + 9, { width: ac.pledge.w,     align: "left"  });
        doc.text(r.netWeightOfGold > 0 ? `${r.netWeightOfGold.toFixed(2)}g` : "—",
                                                                     ac.goldwt.x,     y + 9, { width: ac.goldwt.w,     align: "right" });
        doc.text(r.netWeightOfSilver > 0 ? `${r.netWeightOfSilver.toFixed(2)}g` : "—",
                                                                     ac.silverwt.x,   y + 9, { width: ac.silverwt.w,   align: "right" });
        doc.text(rupees(r.loanAmount),                               ac.loan.x,       y + 9, { width: ac.loan.w,       align: "right" });
        doc.text(r.interestAccrued > 0 ? rupees(r.interestAccrued) : "—",
                                                                     ac.interest.x,   y + 9, { width: ac.interest.w,   align: "right" });
        doc.text(r.receivableAmount != null ? rupees(r.receivableAmount) : "—",
                                                                     ac.receivable.x, y + 9, { width: ac.receivable.w, align: "right" });
        doc.fillColor(ltvHex(r.ltv)).font("Helvetica-Bold");
        doc.text(r.ltv != null ? `${r.ltv.toFixed(1)}%` : "—",     ac.ltv.x,        y + 9, { width: ac.ltv.w,        align: "right" });
      }

      y += rowH;
    });

    // ── Totals footer ───────────────────────────────────────
    if (y > doc.page.height - 60) { doc.addPage(); y = 40; }
    const totalLoan       = rows.reduce((s, r) => s + r.loanAmount, 0);
    const totalInterest   = rows.reduce((s, r) => s + r.interestAccrued, 0);
    const totalReceivable = rows.reduce((s, r) => s + (r.receivableAmount ?? 0), 0);
    doc.rect(40, y, pageWidth, rowH).fill("#d1fae5");
    doc.fillColor("#065f46").fontSize(8).font("Helvetica-Bold");

    if (isReleased) {
      const rc = col as typeof col & { netwt: { x: number; w: number } };
      const totalNetWt = rows.reduce((s, r) => s + r.netWeight, 0);
      doc.text("Total",                        rc.customer.x,   y + 9, { width: rc.customer.w,   align: "left"  });
      doc.text(`${totalNetWt.toFixed(2)}g`,    rc.netwt.x,      y + 9, { width: rc.netwt.w,      align: "right" });
      doc.text(rupees(totalLoan),              rc.loan.x,       y + 9, { width: rc.loan.w,       align: "right" });
      doc.text(rupees(totalInterest),          rc.interest.x,   y + 9, { width: rc.interest.w,   align: "right" });
      doc.text(rupees(totalReceivable),        rc.receivable.x, y + 9, { width: rc.receivable.w, align: "right" });
    } else {
      const ac = col as typeof col & {
        goldwt:   { x: number; w: number };
        silverwt: { x: number; w: number };
      };
      const totalGold   = rows.reduce((s, r) => s + r.netWeightOfGold, 0);
      const totalSilver = rows.reduce((s, r) => s + r.netWeightOfSilver, 0);
      doc.text("Total",                        ac.customer.x,   y + 9, { width: ac.customer.w,   align: "left"  });
      doc.text(`${totalGold.toFixed(2)}g`,     ac.goldwt.x,     y + 9, { width: ac.goldwt.w,     align: "right" });
      doc.text(`${totalSilver.toFixed(2)}g`,   ac.silverwt.x,   y + 9, { width: ac.silverwt.w,   align: "right" });
      doc.text(rupees(totalLoan),              ac.loan.x,       y + 9, { width: ac.loan.w,       align: "right" });
      doc.text(rupees(totalInterest),          ac.interest.x,   y + 9, { width: ac.interest.w,   align: "right" });
      doc.text(rupees(totalReceivable),        ac.receivable.x, y + 9, { width: ac.receivable.w, align: "right" });
    }

    doc.end();
  });
}

// ── Purchase receipt (direct-purchase inventory item) ───────────────

type PurchaseReceiptItem = {
  id: string;
  description: string;
  itemType: string;
  metalType: string;
  purity: string | null;
  grossWeight: string;
  netWeightOfGold: string;
  netWeightOfSilver: string;
  acquiredCost: string;
  acquiredAt: string;
  acquiredMetalRate: string | null;
  sellerName: string | null;
  sellerIdNum: string | null;
  notes: string | null;
};

type PurchaseReceiptShop = {
  shopName: string | null;
  mobile: string | null;
  address: string | null;
};

export function generateInventoryPurchasePDF(
  item: PurchaseReceiptItem,
  shop: PurchaseReceiptShop
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 40, size: "A4" });
    const chunks: Buffer[] = [];

    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end",  () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const pageW  = doc.page.width - 80; // 40 margin each side
    const olive  = "#565C3F";
    const oliveL = "#EAE9DF";

    // ── Olive header bar ─────────────────────────────────────────────
    doc.rect(40, 40, pageW, 48).fill(olive);
    doc
      .fillColor("white")
      .fontSize(18)
      .font("Helvetica-Bold")
      .text("Purchase Receipt", 40, 48, { width: pageW, align: "center" });
    doc
      .fillColor("rgba(255,255,255,0.7)")
      .fontSize(9)
      .font("Helvetica")
      .text("Direct Purchase — Inventory Record", 40, 68, { width: pageW, align: "center" });

    // ── Letterhead ───────────────────────────────────────────────────
    let y = 104;
    if (shop.shopName) {
      doc.fillColor("#1a1a1a").fontSize(13).font("Helvetica-Bold")
        .text(shop.shopName, 40, y, { width: pageW, align: "center" });
      y += 17;
    }
    if (shop.address) {
      doc.fillColor("#555").fontSize(9).font("Helvetica")
        .text(shop.address, 40, y, { width: pageW, align: "center" });
      y += 14;
    }
    if (shop.mobile) {
      doc.fillColor("#555").fontSize(9)
        .text(`Mobile: ${shop.mobile}`, 40, y, { width: pageW, align: "center" });
      y += 14;
    }

    // ── Receipt ref line ─────────────────────────────────────────────
    y += 6;
    doc.moveTo(40, y).lineTo(40 + pageW, y).strokeColor("#e5e7eb").lineWidth(0.5).stroke();
    y += 10;

    const shortId = item.id.slice(-8).toUpperCase();
    const dateStr = new Date(item.acquiredAt).toLocaleDateString("en-IN", {
      day: "numeric", month: "short", year: "numeric",
    });
    doc.fillColor("#555").fontSize(8.5).font("Helvetica")
      .text(`Receipt Ref: ${shortId}`, 40, y, { width: pageW / 2, align: "left" })
      .text(`Purchase Date: ${dateStr}`, 40 + pageW / 2, y, { width: pageW / 2, align: "right" });
    y += 20;

    // ── Helper: section header ───────────────────────────────────────
    function sectionHeader(label: string) {
      doc.rect(40, y, pageW, 22).fill(oliveL);
      doc.fillColor(olive).fontSize(8.5).font("Helvetica-Bold")
        .text(label.toUpperCase(), 44, y + 6, { width: pageW - 8 });
      y += 22;
    }

    // ── Helper: field row ────────────────────────────────────────────
    function fieldRow(label: string, value: string, isLast = false) {
      const rowH = 22;
      doc.rect(40, y, pageW, rowH).fill("#fafafa").strokeColor("#e5e7eb").lineWidth(0.5).stroke();
      doc.fillColor("#6b7280").fontSize(8).font("Helvetica").text(label, 48, y + 6, { width: 140 });
      doc.fillColor("#1a1a1a").fontSize(8.5).font("Helvetica").text(value, 194, y + 6, { width: pageW - 160 });
      y += rowH;
      if (isLast) {
        doc.moveTo(40, y).lineTo(40 + pageW, y).strokeColor("#e5e7eb").lineWidth(0.5).stroke();
      }
    }

    // ── Section: Seller ──────────────────────────────────────────────
    sectionHeader("Seller Information");
    fieldRow("Seller Name",      item.sellerName   ?? "—");
    fieldRow("Seller ID Number", item.sellerIdNum  ?? "—", true);
    y += 12;

    // ── Section: Item Details ────────────────────────────────────────
    sectionHeader("Item Details");
    fieldRow("Description",  item.description);
    fieldRow("Item Type",    item.itemType);
    fieldRow("Metal Type",   item.metalType);
    fieldRow("Purity",       item.purity != null ? `${Number(item.purity).toFixed(2)}%` : "—");
    fieldRow("Gross Weight", `${Number(item.grossWeight).toFixed(3)} g`);
    const netGold   = Number(item.netWeightOfGold);
    const netSilver = Number(item.netWeightOfSilver);
    const netWeight = netGold > 0 ? netGold : netSilver > 0 ? netSilver : null;
    if (netWeight !== null) {
      const metalName = item.metalType.charAt(0).toUpperCase() + item.metalType.slice(1).toLowerCase();
      fieldRow(`Net ${metalName} Weight`, `${netWeight.toFixed(3)} g`);
    }
    if (item.acquiredMetalRate != null) {
      const metal = item.metalType.charAt(0).toUpperCase() +
        item.metalType.slice(1).toLowerCase();
      fieldRow(
        `${metal} rate at purchase`,
        `Rs.${Number(item.acquiredMetalRate).toLocaleString("en-IN")}/g`,
        true,
      );
    } else {
      doc.moveTo(40, y).lineTo(40 + pageW, y).strokeColor("#e5e7eb").lineWidth(0.5).stroke();
    }
    y += 12;

    // ── Section: Payment ─────────────────────────────────────────────
    sectionHeader("Payment");
    y += 10;
    const priceStr = "₹" + Number(item.acquiredCost).toLocaleString("en-IN");
    doc.fillColor(olive).fontSize(28).font("Helvetica-Bold")
      .text(priceStr, 40, y, { width: pageW, align: "center" });
    y += 38;
    doc.fillColor("#9ca3af").fontSize(8).font("Helvetica")
      .text("Total Purchase Price", 40, y, { width: pageW, align: "center" });
    y += 18;
    doc.moveTo(40, y).lineTo(40 + pageW, y).strokeColor("#e5e7eb").lineWidth(0.5).stroke();
    y += 12;

    // ── Notes ────────────────────────────────────────────────────────
    if (item.notes) {
      sectionHeader("Notes");
      doc.fillColor("#374151").fontSize(8.5).font("Helvetica")
        .text(item.notes, 48, y + 4, { width: pageW - 16 });
      const notesH = doc.heightOfString(item.notes, { width: pageW - 16 });
      y += Math.max(28, notesH + 16);
    }

    // ── Signature lines ──────────────────────────────────────────────
    const sigY = Math.max(y + 20, doc.page.height - 130);
    const sigW = pageW / 2 - 12;

    doc.moveTo(48,            sigY).lineTo(48 + sigW,      sigY).strokeColor("#9ca3af").lineWidth(0.8).stroke();
    doc.moveTo(48 + sigW + 24, sigY).lineTo(40 + pageW, sigY).strokeColor("#9ca3af").lineWidth(0.8).stroke();

    doc.fillColor("#6b7280").fontSize(8).font("Helvetica")
      .text("Seller Signature",      48,            sigY + 5, { width: sigW,  align: "center" })
      .text("Shop Owner Signature",  48 + sigW + 24, sigY + 5, { width: sigW,  align: "center" });

    const dateLineY = sigY + 18;
    doc.text(`Date: _______________`, 48,            dateLineY, { width: sigW,  align: "center" });
    doc.text(`Date: _______________`, 48 + sigW + 24, dateLineY, { width: sigW,  align: "center" });

    doc.end();
  });
}

const DEFAULT_SHOPOWNER_TERMS = [
  "• मेरे द्वारा गिरवी रखी गई उपरोक्त रकम मेरे स्वामित्व, पूर्ण प्रामाणिक, आविवादित संपत्ति है।",
  "• मय ब्याज (प्रतिमाह/प्रति चौकडा) मूलधन को वापस लौटाने पर ही आपसे पुन: रकम लेने का मुझे अधिकार होगा।",
  "• गिरवी रखी गयी रकम 1 वर्ष के अंतराल में ना छुड़ा पाने की दशा में हमारे द्वारा ब्याज का हिसाब अनिवार्य रूप से जमा कर दिया जाएगा।",
  "• तय दिशा निर्देशों के अनुरूप मूलधन व ब्याज मेरे द्वारा अदा न कर पाने की स्थिति में आपको रकम बेच कर अपनी राशि पुन: वसूलने का पूर्ण अधिकार होगा।",
  "• अपरिहार्य कारणों से किसी विवाद की स्थिति में न्याय क्षेत्र यहीं होगा।",
];

const DEFAULT_CUSTOMER_TERMS = [
  "• गिरवी रखी गयी रकम का 1 वर्ष मे हिसाब करना अनिवार्य है।",
  "• रकम रखने वाले व्यक्ति को ही रकम वापस दी जायेगी।",
  "• रकम छुडाते समय रसीद पुन: साथ लाये।",
  "• रकम/लेनदेन/हिसाब काउंटर पर ही चेक कर तत्परचात हमारी कोई जवाबदारी नही होगी।",
  "• असुविधा व समय के बचत हेतु रकम छुड़ाने से 1 घंटा पूर्व कृपया इस नंबर पर फोन करे।",
];

type ReceiptItem = {
  name: string;
  grossWeight: number;
  netWeight: number;
};

type ReceiptData = {
  transactionId: string;
  pledgeDate: string;
  customerName: string;
  customerAddress: string;
  loanAmount: number;
  items: ReceiptItem[];
  remark: string | null;
  shopName: string;
  shopAddress: string;
  shopMobile: string;
  itemPhoto: string | null;
  username: string;
  shopownerTerms: string | null;
  customerTerms: string | null;
};

async function fetchImageBuffer(url: string): Promise<Buffer | null> {
  // Defense-in-depth: only fetch images from Cloudinary over HTTPS. The only
  // caller passes a server-generated Cloudinary secure_url, but this guards
  // against SSRF if any future path lets a client influence the value.
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:") return null;
    if (!parsed.hostname.endsWith("res.cloudinary.com")) return null;
  } catch {
    return null; // malformed URL
  }

  // Node's fetch has no default timeout — bound it so a hung Cloudinary
  // response can't hang the receipt route. On timeout/failure fall back to
  // null so the PDF still generates without the image.
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);
  try {
    const res = await fetch(url, {
      cache: "no-store",
      signal: controller.signal,
    });
    if (!res.ok) {
      console.error("Image fetch HTTP error:", res.status);
      return null;
    }
    const arrayBuffer = await res.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } catch (e) {
    console.error("fetchImageBuffer error:", e);
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

export function generateReceiptPDF(data: ReceiptData): Promise<Buffer> {
  return new Promise(async (resolve, reject) => {
    const doc = new PDFDocument({ margin: 0, size: "A4", layout: "landscape" });
    const chunks: Buffer[] = [];

    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    // ── Register Hindi font with fallback ───────────────
    const fontPath = path.join(process.cwd(), "public", "fonts", "NotoSansDevanagari_Condensed-Bold.ttf");
    let hindiFont = "Helvetica";
    try {
      doc.registerFont("HindiBold", fontPath);
      hindiFont = "HindiBold";
    } catch {
      console.warn("Hindi font not found, using Helvetica fallback");
    }

    // ── Fetch image ──────────────────────────────────────
    let imageBuffer: Buffer | null = null;
    if (data.itemPhoto) {
      imageBuffer = await fetchImageBuffer(data.itemPhoto);
    }

    const PW = doc.page.width;
    const PH = doc.page.height;
    const half = PW / 2;

    const drawCopy = (offsetX: number, copyLabel: string, img: Buffer | null) => {
      const pad = 20;
      const W = half - pad * 2;
      const tX = offsetX + pad + 5;
      const tW = W - 10;

      doc.rect(offsetX + pad, 20, W, PH - 40).strokeColor("#000").lineWidth(1).stroke();

      let y = 30;

      // ── Receipt badge ─────────────────────────────────
      const badgeW = 70;
      const badgeX = offsetX + pad + W / 2 - badgeW / 2;
      doc.rect(badgeX, y, badgeW, 16).fill("#000");
      doc.fillColor("white").fontSize(9).font("Helvetica-Bold")
        .text("Receipt", badgeX, y + 4, { width: badgeW, align: "center" });

      y += 22;
      doc.fillColor("#000").fontSize(11).font("Helvetica-Bold")
        .text(`M/s ${data.username}`, offsetX + pad, y, { width: W, align: "center" });

      y += 15;
      doc.fontSize(8).font("Helvetica")
        .text(`${data.shopName} ${data.shopAddress}`, offsetX + pad, y, { width: W, align: "center" });

      y += 12;
      doc.text(`Mobile No. : ${data.shopMobile}`, offsetX + pad, y, { width: W, align: "center" });

      y += 10;
      doc.fontSize(7).fillColor("#555")
        .text(`(${copyLabel})`, offsetX + pad, y, { width: W, align: "center" });

      y += 10;
      doc.moveTo(offsetX + pad, y).lineTo(offsetX + pad + W, y)
        .strokeColor("#000").lineWidth(0.5).stroke();

      // ── Transaction info ──────────────────────────────
      y += 8;
      doc.fillColor("#000").fontSize(8).font("Helvetica-Bold");
      doc.text(`Transaction ID - ${data.transactionId}`, offsetX + pad + 5, y);
      doc.text(`Pledge Date - ${data.pledgeDate}`, offsetX + pad + 5, y, {
        width: W - 10, align: "right",
      });

      // ── Customer info (handles long address) ──────────
      const labelX = offsetX + pad + 5;
      const valueX = offsetX + pad + 85;
      const valueW = W - 90;

      y += 14;
      doc.font("Helvetica-Bold").text("Customer Name", labelX, y);
      doc.font("Helvetica").text(`: ${data.customerName}`, valueX, y, { width: valueW });
      y += Math.max(12, doc.heightOfString(`: ${data.customerName}`, { width: valueW }) + 2);

      doc.font("Helvetica-Bold").text("Address", labelX, y);
      doc.font("Helvetica").text(`: ${data.customerAddress}`, valueX, y, { width: valueW });
      y += Math.max(12, doc.heightOfString(`: ${data.customerAddress}`, { width: valueW }) + 2);

      doc.font("Helvetica-Bold").text("Loan Amount", labelX, y);
      doc.font("Helvetica").text(`: ${data.loanAmount.toLocaleString("en-IN")}`, valueX, y, { width: valueW });
      y += 14;

      // ── Items table ───────────────────────────────────
      const col1 = tW * 0.35;
      const col2 = tW * 0.18;
      const col3 = tW * 0.18;
      const col4 = tW * 0.29;
      const rowH = 14;

      // Header
      doc.rect(tX, y, tW, rowH).fill("#000");
      doc.fillColor("white").font("Helvetica-Bold").fontSize(7.5);
      doc.text("Item Name",  tX + 3,                        y + 3, { width: col1 });
      doc.text("Gross Wt.",  tX + col1 + 3,                 y + 3, { width: col2 });
      doc.text("Net Wt.",    tX + col1 + col2 + 3,          y + 3, { width: col3 });
      doc.text("Remark",     tX + col1 + col2 + col3 + 3,   y + 3, { width: col4 });
      y += rowH;

      // Item rows
      const itemsToShow = data.items.length > 0
        ? data.items
        : [{ name: "—", grossWeight: 0, netWeight: 0 }];

      itemsToShow.forEach((item, idx) => {
        const remarkText = idx === 0 ? (data.remark ?? "") : "";
        const nameH   = doc.heightOfString(item.name,    { width: col1 - 6 });
        const remarkH = doc.heightOfString(remarkText,   { width: col4 - 6 });
        const dynRowH = Math.max(rowH, nameH + 6, remarkH + 6);
        doc.rect(tX, y, tW, dynRowH).strokeColor("#000").lineWidth(0.5).stroke();
        doc.fillColor("#000").font("Helvetica").fontSize(7.5);
        doc.text(item.name,                            tX + 3,               y + 3, { width: col1 - 6 });
        doc.text(`${item.grossWeight.toFixed(3)} g`,   tX + col1 + 3,        y + 3, { width: col2 - 6 });
        doc.text(`${item.netWeight.toFixed(3)} g`,     tX + col1 + col2 + 3, y + 3, { width: col3 - 6 });
        if (idx === 0) {
          doc.text(remarkText, tX + col1 + col2 + col3 + 3, y + 3, { width: col4 - 6 });
        }
        y += dynRowH;
      });

      // Pad to minimum 3 rows
      const emptyRows = Math.max(0, 3 - itemsToShow.length);
      for (let i = 0; i < emptyRows; i++) {
        doc.rect(tX, y, tW, rowH).strokeColor("#000").lineWidth(0.5).stroke();
        y += rowH;
      }

      y += 4;

      // ── Item photo ────────────────────────────────────
      const photoH = 120;
      if (img) {
        try {
          doc.image(img, tX + 4, y + 2, {
            fit: [110, photoH - 4],
          });
        } catch (e) {
          console.error("Image embed error:", e);
        }
      }
      y += photoH;

      // ── Terms ─────────────────────────────────────────
      const rawTerms = copyLabel === "Shopowner Copy"
        ? data.shopownerTerms
        : data.customerTerms;

      const termLines: string[] = rawTerms
        ? rawTerms.split("\n").filter((l) => l.trim() !== "")
        : copyLabel === "Shopowner Copy"
          ? DEFAULT_SHOPOWNER_TERMS
          : DEFAULT_CUSTOMER_TERMS;

      const sigBoxY = PH - 75;
      let termsY = y;

      doc.fontSize(6.5).font(hindiFont).fillColor("#000");
      termLines.forEach((line) => {
        const lineH = doc.heightOfString(line.trim(), { width: tW }) + 2;
        if (termsY + lineH < sigBoxY - 5) {
          doc.text(line.trim(), tX, termsY, { width: tW });
          termsY += lineH;
        }
      });

      // ── Signature boxes ───────────────────────────────
      y = sigBoxY;
      const sigW = tW / 2 - 5;

      if (copyLabel === "Shopowner Copy") {
        doc.rect(tX, y, tW / 2 - 3, 40).strokeColor("#000").lineWidth(0.5).stroke();
        doc.rect(tX + tW / 2 + 3, y, tW / 2 - 3, 40).strokeColor("#000").lineWidth(0.5).stroke();
        doc.fontSize(7).font(hindiFont).fillColor("#000");
        doc.text("रूपये नगद प्राप्त किये", tX + 3, y + 3, { width: sigW });
        doc.text("रकम पुन: प्राप्त की दिनांक:-", tX + tW / 2 + 6, y + 3, { width: sigW });

        y += 42;
        doc.rect(tX, y, tW / 2 - 3, 14).fill("#000");
        doc.rect(tX + tW / 2 + 3, y, tW / 2 - 3, 14).fill("#000");
        doc.fillColor("white").fontSize(7).font(hindiFont);
        doc.text("रकम रखनेवाले के हस्ताक्षर/अंगूठा", tX + 3, y + 4, { width: sigW });
        doc.text("रकम छुडाने वाले के हस्ताक्षर/अंगूठा", tX + tW / 2 + 6, y + 4, { width: sigW });
      } else {
        doc.rect(tX, y, tW / 2 - 3, 54).strokeColor("#000").lineWidth(0.5).stroke();
        doc.rect(tX + tW / 2 + 3, y, tW / 2 - 3, 54).strokeColor("#000").lineWidth(0.5).stroke();
        doc.fillColor("#000").fontSize(7).font("Helvetica-Bold");
        doc.text("Shop Owner Signature", tX + 3, y + 3, { width: sigW });
        doc.text("Customer Signature",   tX + tW / 2 + 6, y + 3, { width: sigW });
      }
    };

    drawCopy(0, "Shopowner Copy", imageBuffer);

    doc.save();
    doc.dash(4, { space: 3 });
    doc.moveTo(half, 20).lineTo(half, PH - 20).strokeColor("#aaa").lineWidth(0.8).stroke();
    doc.restore();

    drawCopy(half, "Customer Copy", imageBuffer);

    doc.end();
  });
}