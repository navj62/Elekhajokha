// Inventory list source filter <-> ?sourceType= URL param.
import { describe, it, expect } from "vitest";
import { sourceFilterFromParam, sourceParamFromFilter, withSourceParam } from "@/lib/inventorySourceParam";

describe("sourceFilterFromParam", () => {
  it("maps the two source types", () => {
    expect(sourceFilterFromParam("PLEDGE_SALE")).toBe("pledge");
    expect(sourceFilterFromParam("DIRECT_PURCHASE")).toBe("direct");
  });

  it("anything else is no filter", () => {
    for (const v of [null, undefined, "", "pledge", "pledge_sale", "ALL", "SOLD", " PLEDGE_SALE"]) {
      expect(sourceFilterFromParam(v)).toBe("all");
    }
  });
});

describe("sourceParamFromFilter", () => {
  it("round-trips, and 'all' leaves the param out", () => {
    expect(sourceFilterFromParam(sourceParamFromFilter("pledge"))).toBe("pledge");
    expect(sourceFilterFromParam(sourceParamFromFilter("direct"))).toBe("direct");
    expect(sourceParamFromFilter("all")).toBeNull();
  });
});

describe("withSourceParam", () => {
  it("sets, replaces and removes sourceType, keeping other params", () => {
    expect(withSourceParam("", "pledge")).toBe("?sourceType=PLEDGE_SALE");
    expect(withSourceParam("?sourceType=PLEDGE_SALE", "direct")).toBe("?sourceType=DIRECT_PURCHASE");
    expect(withSourceParam("?sourceType=PLEDGE_SALE", "all")).toBe("");
    expect(withSourceParam("?x=1&sourceType=bogus", "all")).toBe("?x=1");
    expect(withSourceParam("?x=1", "pledge")).toBe("?x=1&sourceType=PLEDGE_SALE");
  });
});
