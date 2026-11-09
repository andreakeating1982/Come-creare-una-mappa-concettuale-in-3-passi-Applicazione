# 🤖 GUIDA-IA — Ricostruzione e variazione dell'app "Mappa Concettuale 3 Passi"

> **Documento operativo per un'Intelligenza Artificiale** (MARKY su Easy-Peasy.AI,
> GitHub Copilot, Claude, ChatGPT, ecc.) o per uno sviluppatore, per **ricostruire**,
> **mantenere** e **variare** questa app partendo dalla repository GitHub.
>
> 👉 Gli agenti IA che aprono la repo trovano prima **`AGENTS.md`** (istruzioni
> operative rapide: comandi, file critici, regole d'oro). Questo file è la guida
> completa.
>
> **App**: MAPPA CONCETTUALE 3 PASSI
> **Stack**: Vite + React 19 + TypeScript + TailwindCSS 4 + tRPC 11 + Better Auth +
> Drizzle ORM (PostgreSQL) + Express 4 + Wouter
> **Scaffold**: `web-db-user` (Easy-Peasy.AI) — il cuore didattico è però
> **interamente lato client** (nessuna chiamata API nel flusso studente).

---

## INDICE

1. [Che cos'è l'app](#1-che-cosè-lapp)
2. [Architettura e file critici](#2-architettura-e-file-critici)
3. [Ricostruire l'app da GitHub](#3-ricostruire-lapp-da-github)
4. [Comandi: install, check, build, dev, test](#4-comandi-install-check-build-dev-test)
5. [Come variare l'app (nuova attività / nuovo aspetto)](#5-come-variare-lapp-nuova-attività--nuovo-aspetto)
6. [Database, auth e API: cosa NON toccare](#6-database-auth-e-api-cosa-non-toccare)
7. [Build, verifica e deploy su Easy-Peasy.AI](#7-build-verifica-e-deploy-su-easy-peasyai)
8. [Trasferimento su Render (via GitHub)](#8-trasferimento-su-render-via-github)
9. [ACCESSIBILITÀ (sezione portabile)](#9-accessibilità-sezione-portabile)
10. [Cornice dinamica (embed per il blog)](#10-cornice-dinamica-embed-per-il-blog)
11. [Regole d'oro](#11-regole-doro)

---

## 1. Che cos'è l'app

L'app guida uno studente nella costruzione di una **mappa concettuale** attraverso un
percorso in **3 passi** (dopo un benvenuto con i dati dello studente):

| Fase | Nome | Cosa fa lo studente |
|------|------|---------------------|
| 0 | BENVENUTO | Inserisce Cognome, Nome, Data, Classe → **ENTRA** |
| 1 | IL TRONCO | Scrive il **titolo** della mappa e ne sceglie il colore |
| 2 | I RAMI | Aggiunge i **sottotitoli** (rami) con colori personalizzabili |
| 3 | LE FOGLIE | Aggiunge le **parole chiave** (foglie) e le **immagini** |

Alla fine la mappa completa appare su un **canvas SVG interattivo** dove rami, parole
chiave, parole-legame e immagini si **trascinano**; lo studente può **scaricare** il
risultato in **PDF** o **PNG**. Il font è **OpenDyslexic** (default, per DSA/BES).

> ⚠️ **NON è un quiz e NON ha dashboard docente.** Le app con dashboard docente,
> codici classe, sessioni e contatore studenti appartengono ad altre app della
> famiglia (vedi skill schema-quiz-builder). Questa repo è l'app studente a 3 passi.

---

## 2. Architettura e file critici

| File | Ruolo |
|------|-------|
| `client/src/pages/Home.tsx` | ⭐ **Tutta l'app** (benvenuto + 3 passi + canvas + PDF/PNG + persistenza mappa) |
| `client/src/components/ConceptMapCanvas.tsx` | Canvas SVG interattivo: layout radiale, parole-legame, **drag & drop fluido ref-based**, tastiera ed export |
| `client/src/lib/mappaTouch.ts` | Bersagli touch ampliati e selezione corretta quando le aree si sovrappongono; test in `server/mappa-touch.test.ts` |
| `client/src/components/ParoleLegameEditor.tsx` | Campi accessibili per ogni legame titolo→ramo e ramo→foglia |
| `client/src/lib/tipi-mappa.ts` | Tipi TypeScript, **colori di rami/foglie**, helper, struttura dati mappa |
| `client/src/contexts/AccessibilityContext.tsx` | Accessibilità: font/interlinea/righello/contrasto, localStorage `m3p_access` |
| `client/src/components/AccessibilityToolbar.tsx` | Barra di accessibilità (Font, Interlinea, Righello, Modalità, Ascolto) |
| `client/src/hooks/useReadAloud.ts` | **Lettura ad alta voce** (TTS italiano, converte esponenti/date/MAIUSCOLE) |
| `client/src/lib/heightSync.ts` | Cornice dinamica: sincronizzazione altezza iframe (`labvisivo:height`) |
| `client/src/main.tsx` | Entry: chiama `initHeightSync()` PRIMA del render; provider tRPC/Query |
| `client/src/App.tsx` | Router (Wouter) + `AccessibilityProvider` + barra accessibilità |
| `client/public/fonts/` | **Font OpenDyslexic** (TTF/OTF/WOFF2) |
| `client/src/index.css` | Tema Tailwind (palette terracotta), `@font-face`, stili accessibilità |
| `server/_core/index.ts` | Server Express: `/fonts` CORS, `/api/auth/*`, tRPC `/api/trpc`, `/_health`, static |
| `server/db.ts` / `server/routers.ts` | Client DB e procedure tRPC (scaffold — non usate dal flusso studente) |
| `drizzle/schema.ts` | Schema PostgreSQL (Better Auth: user/session/account/verification) |
| `drizzle.config.ts` | Configurazione Drizzle (dialect: postgresql) |
| `cornice-dinamica/` | Embed Blogger: **dedicata v4 impermeabile + anti-tremolio**, lite, universale, autosufficiente, test |
| `embed-blogger.html` | Cornice dedicata pronta da incollare nel post (stesso contenuto della dedicata) |
| `render.yaml` | Blueprint Render (deploy con un clic) |
| `.github/workflows/ci.yml` | CI: install → check → build a ogni push |
| `AGENTS.md` | Istruzioni operative rapide per agenti IA (punto di ingresso) |
| `ACCESSIBILITA.md` | ⚠️ **Sezione ACCESSIBILITÀ** (misure portabili su altre app) |
| `DEPLOY-RENDER.md` | Trasferimento su Render via GitHub |
| `GUIDA-IA.md` | QUESTO FILE |
| `DOCUMENTAZIONE_DETTAGLIATA.md` | Storico delle modifiche e dettagli implementativi |

### Flusso dati dello studente (tutto client-side)

```
Benvenuto (dati studente in memoria + localStorage)
  → PASSO 1: titolo + colore (stato mappa)
  → PASSO 2: rami + colori + parole-legame facoltative
  → PASSO 3: parole chiave per ramo + parole-legame facoltative
  → Canvas SVG (#mappa-da-stampare): layout radiale, immagini, drag, tastiera, zoom mobile
  → Editor dei legami: si apre solo dal pulsante PAROLE-LEGAME; un campo per ogni linea, anche delle vecchie mappe
  → Export intero a 1080px: html2canvas (scala 2×, anche su mobile) → PDF (jsPDF) e/o PNG
```

---

## 3. Ricostruire l'app da GitHub

### 3.1 Localmente (qualsiasi macchina)

```bash
git clone https://github.com/<utente>/<repo>.git
cd <repo>
pnpm install          # usa pnpm-lock.yaml (versioni identiche)
pnpm check            # type-check TypeScript — MAI saltare
pnpm dev              # avvia dev server (Vite + Express, porta 3000)
```

> **pnpm** è richiesto (c'è `pnpm-lock.yaml` e `packageManager: pnpm@10.4.1`).
> Node 22 consigliato. Se non hai pnpm: `npm i -g pnpm@10.4.1` o `corepack enable`.

### 3.2 Su Easy-Peasy.AI (MARKY)

1. Caricare la cartella (o clonare la repo) nel sandbox.
2. Verificare la struttura con `webdev_view_project` e leggere **questo** file.
3. Eseguire `pnpm check` poi `pnpm build`.
4. Preview: `webdev_deploy mode="preview"` → testare.
5. Produzione: `webdev_save_checkpoint` + `webdev_deploy mode="production"`
   (SOLO dopo conferma esplicita dell'utente).

> ⚠️ Scaffold **`web-db-user`**: Easy-Peasy inietta `DATABASE_URL`,
> `BETTER_AUTH_SECRET` e `TRUSTED_ORIGINS` nel sandbox. Il flusso studente
> **non ne ha bisogno**, ma non rimuoverli dal `.env`.

---

## 4. Comandi: install, check, build, dev, test

```bash
pnpm install                 # dipendenze (usa pnpm-lock.yaml)
pnpm check                   # type-check — MAI saltare prima del deploy
pnpm build                   # vite build (client → dist/public) + esbuild server → dist/
pnpm dev                     # dev server (NODE_ENV=development, Vite HMR + Express)
pnpm start                   # produzione: NODE_ENV=production node dist/index.js
pnpm test                    # vitest: geometria nodi, parole-legame e bersagli touch
pnpm format                  # prettier
pnpm db:push                 # genera + applica migrazioni Drizzle (richiede DATABASE_URL)
pnpm db:studio               # Drizzle Studio (ispezione DB)
```

Script chiave del `package.json`:

```jsonc
"dev":   "NODE_ENV=development tsx watch server/_core/index.ts",
"build": "vite build && esbuild server/_core/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist --external:./vite --external:./vite.js",
"start": "NODE_ENV=production node dist/index.js",
"check": "tsc --noEmit"
```

---

## 5. Come variare l'app (nuova attività / nuovo aspetto)

> L'app NON ha un clone script meccanico (a differenza delle app con grado
> variabile). Le variazioni si fanno **editando i punti giusti**, elencati sotto.

### 5.1 Testi, consegne e fasi

Tutto il contenuto didattico (titoli, consegne, pulsanti) è in
`client/src/pages/Home.tsx` e nelle costanti di `client/src/lib/tipi-mappa.ts`:

| Cosa cambiare | Dove |
|---|---|
| Titolo dell'attività (header) | `Home.tsx` (JSX di testata) |
| Testo dei passi (tronco/rami/foglie) | `Home.tsx` (sezioni PASSO 1/2/3) |
| Numero/ordine dei passi | `Home.tsx` (macchina a stati dei passi) |
| Placeholder e intestazioni dei contenitori | `Home.tsx` |
| Tipi mappa, colori default | `client/src/lib/tipi-mappa.ts` |

> ⚠️ **MAI** rinominare `mappa-da-stampare` (id del canvas esportato) né le chiavi
> di stato del flusso senza aggiornare TUTTI i riferimenti (drag & drop, export).

### 5.2 Colori (palette terracotta)

In `client/src/index.css` (`:root`):

```css
--background: #F5F3ED;        /* sfondo pagina */
--card:       #FAF8F5;        /* card */
--primary:    #B8846A;        /* terracotta */
--secondary:  #F0E5DF;
--secondary-foreground: #8B3A1A;
--ring:       #B8846A;        /* anello focus */
--branch-red/blue/green/purple/orange: ...  /* colori rami */
```

I colori di **tronco/rami/foglie** disponibili nell'interfaccia sono nelle costanti
di `client/src/lib/tipi-mappa.ts` (badge colori) e nelle variabili `--branch-*`.

### 5.3 Nuova attività sullo stesso schema (es. altro argomento)

Per creare una nuova app **uguale nello schema** con contenuto diverso
(es. "Mappa su un altro capitolo", versione a 6 passi…):

1. Copiare la cartella del progetto in una nuova (es. `mappa-altra-attivita`).
2. Cambiare in `client/src/index.html`: `<title>`, `lang`, meta description.
3. Cambiare testi e consegne in `Home.tsx` + costanti in `tipi-mappa.ts`.
4. Cambiare eventualmente palette in `index.css` (senza toccare le variabili
   di accessibilità `--lf-*`, `lf-ruler`, `lf-hc`).
5. Aggiornare `README.md`, `GUIDA-IA.md`, i titoli in `cornice-dinamica/`
   (riga `APP_URL`, `APP_TITLE`, colori) e `embed-blogger.html`.
6. `pnpm check` → `pnpm build` → preview → produzione.

### 5.4 Logica del canvas / drag & drop

La mappa è in `ConceptMapCanvas.tsx`. Regole implementative consolidate:

- **Niente `setState` durante `onPointerMove`**: le posizioni vivono in `useRef`;
  un solo contatore `tick` incrementato via `requestAnimationFrame`.
- `svg.setPointerCapture()` per non perdere il puntatore (mobile).
- Larghezza testo stimata con fattore **0.72** (calibrato su Cambria/Georgia).
- Padding dichiarato per lato (`padCentroH`, `padRamoH`, `padKwH`).
- Le immagini si trascinano **direttamente sul canvas** (niente pad separato).
- Le parole-legame si trascinano autonomamente con mouse/tocco o si spostano con
  le frecce: `spostamentoLegame` memorizza l'offset rispetto alla posizione
  automatica. L'editor si apre solo dal pulsante dedicato, mai dalle linee.

Dettagli nel file `DOCUMENTAZIONE_DETTAGLIATA.md` (storico completo).

---

## 6. Database, auth e API: cosa NON toccare

Il progetto è uno scaffold `web-db-user`: include Better Auth + Drizzle PostgreSQL.
Il flusso studente **non usa il DB** (nessuna `trpc.*` in `Home.tsx`), ma
l'infrastruttura è condivisa e **non va rimossa**:

| Area | File | Nota |
|------|------|------|
| Client DB | `server/db.ts` | **NON rimuovere l'export `db`** (serve ad auth.ts) |
| Better Auth | `server/_core/auth.ts`, `oauth.ts` | Crea auth solo se DB + `BETTER_AUTH_SECRET` presenti; altrimenti `/api/auth/*` → 503 |
| Procedure tRPC | `server/routers.ts`, `server/_core/systemRouter.ts` | `system.health` è usato per il check |
| Static | `server/_core/static.ts` | Serva `dist/public` + SPA fallback + `Cache-Control` |
| `/fonts` CORS | `server/_core/index.ts` | **Necessario per l'embed** (font cross-origin) |
| `/api/upload` | `server/_core/upload.ts`, `server/storage.ts` | Richiede `STORAGE_*`; non usato dallo studente |

Se aggiungi funzioni che usano il DB: schema in `drizzle/schema.ts` →
`pnpm db:push` → helper in `server/db.ts` → procedure in `server/routers.ts`.

---

## 7. Build, verifica e deploy su Easy-Peasy.AI

```bash
pnpm install
pnpm check          # type-check — MAI saltare
pnpm build          # produce dist/ (client in dist/public, server in dist/index.js)
pnpm dev            # sviluppo
pnpm start          # produzione locale
```

Su Easy-Peasy.AI (MARKY):
- **Preview**: `webdev_deploy mode="preview" project_dir="<cartella>"`.
- **Produzione**: prima `webdev_save_checkpoint`, poi (solo dopo conferma
  esplicita dell'utente) `webdev_deploy mode="production"`.

Verifica residui dopo modifiche di testi (es. vecchio nome attività):

```bash
grep -rn "Mappa Concettuale\|3 PASSI\|tronco\|rami\|foglie" client/src | head
```

---

## 8. Trasferimento su Render (via GitHub)

Il progetto include già:
- **`render.yaml`** — Blueprint Render (Node 22, `pnpm install --frozen-lockfile &&
  pnpm build`, `pnpm start`).
- **`.github/workflows/ci.yml`** — CI su ogni push (install → check → build).

Procedura completa passo-passo: **[`DEPLOY-RENDER.md`](DEPLOY-RENDER.md)**.

In sintesi:
1. Carica questa cartella su un repository GitHub (root del repo).
2. Su [render.com](https://render.com) → **New → Blueprint** → collega il repo.
3. Render legge `render.yaml` e crea il Web Service automaticamente.

> Il cuore didattico è client-side: su Render **funziona anche senza database**.
> Better Auth si attiva solo se imposti `DATABASE_URL` + `BETTER_AUTH_SECRET`
> + `TRUSTED_ORIGINS` (per la pagina `/login` dello scaffold).

---

## 9. ACCESSIBILITÀ (sezione portabile)

> ⚠️ **SEZIONE ACCESSIBILITÀ** — riassume TUTTE le misure di accessibilità
> dell'app, **portabili su altre app simili** copiando i file indicati.
> Dettaglio completo: **[`ACCESSIBILITA.md`](ACCESSIBILITA.md)**.

### Misure implementate (riepilogo)

| # | Misura | File da copiare su altre app |
|---|--------|------------------------------|
| 1 | **Font OpenDyslexic** auto-ospitato (default) | `client/public/fonts/` + `@font-face` in `client/src/index.css` |
| 2 | **Barra di accessibilità** (Font, Interlinea, Righello, Modalità, Ascolto) | `client/src/components/AccessibilityToolbar.tsx` |
| 3 | **Dimensione testo regolabile** 80%–160% | `client/src/contexts/AccessibilityContext.tsx` → `--lf-scale` |
| 4 | **Interlinea regolabile** 1.65 / 1.9 / 2.2 / 2.6 | `AccessibilityContext.tsx` → `--lf-lh` |
| 5 | **Righello di lettura** | `index.css` (`.lf-ruler-band`) |
| 6 | **Modalità ad alto contrasto** | `index.css` (`html.lf-hc`) |
| 7 | **Focus visibile** (`:focus-visible`) | `index.css` |
| 8 | **`prefers-reduced-motion`** rispettato | `index.css` |
| 9 | **Testo base 18px + selezione ad alto contrasto** | `index.css` |
| 10 | **ARIA / tastiera** (`role="toolbar"`, `aria-live`, `aria-label`) | `AccessibilityToolbar.tsx`, `Home.tsx` |
| 11 | **Lettura ad alta voce** (TTS italiano) | `client/src/hooks/useReadAloud.ts` + pulsante "Ascolto" |
| 12 | **Preferenze persistenti** (`localStorage` `m3p_access`) | `AccessibilityContext.tsx` |
| 13 | **CORS sui font** (embed cross-origin) | `server/_core/index.ts` |
| 14 | **Embed a altezza automatica senza 100vh** (altezza reale, **stabile** e "restringibile": misura del solo contenuto + soglia anti-oscillazione) | `client/src/lib/heightSync.ts` (`currentHeight`) + `html.lf-embedded` in `index.css` |

**Come portarle su un'altra app** (sintesi): copiare `client/public/fonts/`; copiare
in `index.css` i 4 `@font-face`, le variabili `--lf-*`, `.lf-ruler-band`, `html.lf-hc`,
`:focus-visible`, `::selection`, `@media (prefers-reduced-motion: reduce)`;
copiare `AccessibilityContext.tsx` + `AccessibilityToolbar.tsx` e montarli in
`App.tsx` dentro `<AccessibilityProvider>` prima del router; copiare
`useReadAloud.ts`; aggiungere `aria-label` ai campi e `role="toolbar"`/`aria-live`
alla barra; CORS `/fonts` nel server; `heightSync.ts` per l'embed.

---

## 10. Cornice dinamica (embed per il blog)

Il pacchetto include la **cornice dinamica** in `cornice-dinamica/`: blocco HTML
autonomo da incollare su Blogger (o qualsiasi sito) che mostra l'app in un iframe
con **altezza automatica**, **font OpenDyslexic**, **Schermo intero**, **Ricarica**
e **isolamento multi-embed (impermeabile, v3)**.

| File | Uso |
|------|-----|
| `cornice-dinamica/embed-mappa-3passi-dedicata.html` | ⭐ **Versione dedicata (v4 impermeabile + anti-tremolio)**: titolo e pulsanti sulla stessa riga centrati, Schermo intero, Ricarica, spinner, stato online/errore con **Riprova** (timeout 15 s), ping periodico, altezza al resize, isolamento multi-embed (scoping DOM, id con token, filtro `e.source`) e **anti-loop mobile**. **Da incollare nel post.** |
| `cornice-dinamica/embed-mappa-3passi-lite.html` | Versione minima (~5 KB) riutilizzabile: cambia `APP_URL` (o passa `?app=URL`) |
| `cornice-dinamica/embed-universale.html` | Template universale con URL segnaposto, per altre app |
| `cornice-dinamica/embed-mappa-3passi.html` | Versione autosufficiente (~128 KB, font in base64) |
| `cornice-dinamica/test-dedicata.html` | Pagina di test locale (simula un post Blogger) |
| `cornice-dinamica/test-impermeabile.html` | Test multi-embed: 2 cornici + un «intruso» che tenta il furto dell'iframe |
| `cornice-dinamica/README.md` | Documentazione completa della cornice |
| `embed-blogger.html` | ⭐ Stessa cornice dedicata, pronta da incollare (radice progetto) |

### Protocollo altezza dinamica

- L'app (`client/src/lib/heightSync.ts`, inizializzato da `client/src/main.tsx`)
  misura la propria altezza e la invia al genitore con
  `{ type: "labvisivo:height", height }`.
- La cornice ascolta i messaggi `message` e imposta `iframe.style.height`.
- La cornice invia `{ type: "labvisivo:ping", cornice: <token> }`; l'app risponde
  con la sua altezza **rispecchiando il token** (heightSync legge `?cornice=<token>`).
- **Anti-loop**: dentro un iframe l'app aggiunge `lf-embedded` a `<html>` e il CSS
  disattiva `min-h-screen`/`min-h-dvh`, così l'altezza misurata non dipende
  dall'altezza dell'iframe.
- **Anti-oscillazione + SHRINK (fix 2026-09-10, con misurazioni reali)**:
  `currentHeight()` misura **il bordo inferiore reale del contenuto**
  (`body.getBoundingClientRect().bottom + scrollY`, poi
  `Math.max(..., body.scrollHeight, body.offsetHeight)`) e **non usa mai**
  `documentElement.offsetHeight` / `scrollHeight` / `clientHeight` come
  riferimento: dentro un iframe quelle misure valgono l'altezza del **viewport**
  quando il contenuto è più corto, quindi (a) la cornice non potrebbe mai
  restringersi e (b) una differenza di pochi pixel fra due misure successive
  riavvia il ciclo app → cornice → app.
- **UN SOLO MITTENTE**: la logica legacy `mappaconcettuale:height` è stata
  rimossa da `Home.tsx`; ora `heightSync.ts` invia **entrambi** i protocolli con
  la **stessa** misura (le vecchie cornici già incollate nei post continuano a
  funzionare). Prima c'erano due mittenti con due misure diverse (562 px contro
  554 px, 8 px di scarto) che si alternavano a ogni resize.
- **Tre difese anti-loop**: soglia `TOLLERANZA_PX = 4` (le micro-variazioni non
  vengono inviate), **deduplica** (nessun messaggio identico ripetuto) e
  **debounce** `DEBOUNCE_MS = 100` sugli observer; al `ping` della cornice si
  risponde come «battito» al massimo ogni `HEARTBEAT_MS = 3000`.
- **Misura prima/dopo** (iframe 900 px, prima pagina BENVENUTO): **1314 → 6**
  messaggi in 10 s (poi silenzio totale). A 748 px di larghezza (come il post
  del blog) la cornice si assesta a **576 px**, margini 24,0 px sopra e 24,4 px
  sotto la card, **0 scrollbar interne**; nel post dal vivo: altezza **588 px
  stabile** su 24 campioni in 12 s e stato «App online».
- **Prima pagina (BENVENUTO) con margini pareggiati**: allo step 0 il `<main>`
  riceve la classe `lf-welcome-main` (padding verticale gestito da `.lf-welcome`:
  24px sopra e 24px sotto la card in embed). In pagina AUTONOMA
  (`window.self === window.top`) `Home.tsx` aggiunge `html.lf-welcome-top` su
  `<html>`: canvas bianco sotto la card e `min-h-screen` disattivato (niente vuoto
  crema). Regole in `index.css`, sezione "PRIMA PAGINA BENVENUTO".
- **Retrocompatibilità**: `Home.tsx` invia ancora il messaggio legacy
  `mappaconcettuale:height` per le vecchie cornici già incollate nei post:
  NON rimuoverlo.

### Adattare la cornice a un'altra app

1. **Versione universale/lite**: cambia la riga `APP_URL` nella sezione
   `⚙️ CONFIGURAZIONE`; oppure passa `?app=URL&title=NOME` come parametri.
2. **Versione dedicata**: cambia `APP_URL` + i due URL `@font-face` + il titolo.
3. Le app devono servire i font su `/fonts/*` con CORS (`server/_core/index.ts`).

Per i dettagli completi leggi `cornice-dinamica/README.md`.

---

## 11. Regole d'oro

1. **MAI saltare `pnpm check`** prima del deploy — gli errori TypeScript bloccano la build.
2. **Il flusso studente è client-side**: non aggiungere dipendenze dal server/DB
   per modifiche di testi o colori.
3. **Il canale postMessage è `'labvisivo:height'`** (condiviso): NON cambiarlo negli
   embed. Mantieni anche il legacy `mappaconcettuale:height` in `Home.tsx`.
4. **`#mappa-da-stampare` e il font Cambria del canvas NON si toccano**: le
   larghezze dei riquadri e l'export PDF/PNG dipendono da quel font.
5. **NON rinominare le chiavi di stato del flusso** senza aggiornare drag & drop,
   export e persistenza.
6. **Le preferenze di accessibilità** (`--lf-*`, `lf-ruler`, `lf-hc`, `m3p_access`)
   restano sempre attive e persistenti.
7. **Prima del deploy produzione**: sempre `webdev_save_checkpoint` con descrizione,
   poi conferma esplicita dell'utente.
8. **pnpm, non npm**: il progetto usa `pnpm-lock.yaml` e `packageManager pnpm@10.4.1`.

---

*Documento generato per il pacchetto esportabile di "Mappa Concettuale 3 Passi" —
Settembre 2026.*
