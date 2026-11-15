import { describe, expect, it } from "vitest";
import { computeHoldings, feeRatio, flowDirection, simulateDaily, valuate, xirr, investorFlows, type PriceMap, type Tx } from "./engine";
import { fmtFCFA, fmtPct } from "./format";

// Reference demo account from the specification (close of 13/11/2026).
const base = { quantity: 0, price: 0, fees: 0, amount: 0, tax: 0, securityId: null };
const txs: Tx[] = [
  { ...base, id: "1", type: "depot", date: "2026-07-10", amount: 1_000_000 },
  { ...base, id: "2", type: "depot", date: "2026-07-10", amount: 10_000 },
  { ...base, id: "3", type: "acquisition", date: "2026-07-10", securityId: "UNLC", quantity: 10, price: 50_500, fees: 505 },
  { ...base, id: "4", type: "acquisition", date: "2026-07-10", securityId: "PALC", quantity: 11, price: 8_000, fees: 448 },
];
const prices: PriceMap = new Map([
  ["UNLC", [{ date: "2026-07-10", close: 50_500 }, { date: "2026-11-13", close: 46_500 }]],
  ["PALC", [{ date: "2026-07-10", close: 8_000 }, { date: "2026-11-13", close: 6_950 }]],
]);

describe("reference case (spec §6)", () => {
  const h = computeHoldings(txs, "2026-11-13");
  const v = valuate(h, prices, "2026-11-13");

  it("net contributions = 1 010 000 FCFA", () => expect(v.netContributions).toBe(1_010_000));
  it("invested capital = 593 953 FCFA (fees included)", () => expect(v.investedCapital).toBe(593_953));
  it("cash = 416 047 FCFA", () => expect(v.cash).toBe(416_047));
  it("securities value = 541 450 FCFA", () => expect(v.securitiesValue).toBe(541_450));
  it("total value = 957 497 FCFA", () => expect(v.totalValue).toBe(957_497));
  it("total gain = −52 503 FCFA", () => expect(v.gain).toBe(-52_503));
  it("unrealized gain = −52 503 FCFA", () => expect(v.unrealized).toBe(-52_503));
  it("UNLC unit cost = 50 551 FCFA", () => {
    const unlc = v.positions.find((p) => p.securityId === "UNLC")!;
    expect(Math.round(unlc.unitCost)).toBe(50_551);
  });
  it("cumulated fees = 953 FCFA", () => expect(v.fees).toBe(953));
});

describe("transaction rules", () => {
  it("fee shown as % of the operation: 505 on 50 500 × 10 = 0,10 %", () => {
    expect(fmtPct(feeRatio({ quantity: 10, price: 50_500, fees: 505 }))).toBe("0,10\u202F%");
  });
  it("a purchase is a cash outflow, a deposit an inflow", () => {
    expect(flowDirection(txs[2]!)).toBe("Sortie");
    expect(flowDirection(txs[0]!)).toBe("Entrée");
  });
  it("selling realizes gain against the average cost", () => {
    const sell: Tx = { ...base, id: "5", type: "cession", date: "2026-08-01", securityId: "UNLC", quantity: 5, price: 52_000, fees: 260 };
    const h = computeHoldings([...txs, sell], "2026-11-13");
    // cost basis of 5 shares = 505 505 / 2 = 252 753 (rounded); proceeds 259 740
    expect(h.realized).toBe(259_740 - 252_753);
    expect(h.positions.get("UNLC")!.quantity).toBe(5);
  });
  it("dividends are counted net of IRVM", () => {
    const div: Tx = { ...base, id: "6", type: "dividende", date: "2026-08-15", securityId: "PALC", amount: 5_000, tax: 500 };
    const h = computeHoldings([...txs, div], "2026-11-13");
    expect(h.dividendsNet).toBe(4_500);
    expect(h.cash).toBe(416_047 + 4_500);
  });
});

describe("base-100 index neutralises deposits", () => {
  it("a deposit alone does not move the index", () => {
    const cal = ["2026-07-10", "2026-07-13", "2026-07-14"];
    const t: Tx[] = [
      { ...base, id: "a", type: "depot", date: "2026-07-10", amount: 100_000 },
      { ...base, id: "b", type: "depot", date: "2026-07-13", amount: 50_000 },
    ];
    const d = simulateDaily(t, cal, new Map(), true);
    expect(d.map((p) => Math.round(p.index * 100) / 100)).toEqual([100, 100, 100]);
  });
  it("index tracks the security when fully invested", () => {
    const cal = ["2026-07-10", "2026-07-13"];
    const pm: PriceMap = new Map([["X", [{ date: "2026-07-10", close: 1000 }, { date: "2026-07-13", close: 1100 }]]]);
    const t: Tx[] = [
      { ...base, id: "a", type: "depot", date: "2026-07-10", amount: 10_000 },
      { ...base, id: "b", type: "acquisition", date: "2026-07-10", securityId: "X", quantity: 10, price: 1000 },
    ];
    const d = simulateDaily(t, cal, pm, true);
    expect(d[1]!.index).toBeCloseTo(110, 6);
  });
});

describe("annualised return", () => {
  it("one year, +10 % → 10 %", () => {
    const r = xirr([{ date: "2025-01-01", amount: -100_000 }, { date: "2026-01-01", amount: 110_000 }]);
    expect(r).toBeCloseTo(0.1, 4);
  });
  it("reference case is negative", () => {
    const r = xirr(investorFlows(txs, "2026-11-13", 957_497));
    expect(r).toBeLessThan(0);
  });
});

describe("number format", () => {
  it("uses a no-break thousands separator and typographic minus", () => {
    expect(fmtFCFA(-52_503)).toBe("\u221252\u202F503\u202FFCFA");
    expect(fmtFCFA(3220)).toBe("3\u202F220\u202FFCFA");
  });
});
