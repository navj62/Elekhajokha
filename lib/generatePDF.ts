// lib/generatePDF.ts
import path from "path/win32";
import PDFDocument from "pdfkit";
const boldFont = path.join(process.cwd(), "public/fonts/NotoSansDevanagari-Bold.ttf");

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


export function generateReceiptPDF(data: ReceiptData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 0, size: "A4", layout: "landscape" });
    const chunks: Buffer[] = [];

    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    // ── Register Hindi font ──────────────────────────────
    const fontPath = path.join(process.cwd(), "public/fonts/NotoSansDevanagari_Condensed-Bold.ttf");
    // doc.registerFont("Hindi", fontPath);
    doc.registerFont("HindiBold", fontPath); // same file, wght axis handles bold

    const PW = doc.page.width;
    const PH = doc.page.height;
    const half = PW / 2;

    const drawCopy = (offsetX: number, copyLabel: string) => {
      const pad = 20;
      const W = half - pad * 2;

      doc.rect(offsetX + pad, 20, W, PH - 40).strokeColor("#000").lineWidth(1).stroke();

      let y = 30;

      // Receipt badge
      const badgeW = 70;
      const badgeX = offsetX + pad + W / 2 - badgeW / 2;
      doc.rect(badgeX, y, badgeW, 16).fill("#000");
      doc.fillColor("white").fontSize(9).font("Helvetica-Bold")
        .text("Receipt", badgeX, y + 4, { width: badgeW, align: "center" });

      y += 22;
      doc.fillColor("#000").fontSize(11).font("Helvetica-Bold")
        .text(`M/s ${data.userName}`, offsetX + pad, y, { width: W, align: "center" });

      y += 15;
      doc.fontSize(8).font("Helvetica")
        .text(`${data.shopName} ${data.shopAddress}`, offsetX + pad, y, { width: W, align: "center" });

      y += 12;
      doc.text(`Mobile No. : ${data.shopMobile}`, offsetX + pad, y, { width: W, align: "center" });

      y += 10;
      doc.fontSize(7).fillColor("#555")
        .text(`(${copyLabel})`, offsetX + pad, y, { width: W, align: "center" });

      y += 10;
      doc.moveTo(offsetX + pad, y).lineTo(offsetX + pad + W, y).strokeColor("#000").lineWidth(0.5).stroke();

      y += 8;
      doc.fillColor("#000").fontSize(8).font("Helvetica-Bold");
      doc.text(`Transaction ID - ${data.transactionId}`, offsetX + pad + 5, y);
      doc.text(`Pledge Date - ${data.pledgeDate}`, offsetX + pad + 5, y, { width: W - 10, align: "right" });

      y += 14;
      doc.font("Helvetica-Bold").text("Customer Name", offsetX + pad + 5, y);
      doc.font("Helvetica").text(`: ${data.customerName}`, offsetX + pad + 85, y);

      y += 12;
      doc.font("Helvetica-Bold").text("Address", offsetX + pad + 5, y);
      doc.font("Helvetica").text(`: ${data.customerAddress}`, offsetX + pad + 85, y);

      y += 12;
      doc.font("Helvetica-Bold").text("Loan Amount", offsetX + pad + 5, y);
      doc.font("Helvetica").text(`: ${data.loanAmount.toLocaleString("en-IN")}`, offsetX + pad + 85, y);

      // Items table
      y += 14;
      const tX = offsetX + pad + 5;
      const tW = W - 10;
      const col1 = tW * 0.5;
      const col2 = tW * 0.25;
      const col3 = tW * 0.25;

      doc.rect(tX, y, tW, 14).fill("#000");
      doc.fillColor("white").font("Helvetica-Bold").fontSize(8);
      doc.text("Item Name", tX + 3, y + 3, { width: col1 });
      doc.text("Weight",    tX + col1 + 3, y + 3, { width: col2 });
      doc.text("Remark",    tX + col1 + col2 + 3, y + 3, { width: col3 });

      y += 14;
      doc.rect(tX, y, tW, 14).strokeColor("#000").lineWidth(0.5).stroke();
      doc.fillColor("#000").font("Helvetica").fontSize(8);
      doc.text(data.itemName,    tX + 3, y + 3, { width: col1 });
      doc.text(data.itemWeight,  tX + col1 + 3, y + 3, { width: col2 });
      doc.text(data.remark ?? "", tX + col1 + col2 + 3, y + 3, { width: col3 });

      y += 14;
      doc.rect(tX, y, tW, 14).strokeColor("#000").lineWidth(0.5).stroke();
      y += 14;
      doc.rect(tX, y, tW, 14).strokeColor("#000").lineWidth(0.5).stroke();

      // ── Hindi terms ──────────────────────────────────────
      y += 18;
      const terms = copyLabel === "Shopowner Copy"
        ? [
            "• मेरे द्वारा गिरवी रखी गई उपरोक्त रकम मेरे स्वामित्व, पूर्ण प्रामाणिक, आविवादित संपत्ति है।",
            "• मय ब्याज (प्रतिमाह/प्रति चौकडा) मूलधन को वापस लौटाने पर ही आपसे पुन: रकम लेने का मुझे अधिकार होगा।",
            "• गिरवी रखी गयी रकम 1 वर्ष के अंतराल में ना छुड़ा पाने की दशा में हमारे द्वारा ब्याज का हिसाब अनिवार्य रूप से जमा कर दिया जाएगा।",
            "• तय दिशा निर्देशों के अनुरूप मूलधन व ब्याज मेरे द्वारा अदा न कर पाने की स्थिति में आपको रकम बेच कर अपनी राशि पुन: वसूलने का पूर्ण अधिकार होगा।",
            "• अपरिहार्य कारणों से किसी विवाद की स्थिति में न्याय क्षेत्र यहीं होगा।",
          ]
        : [
            "• गिरवी रखी गयी रकम का 1 वर्ष मे हिसाब करना अनिवार्य है।",
            "• रकम रखने वाले व्यक्ति को ही रकम वापस दी जायेगी।",
            "• रकम छुडाते समय रसीद पुन: साथ लाये।",
            "• रकम/लेनदेन/हिसाब काउंटर पर ही चेक कर तत्परचात हमारी कोई जवाबदारी नही होगी।",
            "• असुविधा व समय के बचत हेतु रकम छुड़ाने से 1 घंटा पूर्व कृपया इस नंबर पर फोन करे।",
          ];

      // ← Use Hindi font here
      doc.fontSize(6.5).font("HindiBold").fillColor("#000");
      terms.forEach((line) => {
        doc.text(line, tX, y, { width: tW });
        y += doc.currentLineHeight() + 2;
      });

      // Signature boxes
      y = PH - 75;
      const sigW = tW / 2 - 5;

      if (copyLabel === "Shopowner Copy") {
        doc.rect(tX, y, tW / 2 - 3, 40).strokeColor("#000").lineWidth(0.5).stroke();
        doc.rect(tX + tW / 2 + 3, y, tW / 2 - 3, 40).strokeColor("#000").lineWidth(0.5).stroke();
        // ← Hindi font for Hindi sig labels
        doc.fontSize(7).font("HindiBold").fillColor("#000");
        doc.text("रूपये नगद प्राप्त किये", tX + 3, y + 3, { width: sigW });
        doc.text("रकम पुन: प्राप्त की दिनांक:-", tX + tW / 2 + 6, y + 3, { width: sigW });

        y += 42;
        doc.rect(tX, y, tW / 2 - 3, 14).fill("#000");
        doc.rect(tX + tW / 2 + 3, y, tW / 2 - 3, 14).fill("#000");
        doc.fillColor("white").fontSize(7).font("HindiBold");
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

    drawCopy(0, "Shopowner Copy");

    doc.save();
    doc.dash(4, { space: 3 });
    doc.moveTo(half, 20).lineTo(half, PH - 20).strokeColor("#aaa").lineWidth(0.8).stroke();
    doc.restore();

    drawCopy(half, "Customer Copy");

    doc.end();
  });
}