/** Bersagli touch della mappa finale: coordinate nel viewBox SVG. */
export type TipoElementoMappa = 'ramo' | 'parola' | 'immagine' | 'legame';
export type AreaTouch = {
  tipo: TipoElementoMappa;
  id: string;
  ramoId: string;
  x: number;
  y: number;
  larghezza: number;
  altezza: number;
  margine?: number;
  ancora?: { x: number; y: number };
};

export const VIEWBOX_COMPLETO_INIZIO = -105;
export const VIEWBOX_COMPLETO_LATO = 310;
export const AREA_TOUCH_MINIMA = 44;

type RettangoloSchermo = { left: number; top: number; width: number; height: number };

/**
 * Quando i bersagli facilitati si sovrappongono, dà priorità al riquadro
 * visibile più vicino al dito. A parità di distanza vince l'ultimo disegnato,
 * come nell'SVG. Il resto della superficie rimane disponibile allo scroll.
 */
export function selezionaAreaTouch(
  aree: readonly AreaTouch[],
  punto: { x: number; y: number },
  rect: RettangoloSchermo,
): AreaTouch | undefined {
  if (rect.width <= 0 || rect.height <= 0) return undefined;
  const scalaX = rect.width / VIEWBOX_COMPLETO_LATO;
  const scalaY = rect.height / VIEWBOX_COMPLETO_LATO;
  let scelta: AreaTouch | undefined;
  let distanzaMinima = Infinity;
  for (const area of aree) {
    const centroX = rect.left + (area.x - VIEWBOX_COMPLETO_INIZIO) * scalaX;
    const centroY = rect.top + (area.y - VIEWBOX_COMPLETO_INIZIO) * scalaY;
    const larghezza = area.larghezza * scalaX;
    const altezza = area.altezza * scalaY;
    const dx = Math.abs(punto.x - centroX);
    const dy = Math.abs(punto.y - centroY);
    if (dx > Math.max(AREA_TOUCH_MINIMA, larghezza + (area.margine || 0)) / 2 ||
        dy > Math.max(AREA_TOUCH_MINIMA, altezza + (area.margine || 0)) / 2) continue;
    const distanza = Math.hypot(Math.max(0, dx - larghezza / 2), Math.max(0, dy - altezza / 2));
    if (distanza <= distanzaMinima) {
      scelta = area;
      distanzaMinima = distanza;
    }
  }
  return scelta;
}

