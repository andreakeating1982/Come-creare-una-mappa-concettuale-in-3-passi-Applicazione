import { describe, expect, it } from 'vitest';
import { selezionaAreaTouch, type AreaTouch } from '../client/src/lib/mappaTouch';

const rect = { left: 10, top: 20, width: 310, height: 310 };
const sulloSchermo = (x: number, y: number) => ({ x: rect.left + x + 105, y: rect.top + y + 105 });
const legame: AreaTouch = { tipo: 'legame', id: 'l', ramoId: '', x: 65, y: 50, larghezza: 12, altezza: 6, margine: 38 };
const ramo: AreaTouch = { tipo: 'ramo', id: 'r', ramoId: 'r', x: 80, y: 50, larghezza: 20, altezza: 15 };
const foglia: AreaTouch = { tipo: 'parola', id: 'p', ramoId: 'r', x: -30, y: -30, larghezza: 10, altezza: 8 };

// Ordine di disegno: il ramo è sopra la parola-legame.
const aree = [legame, foglia, ramo];

describe('bersagli touch della mappa', () => {
  it('seleziona la parola-legame visibile anche se il bersaglio del ramo la copre', () => {
    expect(selezionaAreaTouch(aree, sulloSchermo(65, 50), rect)?.id).toBe('l');
  });

  it('seleziona il ramo visibile anche se il bersaglio della parola-legame lo copre', () => {
    expect(selezionaAreaTouch(aree, sulloSchermo(80, 50), rect)?.id).toBe('r');
  });

  it('facilita il tocco vicino a una piccola foglia', () => {
    expect(selezionaAreaTouch(aree, sulloSchermo(-15, -30), rect)?.id).toBe('p');
  });

  it('sceglie il rettangolo visibile più vicino se i bersagli facilitati si sovrappongono', () => {
    expect(selezionaAreaTouch(aree, sulloSchermo(60, 62), rect)?.id).toBe('l');
  });

  it('lascia libera l’area vuota per lo scorrimento', () => {
    expect(selezionaAreaTouch(aree, sulloSchermo(-90, 100), rect)).toBeUndefined();
  });

  it('in caso di sovrapposizione visibile conserva l’ordine di disegno', () => {
    const sopra: AreaTouch = { ...ramo, id: 'sopra', x: legame.x, y: legame.y };
    expect(selezionaAreaTouch([legame, sopra], sulloSchermo(legame.x, legame.y), rect)?.id).toBe('sopra');
  });

  it('tiene conto delle dimensioni e della posizione della mappa ingrandita', () => {
    const grande = { left: -60, top: 120, width: 620, height: 620 };
    const punto = { x: grande.left + (legame.x + 105) * 2, y: grande.top + (legame.y + 105) * 2 };
    expect(selezionaAreaTouch(aree, punto, grande)?.id).toBe('l');
  });

  it('non seleziona elementi se il canvas non ha dimensioni misurabili', () => {
    expect(selezionaAreaTouch(aree, sulloSchermo(65, 50), { ...rect, width: 0 })).toBeUndefined();
  });
});

