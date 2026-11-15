import { describe, expect, it } from "vitest";
import { parseDate, parseNumber, parseRows, parseType } from "./import";

describe("import parsing", () => {
  it("reads French numbers", () => {
    expect(parseNumber("1 234,50")).toBe(1234.5);
    expect(parseNumber("50 500 FCFA")).toBe(50500);
    expect(parseNumber("1.234,5")).toBe(1234.5);
  });
  it("reads dd/mm/yyyy dates and rejects impossible ones", () => {
    expect(parseDate("10/07/2026")).toBe("2026-07-10");
    expect(parseDate("31/02/2026")).toBeNull();
  });
  it("maps SGI wording to transaction types", () => {
    expect(parseType("Achat")).toBe("acquisition");
    expect(parseType("Vente")).toBe("cession");
    expect(parseType("Versement")).toBe("depot");
  });
  it("flags unknown tickers", () => {
    const { rows } = parseRows([["Date", "Type", "Titre", "Quantité", "Prix", "Frais"], ["10/07/2026", "Achat", "XXXX", "10", "50500", "505"]], new Set(["UNLC"]));
    expect(rows[0]!.errors).toContain("Titre XXXX inconnu");
  });
});
