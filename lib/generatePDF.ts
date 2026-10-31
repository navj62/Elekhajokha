// lib/generatePDF.ts
import path from "path";
import PDFDocument from "pdfkit";

// ── Reports export (Active / Released / Customer tabs) ──────────────

// Noto Sans Devanagari (OFL, licence alongside in public/fonts). The Regular
// cut has Devanagari, digits and ₹ but NO Latin letters, so body text is drawn
// in script runs: Devanagari + ₹ in Noto Regular, everything else in
// Helvetica. The Condensed Bold cut covers Latin too, so bold text uses it
// whole.
const REPORT_FONT_REGULAR = "NotoDevanagariRegular";
const REPORT_FONT_BOLD = "NotoDevanagariBold";

export type ReportPdfAlign = "left" | "right" | "center";

export type ReportPdfColumn = {
  header: string;
  width: number; // relative weight — scaled to the page's content width
  align: ReportPdfAlign;
};

export type ReportPdfCell = { text: string; color?: string };

export type ReportPdfInput = {
  shop: { shopName: string | null; address: string | null; mobile: string | null };
  title: string;
  metaLines: string[];
  summary: { label: string; value: string }[];
  columns: ReportPdfColumn[];
  rows: ReportPdfCell[][];
  totals: ReportPdfCell[];
};

const graphemeSegmenter = new Intl.Segmenter("en", { granularity: "grapheme" });
const graphemes = (s: string) => Array.from(graphemeSegmenter.segment(s), (g) => g.segment);

function needsDevanagariFont(cp: number): boolean {
  return (
    (cp >= 0x0900 && cp <= 0x097f) || // Devanagari
    (cp >= 0xa8e0 && cp <= 0xa8ff) || // Devanagari Extended
    cp === 0x20b9 ||                  // ₹ — not in Helvetica's WinAnsi set
    cp === 0x200c || cp === 0x200d    // ZWNJ / ZWJ inside conjuncts
  );
}

type TextRun = { font: string; text: string };

function textRuns(text: string, bold: boolean): TextRun[] {
  if (bold) return [{ font: REPORT_FONT_BOLD, text }];
  const runs: TextRun[] = [];
  for (const g of graphemes(text)) {
    const last = runs[runs.length - 1];
    // Whitespace stays in the current run so a space never splits a word pair.
    const font =
      last && /^\s+$/.test(g)
        ? last.font
        : needsDevanagariFont(g.codePointAt(0)!) ? REPORT_FONT_REGULAR : "Helvetica";
    if (last && last.font === font) last.text += g;
    else runs.push({ font, text: g });
  }
  return runs;
}

function runsWidth(doc: PDFKit.PDFDocument, runs: TextRun[], size: number): number {
  return runs.reduce((w, r) => w + doc.font(r.font).fontSize(size).widthOfString(r.text), 0);
}

/**
 * Single-line text clipped to `width` with an ellipsis, positioned on a shared
 * alphabetic baseline so Helvetica and Noto runs line up.
 */
function drawLine(
  doc: PDFKit.PDFDocument,
  text: string,
  x: number,
  baselineY: number,
  width: number,
  opts: { size: number; bold?: boolean; color: string; align?: ReportPdfAlign }
) {
  const bold = opts.bold ?? false;
  let runs = textRuns(text, bold);
  if (runsWidth(doc, runs, opts.size) > width) {
    const g = graphemes(text);
    let n = g.length;
    do {
      n--;
      runs = textRuns(g.slice(0, n).join("").trimEnd() + "…", bold);
    } while (n > 0 && runsWidth(doc, runs, opts.size) > width);
  }
  const total = runsWidth(doc, runs, opts.size);
  let cx =
    opts.align === "right" ? x + width - total
    : opts.align === "center" ? x + (width - total) / 2
    : x;
  doc.fillColor(opts.color);
  for (const r of runs) {
    doc.font(r.font).fontSize(opts.size).text(r.text, cx, baselineY, {
      lineBreak: false,
      baseline: "alphabetic",
    });
    cx += doc.widthOfString(r.text);
  }
}

export function generateReportPDF(input: ReportPdfInput): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    // margin 0: all positions are absolute, and pdfkit must never auto-paginate.
    const doc = new PDFDocument({ size: "A4", layout: "landscape", margin: 0, bufferPages: true });
    const chunks: Buffer[] = [];

    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const fontDir = path.join(process.cwd(), "public", "fonts");
    doc.registerFont(REPORT_FONT_REGULAR, path.join(fontDir, "NotoSansDevanagari-Regular.ttf"));
    doc.registerFont(REPORT_FONT_BOLD, path.join(fontDir, "NotoSansDevanagari_Condensed-Bold.ttf"));

    const olive = "#565C3F";
    const oliveL = "#EAE9DF";
    const zebra = "#F7F6F0";
    const ink = "#1a1a1a";
    const grey = "#6b7280";

    const M = 40;
    const pageW = doc.page.width - M * 2;
    const pageH = doc.page.height;
    const bottomLimit = pageH - M - 16; // room for the page footer
    const rowH = 18;
    const cellPad = 4;
    const shopName = input.shop.shopName?.trim() || "";

    // Column x/width, scaled from relative weights.
    const weightSum = input.columns.reduce((s, c) => s + c.width, 0);
    let acc = M;
    const cols = input.columns.map((c) => {
      const w = (c.width / weightSum) * pageW;
      const col = { ...c, x: acc, w };
      acc += w;
      return col;
    });

    const drawRow = (cells: ReportPdfCell[], y: number, o: { fill?: string; bold?: boolean; color: string; size: number }) => {
      if (o.fill) doc.rect(M, y, pageW, rowH).fill(o.fill);
      const baseline = y + rowH / 2 + o.size * 0.35;
      cols.forEach((c, i) => {
        const cell = cells[i];
        if (!cell || !cell.text) return;
        drawLine(doc, cell.text, c.x + cellPad, baseline, c.w - cellPad * 2, {
          size: o.size, bold: o.bold, color: cell.color ?? o.color, align: c.align,
        });
      });
    };

    const drawHeader = (y: number) => {
      drawRow(cols.map((c) => ({ text: c.header })), y, { fill: olive, bold: true, color: "white", size: 8.5 });
      return y + rowH;
    };

    // ── Letterhead (first page) ──────────────────────────────────
    let y = M;
    if (shopName) {
      drawLine(doc, shopName, M, y + 14, pageW, { size: 16, bold: true, color: ink, align: "center" });
      y += 22;
    }
    const contact = [input.shop.address?.trim(), input.shop.mobile?.trim() ? `Mob: ${input.shop.mobile.trim()}` : ""]
      .filter(Boolean)
      .join("   |   ");
    if (contact) {
      drawLine(doc, contact, M, y + 9, pageW, { size: 9, color: grey, align: "center" });
      y += 16;
    }
    y += 4;
    doc.rect(M, y, pageW, 26).fill(olive);
    drawLine(doc, input.title, M, y + 17.5, pageW, { size: 13, bold: true, color: "white", align: "center" });
    y += 34;

    for (const line of input.metaLines) {
      drawLine(doc, line, M, y + 9, pageW, { size: 9, color: grey });
      y += 13;
    }
    y += 6;

    // ── Summary strip ────────────────────────────────────────────
    if (input.summary.length) {
      const boxW = pageW / input.summary.length;
      doc.rect(M, y, pageW, 38).fill(oliveL);
      input.summary.forEach((s, i) => {
        const bx = M + i * boxW;
        drawLine(doc, s.value, bx, y + 18, boxW, { size: 12, bold: true, color: ink, align: "center" });
        drawLine(doc, s.label.toUpperCase(), bx, y + 31, boxW, { size: 7, color: grey, align: "center" });
      });
      y += 48;
    }

    // ── Table ────────────────────────────────────────────────────
    const continuationTitle = [shopName, input.title].filter(Boolean).join("  —  ") + " (continued)";
    const newPage = () => {
      doc.addPage({ size: "A4", layout: "landscape", margin: 0 });
      drawLine(doc, continuationTitle, M, M + 9, pageW, { size: 9, color: grey });
      return drawHeader(M + 16);
    };

    y = drawHeader(y);
    if (input.rows.length === 0) {
      drawLine(doc, "No records.", M, y + rowH / 2 + 3, pageW, { size: 9, color: grey, align: "center" });
      y += rowH;
    }
    input.rows.forEach((cells, i) => {
      if (y + rowH > bottomLimit) y = newPage();
      drawRow(cells, y, { fill: i % 2 === 0 ? zebra : undefined, color: "#374151", size: 8 });
      y += rowH;
    });
    if (y + rowH > bottomLimit) y = newPage();
    drawRow(input.totals, y, { fill: oliveL, bold: true, color: olive, size: 8.5 });

    // ── Footer: "Page X of Y" on every page ──────────────────────
    const { start, count } = doc.bufferedPageRange();
    const footerLeft = [shopName, input.title].filter(Boolean).join("  ·  ");
    for (let i = start; i < start + count; i++) {
      doc.switchToPage(i);
      const fy = pageH - M + 6;
      drawLine(doc, footerLeft, M, fy, pageW * 0.7, { size: 8, color: grey });
      drawLine(doc, `Page ${i - start + 1} of ${count}`, M, fy, pageW, { size: 8, color: grey, align: "right" });
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