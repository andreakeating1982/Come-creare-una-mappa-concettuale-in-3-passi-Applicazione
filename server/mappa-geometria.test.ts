import { describe, expect, it } from "vitest";
import { dimensioniNodo, dividiInRighe, posizioneLegame, posizioniCerchio, spostamentoLegameVisibile } from "../client/src/components/ConceptMapCanvas";

describe("Geometria della mappa", () => {
  it("distribuisce due rami in diagonale su entrambi gli assi", () => {
    const [a, b] = posizioniCerchio(2, 68);
    expect(a.x).toBeGreaterThan(50);
    expect(a.y).toBeLessThan(50);
    expect(b.x).toBeLessThan(50);
    expect(b.y).toBeGreaterThan(50);
  });
  it("manda a capo i testi lunghi senza perdere parole", () => {
    const testo = "GLI STATI DELLA MATERIA E LE TRASFORMAZIONI";
    const righe = dividiInRighe(testo, 13);
    // Le parole più lunghe della riga possono essere spezzate: nessuna lettera va persa.
    expect(righe.join("").replace(/\s/g, "")).toBe(testo.replace(/\s/g, ""));
    expect(righe.every(riga => riga.length <= 13)).toBe(true);
  });

  it("spezza anche una singola parola molto lunga", () => {
    const testo = "PRECIPITEVOLISSIMEVOLMENTE";
    const righe = dividiInRighe(testo, 10);
    expect(righe.join("")).toBe(testo);
    expect(righe.every(riga => riga.length <= 10)).toBe(true);
  });

  it("aumenta l'altezza del nodo quando il testo va a capo", () => {
    const breve = dimensioniNodo("TRONCO", 4, 8, 5, 10, 12);
    const lungo = dimensioniNodo("TRONCO CON UN TESTO PIÙ LUNGO", 4, 8, 5, 10, 12);
    expect(lungo.altezza).toBeGreaterThan(breve.altezza);
    expect(lungo.righe.length).toBeGreaterThan(1);
  });

  it("colloca un legame orizzontale senza coprire i due nodi", () => {
    const a = { x: 50, y: 50 }, b = { x: 118, y: 50 };
    const da = { larghezza: 72, altezza: 20 }, db = { larghezza: 54, altezza: 17 };
    const w = 28, h = 8;
    const p = posizioneLegame(a, b, da, db, w, h);
    const collide = (n: typeof a, d: typeof da) => Math.abs(p.x - n.x) < (w + d.larghezza) / 2 + 1 && Math.abs(p.y - n.y) < (h + d.altezza) / 2 + 1;
    expect(collide(a, da)).toBe(false);
    expect(collide(b, db)).toBe(false);
  });

  it("sposta subito il legame verso l'interno quando l'offset supera il bordo", () => {
    const ancora = { x: 160, y: -60 };
    const fuori = { x: 30, y: -20 };
    const corretto = spostamentoLegameVisibile(ancora, fuori, { x: -2, y: 5 });
    expect(ancora.x + corretto.x).toBe(168);
    expect(ancora.y + corretto.y).toBe(-65);
  });

  it("non produce coordinate non finite per nodi sovrapposti", () => {
    const p = posizioneLegame({ x: 50, y: 50 }, { x: 50, y: 50 }, { larghezza: 30, altezza: 12 }, { larghezza: 30, altezza: 12 }, 12, 6);
    expect(Number.isFinite(p.x)).toBe(true);
    expect(Number.isFinite(p.y)).toBe(true);
  });
});

