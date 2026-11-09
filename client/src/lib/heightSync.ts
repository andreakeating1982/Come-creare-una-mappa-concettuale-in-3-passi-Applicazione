/**
 * Sincronizzazione altezza per embed iframe (protocollo `labvisivo:height`).
 *
 * Quando l'app è caricata dentro un iframe (es. cornice dinamica su Blogger
 * o su un sito), invia al parent l'altezza reale del documento così la
 * cornice può adattarsi automaticamente al contenuto (resize automatico).
 *
 * Il parent ascolta messaggi del tipo:
 *   { type: "labvisivo:height", height: <numero> }
 *
 * Portato dall'app sorgente EQUAZIONI-DI-QUARTO-GRADO-TRINOMIE-BIQUADRATICHE
 * (stessa famiglia LabVisivo / Cornice Universale).
 *
 * ------------------------------------------------------------------
 * CORREZIONI ANTI-OSCILLAZIONE (verificate con misurazioni reali)
 * ------------------------------------------------------------------
 * Il 10/09/2026 è stata riprodotta e misurata una micro-oscillazione
 * dell'altezza (~1.300 messaggi in 10 s, altezza che alternava fra due
 * valori 554 ↔ 562 px). Cause individuate, entrambe lato app:
 *
 * 1) DUE MITTENTI CON DUE MISURE DIVERSE
 *    `sendHeight()` inviava 562 px, mentre il mittente "legacy" in
 *    Home.tsx (`mappaconcettuale:height`, per vecchie cornici) inviava
 *    `document.body.scrollHeight` = 554 px (8 px in meno: il contenuto
 *    finisce a 561,64 px). I due valori si alternavano a ogni resize
 *    provocato dal parent → il parent applicava ora l'uno ora l'altro.
 *    → Ora esiste UNA SOLA misura condivisa e i due protocolli partono
 *      dalla stessa funzione, con deduplica (vedi sotto).
 *
 * 2) IL RIFERIMENTO DI MISURA INCLUDEVA IL VIEWPORT
 *    `documentElement.offsetHeight` (e `scrollHeight`) dentro un iframe
 *    valgono l'altezza del VIEWPORT quando il contenuto è più corto del
 *    frame: la misura risultava "gonfiata" all'altezza attuale dell'iframe.
 *    Effetti: (a) la cornice non poteva mai RESTRINGERSI (nel post del blog
 *    l'iframe restava bloccato a 596 px con il contenuto a 562 px);
 *    (b) bastava un pixel di differenza per far ripartire il ciclo di
 *    messaggi (il parent cambia → l'app rimisura → il parent cambia…).
 *    → Ora si misura il bordo inferiore REALE del contenuto (`body`), che
 *      non dipende dal viewport, quindi l'altezza è stabile e la cornice
 *      può sia crescere sia restringersi.
 *
 * In più: DEDUPLICA + SOGLIA + DEBOUNCE (anti-loop a tre livelli).
 */

/** Variazioni inferiori a questa soglia (px) NON vengono inviate:
 *  sono rumore di layout (arrotondamenti, scrollbar, sotto-pixel) e il
 *  rimbalzo continuo teneva la cornice in debounce permanente, impedendole
 *  di applicare l'altezza nuova. */
const TOLLERANZA_PX = 4;

/** Al "ping" della cornice rispondiamo anche a parità di valore, ma non più
 *  spesso di così (così la cornice può ricostruire l'altezza se l'ha persa,
 *  senza ricevere una raffica di messaggi identici). */
const HEARTBEAT_MS = 3000;

/** Coalescenza: più variazioni di layout ravvicinate producono UN invio. */
const DEBOUNCE_MS = 100;

/** Altezza REALE del contenuto (indipendente dal viewport dell'iframe).
 *
 *  IMPORTANTE: NON usare `documentElement.offsetHeight` / `scrollHeight`
 *  come riferimento assoluto. Dentro un iframe il root si allunga
 *  all'altezza del viewport quando il contenuto è più corto: la misura
 *  diventerebbe "l'altezza attuale dell'iframe", quindi la cornice non
 *  potrebbe MAI restringersi e una differenza di pochi pixel fra due
 *  misure successive genererebbe un loop di messaggi.
 *
 *  Usiamo invece il bordo inferiore reale del contenuto (il `body`, che
 *  comprende sia il flusso normale sia l'overflow dei discendenti) e,
 *  per sicurezza, il massimo fra questo e le metriche del body.
 */
function currentHeight(): number {
  const docEl = document.documentElement;
  const body = document.body;
  if (!body) return docEl ? docEl.scrollHeight : 0;

  const scrollY = window.scrollY || (docEl ? docEl.scrollTop : 0) || 0;
  const fineContenuto = body.getBoundingClientRect().bottom + scrollY;

  return Math.round(
    Math.max(fineContenuto, body.scrollHeight, body.offsetHeight)
  );
}

function getCorniceToken(): string | null {
  // La cornice v3 "impermeabile" aggiunge ?cornice=<token> all'URL dell'iframe:
  // rispecchiamo il token nei messaggi, così la cornice rifiuta i messaggi
  // di altezza che arrivano da altre istanze (filtro e.source + token).
  try {
    return new URLSearchParams(window.location.search).get("cornice");
  } catch {
    return null;
  }
}

/** Stato dell'ultimo invio (deduplica + heartbeat). */
let ultimaInviata = 0;
let ultimoInvioMs = 0;
let debounceTimer: ReturnType<typeof setTimeout> | null = null;

function inviaAltezza(height: number): void {
  const msg: Record<string, unknown> = { type: "labvisivo:height", height };
  const token = getCorniceToken();
  if (token) msg.cornice = token;
  window.parent.postMessage(msg, "*");

  /* Compatibilità con le cornici "legacy" già incollate nei post:
     STESSO valore (una sola misura per entrambi i protocolli). */
  window.parent.postMessage(
    { type: "mappaconcettuale:height", height },
    "*"
  );
}

/**
 * Invia l'altezza al parent.
 * @param forza true quando risponde a un ping (heartbeat consentito anche
 *              se il valore non è cambiato).
 */
function sendHeight(forza = false): void {
  // Attivo solo quando siamo dentro un iframe (non come pagina principale)
  if (window.self === window.top) return;

  const height = currentHeight();
  if (height <= 100) return;

  const adesso = Date.now();
  const primoInvio = ultimaInviata === 0;
  const cambiata = Math.abs(height - ultimaInviata) >= TOLLERANZA_PX;

  // Anti-loop: a parità di valore (o per micro-variazioni sotto soglia) non
  // inviamo nulla; rispondiamo solo come "battito" ai ping della cornice.
  if (!cambiata && !primoInvio) {
    if (!forza || adesso - ultimoInvioMs < HEARTBEAT_MS) return;
  }

  ultimaInviata = height;
  ultimoInvioMs = adesso;
  inviaAltezza(height);
}

/** Coalescenza: le variazioni di layout ravvicinate diventano un solo invio. */
function pianificaInvio(): void {
  if (debounceTimer !== null) return;
  debounceTimer = setTimeout(() => {
    debounceTimer = null;
    sendHeight();
  }, DEBOUNCE_MS);
}

export function initHeightSync(): void {
  // IMPORTANTE: quando l'app è dentro un iframe a altezza automatica
  // (cornice dinamica), la pagina deve seguire l'altezza del CONTENUTO.
  // Il classico `min-h-screen` (100vh) creerebbe un loop infinito:
  //   iframe = misurato → viewport = iframe → misurato = viewport + barra → …
  // Con la classe `lf-embedded` il CSS disattiva i 100vh (vedi index.css).
  if (window.self !== window.top) {
    document.documentElement.classList.add("lf-embedded");
  }

  // Risponde al "ping" della cornice dinamica (embed Blogger): la cornice
  // può richiedere l'altezza in ogni momento con { type: "labvisivo:ping" }
  window.addEventListener("message", (e) => {
    if (e.data && e.data.type === "labvisivo:ping") sendHeight(true);
  });

  // Invia subito (prima del rendering completo) e a caricamento avvenuto
  sendHeight();
  window.addEventListener("load", () => sendHeight());
  window.addEventListener("resize", pianificaInvio);

  // Osserva i cambi di layout (es. dialoghi, cambio passo dell'esercizio…).
  // Con la soglia TOLLERANZA_PX i resize provocati dalla cornice stessa
  // (che non cambiano il contenuto reale) non generano nuovi messaggi:
  // è questo che spezza il ciclo app ↔ cornice.
  if (typeof ResizeObserver !== "undefined") {
    const ro = new ResizeObserver(() => pianificaInvio());
    if (document.documentElement) ro.observe(document.documentElement);
    if (document.body) ro.observe(document.body);
    setTimeout(pianificaInvio, 250);
  }

  // Retry: font e contenuti asincroni possono cambiare l'altezza dopo "load"
  setTimeout(pianificaInvio, 500);
  setTimeout(pianificaInvio, 1500);

  // I font auto-ospitati (OpenDyslexic) cambiano le metriche dei testi
  // quando sono pronti: rimisuriamo una volta che il caricamento è finito.
  if (document.fonts && typeof document.fonts.ready?.then === "function") {
    document.fonts.ready.then(() => pianificaInvio()).catch(() => undefined);
  }
}
