import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { buildMessages } from "../../../lib/import/ai/prompt";
import {
  MAX_SAMPLE_ROWS,
  classifyHeader,
  maskAddress,
  maskLetters,
  maskSample,
  scrubDigitRuns,
} from "../../../lib/import/ai/mask";
import { extractTable, findHeaderRow, listSheets, readSheet } from "../../../lib/import/parse";

describe("maskLetters / maskAddress", () => {
  it("keeps the first letter of each word, Latin", () => {
    expect(maskLetters("Ramesh Kumar")).toBe("R***** K****");
    expect(maskLetters("Ram-Lal")).toBe("R**-L**");
  });
  it("keeps the first letter of each word, Devanagari (marks are masked too)", () => {
    expect(maskLetters("रमेश कुमार")).toBe("र*** क****");
    expect(maskLetters("दिलीप कोठारी")).toBe("द**** क*****");
  });
  it("masks letters and turns every digit into X in addresses (Latin)", () => {
    expect(maskAddress("Plot 12, Gandhi Nagar, 464001")).toBe("P*** XX, G***** N****, XXXXXX");
  });
  it("masks letters and turns every digit into X in addresses (Devanagari, Devanagari digits)", () => {
    expect(maskAddress("मकान २४, गांधी नगर, ४६४००१")).toBe("म*** XX, ग**** न**, XXXXXX");
  });
});

describe("scrubDigitRuns", () => {
  it("reduces a mobile to its shape", () => {
    expect(scrubDigitRuns("9876543210")).toBe("98XXXXXX10");
    expect(scrubDigitRuns("98765 43210")).toBe("98XXXXXX10");
    expect(scrubDigitRuns("call 9876543210 now")).toBe("call 98XXXXXX10 now");
    expect(scrubDigitRuns("+91-98765-43210")).toBe("91XXXXXXXX10");
  });
  it("removes Aadhaar-shaped runs entirely", () => {
    expect(scrubDigitRuns("2345 6789 0123")).toBe("");
    expect(scrubDigitRuns("234567890123")).toBe("");
    expect(scrubDigitRuns("id 2345-6789-0123 ok")).toBe("id  ok");
  });
  it("leaves ordinary numbers and dates alone", () => {
    expect(scrubDigitRuns("12500.50")).toBe("12500.50");
    expect(scrubDigitRuns("2026-04-03")).toBe("2026-04-03");
    expect(scrubDigitRuns("1,25,000")).toBe("1,25,000");
  });
});

describe("classifyHeader", () => {
  it("recognises the real sample headers", () => {
    const kind = (h: string) => classifyHeader(h);
    // sample 1
    expect(kind("customername")).toBe("name");
    expect(kind("address")).toBe("address");
    expect(kind("itemname")).toBe("exempt");
    expect(kind("type")).toBe("exempt");
    expect(kind("cid")).toBe("exempt");
    expect(kind("loanamount")).toBe("unlabelled");
    // sample 2
    expect(kind("Contact Person")).toBe("name");
    expect(kind("Contact ID")).toBe("exempt");
    expect(kind("Shop Name")).toBe("name");
    // sample 3
    expect(kind("owner / contact")).toBe("name");
    // sample 4
    expect(kind("ग्राहक का नाम")).toBe("name");
    expect(kind("पता")).toBe("address");
    expect(kind("वस्तु")).toBe("exempt");
  });
  it("recognises Aadhaar headers in several spellings", () => {
    for (const h of ["Aadhaar No", "aadhar", "Adhar Number", "UID", "आधार नंबर"]) {
      expect(classifyHeader(h)).toBe("aadhaar");
    }
  });
});

describe("maskSample", () => {
  const rows = (...r: (string | number | null)[][]) => r.map((cells) => ({ cells }));

  it("sends the header row plus at most 20 data rows", () => {
    const many = Array.from({ length: 50 }, (_, i) => [`Name ${i}`]);
    const masked = maskSample({ headers: ["x"], rows: rows(...many) });
    expect(masked.rows).toHaveLength(MAX_SAMPLE_ROWS);
    expect(masked.headers).toEqual(["x"]);
  });

  it("drops an Aadhaar column found by header, but keeps the header", () => {
    const masked = maskSample({
      headers: ["Name", "Aadhaar No"],
      rows: rows(["Ramesh Kumar", "x-not-a-number"]),
    });
    expect(masked.headers).toEqual(["Name", "Aadhaar No"]);
    expect(masked.rows[0]?.[1]).toBe("");
  });

  it("drops a column by value shape when its header does not say Aadhaar", () => {
    for (const value of ["234567890123", "2345 6789 0123", "2345-6789-0123", 234567890123]) {
      const masked = maskSample({
        headers: ["Name", "Column 2"],
        rows: rows(["Ramesh", "hello"], ["Suresh", value]),
      });
      expect(masked.kinds[1]).toBe("aadhaar");
      expect(masked.rows.map((r) => r[1])).toEqual(["", ""]);
    }
  });

  it("removes a stray 12-digit run from another cell", () => {
    const masked = maskSample({ headers: ["remarks"], rows: rows(["aadhaar 234567890123 seen"]) });
    expect(JSON.stringify(masked)).not.toContain("234567890123");
  });

  it("reduces mobiles to their shape in any column", () => {
    const masked = maskSample({ headers: ["Phone"], rows: rows(["9876543210"], [9876543210]) });
    expect(masked.rows).toEqual([["98XXXXXX10"], ["98XXXXXX10"]]);
  });

  it("masks name columns by header, Latin and Devanagari", () => {
    const masked = maskSample({
      headers: ["Customer Name", "ग्राहक का नाम"],
      rows: rows(["Ramesh Kumar", "रमेश कुमार"]),
    });
    expect(masked.rows[0]).toEqual(["R***** K****", "र*** क****"]);
  });

  it("masks address columns, Latin and Devanagari, and no raw address survives", () => {
    const masked = maskSample({
      headers: ["Address", "पता"],
      rows: rows(["Plot 12, Gandhi Nagar", "मकान २४, गांधी नगर"]),
    });
    expect(masked.rows[0]).toEqual(["P*** XX, G***** N****", "म*** XX, ग**** न**"]);
    const text = JSON.stringify(masked);
    for (const raw of ["Gandhi", "Plot 12", "गांधी", "मकान", "२४"]) expect(text).not.toContain(raw);
  });

  it("masks an unlabelled column that looks like people's names (>= 5 distinct)", () => {
    const names = ["Ramesh Kumar", "Suresh Jain", "Mahesh Patel", "Dinesh Shah", "Naresh Mehta"];
    const masked = maskSample({ headers: ["Column 3"], rows: rows(...names.map((n) => [n])) });
    expect(masked.rows.map((r) => r[0])).toEqual(["R***** K****", "S***** J***", "M***** P****", "D***** S***", "N***** M****"]);
  });

  it("does not mask a small categorical unlabelled column, nor an item-name column", () => {
    const few = maskSample({ headers: ["Column 3"], rows: rows(["Gold"], ["Silver"], ["Gold"]) });
    expect(few.rows.map((r) => r[0])).toEqual(["Gold", "Silver", "Gold"]);

    const items = ["Ring", "Chain", "Bangles", "Necklace", "Anklet", "Pendant"];
    const kept = maskSample({ headers: ["itemname"], rows: rows(...items.map((i) => [i])) });
    expect(kept.rows.map((r) => r[0])).toEqual(items);
  });

  it("does not treat numbers, dates or mixed text as names", () => {
    const masked = maskSample({
      headers: ["Column 3"],
      rows: rows(["2026-01-05"], ["5000"], ["वज़न २ ग्राम"], ["10 gm"], ["3 gm"], ["a b 1"]),
    });
    expect(masked.rows.map((r) => r[0])).toEqual(["2026-01-05", "5000", "वज़न २ ग्राम", "10 gm", "3 gm", "a b 1"]);
  });

  it("truncates very long cells", () => {
    const masked = maskSample({ headers: ["x"], rows: rows(["a".repeat(1000)]) });
    expect(masked.rows[0]?.[0]).toHaveLength(200);
  });
});

describe("masking the four real sample files", () => {
  const SAMPLES = path.resolve(__dirname, "../../../samples");
  const files = [
    "1_php_ledger_export.csv",
    "2_jeweller_contacts_masked.xlsx",
    "3_jeweller_contacts_dirty.csv",
    "4_messy_ledger_hindi.xlsx",
  ];

  for (const file of files) {
    it(`${file}: name and address cells never reach the prompt`, async () => {
      const buffer = readFileSync(path.join(SAMPLES, file));
      const listed = await listSheets(buffer, file);
      const sheet = await readSheet(buffer, file, listed.sheets[0]?.name);
      const headerIndex = findHeaderRow(sheet.rows);
      if (headerIndex === null) throw new Error("no header");
      const parsed = extractTable(sheet.rows, headerIndex);
      const masked = maskSample(parsed);
      const prompt = JSON.stringify(buildMessages(masked));

      const sensitive = parsed.headers
        .map((h, c) => ({ kind: classifyHeader(h), c }))
        .filter(({ kind }) => kind === "name" || kind === "address");
      expect(sensitive.length).toBeGreaterThan(0);
      for (const { c } of sensitive) {
        for (const row of parsed.rows.slice(0, MAX_SAMPLE_ROWS)) {
          const raw = row.cells[c];
          // Compare whole words (3+ letters) so short fragments cannot false-positive.
          for (const word of String(raw ?? "").split(/[\s,]+/).filter((w) => /^[\p{L}\p{M}]{3,}$/u.test(w))) {
            expect(prompt).not.toContain(word);
          }
        }
      }
    });
  }
});
