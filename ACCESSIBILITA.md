# ♿ ACCESSIBILITÀ — Mappa Concettuale 3 Passi

> ⚠️ **SEZIONE ACCESSIBILITÀ** — Questa è la sezione che riassume **TUTTE** le misure di
> accessibilità/inclusione dell'app. Ogni misura è **portabile su altre app simili**:
> nella tabella è indicato il file (o il frammento) da copiare. Il riepilogo operativo
> **"come portarle su un'altra app"** è in fondo a questa pagina e in `GUIDA-IA.md`
> (sezione 9).

> Misure di accessibilità/inclusione aggiunte all'app **MAPPA CONCETTUALE 3 PASSI**,
> portate dall'app di riferimento **EQUAZIONI-DI-QUARTO-GRADO-TRINOMIE-BIQUADRATICHE**
> (famiglia LabVisivo / Cornice Universale, stesso schema della barra di
> accessibilità). Pensate per studenti con **BES**, **DSA (dislessia, disortografia)**
> e **ipovisione**.

**Principio guida**: *ogni comando raggiungibile da tastiera; preferenze persistenti;
testo grande e ad alta leggibilità; contrasto regolabile; rispetto di
`prefers-reduced-motion`.*

---

## Panoramica delle misure

| # | Misura | Dove vive nel codice |
|---|--------|----------------------|
| 1 | **Font OpenDyslexic** (auto-ospitato) come font PREIMPOSTATO di tutta l'app | `client/public/fonts/` + `@font-face` in `client/src/index.css` |
| 2 | **Barra di accessibilità** (Font, Interlinea, Righello, Modalità, Ascolto) | `client/src/components/AccessibilityToolbar.tsx` |
| 3 | **Dimensione testo regolabile** 80%–160% | `client/src/contexts/AccessibilityContext.tsx` → `--lf-scale` |
| 4 | **Interlinea regolabile** 1.65 / 1.9 / 2.2 / 2.6 | `AccessibilityContext.tsx` → `--lf-lh` |
| 5 | **Righello di lettura** (banda che segue il mouse) | `index.css` (`.lf-ruler-band`) + context |
| 6 | **Modalità ad alto contrasto** | `index.css` (`html.lf-hc`) |
| 7 | **Focus visibile** (tastiera / ipovedenti) | `index.css` (`:focus-visible`) |
| 8 | **`prefers-reduced-motion`** rispettato | `index.css` (`@media (prefers-reduced-motion)`) |
| 9 | **Testo base 18 px + selezione ad alto contrasto** | `index.css` (`body`, `::selection`) |
| 10 | **ARIA e accessibilità da tastiera** | `AccessibilityToolbar.tsx`, `Home.tsx` |
| 11 | **Lettura ad alta voce** (text-to-speech in italiano) | `client/src/hooks/useReadAloud.ts` + pulsante "Ascolto" nella barra |
| 12 | **Preferenze persistenti** (`localStorage`) | `AccessibilityContext.tsx` (chiave `m3p_access`) |
| 13 | **CORS sui font** (per embed Blogger cross-origin) | `server/_core/index.ts` (`app.use("/fonts", ...)`) |
| 14 | **Embed a altezza automatica senza "100vh"** — l'iframe segue l'altezza REALE del contenuto, anche quando è più corto (la cornice può restringersi) | `client/src/lib/heightSync.ts` (`currentHeight`) + `html.lf-embedded` in `index.css` |

---

## Dettaglio

### Font OpenDyslexic (font preimpostato dell'app)
- Quattro `@font-face` in `client/src/index.css` (Regular 400, Bold 700, Italic 400,
  Bold Italic 700) con `font-display: swap`.
- File auto-ospitati in `client/public/fonts/` (TTF, OTF, WOFF2). Nessun CDN esterno.
- Applicato a `html, body, #root` e alle classi `.font-sans/.font-serif/.font-mono`
  con fallback `'Cambria', 'Georgia', 'Times New Roman', serif`.
- **Niente toggle**: OpenDyslexic è il font di default di tutta l'interfaccia
  (come nell'app sorgente) — lo studente non deve sapere di "attivare" nulla.
- **Unica eccezione voluta**: il canvas SVG della mappa (`#mappa-da-stampare`)
  conserva il font **Cambria** e NON viene sovrascritto: le larghezze dei riquadri
  (tronco, rami, foglie) sono calcolate su Cambria e l'export **PDF/PNG deve restare
  identico** (stesso principio dei font KaTeX nell'app sorgente). Le schermate
  interattive di studio restano comunque tutte in OpenDyslexic.

### Barra di accessibilità
Barra fissa in alto (`App.tsx`, sopra il router), visibile su **tutte** le pagine,
con **5 moduli**: **FONT**, **INTERLINEA**, **RIGHELLO**, **MODALITÀ**, **ASCOLTO**.

- **Font** (`A−` / `A+`): scala 80%–160%, passo 10% (`--lf-scale`); annuncio
  percentuale con `aria-live`.
- **Interlinea**: cicla 1.65 → 1.9 → 2.2 → 2.6 (`--lf-lh`).
- **Righello**: banda gialla di lettura che segue il mouse (`pointer-events: none`).
- **Modalità**: alterna Normale ↔ Alto contrasto.
- **Ascolto**: pulsante **Leggi** / **Stop** che legge ad alta voce il contenuto
  della pagina in italiano (Web Speech API `speechSynthesis`, voce italiana).

Palette calda fissa (barra bianco caldo `#fdfbf8`, bordo `#dedbd6`, capsule crema
`#f5f0e6` senza bordo, pulsanti trasparenti con bordo sottile `#dedbd6`, testo/icone
`#2e2118`, anello focus `#b71c1c`), identica alla barra dell'app di riferimento
(stile Cornice Universale): l'aspetto resta coerente anche dentro la cornice
dinamica del blog.

### Dimensione testo e interlinea
`AccessibilityContext.tsx` imposta su `<html>`: `font-size: 16px × scala` e le
variabili `--lf-scale` / `--lf-lh`. Il `body` usa `font-size: calc(18px * var(--lf-scale))`
e `line-height: var(--lf-lh)`. Le istruzioni e i campi di scrittura della mappa
usano la stessa dimensione responsiva (`text-sm md:text-base`) e il marrone
`--secondary-foreground` per le indicazioni. Tutto scala con il comando A−/A+.

### Alto contrasto
`html.lf-hc` applica `filter: contrast(1.3) saturate(1.15)` e sfondo bianco sul `body`.

### Lettura ad alta voce (text-to-speech)
Il pulsante **Ascolto → Leggi** nella barra legge ad alta voce **tutta la pagina** in
italiano (Web Speech API `speechSynthesis`, migliore voce italiana disponibile).
**Stop** interrompe la lettura.

Caratteristiche della lettura (`useReadAloud.ts`):
- legge **tutto il contenuto**: titoli, consegne dei passi, istruzioni, pulsanti
  principali — senza produrre "rumore" da toolbar, canvas o campi nascosti;
- converte gli **esponenti e pedici Unicode** in italiano parlato ("x²" → "x al
  quadrato", "t₁" → "t uno") e le formule testuali (frazioni "fratto", radici
  "radice quadrata di", "più o meno");
- legge le **date in forma naturale** ("02/09/2026" → "due settembre duemilaventisei");
- converte le **parole MAIUSCOLE in minuscolo** per una pronuncia corretta
  (l'interfaccia usa `text-transform: uppercase`);
- seleziona la voce italiana meno "robotica" disponibile.

### Focus e riduzione movimento
- `:focus-visible { outline: 3px solid var(--ring); outline-offset: 2px }` — anello
  visibile solo alla navigazione da tastiera.
- `::selection { background: var(--primary); color: var(--primary-foreground) }`.
- `@media (prefers-reduced-motion: reduce)` azzera animazioni e transizioni.

### ARIA e struttura
- La pagina usa il landmark `<main>` (`Home.tsx`) per la navigazione con screen
  reader e come sorgente della lettura ad alta voce.
- `html { scroll-behavior: smooth }` per uno scorrimento morbido.
- Barra: `role="toolbar"` con `aria-label` descrittiva; ogni modulo è un
  `role="group"` con la propria `aria-label`; `aria-pressed` sui toggle; `aria-live`
  sulla percentuale; icone decorative con `aria-hidden="true"`; descrizione
  introduttiva `sr-only` + live region `role="status"` che annunciano all'avvio la
  disponibilità della barra e del pulsante Ascolto (screen reader NVDA/JAWS/
  VoiceOver/TalkBack).
- Campi di ingresso `Cognome` / `Nome` / `Data` / `Classe`: `aria-label` (`Home.tsx`).
- Il pulsante **Ascolto** contiene la parola "Ascolto" nel nome accessibile.

### Canvas, parole-legame e telefono
- L'area della mappa è una regione etichettata, con pulsanti **Riduci** e
  **Ingrandisci** e percentuale di zoom centrale annunciata agli screen reader;
  al bisogno scorre all'interno senza allargare la pagina.
- Ogni ramo, parola chiave, parola-legame e immagine è selezionabile con `Tab` e
  spostabile con le frecce; `Maiusc` + freccia aumenta il passo. Il focus è visibile.
- Le parole-legame si trascinano con mouse o tocco e conservano lo spostamento
  rispetto alla linea. Per modificare il testo si usa solo il pulsante
  **PAROLE-LEGAME**: né il tocco né il clic sulle linee aprono l'editor.
- Il trascinamento touch riguarda rami, foglie, parole-legame e immagini; l'area vuota consente lo scorrimento. I bersagli HTML trasparenti di almeno 44 px evitano che lo scroll interrompa il gesto; `mappaTouch.ts` sceglie il riquadro visibile più vicino se i bersagli si sovrappongono. I gruppi SVG restano disponibili alla tastiera.
  Lo zoom non ritaglia il PDF o il PNG, che includono tutta la mappa. I pulsanti
  della barra accessibilità sono più ampi su telefono per facilitare il tocco;
  i loro nomi accessibili includono il testo visibile, utile ai comandi vocali.
  È consentito anche lo zoom nativo del browser.

### Persistenza
Le impostazioni sono salvate in `localStorage` (chiave **`m3p_access`**) e
ricaricate all'avvio, su tutte le pagine. La mappa, incluse parole-legame e
posizioni, usa `mappa-concettuale-3passi` sul dispositivo corrente.

### Embed / cornice dinamica
Quando l'app è dentro un iframe (cornice dinamica su Blogger), `heightSync.ts`
aggiunge la classe `lf-embedded` a `<html>` e il CSS disattiva `min-h-screen`
(100vh): la pagina segue l'altezza del **contenuto**, niente loop di crescita.
`currentHeight()` misura il **bordo inferiore reale del contenuto**
(`body.getBoundingClientRect().bottom + scrollY`): il riferimento **non è mai**
l'altezza del viewport (`documentElement.offsetHeight`/`scrollHeight`), così la
cornice **si restringe** quando si passa a una pagina più corta (es. la prima
pagina BENVENUTO, margini pareggiati 24px/24px con le classi `lf-welcome-main` /
`html.lf-welcome-top`) e non riparte il ciclo di messaggi.
Con la soglia `TOLLERANZA_PX = 4`, la **deduplica** e il **debounce**
(`heightSync.ts`) le micro-variazioni non vengono più inviate: **misurato
1314 → 6 messaggi in 10 secondi** (poi silenzio), con la cornice assestata
all'altezza reale del contenuto.
Le vecchie cornici continuano a funzionare: `heightSync.ts` invia anche il
messaggio legacy `mappaconcettuale:height`, **con la stessa misura**.

---

## Come portare queste misure su un'altra app

1. Copiare la cartella `client/public/fonts/` (font OpenDyslexic).
2. Copiare in `index.css`: i 4 `@font-face`, le variabili `--lf-scale` / `--lf-lh`,
   le classi `.lf-ruler-band` e `html.lf-hc`, `:focus-visible`, `::selection` e
   `@media (prefers-reduced-motion: reduce)`.
3. Copiare `AccessibilityContext.tsx` + `AccessibilityToolbar.tsx` e montarli in
   `App.tsx` dentro un `<AccessibilityProvider>`, **prima** del router (la barra
   deve essere visibile su TUTTE le pagine).
4. Copiare `useReadAloud.ts` per la lettura ad alta voce (voce italiana, converte
   esponenti/date/MAIUSCOLE in linguaggio naturale).
5. Aggiungere `aria-label` ai campi di input e `role="toolbar"` / `aria-live` /
   `role="status"` alla barra.
6. Nel server: aggiungere il CORS su `/fonts` (`app.use("/fonts", ...)` con
   `Access-Control-Allow-Origin: *`) per l'embed cross-origin.
7. Se l'app viene incorporata: copiare `heightSync.ts`, chiamare `initHeightSync()`
   in `main.tsx` PRIMA del render, e aggiungere le regole `html.lf-embedded`
   (e, per la prima pagina con margini pareggiati, `lf-welcome-main` sul `<main>`
   allo step 0 e `html.lf-welcome-top` per la vista autonoma).

---

## Verifica rapida

- [ ] Il font OpenDyslexic si carica (DevTools → Network → `/fonts/OpenDyslexic-Regular.ttf` → 200).
- [ ] `Tab` sposta il focus con anello visibile; la barra si annuncia come "toolbar".
- [ ] `A−`/`A+` scala il testo (80%–160%) e la percentuale si aggiorna (`aria-live`).
- [ ] Interlinea cicla 1,65 → 1,9 → 2,2 → 2,6.
- [ ] Righello ON/OFF mostra/nasconde la banda gialla senza bloccare i clic.
- [ ] Modalità Contrasto schiarisce lo sfondo e aumenta il contrasto.
- [ ] Le preferenze restano dopo il riavvio del browser (`localStorage` → `m3p_access`).
- [ ] Il pulsante "Ascolto → Leggi" avvia la lettura ad alta voce in italiano; "Stop" la ferma.
- [ ] L'export PDF/PNG della mappa è invariato (font Cambria nel canvas SVG).

---

## Riferimenti

- **OpenDyslexic** — font libero (licenza OFL) per la dislessia.
- **WCAG 2.1/2.2** (W3C): contrasto (1.4.3), ridimensionamento testo (1.4.4), focus
  visibile (2.4.7), tastiera (2.1), `prefers-reduced-motion` (2.3.3).
- **L. 170/2010 e Linee Guida MIUR (DSA)** — contesto normativo della didattica inclusiva.
