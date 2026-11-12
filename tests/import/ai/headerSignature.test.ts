import { describe, expect, it } from "vitest";
import { headerSignature } from "../../../lib/import/ai/headerSignature";

describe("headerSignature", () => {
  const base = ["Customer Name", "Pledge Date", "Amount"];

  it("is a stable sha-256 hex string", () => {
    expect(headerSignature(base)).toMatch(/^[0-9a-f]{64}$/);
    expect(headerSignature(base)).toBe(headerSignature([...base]));
  });

  it("ignores case, extra spaces, a BOM and Unicode composition", () => {
    expect(headerSignature(["﻿customer   name", " PLEDGE DATE ", "amount"])).toBe(headerSignature(base));
    expect(headerSignature(["क्रम́"])).toBe(headerSignature(["क्रम́".normalize("NFD")]));
  });

  it("ignores empty headers and 'Column N' placeholders", () => {
    expect(headerSignature([...base, "Column 4", ""])).toBe(headerSignature(base));
  });

  it("changes when columns are reordered, renamed or added", () => {
    const sig = headerSignature(base);
    expect(headerSignature([base[1]!, base[0]!, base[2]!])).not.toBe(sig);
    expect(headerSignature(["Customer", "Pledge Date", "Amount"])).not.toBe(sig);
    expect(headerSignature([...base, "Item"])).not.toBe(sig);
  });

  it("cannot be confused by a header containing the separator", () => {
    expect(headerSignature(["a\u0001b"])).not.toBe(headerSignature(["a", "b"]));
  });
});
