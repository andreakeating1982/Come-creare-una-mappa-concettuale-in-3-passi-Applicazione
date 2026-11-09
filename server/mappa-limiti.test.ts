import { describe, expect, it } from "vitest";
import { contaParoleLegame, MAX_RAMI, MAX_FOGLIE_PER_RAMO, MAX_PAROLE_LEGAME, type Ramo } from "../client/src/lib/tipi-mappa";

const rami: Ramo[] = [
  { id: "r1", titolo: "PRIMO", colore: "#ffffff", parolaLegame: "comprende", parole: [
    { id: "p1", testo: "UNO", hashtag: "", parolaLegame: "contiene" },
    { id: "p2", testo: "DUE", hashtag: "", parolaLegame: "   " },
  ] },
  { id: "r2", titolo: "SECONDO", colore: "#000000", parole: [
    { id: "p3", testo: "TRE", hashtag: "" },
  ] },
];

describe("Limiti della mappa", () => {
  it("permette 4 rami e 3 foglie per ramo, con un legame facoltativo per linea", () => {
    expect(MAX_RAMI).toBe(4);
    expect(MAX_FOGLIE_PER_RAMO).toBe(3);
    expect(MAX_PAROLE_LEGAME).toBe(16);
    expect(MAX_PAROLE_LEGAME).toBe(MAX_RAMI * (MAX_FOGLIE_PER_RAMO + 1));
  });
  it("conta solo legami non vuoti, tra tronco e rami e tra rami e foglie", () => {
    expect(contaParoleLegame(rami)).toBe(2);
    expect(contaParoleLegame([])).toBe(0);
  });
});

