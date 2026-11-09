// Tipi per la mappa concettuale

export interface ParolaChiave {
  id: string;
  testo: string;
  hashtag: string;
  colore?: string;
  /** Testo facoltativo sulla linea dal ramo a questa parola chiave. */
  parolaLegame?: string;
  /** Spostamento rispetto alla posizione automatica del legame. */
  spostamentoLegame?: { x: number; y: number };
  x?: number;
  y?: number;
}

export interface Ramo {
  id: string;
  titolo: string;
  colore: string;
  parole: ParolaChiave[];
  /** Testo facoltativo sulla linea dal titolo centrale a questo ramo. */
  parolaLegame?: string;
  /** Spostamento rispetto alla posizione automatica del legame. */
  spostamentoLegame?: { x: number; y: number };
  x?: number;
  y?: number;
}

export interface ImmagineMappa {
  dataUrl: string;
  x: number;
  y: number;
  larghezza: number;
  altezza: number;
}

export interface MappaConcettuale {
  studente: { nome: string; cognome: string; data: string; classe: string };
  step: number;
  testoOriginale: string;
  riassunto: string;
  paroleRipetute: string[];
  appunti: string;
  hashtags: string[];
  titoloCentrale: string;
  rami: Ramo[];
  completata: boolean;
  immagini: ImmagineMappa[];
  coloreTitolo?: string;
}

// Limiti dei contenuti, scelti per mantenere la mappa leggibile anche su telefono.
export const MAX_RAMI = 4;
export const MAX_FOGLIE_PER_RAMO = 3;
export const MAX_PAROLE_LEGAME = MAX_RAMI * (1 + MAX_FOGLIE_PER_RAMO);

export function contaParoleLegame(rami: Ramo[]): number {
  return rami.reduce((totale, ramo) => totale + (ramo.parolaLegame?.trim() ? 1 : 0)
    + ramo.parole.filter(parola => parola.parolaLegame?.trim()).length, 0);
}

export const COLORI_RAMI = [
  { nome: 'ROSSO', valore: '#E74C3C', chiaro: '#FADBD8' },
  { nome: 'BLU', valore: '#3498DB', chiaro: '#D6EAF8' },
  { nome: 'VERDE', valore: '#27AE60', chiaro: '#D5F5E3' },
  { nome: 'VIOLA', valore: '#9B59B6', chiaro: '#E8DAEF' },
  { nome: 'ARANCIONE', valore: '#F39C12', chiaro: '#FDEBD0' },
];

/** Scurisce un colore esadecimale di una percentuale data (0-1) */
export function darkenColor(hex: string, amount: number = 0.2): string {
  const num = parseInt(hex.replace('#', ''), 16);
  const r = Math.max(0, (num >> 16) - Math.round(255 * amount));
  const g = Math.max(0, ((num >> 8) & 0x00FF) - Math.round(255 * amount));
  const b = Math.max(0, (num & 0x0000FF) - Math.round(255 * amount));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

export const MESSAGGI_INCORAGGIANTI = [
  'BRAVO! CONTINUA COSI!',
  'OTTIMO LAVORO!',
  
  'FANTASTICO! VAI AL PROSSIMO PASSO!',
  'CHE BRAVO CHE SEI!',
  'SUPER! CE LA STAI FACENDO!',
  'INCREDIBILE! CONTINUA!',
  'STAI ANDANDO ALLA GRANDE!',
];
