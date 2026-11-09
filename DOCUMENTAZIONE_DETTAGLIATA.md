# Mappa Concettuale 3 Passi — Documentazione Dettagliata

> **Versione pacchetto:** 1.0.0 (aggiornato: 2026-09-02)
> **URL produzione:** https://mappa-3passi-preview.easy-peasy.site
> **Stack:** Vite + React 19 + TypeScript + Tailwind CSS 4 + tRPC + Drizzle + PostgreSQL

> 📚 **Navigazione pacchetto** (leggi anche):
> - [`GUIDA-IA.md`](GUIDA-IA.md) — guida per l'IA (ricostruzione/variazione da GitHub)
> - [`ACCESSIBILITA.md`](ACCESSIBILITA.md) — ⚠️ sezione ACCESSIBILITÀ (misure portabili)
> - [`DEPLOY-RENDER.md`](DEPLOY-RENDER.md) — trasferimento Easy-Peasy.AI → Render
> - [`cornice-dinamica/README.md`](cornice-dinamica/README.md) — embed per il blog
> - `ISTRUZIONI-GITHUB.txt` — da dove cominciare

---

## 1. Panoramica dell'app

La **Mappa Concettuale 3 Passi** guida lo studente nella costruzione di una mappa concettuale attraverso un percorso in 3 passaggi (dopo il benvenuto):

| Step | Nome | Contenuto |
|------|------|-----------|
| 0 | BENVENUTO | Form nome/cognome/data/classe, bottone ENTRA |
| 1 | IL TRONCO | Titolo centrale + color picker |
| 2 | I RAMI | Sottotitoli (rami) con colori personalizzabili |
| 3 | LE FOGLIE | Parole chiave (foglie) + caricamento immagini |

Al termine, lo studente vede la mappa completata su un canvas SVG interattivo, con la possibilità di **trascinare** rami, parole chiave e immagini, e di scaricare il risultato in **PDF** o **PNG**.

---

## 2. Struttura del progetto

```
mappa-3passi-preview/
├── client/
│   └── src/
│       ├── pages/
│       │   └── Home.tsx                 ← TUTTA l'app (806 righe)
│       ├── components/
│       │   └── ConceptMapCanvas.tsx     ← Canvas SVG + drag & drop (455 righe)
│       ├── lib/
│       │   ├── tipi-mappa.ts            ← Tipi TS + colori + helper (70 righe)
│       │   └── utils.ts
│       ├── index.css                    ← Palette terracotta
│       ├── App.tsx
│       └── main.tsx
├── server/
│   ├── _core/                           ← Infrastruttura server (auth, trpc, vite)
│   ├── db.ts
│   └── routers.ts
├── drizzle/                             ← Migrazioni DB
├── embed-blogger.html                   ← Embed per Blogger
├── package.json
└── DOCUMENTAZIONE_DETTAGLIATA.md        ← QUESTO FILE
```

---

## 3. Storico completo delle modifiche

### 3.1 Drag & Drop fluido (ref-based)
**File:** `ConceptMapCanvas.tsx`

Riscrittura completa del sistema di trascinamento per eliminare il "rimbalzo" su touch:
- **Niente `setState` durante `onPointerMove`** — le posizioni vivono in `useRef`
- Un solo contatore `tick` (state) incrementato via `requestAnimationFrame` → 1 re-render per frame
- `svg.setPointerCapture()` per non perdere il puntatore durante il drag su mobile

**Struttura dati:**
- `posRami` (ref): `Record<string, {x, y}>` — posizioni committed dei rami
- `posParole` (ref): `Record<string, {x, y}>` — posizioni committed delle parole
- `posImmagini` (ref): `{x, y}[]` — posizioni committed delle immagini
- `drag` (ref): `{on, type, id, ramoId, sx, sy, ox, oy, dx, dy, paroleOff, raf}`
- `[tick, setTick]` (state): contatore re-render

### 3.2 Testo mai fuori dai contenitori
**File:** `ConceptMapCanvas.tsx`

- Fattore di stima larghezza testo `tw()` portato da `0.58` a **`0.72`** (calibrato su Cambria/Georgia)
- Padding dichiarato **per lato** (non totale): `padCentroH = 10`, `padRamoH = 8`, `padKwH = 7`
- Formule: `larghezza = tw(testo, fontSize) + 2 * padH`
- `kwMinW`: mini 12, normal 13, fullSize 14

### 3.3 Download immagine (PNG)
**File:** `Home.tsx`

Nuova funzione `scaricaImmagine()`:
- Cattura `#mappa-da-stampare` con `html2canvas` a **scala 3×**
- `canvas.toBlob("image/png")` → download `mappa-concettuale.png`

### 3.4 Pulsanti uniformi
**File:** `Home.tsx`

I due pulsanti di download usano `bg-secondary hover:bg-secondary/80 text-secondary-foreground`:
1. **SCARICA PDF** → `scaricaPDF()` (html2canvas + jsPDF, scala 2×)
2. **SCARICA IMMAGINE** → `scaricaImmagine()` (html2canvas + toBlob, scala 3×)

Per iniziare un'altra mappa si usa **RICOMINCIA** in alto, previa conferma. Il pulsante duplicato in fondo è stato rimosso.

### 3.5 Sfondo bianco puro
**File:** `Home.tsx`

Il contenitore `#mappa-da-stampare` usa `bg-white` (non più `bg-card` crema) per un contrasto migliore dei riquadri bianchi.

### 3.6 Immagini trascinabili sul canvas
**File:** `ConceptMapCanvas.tsx` + `Home.tsx`

**PRIMA:** esisteva un "pad" separato accanto alla mappa con una griglia tratteggiata per posizionare le immagini.

**ORA:** il pad è stato **eliminato completamente**. Le immagini si trascinano **direttamente sul canvas SVG** come rami e keyword:
- `type: 'immagine'` nel sistema drag, indice come `id`
- `endDrag` committa in `posImmagini.current[idx]` e chiama `onImmaginiPosizioniRef.current()`
- Layout a colonna singola (rimossa la griglia `lg:grid-cols-2`)

### 3.7 Fix STALE CLOSURE (critico)
**File:** `ConceptMapCanvas.tsx`

**Sintomo:** eliminando un'immagine e poi trascinandone un'altra, l'immagine eliminata riappariva e le posizioni "scattavano" all'inizio.

**Causa:** `endDrag` ha dipendenze `[]` — catturava la **prima** versione di `onImmaginiPosizioni`, che leggeva un `mappa.immagini` vecchio (con l'immagine cancellata ancora dentro).

**Fix:** introdotto `onImmaginiPosizioniRef` che punta sempre all'ultima callback:
```ts
const onImmaginiPosizioniRef = useRef(onImmaginiPosizioni);
onImmaginiPosizioniRef.current = onImmaginiPosizioni;
```
`endDrag` usa `onImmaginiPosizioniRef.current?.()` → sempre lo stato più recente.

### 3.8 Limite 4 immagini
**File:** `Home.tsx`

`handleImageUpload` blocca l'upload oltre le 4 immagini senza eliminare le immagini delle mappe già salvate:
```ts
const postiLiberi = Math.max(0, MAX_IMMAGINI - mappa.immagini.length);
if (postiLiberi <= 0) { /* blocca */ return; }
const daCaricare = Array.from(files).slice(0, postiLiberi);
```
Se selezioni più file dei posti liberi, vengono caricati solo i primi N necessari.

### 3.9 Legenda immagini rinnovata
**File:** `Home.tsx`

- Titolo "Immagine N" in **marrone** (`text-amber-900`) e **non grassetto** (`font-normal`)
- Label per intero: **LARGHEZZA:** e **ALTEZZA:** (mai abbreviate)
- Layout arioso: `p-4`, `gap-4`, `space-y-4`, thumbnail `w-14 h-14`
- Input: `ml-1.5 px-1.5 py-1`

### 3.10 Ritocchi testuali UI
**File:** `Home.tsx` + `ConceptMapCanvas.tsx`

- **MAPPA COMPLETATA** — rimosso il punto esclamativo
- **REALIZZATO DA [studente]** — più respiro: `mt-4 mb-2 py-1.5`

### 3.11 Limiti caratteri raddoppiati
**File:** `Home.tsx`

| Campo | Passo | Prima | Ora |
|-------|-------|-------|-----|
| Titolo centrale | 1 (IL TRONCO) | 20 | **40** |
| Sottotitolo / Ramo | 2 (I RAMI) | 14 | **28** |
| Parola chiave / Foglia | 3 (LE FOGLIE) | 16 | **32** |

Aggiornati anche: `slice(0, N)`, `maxLength={N}`, contatore `x/N caratteri`, evidenziazione rossa al limite.

---

## 4. Dettagli tecnici del canvas

### 4.1 Sistema di coordinate
- `viewBox` SVG: `-15 -15 130 130` (coordinate 0–100 per il contenuto)
- Posizioni centrate: `x`/`y` indicano il **centro** dell'elemento
- `clampX`/`clampY` limitano tra -10 e 110

### 4.2 Layout radiale (`buildDefaultLayout`)
- Raggio rami: mini 21, normal 26, fullSize 30
- Font size: fCentro 3.4 / fRamo 2.9 / fFoglia 2.4 (fullSize)
- Usato solo come posizione iniziale; dopo il primo drag contano i ref

### 4.3 Riquadri
- Nodo centrale: rettangolo colorato (`coloreTitolo`), testo bianco Cambria/Georgia
- Rami: rettangoli colorati, connessi da linee continue
- Foglie: rettangoli bianchi con bordo colorato, connessi da linee tratteggiate
- Immagini: rettangolo bianco + `clipPath` + `<image preserveAspectRatio="xMidYMid slice">`

---

## 5. Deploy

### Preview (temporanea)
```bash
webdev_deploy mode="preview" project_dir="/home/user/mappa-3passi-preview"
```

### Produzione (permanente)
```bash
webdev_save_checkpoint   # SEMPRE prima
webdev_deploy mode="production" project_dir="/home/user/mappa-3passi-preview"
```
URL: https://mappa-3passi-preview.easy-peasy.site

### TypeScript check
```bash
pnpm check
```

---

## 6. Persistenza dati

- `localStorage` chiave: `"mappa-concettuale-3passi"`
- Type `MappaConcettuale`: `{ studente, titoloCentrale, rami, immagini, stepCorrente, completata, coloreTitolo }`
- `ImmagineMappa`: `{ dataUrl, x, y, larghezza, altezza }`

---

## 7. Embed Blogger

- `ResizeObserver` + `postMessage` (`{ type: 'mappaconcettuale:height', height }`)
- Cornice con gradiente `rgb(230, 205, 171)`
- Codice in `embed-blogger.html`

---

## 8. Note operative per manutenzione

- **⚠️ MAI** introdurre `setState` dentro `onPointerMove` → rompe il drag su touch
- **⚠️ SEMPRE** usare `onImmaginiPosizioniRef` per callback che leggono stato parent (stale closure)
- **⚠️** Fattore `tw()` = 0.72: non ridurlo o il testo trabocca dai riquadri
- **⚠️** Sfondo `#mappa-da-stampare` = `bg-white`: non tornare a `bg-card`
- **⚠️** Label dimensioni: scrivere per intero LARGHEZZA / ALTEZZA
