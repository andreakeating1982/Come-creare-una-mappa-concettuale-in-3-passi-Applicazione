# AGENTS.md — Istruzioni operative per agenti IA su questa repository

> Questo file è pensato per gli agenti IA (GitHub Copilot, Claude, ChatGPT, MARKY
> su Easy-Peasy.AI, ecc.) che lavorano su questa repository. È il **punto di
> ingresso rapido**: leggere **GUIDA-IA.md** per la guida completa.

## Cosa è questa app

**Mappa Concettuale 3 Passi** — app didattica che guida lo studente a costruire una
mappa concettuale in 3 passi (tronco → rami → foglie/immagini) con canvas SVG
interattivo (drag & drop), download PDF/PNG, font **OpenDyslexic** preimpostato e
barra di accessibilità (BES/DSA/ipovisione). Nessun quiz, nessuna dashboard
docente. Il cuore didattico è **interamente lato client**.

## Stack e comandi

| | |
|---|---|
| Stack | Vite + React 19 + TypeScript + TailwindCSS 4 + tRPC 11 + Better Auth + Drizzle (PostgreSQL) + Express + Wouter |
| Package manager | **pnpm** (mai npm) — `packageManager: pnpm@10.4.1` |
| Install | `pnpm install` |
| Type-check | `pnpm check` — **MAI saltare** prima di un deploy |
| Build | `pnpm build` (Vite client → `dist/public`, esbuild server → `dist/`) |
| Dev | `pnpm dev` (Vite HMR + Express, porta 3000) |
| Produzione locale | `pnpm start` (`NODE_ENV=production node dist/index.js`) |

## File critici (non confondersi)

| File | Ruolo |
|------|-------|
| `client/src/pages/Home.tsx` | ⭐ **Tutta l'app**: benvenuto + 3 passi + canvas + export + persistenza |
| `client/src/components/ConceptMapCanvas.tsx` | Canvas SVG, parole-legame e drag & drop (ref-based, **zero setState durante il movimento**) |
| `client/src/lib/mappaTouch.ts` | Bersagli touch di almeno 44 px e selezione dell'elemento visibile più vicino; prove in `server/mappa-touch.test.ts` |
| `client/src/components/ParoleLegameEditor.tsx` | Editor accessibile dei collegamenti titolo→ramo e ramo→foglia |
| `client/src/lib/tipi-mappa.ts` | Tipi, colori, helper della mappa |
| `client/src/contexts/AccessibilityContext.tsx` | Accessibilità: `--lf-scale`, `--lf-lh`, localStorage `m3p_access` |
| `client/src/components/AccessibilityToolbar.tsx` | Barra di accessibilità (Font, Interlinea, Righello, Modalità, Ascolto) |
| `client/src/hooks/useReadAloud.ts` | Lettura ad alta voce (TTS italiano) |
| `client/src/lib/heightSync.ts` | Embed: altezza iframe `labvisivo:height` (**può restringersi**) |
| `client/src/index.css` | Palette terracotta, `@font-face` OpenDyslexic, regole `html.lf-embedded` / `html.lf-welcome-top`, accessibilità |
| `cornice-dinamica/` + `embed-blogger.html` | Cornice dinamica embed per il blog (v4 impermeabile + anti-tremolio) |
| `render.yaml` + `.github/workflows/ci.yml` | Deploy Render (Blueprint) + CI |

## Documenti da consultare

| Documento | Contenuto |
|-----------|-----------|
| `GUIDA-IA.md` | ⭐ Guida completa: ricostruzione, variazione, deploy Easy-Peasy, sezione accessibilità, cornice dinamica, regole d'oro |
| `ACCESSIBILITA.md` | ⚠️ Sezione ACCESSIBILITÀ: tutte le misure BES/DSA, portabili su altre app |
| `DEPLOY-RENDER.md` | Trasferimento Easy-Peasy.AI → Render via GitHub |
| `README.md` | Documentazione generale |
| `DOCUMENTAZIONE_DETTAGLIATA.md` | Storico modifiche e dettagli implementativi |
| `cornice-dinamica/README.md` | Cornice dinamica (tutte le versioni) |

## Regole d'oro (sintesi)

1. **`pnpm check` prima di ogni deploy** — gli errori TypeScript bloccano la build.
2. **Drag & drop**: tutto in `useRef`, un solo contatore `tick` via
   `requestAnimationFrame`; **niente `setState` in `onPointerMove`** (perde il
   pointer capture su touch). Non modificare `drag.current`/`posRami`/`posParole`
   senza seguire l'architettura esistente.
3. **Canvas**: NON toccare `#mappa-da-stampare`, il font Cambria del canvas e il
   fattore di larghezza testo `0.72` — export PDF/PNG e larghezze ne dipendono.
4. **postMessage embed**: canale condiviso `labvisivo:height` + ping con token
   (`?cornice=`). Il legacy `mappaconcettuale:height` è inviato **da
   `heightSync.ts`** (stessa misura): NON aggiungere un secondo mittente in
   `Home.tsx` — due mittenti con misure diverse generano l'oscillazione
   dell'altezza (bug misurato il 2026-09-10).
5. **Altezza embed — una sola misura, solo il contenuto**: `currentHeight()` usa
   `body.getBoundingClientRect().bottom + scrollY` (con `max(...,
   body.scrollHeight, body.offsetHeight)`). NON usare `documentElement.
   offsetHeight`/`scrollHeight`/`clientHeight`: dentro un iframe valgono la
   **viewport** quando il contenuto è corto, quindi la cornice non può
   restringersi e riparte il ciclo di messaggi. Servono anche la soglia
   `TOLLERANZA_PX = 4`, la deduplica e il debounce (`DEBOUNCE_MS = 100`):
   rimuoverli reintroduce il loop (~130 messaggi/secondo).
6. **Prima pagina (BENVENUTO, step 0)**: margini pareggiati 24px/24px — il `<main>`
   riceve `lf-welcome-main` allo step 0, la card `.lf-welcome` ha il padding 24/24,
   in pagina autonoma `html.lf-welcome-top` rende bianco il canvas sotto la card.
   Non reintrodurre `min-h-screen` (100vh) dentro l'iframe (loop di crescita).
7. **Accessibilità**: OpenDyslexic preimpostato, preferenze persistenti `--lf-*`,
   `lf-ruler`, `lf-hc`, `m3p_access`. Non rimuovere mai.
8. **pnpm, non npm**; il DB/auth dello scaffold non è usato dal flusso studente e
   **non va rimosso** (il server lo attiva solo se `DATABASE_URL` è impostato).
9. **Parole-legame e mobile**: `Ramo.parolaLegame` e `ParolaChiave.parolaLegame`
   sono facoltativi e retrocompatibili. I loro `spostamentoLegame` relativi alla
   posizione automatica sono salvati dopo drag o tastiera; l'editor si apre solo
   dal pulsante dedicato, mai dal canvas. `Home.tsx` offre zoom e scroll interno.
   Preservare i bersagli HTML trasparenti con `touch-action: none` sui singoli
   elementi: evitano `pointercancel` su mobile senza impedire lo scroll nell'area
   vuota. I gruppi SVG restano accessibili via tastiera; testare anche nell'iframe.
   L'export clona la mappa a 1080px
   per includerla tutta anche da telefono. Non modificare la misura anti-loop
   di `heightSync.ts` né usare `vh` per l'altezza del viewport della mappa in iframe.
