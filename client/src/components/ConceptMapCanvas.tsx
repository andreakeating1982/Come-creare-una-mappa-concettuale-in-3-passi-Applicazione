import { useMemo, useRef, useState, useCallback, useEffect } from "react";
import type { Ramo, ImmagineMappa } from "@/lib/tipi-mappa";
import { AREA_TOUCH_MINIMA, VIEWBOX_COMPLETO_INIZIO, VIEWBOX_COMPLETO_LATO, selezionaAreaTouch } from "@/lib/mappaTouch";
import type { AreaTouch, TipoElementoMappa } from "@/lib/mappaTouch";

type Punto = { x: number; y: number };
type Posizioni = Record<string, Punto>;

interface Props {
  titolo: string;
  rami: Ramo[];
  immagini?: ImmagineMappa[];
  onImmaginiPosizioni?: (posizioni: Punto[]) => void;
  onPosizioniMappa?: (rami: Posizioni, parole: Posizioni) => void;
  onPosizioniLegami?: (posizioni: Posizioni) => void;
  studente?: { nome: string; cognome: string; data: string; classe: string };
  coloreTitolo?: string;
  mini?: boolean;
  fullSize?: boolean;
  zoom?: number;
}

/* ── Helpers geometrici ───────────────────────────────── */

export function posizioniCerchio(totale: number, raggio: number): { x: number; y: number; angolo: number }[] {
  if (totale === 0) return [];
  const cx = 50, cy = 50;
  return Array.from({ length: totale }, (_, i) => {
    // Con due rami sfrutta entrambe le dimensioni del foglio e lascia più
    // spazio alle parole-legame lungo le linee, anziché formare una colonna.
    const angolo = (i / totale) * 2 * Math.PI - (totale === 2 ? Math.PI / 4 : Math.PI / 2);
    return { x: cx + raggio * Math.cos(angolo), y: cy + raggio * Math.sin(angolo), angolo };
  });
}

function posizioniFoglie(
  num: number, angoloBase: number, distanza: number, spread: number,
): { x: number; y: number; angolo: number }[] {
  if (num === 0) return [];
  return Array.from({ length: num }, (_, j) => {
    const start = angoloBase - spread / 2;
    const a = num === 1 ? angoloBase : start + (j / (num - 1)) * spread;
    return { x: 50 + distanza * Math.cos(a), y: 50 + distanza * Math.sin(a), angolo: a };
  });
}

function tw(testo: string, fs: number): number {
  return testo.length * fs * 0.72;
}

/** Mantiene i testi lunghi dentro riquadri leggibili senza troncarli. */
export function dividiInRighe(testo: string, massimo: number): string[] {
  const parole = testo.trim().split(/\s+/).flatMap(parola => {
    if (parola.length <= massimo) return [parola];
    return parola.match(new RegExp(`.{1,${massimo}}`, "g")) || [parola];
  });
  const righe: string[] = [];
  for (const parola of parole) {
    const ultima = righe[righe.length - 1];
    if (ultima && `${ultima} ${parola}`.length <= massimo) righe[righe.length - 1] = `${ultima} ${parola}`;
    else righe.push(parola);
  }
  return righe.length ? righe : [""];
}

export function dimensioniNodo(testo: string, fs: number, padH: number, padV: number, minimo: number, massimoCaratteri?: number) {
  const righe = massimoCaratteri ? dividiInRighe(testo, massimoCaratteri) : [testo];
  return {
    righe,
    larghezza: Math.max(minimo, ...righe.map(riga => tw(riga, fs) + 2 * padH)),
    altezza: fs + 2 * padV + Math.max(0, righe.length - 1) * fs * 1.18,
  };
}

/** Testo fra i bordi dei nodi: se lo spazio è stretto lo sposta di poco
 *  a lato della linea, evitando di coprire i riquadri collegati. */
export function posizioneLegame(a: Punto, b: Punto, dimA: { larghezza: number; altezza: number }, dimB: { larghezza: number; altezza: number }, larghezza: number, altezza: number) {
  const dx = b.x - a.x, dy = b.y - a.y;
  const distanza = Math.hypot(dx, dy) || 1;
  const bordo = (dim: { larghezza: number; altezza: number }) => Math.min(
    dx === 0 ? Infinity : dim.larghezza / 2 / Math.abs(dx),
    dy === 0 ? Infinity : dim.altezza / 2 / Math.abs(dy),
  );
  const uscita = Math.min(0.5, bordo(dimA));
  const entrata = Math.max(0.5, 1 - bordo(dimB));
  const t = (uscita + entrata) / 2;
  const centro = { x: a.x + dx * t, y: a.y + dy * t };
  const collide = (p: Punto, n: Punto, dim: { larghezza: number; altezza: number }) =>
    Math.abs(p.x - n.x) < (larghezza + dim.larghezza) / 2 + 1 &&
    Math.abs(p.y - n.y) < (altezza + dim.altezza) / 2 + 1;
  for (const scarto of [0, -7, 7, -13, 13, -20, 20, -26, 26, -32, 32]) {
    const p = { x: centro.x - dy / distanza * scarto, y: centro.y + dx / distanza * scarto };
    if (!collide(p, a, dimA) && !collide(p, b, dimB)) return { ...p, centro };
  }
  return { ...centro, centro };
}

/** Parte dal punto effettivamente visibile anche se un nodo si è spostato
 *  dopo il salvataggio dell'offset: nessuna zona morta vicino ai bordi. */
export function spostamentoLegameVisibile(ancora: Punto, offset: Punto, delta: Punto, min = -70, max = 170): Punto {
  const limita = (valore: number) => Math.max(min, Math.min(max, valore));
  return {
    x: limita(limita(ancora.x + offset.x) + delta.x) - ancora.x,
    y: limita(limita(ancora.y + offset.y) + delta.y) - ancora.y,
  };
}

function clientToSvg(svg: SVGSVGElement, cx: number, cy: number): { x: number; y: number } {
  const pt = svg.createSVGPoint();
  pt.x = cx; pt.y = cy;
  const ctm = svg.getScreenCTM();
  if (!ctm) return { x: cx, y: cy };
  const r = pt.matrixTransform(ctm.inverse());
  return { x: r.x, y: r.y };
}

/* ── Layout predefinito ──────────────────────────────── */

function buildDefaultLayout(
  rami: Ramo[], totale: number,
  raggioRami: number, distFoglie: number,
  gapTraKw: number, spreadCap: number,
  fFoglia: number, kwMinW: number, padKwH: number,
): { rami: Record<string, { x: number; y: number }>; parole: Record<string, { x: number; y: number }> } {
  const posR = posizioniCerchio(totale, raggioRami);
  const rpos: Record<string, { x: number; y: number }> = {};
  const ppos: Record<string, { x: number; y: number }> = {};

  rami.forEach((ramo, i) => {
    const pr = posR[i];
    if (!pr) return;
    rpos[ramo.id] = { x: pr.x, y: pr.y };
    const n = ramo.parole.length;
    if (n === 0) return;
    const larghezze = ramo.parole.map(p => Math.max(kwMinW, tw(p.testo, fFoglia) + 2 * padKwH));
    const somma = larghezze.reduce((a, b) => a + b, 0);
    const spread = Math.min(spreadCap, Math.max(0.55, (somma + (n - 1) * gapTraKw) / distFoglie));
    const foglie = posizioniFoglie(n, pr.angolo, distFoglie, spread);
    ramo.parole.forEach((p, j) => {
      const f = foglie[j];
      if (f) ppos[p.id] = { x: f.x, y: f.y };
    });
  });

  return { rami: rpos, parole: ppos };
}

/* ── Componente ─────────────────────────────────────── */

export default function ConceptMapCanvas({ titolo, rami, immagini, onImmaginiPosizioni, onPosizioniMappa, onPosizioniLegami, studente, coloreTitolo, mini, fullSize, zoom = 1 }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);

  // Anche un ramo senza foglie deve rimanere visibile nella mappa finale.
  const ramiAttivi = rami;
  const totale = ramiAttivi.length || Math.max(rami.length, 1);

  /* Parametri di layout */
  const raggioRami = mini ? 21 : fullSize ? 68 : 26;
  const distFoglie = mini ? 38 : fullSize ? 125 : 52;
  const spreadCap  = 1.5;
  const gapTraKw   = 4.0;

  /* Font */
  const fCentro = mini ? 3.0 : fullSize ? 4.9 : 3.0;
  const fRamo   = mini ? 2.5 : fullSize ? 4.3 : 2.6;
  const fFoglia = mini ? 2.0 : fullSize ? 3.8 : 2.1;

  /* Padding */
  // padding per-lato: la formula largh = tw + 2*padXxx
  const padCentroH = 10;
  const padCentroV = fCentro * 1.6;
  const padRamoH   = 8;
  const padRamoV   = fRamo * 1.4;
  const padKwH     = 7;
  const padKwV     = fFoglia * 1.6;

  const kwMinW    = mini ? 12 : fullSize ? 14 : 13;
  const canvasPx  = fullSize ? 1080 * zoom : mini ? 260 : 440;
  const dimCentro = dimensioniNodo(titolo, fCentro, padCentroH, padCentroV, mini ? 20 : fullSize ? 28 : 24, fullSize ? 16 : undefined);
  const dimRamo = (ramo: Ramo) => dimensioniNodo(ramo.titolo, fRamo, padRamoH, padRamoV, mini ? 15 : fullSize ? 22 : 18, fullSize ? 13 : undefined);
  const dimParola = (testo: string) => dimensioniNodo(testo, fFoglia, padKwH, padKwV, kwMinW, fullSize ? 13 : undefined);

  /* Layout predefinito */
  const defaultLayout = useMemo(
    () => buildDefaultLayout(ramiAttivi, totale, raggioRami, distFoglie, gapTraKw, spreadCap, fFoglia, kwMinW, padKwH),
    [ramiAttivi, totale, raggioRami, distFoglie, gapTraKw, spreadCap, fFoglia, kwMinW, padKwH],
  );

  /* ── Sistema di drag senza interferenze React ── */

  // Tutte le posizioni sono in ref: MAI toccate da setState durante il drag
  const posRami     = useRef<Record<string, { x: number; y: number }>>({});
  const posParole   = useRef<Record<string, { x: number; y: number }>>({});
  // Offset dalla posizione automatica: il legame continua a seguire i suoi nodi.
  const posLegami   = useRef<Posizioni>({});
  const posImmagini = useRef<{ x: number; y: number }[]>([]);
  const onImmaginiPosizioniRef = useRef(onImmaginiPosizioni);
  onImmaginiPosizioniRef.current = onImmaginiPosizioni;
  const onPosizioniMappaRef = useRef(onPosizioniMappa);
  onPosizioniMappaRef.current = onPosizioniMappa;
  const onPosizioniLegamiRef = useRef(onPosizioniLegami);
  onPosizioniLegamiRef.current = onPosizioniLegami;

  // Conserva le posizioni salvate o già trascinate quando cambia il contenuto.
  // Le anteprime mini usano sempre il loro layout compatto.
  const prevLayoutKey = useRef('');
  const layoutKey = ramiAttivi.map(r => r.id + '|' + r.parole.map(p => p.id).join(',')).join('::');
  if (layoutKey !== prevLayoutKey.current) {
    prevLayoutKey.current = layoutKey;
    const prossimiRami: Posizioni = {};
    const prossimeParole: Posizioni = {};
    const prossimiLegami: Posizioni = {};
    const conservaLegame = (chiave: string, salvata?: Punto) => {
      const posizione = salvata || posLegami.current[chiave];
      if (!mini && posizione && Number.isFinite(posizione.x) && Number.isFinite(posizione.y)) {
        prossimiLegami[chiave] = { x: posizione.x, y: posizione.y };
      }
    };
    ramiAttivi.forEach(ramo => {
      const salvata = !mini && typeof ramo.x === 'number' && typeof ramo.y === 'number' ? { x: ramo.x, y: ramo.y } : undefined;
      prossimiRami[ramo.id] = mini ? (defaultLayout.rami[ramo.id] || { x: 50, y: 50 }) : (salvata || posRami.current[ramo.id] || defaultLayout.rami[ramo.id] || { x: 50, y: 50 });
      conservaLegame(`tronco-${ramo.id}`, ramo.spostamentoLegame);
      ramo.parole.forEach(parola => {
        const salvataParola = !mini && typeof parola.x === 'number' && typeof parola.y === 'number' ? { x: parola.x, y: parola.y } : undefined;
        prossimeParole[parola.id] = mini ? (defaultLayout.parole[parola.id] || { x: 50, y: 50 }) : (salvataParola || posParole.current[parola.id] || defaultLayout.parole[parola.id] || { x: 50, y: 50 });
        conservaLegame(`foglia-${parola.id}`, parola.spostamentoLegame);
      });
    });
    posRami.current = prossimiRami;
    posParole.current = prossimeParole;
    posLegami.current = prossimiLegami;
  }

  // Inizializza posImmagini dalle prop quando cambiano
  const prevImgKey = useRef('');
  const imgKey = immagini?.map(img => img.dataUrl.substring(0, 50)).join('|') || '';
  if (imgKey !== prevImgKey.current) {
    prevImgKey.current = imgKey;
    if (immagini) posImmagini.current = immagini.map(img => ({ x: img.x, y: img.y }));
  }

  // L'unico state: un contatore per forzare il refresh visivo durante il drag
  const [tick, setTick] = useState(0);

  // Drag state (tutto in ref, zero render triggerati dal movimento)
  const drag = useRef({
    on: false,
    type: '' as 'ramo' | 'parola' | 'immagine' | 'legame' | '',
    id: '',
    ramoId: '',
    sx: 0, sy: 0,           // punto di partenza del puntatore (coordinate SVG)
    ox: 0, oy: 0,           // posizione originale dell'elemento
    anchorX: 0, anchorY: 0, // posizione automatica della parola-legame
    dx: 0, dy: 0,           // offset corrente
    paroleOff: [] as { id: string; dx: number; dy: number }[],
    raf: 0 as number,       // requestAnimationFrame id
    pointerId: 0,
  });

  // Valore visualizzato: posizione base + offset (se in drag)
  const ramoX = (id: string) => posRami.current[id]?.x ?? 50;
  const ramoY = (id: string) => posRami.current[id]?.y ?? 50;
  const parolaX = (id: string) => posParole.current[id]?.x ?? 50;
  const parolaY = (id: string) => posParole.current[id]?.y ?? 50;

  const imgX = (idx: number) => posImmagini.current[idx]?.x ?? 50;
  const imgY = (idx: number) => posImmagini.current[idx]?.y ?? 50;

  const isDragging = (type: string, id: string) =>
    drag.current.on && drag.current.type === type && drag.current.id === id;

  // Offset visivo durante il drag
  const dragDx = (type: string, id: string) => isDragging(type, id) ? drag.current.dx : 0;
  const dragDy = (type: string, id: string) => isDragging(type, id) ? drag.current.dy : 0;

  /* ── Handler pointer ── */

  const onPointerDown = useCallback((e: React.PointerEvent, type: TipoElementoMappa, id: string, ramoId: string, ancora?: Punto) => {
    // Un secondo dito non deve interrompere o sostituire il drag in corso.
    if (drag.current.on || (e.pointerType === 'mouse' && e.button !== 0)) return;
    e.preventDefault();
    e.stopPropagation();
    const svg = svgRef.current;
    if (!svg) return;
    svg.setPointerCapture(e.pointerId);
    const pt = clientToSvg(svg, e.clientX, e.clientY);
    let ox: number, oy: number;
    if (type === 'immagine') {
      const idx = parseInt(id);
      ox = posImmagini.current[idx]?.x ?? 50;
      oy = posImmagini.current[idx]?.y ?? 50;
    } else if (type === 'legame') {
      const visibile = spostamentoLegameVisibile(ancora || { x: 0, y: 0 }, posLegami.current[id] || { x: 0, y: 0 }, { x: 0, y: 0 });
      ox = visibile.x;
      oy = visibile.y;
    } else {
      ox = type === 'ramo' ? ramoX(id) : parolaX(id);
      oy = type === 'ramo' ? ramoY(id) : parolaY(id);
    }

    const paroleOff: { id: string; dx: number; dy: number }[] = [];
    if (type === 'ramo') {
      const ramo = ramiAttivi.find(r => r.id === id);
      if (ramo) {
        for (const p of ramo.parole) {
          paroleOff.push({ id: p.id, dx: parolaX(p.id) - ox, dy: parolaY(p.id) - oy });
        }
      }
    }

    drag.current = { on: true, type, id, ramoId, sx: pt.x, sy: pt.y, ox, oy, anchorX: ancora?.x ?? 0, anchorY: ancora?.y ?? 0, dx: 0, dy: 0, paroleOff, raf: 0, pointerId: e.pointerId };
  }, [ramiAttivi]);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    const d = drag.current;
    if (!d.on || e.pointerId !== d.pointerId) return;
    e.preventDefault();
    const svg = svgRef.current;
    if (!svg) return;
    const pt = clientToSvg(svg, e.clientX, e.clientY);
    d.dx = pt.x - d.sx;
    d.dy = pt.y - d.sy;

    // Throttling con requestAnimationFrame: un solo refresh per frame
    if (!d.raf) {
      d.raf = requestAnimationFrame(() => {
        d.raf = 0;
        setTick(t => t + 1);
      });
    }
  }, []);

  const endDrag = useCallback(() => {
    const d = drag.current;
    if (!d.on) return;
    d.on = false;
    if (d.raf) { cancelAnimationFrame(d.raf); d.raf = 0; }

    // Commit: scrivi la posizione finale nei ref
    const min = fullSize ? -70 : -10;
    const max = fullSize ? 170 : 110;
    const limita = (v: number) => Math.max(min, Math.min(max, v));
    const nx = limita(d.ox + d.dx);
    const ny = limita(d.oy + d.dy);

    if (d.type === 'ramo') {
      posRami.current = { ...posRami.current, [d.id]: { x: nx, y: ny } };
      for (const po of d.paroleOff) {
        const px = limita(nx + po.dx);
        const py = limita(ny + po.dy);
        posParole.current = { ...posParole.current, [po.id]: { x: px, y: py } };
      }
    } else if (d.type === 'parola') {
      posParole.current = { ...posParole.current, [d.id]: { x: nx, y: ny } };
    } else if (d.type === 'immagine') {
      const idx = parseInt(d.id);
      const nuova = [...posImmagini.current];
      nuova[idx] = { x: nx, y: ny };
      posImmagini.current = nuova;
      onImmaginiPosizioniRef.current?.(nuova.map(p => ({ ...p })));
    } else if (d.type === 'legame') {
      // I limiti si applicano al punto visibile, non all'offset relativo.
      posLegami.current = { ...posLegami.current, [d.id]: {
        x: limita(d.anchorX + d.ox + d.dx) - d.anchorX,
        y: limita(d.anchorY + d.oy + d.dy) - d.anchorY,
      } };
      onPosizioniLegamiRef.current?.({ ...posLegami.current });
    }

    if (d.type === 'ramo' || d.type === 'parola') {
      onPosizioniMappaRef.current?.({ ...posRami.current }, { ...posParole.current });
    }
    d.dx = 0; d.dy = 0;
    setTick(t => t + 1);
    try { svgRef.current?.releasePointerCapture?.(d.pointerId); } catch {}
  }, [fullSize]);

  const onPointerUp = useCallback((e: React.PointerEvent<SVGSVGElement>) => {
    if (drag.current.on && e.pointerId === drag.current.pointerId) endDrag();
  }, [endDrag]);

  // Alternativa al trascinamento per tastiera e tecnologie assistive.
  const spostaConTastiera = (e: React.KeyboardEvent<SVGGElement>, type: 'ramo' | 'parola' | 'immagine' | 'legame', id: string, ancora?: Punto) => {
    const direzioni: Record<string, Punto> = {
      ArrowLeft: { x: -1, y: 0 }, ArrowRight: { x: 1, y: 0 },
      ArrowUp: { x: 0, y: -1 }, ArrowDown: { x: 0, y: 1 },
    };
    const direzione = direzioni[e.key];
    if (!direzione || !fullSize) return;
    e.preventDefault();
    e.stopPropagation();
    const passo = e.shiftKey ? 5 : 2;
    const limita = (v: number) => Math.max(-70, Math.min(170, v));
    const sposta = (p: Punto) => ({ x: limita(p.x + direzione.x * passo), y: limita(p.y + direzione.y * passo) });
    if (type === 'immagine') {
      const i = Number(id);
      const nuove = [...posImmagini.current];
      nuove[i] = sposta(nuove[i] || { x: 50, y: 50 });
      posImmagini.current = nuove;
      onImmaginiPosizioniRef.current?.(nuove.map(p => ({ ...p })));
    } else if (type === 'ramo') {
      const prima = posRami.current[id] || { x: 50, y: 50 };
      const dopo = sposta(prima);
      const delta = { x: dopo.x - prima.x, y: dopo.y - prima.y };
      posRami.current = { ...posRami.current, [id]: dopo };
      ramiAttivi.find(r => r.id === id)?.parole.forEach(parola => {
        const p = posParole.current[parola.id] || { x: 50, y: 50 };
        posParole.current = { ...posParole.current, [parola.id]: { x: limita(p.x + delta.x), y: limita(p.y + delta.y) } };
      });
      onPosizioniMappaRef.current?.({ ...posRami.current }, { ...posParole.current });
    } else if (type === 'legame') {
      const base = ancora || { x: 0, y: 0 };
      const offset = posLegami.current[id] || { x: 0, y: 0 };
      posLegami.current = { ...posLegami.current, [id]: spostamentoLegameVisibile(base, offset, { x: direzione.x * passo, y: direzione.y * passo }) };
      onPosizioniLegamiRef.current?.({ ...posLegami.current });
    } else {
      posParole.current = { ...posParole.current, [id]: sposta(posParole.current[id] || { x: 50, y: 50 }) };
      onPosizioniMappaRef.current?.({ ...posRami.current }, { ...posParole.current });
    }
    setTick(t => t + 1);
  };

  /* Colori */
  const colBase = coloreTitolo || "#E05D2E";
  const colScuro = (() => {
    const n = parseInt(colBase.replace('#', ''), 16);
    const dr = Math.max(0, (n >> 16) - 55);
    const dg = Math.max(0, ((n >> 8) & 0xFF) - 55);
    const db = Math.max(0, (n & 0xFF) - 55);
    return `#${((dr << 16) | (dg << 8) | db).toString(16).padStart(6, '0')}`;
  })();

  /* Forza posizioni a non uscire troppo dal viewBox */
  const clampX = (x: number) => Math.max(fullSize ? -70 : -10, Math.min(fullSize ? 170 : 110, x));
  const clampY = (y: number) => Math.max(fullSize ? -70 : -10, Math.min(fullSize ? 170 : 110, y));
  const posizioneParola = (ramo: Ramo, id: string) => ({
    x: clampX(parolaX(id) + (isDragging('ramo', ramo.id) ? drag.current.dx : dragDx('parola', id))),
    y: clampY(parolaY(id) + (isDragging('ramo', ramo.id) ? drag.current.dy : dragDy('parola', id))),
  });

  const testoMultiriga = (righe: string[], x: number, fs: number) => righe.map((riga, indice) => (
    <tspan key={indice} x={x} dy={indice === 0 ? -((righe.length - 1) * fs * 1.18) / 2 : fs * 1.18}>{riga}</tspan>
  ));

  // Le forme SVG non sempre rispettano touch-action sui telefoni. Raccogliamo
  // gli stessi rettangoli in un livello HTML trasparente: solo i nodi
  // bloccano lo scroll, mentre il resto del canvas resta scorrevole.
  const areeTouch: AreaTouch[] = [];

  // Le aree comode per il dito possono sovrapporsi. Scegli l'elemento
  // visibile più vicino al punto toccato, non semplicemente quello disegnato
  // per ultimo: così una parola-legame vicina al ramo resta trascinabile.
  const onAreaTouchPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    const svg = svgRef.current;
    if (!svg) return;
    const scelta = selezionaAreaTouch(areeTouch, { x: e.clientX, y: e.clientY }, svg.getBoundingClientRect());
    if (scelta) onPointerDown(e, scelta.tipo, scelta.id, scelta.ramoId, scelta.ancora);
  };

  const disegnaLegame = (chiave: string, a: Punto, b: Punto, dimA: { larghezza: number; altezza: number }, dimB: { larghezza: number; altezza: number }, testo: string | undefined, descrizione: string) => {
    const valore = testo?.trim() || '';
    if (!fullSize || !valore) return null;
    const fs = 4.0;
    const dimensioni = dimensioniNodo(valore, fs, 2, 1, 7, 13);
    const automatica = posizioneLegame(a, b, dimA, dimB, dimensioni.larghezza, dimensioni.altezza);
    const ancora = { x: clampX(automatica.x), y: clampY(automatica.y) };
    const offset = isDragging('legame', chiave)
      ? { x: drag.current.ox, y: drag.current.oy }
      : (posLegami.current[chiave] || { x: 0, y: 0 });
    const p = {
      x: clampX(ancora.x + offset.x + dragDx('legame', chiave)),
      y: clampY(ancora.y + offset.y + dragDy('legame', chiave)),
    };
    const dragging = isDragging('legame', chiave);
    areeTouch.push({ tipo: 'legame', id: chiave, ramoId: '', x: p.x, y: p.y,
      larghezza: dimensioni.larghezza, altezza: dimensioni.altezza, margine: 38, ancora });
    return (
      <g key={chiave} data-collegamento={chiave} data-mappa-elemento="legame" data-elemento-id={chiave}
         role="group" tabIndex={0} aria-label={`${valore}. Parola-legame da ${descrizione}. Usa le frecce per spostarla.`}
         onPointerDown={e => onPointerDown(e, 'legame', chiave, '', ancora)}
         onKeyDown={e => spostaConTastiera(e, 'legame', chiave, ancora)}
         style={{ cursor: dragging ? 'grabbing' : 'grab', touchAction: 'none' }}>
        <title>{`Parola-legame ${valore}: ${descrizione}. Trascina o usa le frecce.`}</title>
        {(Math.abs(p.x - automatica.centro.x) > 0.01 || Math.abs(p.y - automatica.centro.y) > 0.01) && (
          <line x1={automatica.centro.x} y1={automatica.centro.y} x2={p.x} y2={p.y} stroke="#7A6A61" strokeWidth="0.35" pointerEvents="none" />
        )}
        <rect x={p.x - dimensioni.larghezza / 2} y={p.y - dimensioni.altezza / 2} width={dimensioni.larghezza} height={dimensioni.altezza} rx="1.5" fill="white" stroke="#D8C6BB" strokeWidth="0.4" />
        <text x={p.x} y={p.y} textAnchor="middle" dominantBaseline="central" fill="#49352A"
          fontFamily="Cambria, Georgia, serif" fontSize={fs} fontWeight="700" style={{ pointerEvents: 'none', textTransform: 'none' }}>
          {testoMultiriga(dimensioni.righe, p.x, fs)}
        </text>
        {/* Il bordo trasparente resta largo 38px a ogni zoom, per facilitare il tocco
            senza rendere attiva l'intera linea. Il rettangolo visibile resta invariato. */}
        <rect x={p.x - dimensioni.larghezza / 2} y={p.y - dimensioni.altezza / 2}
          width={dimensioni.larghezza} height={dimensioni.altezza}
          fill="transparent" stroke="transparent" strokeWidth="38" vectorEffect="non-scaling-stroke" pointerEvents="all" />
      </g>
    );
  };

  return (
    <div className="mappa-canvas relative w-full mx-auto select-none" style={{ maxWidth: canvasPx }}>
      <div className="relative w-full" style={{ aspectRatio: "1" }}>
      <svg
        ref={svgRef}
        viewBox={fullSize ? `${VIEWBOX_COMPLETO_INIZIO} ${VIEWBOX_COMPLETO_INIZIO} ${VIEWBOX_COMPLETO_LATO} ${VIEWBOX_COMPLETO_LATO}` : "-15 -15 130 130"}
        className="w-full h-full block"
        xmlns="http://www.w3.org/2000/svg"
        role={mini ? 'img' : 'group'}
        aria-label={mini ? 'Anteprima della mappa concettuale' : 'Mappa concettuale. Trascina gli elementi o usa le frecce della tastiera.'}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onLostPointerCapture={onPointerUp}
        style={{ touchAction: 'auto' }}
      >

        {/* ── 1. LINEE PRINCIPALI centro→ramo ── */}
        {ramiAttivi.map(ramo => {
          const rx = clampX(ramoX(ramo.id) + dragDx('ramo', ramo.id));
          const ry = clampY(ramoY(ramo.id) + dragDy('ramo', ramo.id));
          return (
            <line key={`l1-${ramo.id}`} x1="50" y1="50" x2={rx} y2={ry}
              stroke={ramo.colore}
              strokeWidth={fullSize ? 2.2 : 1.6}
              strokeLinecap="round"
              opacity="0.7"
            />
          );
        })}

        {/* ── 2. LINEE TRATTEGGIATE ramo→keyword ── */}
        {ramiAttivi.map(ramo => {
          const rx = clampX(ramoX(ramo.id) + dragDx('ramo', ramo.id));
          const ry = clampY(ramoY(ramo.id) + dragDy('ramo', ramo.id));
          return ramo.parole.map(parola => {
            const { x: px, y: py } = posizioneParola(ramo, parola.id);
            return (
              <line key={`dl-${parola.id}`} x1={rx} y1={ry} x2={px} y2={py}
                stroke={parola.colore || ramo.colore}
                strokeWidth={fullSize ? 0.8 : 0.55}
                strokeLinecap="round"
                opacity="0.45"
                strokeDasharray="1.0,0.8"
              />
            );
          });
        })}

        {/* Le etichette si spostano; l'editor si apre solo dal pulsante dedicato. */}
        {ramiAttivi.map(ramo => {
          const pRamo = { x: clampX(ramoX(ramo.id) + dragDx('ramo', ramo.id)), y: clampY(ramoY(ramo.id) + dragDy('ramo', ramo.id)) };
          return [
            disegnaLegame(`tronco-${ramo.id}`, { x: 50, y: 50 }, pRamo, dimCentro, dimRamo(ramo), ramo.parolaLegame, `${titolo} a ${ramo.titolo}`),
            ...ramo.parole.map(parola => disegnaLegame(`foglia-${parola.id}`, pRamo, posizioneParola(ramo, parola.id), dimRamo(ramo), dimParola(parola.testo), parola.parolaLegame, `${ramo.titolo} a ${parola.testo}`)),
          ];
        })}

        {/* ── 3. NODO CENTRALE ── */}
        {(() => {
          const cLargh = dimCentro.larghezza;
          const cAlt = dimCentro.altezza;
          return (
            <g>
              <rect x={50 - cLargh / 2} y={50 - cAlt / 2} width={cLargh} height={cAlt}
                rx={3.0} ry={3.0} fill={colBase} stroke={colScuro}
                strokeWidth={fullSize ? 1.1 : 0.8} />
              <text x="50" y="50" textAnchor="middle" dominantBaseline="central"
                fill="white" fontFamily="Cambria, Georgia, serif"
                fontWeight="900" fontSize={fCentro}
                style={{ pointerEvents: "none" }}>
                {testoMultiriga(dimCentro.righe, 50, fCentro)}
              </text>
            </g>
          );
        })()}

        {/* ── 4. KEYWORD (draggabili) ── */}
        {ramiAttivi.map(ramo =>
          ramo.parole.map(parola => {
            const { x: px, y: py } = posizioneParola(ramo, parola.id);
            const colBordo = parola.colore || ramo.colore;
            const dimensioni = dimParola(parola.testo);
            const largh = dimensioni.larghezza;
            const dragging = isDragging('parola', parola.id);
            if (fullSize) areeTouch.push({ tipo: 'parola', id: parola.id, ramoId: ramo.id,
              x: px, y: py, larghezza: largh, altezza: dimensioni.altezza });
            return (
              <g key={`kw-${parola.id}`} data-mappa-elemento="parola" data-elemento-id={parola.id}
                 tabIndex={fullSize ? 0 : undefined} role={fullSize ? 'group' : undefined}
                 aria-label={`Parola chiave ${parola.testo}. Usa le frecce per spostarla.`}
                 onPointerDown={fullSize ? e => onPointerDown(e, 'parola', parola.id, ramo.id) : undefined}
                 onKeyDown={e => spostaConTastiera(e, 'parola', parola.id)}
                 style={{ cursor: fullSize ? (dragging ? 'grabbing' : 'grab') : 'default', touchAction: fullSize ? 'none' : 'auto' }}
              >
                <rect
                  x={px - largh / 2} y={py - dimensioni.altezza / 2}
                  width={largh} height={dimensioni.altezza}
                  rx={2.5} ry={2.5}
                  fill="white" stroke={colBordo}
                  strokeWidth={fullSize ? 0.55 : 0.4}
                />
                <text x={px} y={py} textAnchor="middle" dominantBaseline="central"
                  fill={colBordo} fontFamily="Cambria, Georgia, serif"
                  fontWeight="700" fontSize={fFoglia}
                  style={{ pointerEvents: "none" }}>
                  {testoMultiriga(dimensioni.righe, px, fFoglia)}
                </text>
              </g>
            );
          })
        )}

        {/* ── 5. RAMI (draggabili) ── */}
        {ramiAttivi.map(ramo => {
          const rx = clampX(ramoX(ramo.id) + dragDx('ramo', ramo.id));
          const ry = clampY(ramoY(ramo.id) + dragDy('ramo', ramo.id));
          const dimensioni = dimRamo(ramo);
          const bLargh = dimensioni.larghezza;
          const bAlt = dimensioni.altezza;
          const dragging = isDragging('ramo', ramo.id);
          if (fullSize) areeTouch.push({ tipo: 'ramo', id: ramo.id, ramoId: ramo.id,
            x: rx, y: ry, larghezza: bLargh, altezza: bAlt });
          return (
            <g key={`br-${ramo.id}`} data-mappa-elemento="ramo" data-elemento-id={ramo.id}
               tabIndex={fullSize ? 0 : undefined} role={fullSize ? 'group' : undefined}
               aria-label={`Ramo ${ramo.titolo}. Usa le frecce per spostarlo insieme alle sue parole.`}
               onPointerDown={fullSize ? e => onPointerDown(e, 'ramo', ramo.id, ramo.id) : undefined}
               onKeyDown={e => spostaConTastiera(e, 'ramo', ramo.id)}
               style={{ cursor: fullSize ? (dragging ? 'grabbing' : 'grab') : 'default', touchAction: fullSize ? 'none' : 'auto' }}
            >
              <rect x={rx - bLargh / 2} y={ry - bAlt / 2} width={bLargh} height={bAlt}
                rx={2.5} ry={2.5} fill={ramo.colore} stroke="white"
                strokeWidth={fullSize ? 0.8 : 0.6} opacity="0.95" />
              <text x={rx} y={ry} textAnchor="middle" dominantBaseline="central"
                fill="white" fontFamily="Cambria, Georgia, serif"
                fontWeight="800" fontSize={fRamo}
                style={{ pointerEvents: "none" }}>
                {testoMultiriga(dimensioni.righe, rx, fRamo)}
              </text>
            </g>
          );
        })}

        {/* ── 6. IMMAGINI (draggabili) ── */}
        {immagini && immagini.length > 0 && immagini.map((img, i) => {
          const ix = clampX(imgX(i) + dragDx('immagine', String(i)));
          const iy = clampY(imgY(i) + dragDy('immagine', String(i)));
          const dragging = isDragging('immagine', String(i));
          if (fullSize) areeTouch.push({ tipo: 'immagine', id: String(i), ramoId: '',
            x: ix, y: iy, larghezza: img.larghezza, altezza: img.altezza });
          return (
          <g key={`img-${i}`} data-mappa-elemento="immagine" data-elemento-id={i}
             tabIndex={fullSize ? 0 : undefined} role={fullSize ? 'group' : undefined}
             aria-label={`Immagine ${i + 1}. Usa le frecce per spostarla.`}
             onPointerDown={fullSize ? e => onPointerDown(e, 'immagine', String(i), '') : undefined}
             onKeyDown={e => spostaConTastiera(e, 'immagine', String(i))}
             style={{ cursor: fullSize ? (dragging ? 'grabbing' : 'grab') : 'default', touchAction: fullSize ? 'none' : 'auto' }}
          >
            <rect
              x={ix - img.larghezza / 2} y={iy - img.altezza / 2}
              width={img.larghezza} height={img.altezza}
              rx="1.5" fill="white" stroke="#E5E0D8" strokeWidth="0.3"
            />
            <clipPath id={`clip-img-${i}`}>
              <rect x={ix - img.larghezza / 2 + 0.3} y={iy - img.altezza / 2 + 0.3}
                width={img.larghezza - 0.6} height={img.altezza - 0.6} rx="1" />
            </clipPath>
            <image href={img.dataUrl}
              x={ix - img.larghezza / 2 + 0.3} y={iy - img.altezza / 2 + 0.3}
              width={img.larghezza - 0.6} height={img.altezza - 0.6}
              clipPath={`url(#clip-img-${i})`} preserveAspectRatio="xMidYMid slice" />
          </g>
        );
        })}

      </svg>
      {fullSize && (
        <div aria-hidden="true" className="pointer-events-none absolute inset-0">
          {areeTouch.map(area => (
            <div key={`${area.tipo}-${area.id}`}
              data-mappa-touch={area.tipo} data-touch-id={area.id}
              onPointerDown={onAreaTouchPointerDown}
              style={{
                position: 'absolute',
                left: `${(area.x - VIEWBOX_COMPLETO_INIZIO) / VIEWBOX_COMPLETO_LATO * 100}%`,
                top: `${(area.y - VIEWBOX_COMPLETO_INIZIO) / VIEWBOX_COMPLETO_LATO * 100}%`,
                width: `calc(${area.larghezza / VIEWBOX_COMPLETO_LATO * 100}% + ${area.margine || 0}px)`,
                height: `calc(${area.altezza / VIEWBOX_COMPLETO_LATO * 100}% + ${area.margine || 0}px)`,
                minWidth: AREA_TOUCH_MINIMA,
                minHeight: AREA_TOUCH_MINIMA,
                transform: 'translate(-50%, -50%)',
                pointerEvents: 'auto',
                touchAction: 'none',
                userSelect: 'none',
                WebkitUserSelect: 'none',
                WebkitTouchCallout: 'none',
                cursor: isDragging(area.tipo, area.id) ? 'grabbing' : 'grab',
              }}
            />
          ))}
        </div>
      )}
      </div>

      {/* Legenda */}
      {!mini && studente && (studente.nome || studente.cognome) && (
        <div className="text-center mt-4 mb-2 py-1.5">
          <span className="text-xs font-bold text-muted-foreground">
            {studente.cognome} {studente.nome}
            {studente.data && ` — ${studente.data}`}
            {studente.classe && ` — Classe ${studente.classe}`}
          </span>
        </div>
      )}
    </div>
  );
}
