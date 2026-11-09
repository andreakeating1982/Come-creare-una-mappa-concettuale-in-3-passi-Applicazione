# 🚀 DEPLOY-RENDER — Trasferire l'app da Easy-Peasy.AI a Render (via GitHub)

> Guida passo-passo per spostare la **Mappa Concettuale 3 Passi** su
> [Render.com](https://render.com) usando un repository GitHub e il Blueprint
> (`render.yaml`) già incluso nel pacchetto.

---

## Perché funziona "out of the box"

L'app è un **frontend React/Vite + un server Express** che:

- serve i file statici (`dist/public`); il routing lato client (Wouter) ricade su
  `index.html` (SPA);
- espone l'health check `/_health` (usato da Render per il monitoraggio);
- imposta **CORS** `Access-Control-Allow-Origin: *` su `/fonts` (per caricare il
  font OpenDyslexic dalle cornici embed cross-origin);
- monta Better Auth su `/api/auth/*` **solo se** `DATABASE_URL` e
  `BETTER_AUTH_SECRET` sono configurati; altrimenti risponde 503 (l'app
  didattica NON ne ha bisogno).

> **Il cuore didattico (benvenuto + 3 passi + canvas + PDF/PNG) è interamente lato
> client**: non chiama il database, non richiede chiavi API. Su Render l'app
> funziona **anche senza database**. Il DB (PostgreSQL) serve solo alle funzioni
> dello scaffold (auth, pagina `/login`) se vuoi attivarle.

---

## Prerequisiti

- Un account GitHub (gratuito).
- Un account Render (gratuito — il piano Free basta per iniziare).
- Il contenuto di questo pacchetto (la cartella dell'app).

---

## Passo 1 — Creare il repository su GitHub

1. Vai su [github.com](https://github.com) → **New repository**.
2. Dagli un nome (es. `mappa-concettuale-3-passi`), **Public** o **Private** a scelta.
3. **NON** inizializzare con README/gitignore (Render clonerà il tuo codice).
4. Carica **tutti i file di questo pacchetto** nella root del repository.

Da terminale (nella cartella del pacchetto):

```bash
git init
git add .
git commit -m "Mappa Concettuale 3 Passi"
git branch -M main
git remote add origin https://github.com/<tuo-utente>/mappa-concettuale-3-passi.git
git push -u origin main
```

> **Nota**: NON committare `node_modules/`, `dist/`, `.git/` e `.env` (con le
> chiavi). Il pacchetto ZIP esportato li esclude già e `.gitignore` li ignora.
> Committa invece `.env.example` (template senza segreti).

---

## Passo 2 — Deploy con il Blueprint su Render

1. Vai su [render.com](https://render.com) → **Dashboard** → **New** → **Blueprint**.
2. Collega il repository GitHub che hai appena creato.
3. Render legge automaticamente il file **`render.yaml`** alla root e mostra
   l'anteprima del Web Service che sta per creare.
4. Clicca **Apply** (o **Create Resources**).

Il file `render.yaml` (già incluso) definisce:

```yaml
services:
  - type: web
    name: mappa-concettuale-3-passi
    runtime: node
    plan: free
    buildCommand: pnpm install --frozen-lockfile && pnpm build
    startCommand: pnpm start
    healthCheckPath: /_health
    autoDeploy: true
    envVars:
      - key: NODE_VERSION
        value: "22"
      - key: NODE_ENV
        value: production
```

Render:
1. installa le dipendenze dal lockfile (`pnpm install --frozen-lockfile`);
2. esegue la build (`pnpm build` → Vite per il client + esbuild per il server → `dist/`);
3. avvia `pnpm start` (`NODE_ENV=production node dist/index.js`);
4. ascolta su `process.env.PORT` (impostata automaticamente da Render);
5. controlla lo stato su `/_health`.

---

## Passo 3 — Verifica

1. Attendi che il deploy finisca (stato **Live**).
2. Apri l'URL fornito da Render (es. `https://mappa-concettuale-3-passi.onrender.com`).
3. Verifica che:
   - la schermata di benvenuto si carichi (Cognome, Nome, Data, Classe → ENTRA);
   - i **3 passi** funzionino (tronco → rami → foglie + immagini);
   - il **canvas** mostri la mappa e il **drag & drop** funzioni;
   - il **PDF** e il **PNG** si scarichino correttamente;
   - il **font OpenDyslexic** si carichi (DevTools → Network → `/fonts/…` → 200);
   - la **barra di accessibilità** funzioni (A−/A+, interlinea, righello, contrasto, Ascolto).

---

## Passo 4 — (Facoltativo) Attivare database e autenticazione

Il flusso didattico NON richiede il DB. Se vuoi attivare le funzioni auth dello
scaffold (pagina `/login`, Better Auth), crea un database PostgreSQL:

1. Su Render: **New → PostgreSQL** (oppure usa un Neon/Turso esistente).
2. Copia la **Internal Database URL** (o External).
3. Aggiungi le variabili al Web Service (**Environment**):

| Variabile | Valore | Obbligatoria |
|-----------|--------|--------------|
| `DATABASE_URL` | `postgres://…` (URL del DB) | per l'auth |
| `BETTER_AUTH_SECRET` | `openssl rand -base64 32` | per l'auth |
| `TRUSTED_ORIGINS` | il tuo dominio Render (es. `https://mappa-concettuale-3-passi.onrender.com`) | per l'auth |
| `NODE_VERSION` | `22` | sì |
| `NODE_ENV` | `production` | sì |

4. Applica le migrazioni dello schema (tabelle Better Auth):

```bash
# in locale, con DATABASE_URL impostata sul DB di Render:
DATABASE_URL="postgres://…" pnpm db:push
```

> Le migrazioni creano le tabelle `user`, `session`, `account`, `verification`
> definite in `drizzle/schema.ts`. Senza DB queste tabelle non servono.

---

## Passo 5 — Dominio personalizzato (opzionale)

1. Su Render → il Web Service → **Settings** → **Custom Domains**.
2. Aggiungi il tuo dominio (es. `mappa.miosito.it`) e configura il record **CNAME**
   presso il tuo provider DNS come indicato da Render.
3. Attendi la verifica e l'emissione del certificato HTTPS (automatico).

---

## Passo 6 — Aggiornare l'app dopo il primo deploy

Con `autoDeploy: true`, **ogni `git push` su `main` riavvia automaticamente la
build**. Basta quindi:

```bash
git add .
git commit -m "Aggiornamento …"
git push
```

La CI di GitHub (`.github/workflows/ci.yml`) esegue già in parallelo
`install → check → build`, così gli errori TypeScript vengono scovati prima del
deploy.

---

## Risoluzione problemi

| Sintomo | Causa probabile | Soluzione |
|---------|-----------------|-----------|
| La pagina è bianca o 404 su route interne | Routing SPA | Il server fa già il fallback su `index.html` (`static.ts`) — verificare `pnpm start` in produzione |
| Font OpenDyslexic non carica (fallback serif) | CORS su `/fonts` mancante | Verificare `app.use("/fonts", …)` in `server/_core/index.ts` |
| Build fallita | Errore TypeScript | Eseguire `pnpm check` in locale e correggere |
| `ERR_OSSL` / versione Node | Node diverso da 22 | `NODE_VERSION=22` è già in `render.yaml` |
| Auth `/api/auth/*` risponde 503 | `DATABASE_URL` / `BETTER_AUTH_SECRET` non impostati | Non è un errore: il flusso didattico non usa l'auth. Per attivarla vedi Passo 4 |
| Upload immagini non funziona | `STORAGE_*` non configurati | Non usato dal flusso studente (le immagini sono dataURL locali). Ignorabile |
| Build lenta / memoria | Piano free di Render | Riprovare; il piano free ha limiti di memoria ma l'app è leggera |

---

*Guida inclusa nel pacchetto esportabile — Settembre 2026.*
