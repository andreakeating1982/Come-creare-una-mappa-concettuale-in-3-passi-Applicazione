# 🗺️ Mappa Concettuale 3 Passi — App Interattiva

Un'app didattica che guida lo studente nella costruzione di una **mappa
concettuale** in **3 passi** (tronco, rami, foglie/immagini), con canvas SVG
interattivo (drag & drop), **font OpenDyslexic** (default, per DSA/BES) e
download in **PDF** e **PNG**.

> Variante "3 passi" della famiglia Mappa Concettuale (salta i passi 1–3 della
> versione a 6 passi: leggi e ripeti, prendi appunti, crea hashtag).

---

## 🚀 L'app è già online

```
https://mappa-3passi-preview.easy-peasy.site
```

---

## 📚 Documentazione chiave (leggi prima di modificare)

| Documento | A cosa serve |
|-----------|--------------|
| [`AGENTS.md`](AGENTS.md) | Istruzioni operative rapide per agenti IA (comandi, file critici, regole d'oro) |
| **[`GUIDA-IA.md`](GUIDA-IA.md)** | **Guida completa per l'IA**: ricostruire e variare l'app dalla repo GitHub (testi, colori, nuova attività, file critici, regole d'oro) |
| **[`ACCESSIBILITA.md`](ACCESSIBILITA.md)** | ⚠️ **SEZIONE ACCESSIBILITÀ** — TUTTE le misure BES/DSA (OpenDyslexic, barra, lettura ad alta voce…), **portabili su altre app** |
| **[`DEPLOY-RENDER.md`](DEPLOY-RENDER.md)** | Trasferire l'app da **Easy-Peasy.AI a Render** via GitHub |
| [`DOCUMENTAZIONE_DETTAGLIATA.md`](DOCUMENTAZIONE_DETTAGLIATA.md) | Storico completo delle modifiche e dettagli implementativi |
| [`cornice-dinamica/README.md`](cornice-dinamica/README.md) | Cornice dinamica embed per il blog (tutte le versioni) |

---

## 📱 Come si usa

### Per lo studente

1. Apri l'app e compila la schermata iniziale con **Cognome, Nome, Data, Classe**
2. Clicca **ENTRA**
3. **PASSO 1 – IL TRONCO**: scrivi il titolo della mappa e scegline il colore
4. **PASSO 2 – I RAMI**: aggiungi almeno un sottotitolo, con colori e parole-legame facoltative
5. **PASSO 3 – LE FOGLIE**: premi un ramo per aprire i campi e aggiungi una parola chiave con eventuale parola-legame. Dopo ogni inserimento i campi si chiudono: premi di nuovo un ramo per aggiungere altre parole. Premi **AVANTI** per completare la mappa.
6. Nella mappa completa modifica le parole-legame con il pulsante **PAROLE-LEGAME**; puoi aggiungere immagini e QR code
7. Trascina gli elementi e le parole-legame, oppure selezionali con la tastiera e usa le frecce; sul telefono usa **INGRANDISCI**, scorri dentro la mappa e usa **RIDUCI** fino al 100% per rivederla intera
8. Scarica l'intera mappa in **PDF** o **PNG**; dati, parole-legame e posizioni sono salvati nel browser del dispositivo. Per una nuova mappa usa **RICOMINCIA** in alto e conferma.

Per mantenere la mappa leggibile: massimo **4 rami**, **3 foglie per ramo** e **16 parole-legame in totale** (una per linea, 32 caratteri ciascuna). Rimane possibile aggiungere fino a **4 immagini**. Le mappe già salvate non vengono tagliate: se superano un limite, conservano tutti gli elementi e non ne accettano altri finché il conteggio non torna sotto soglia.

### Per il docente

- Attività **autoguidata**: lo studente procede da solo, passo dopo passo
- Il PDF/PNG scaricabile contiene la mappa completa — perfetto per la valutazione
- Nessun account, nessuna configurazione: l'app è pronta all'uso
- Accessibilità inclusa: **OpenDyslexic**, barra con dimensioni testo/interlinea,
  righello di lettura, alto contrasto e **lettura ad alta voce** in italiano

---

## 🖼️ Embed nel blog (Blogger / qualsiasi sito)

> ⭐ **Consigliata — cornice dinamica dedicata**: copia l'intero contenuto di
> [`embed-blogger.html`](embed-blogger.html) (o di
> [`cornice-dinamica/embed-mappa-3passi-dedicata.html`](cornice-dinamica/embed-mappa-3passi-dedicata.html))
> nella vista HTML del post. Include titolo + pulsanti **Schermo intero** e
> **Ricarica** sulla stessa riga, spinner, stato online/errore con **Riprova**,
> **isolamento multi-embed (impermeabile v3)** e **altezza automatica**.
> Dettagli: [`cornice-dinamica/README.md`](cornice-dinamica/README.md).

**L'iframe si auto-ridimensiona** grazie ai messaggi `postMessage`
(`labvisivo:height` + ping con token), gestiti da `client/src/lib/heightSync.ts`
(protocollo condiviso della famiglia LabVisivo). Le vecchie cornici restano
compatibili (messaggio legacy `mappaconcettuale:height` in `heightSync.ts`).

---

## ♿ Accessibilità (BES/DSA)

L'app include misure di inclusione per studenti con **BES/DSA** e **ipovisione**:
**font OpenDyslexic preimpostato**, barra di accessibilità (dimensione testo
80–160%, interlinea 1.65–2.6, righello di lettura, alto contrasto), **lettura ad
alta voce** in italiano, focus visibile, ARIA, `prefers-reduced-motion`,
preferenze persistenti (`localStorage`).

Tutte le misure sono documentate e **portabili su altre app** nella
**[`ACCESSIBILITA.md`](ACCESSIBILITA.md)** (sezione ACCESSIBILITÀ).

---

## 🔀 Varianti possibili

L'app è un **sorgente** che l'**IA** (MARKY su Easy-Peasy.AI, Copilot, Claude,
ecc.) può ricostruire e variare:

1. **Nuova attività / altro argomento** — cambia testi e consegne in
   `client/src/pages/Home.tsx` + costanti in `client/src/lib/tipi-mappa.ts`.
2. **Colori** — palette terracotta in `client/src/index.css` (`:root`,
   variabili `--branch-*`).
3. **Nuova app dello stesso schema** — copia la cartella, cambia titoli/testi/
   colori (vedi `GUIDA-IA.md` sezione 5).
4. **Cornice embed per altre app** — versione lite/universale in
   `cornice-dinamica/` (cambia `APP_URL`).

La guida operativa completa è in **[`GUIDA-IA.md`](GUIDA-IA.md)**.

---

## ☁️ Trasferire su Render (via GitHub)

Il pacchetto include già tutto il necessario: `render.yaml` (Blueprint), la CI di
GitHub (`.github/workflows/ci.yml`) e la guida
**[`DEPLOY-RENDER.md`](DEPLOY-RENDER.md)**.

In sintesi: carica la cartella su un repository GitHub → su [render.com](https://render.com)
→ **New → Blueprint** → collega il repo → Render crea il Web Service
automaticamente. **L'app didattica funziona senza database** (il cuore è lato
client); DB/auth dello scaffold sono opzionali (Passo 4 della guida).

---

## 🏗️ Tecnologie

| Tecnologia | Uso |
|-----------|-----|
| React 19 + TypeScript | Frontend |
| Vite 7 | Build tool |
| TailwindCSS 4 | Styling |
| Wouter | Routing lato client |
| tRPC 11 + React Query | API (scaffold) |
| Better Auth | Autenticazione (scaffold, opzionale) |
| Drizzle ORM + PostgreSQL | Database (scaffold, opzionale) |
| html2canvas + jsPDF | Export PDF/PNG |
| Express | Server di produzione |
| OpenDyslexic | Font ad alta leggibilità (DSA/BES) |

---

## 🗂️ Struttura del progetto

```
├── client/                     # Frontend React + Vite + Tailwind
│   ├── index.html
│   ├── public/fonts/           # Font OpenDyslexic
│   └── src/
│       ├── pages/Home.tsx      # ⭐ TUTTA l'attività (benvenuto + 3 passi + export)
│       ├── components/
│       │   ├── ConceptMapCanvas.tsx      # Canvas SVG + drag & drop
│       │   ├── ParoleLegameEditor.tsx     # Campi dei collegamenti della mappa
│       │   ├── AccessibilityToolbar.tsx  # Barra accessibilità (5 moduli)
│       │   └── ui/                       # Componenti shadcn/ui
│       ├── contexts/AccessibilityContext.tsx  # Accessibilità (localStorage m3p_access)
│       ├── hooks/useReadAloud.ts         # Lettura ad alta voce (TTS italiano)
│       ├── lib/
│       │   ├── heightSync.ts             # Embed: altezza iframe (labvisivo:height)
│       │   └── tipi-mappa.ts             # Tipi, colori, helper della mappa
│       ├── App.tsx / main.tsx / index.css
├── server/                     # Server Express (static + auth + tRPC + /fonts CORS)
├── shared/                     # Costanti condivise
├── drizzle/                    # Schema e migrazioni PostgreSQL (scaffold auth)
├── cornice-dinamica/           # Cornice dinamica embed (dedicata, lite, universale, test)
├── embed-blogger.html          # Cornice dedicata pronta da incollare nel post
├── AGENTS.md                   # Istruzioni operative rapide per agenti IA
├── GUIDA-IA.md                 # Guida completa per l'IA
├── ACCESSIBILITA.md            # ⚠️ Sezione ACCESSIBILITÀ (portabile)
├── DEPLOY-RENDER.md            # Guida deploy Render
├── render.yaml                 # Blueprint Render
├── package.json                # Dipendenze e script
└── vite.config.ts              # Configurazione Vite
```

---

## 📦 Sviluppo locale

```bash
pnpm install     # dipendenze (usa pnpm-lock.yaml)
pnpm dev         # dev server (Vite + Express, porta 3000)
pnpm check       # type-check TypeScript — MAI saltare
pnpm build       # build di produzione (client + server)
pnpm start       # server di produzione
```

---

## 📄 Licenza

MIT — libero di usare, modificare e condividere.

---

*App creata con ❤️ da MARKY su Easy-Peasy.AI · Settembre 2026*
