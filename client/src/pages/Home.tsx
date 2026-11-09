import { useState, useCallback, useRef, useEffect } from "react";
import { type MappaConcettuale, type Ramo, type ImmagineMappa, COLORI_RAMI, MESSAGGI_INCORAGGIANTI, darkenColor, MAX_RAMI, MAX_FOGLIE_PER_RAMO, MAX_PAROLE_LEGAME, contaParoleLegame } from "@/lib/tipi-mappa";
import ConceptMapCanvas from "@/components/ConceptMapCanvas";
import ParoleLegameEditor from "@/components/ParoleLegameEditor";
import { ChevronDown, Minus, Plus } from "lucide-react";
import { toast } from "sonner";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

const MAX_IMMAGINI = 4;

const STEP_TITLES = [
  "BENVENUTO",
  "PASSO 1 – IL TRONCO",
  "PASSO 2 – I RAMI",
  "PASSO 3 – LE FOGLIE",
];

function messaggioCasuale(): string {
  return MESSAGGI_INCORAGGIANTI[Math.floor(Math.random() * MESSAGGI_INCORAGGIANTI.length)];
}

export default function Home() {
  const [mappa, setMappa] = useState<MappaConcettuale>(() => {
    const salvata = localStorage.getItem("mappa-concettuale-3passi");
    if (salvata) {
      try {
        const parsed = JSON.parse(salvata);
        if (!parsed.studente) parsed.studente = { nome: "", cognome: "", data: "", classe: "" };
        if (!parsed.studente.data) parsed.studente.data = "";
        if (!parsed.studente.classe) parsed.studente.classe = "";
        if (!parsed.immagini) parsed.immagini = [];
        else if (parsed.immagini.length > 0 && typeof parsed.immagini[0] === 'string') {
          parsed.immagini = parsed.immagini.map((url: string) => ({
            dataUrl: url, x: 50, y: 50, larghezza: 12, altezza: 12,
          }));
        }
        return parsed;
      } catch { /* use default */ }
    }
    return {
      studente: { nome: "", cognome: "", data: "", classe: "" },
      step: 0,
      testoOriginale: "",
      riassunto: "",
      paroleRipetute: [],
      appunti: "",
      hashtags: [],
      titoloCentrale: "",
      rami: [],
      completata: false,
      immagini: [],
    };
  });

  const [currentStep, setCurrentStep] = useState(mappa.step || 0);
  const [messaggio, setMessaggio] = useState("");
  const [mostraMessaggio, setMostraMessaggio] = useState(false);

  // Input states (only keeping what's needed for steps 1-3)
  const [titoloInput, setTitoloInput] = useState(mappa.titoloCentrale);
  const [ramoInput, setRamoInput] = useState("");
  const [ramoLegameInput, setRamoLegameInput] = useState("");
  const [parolaRamoId, setParolaRamoId] = useState("");
  const [mostraCampiParola, setMostraCampiParola] = useState(false);
  const [parolaRamoTesto, setParolaRamoTesto] = useState("");
  const [parolaLegameInput, setParolaLegameInput] = useState("");
  const [mostraLegami, setMostraLegami] = useState(false);
  const [zoomMappa, setZoomMappa] = useState(1);
  const [esportazione, setEsportazione] = useState<"pdf" | "png" | null>(null);
  const viewportMappaRef = useRef<HTMLDivElement>(null);
  const [nomeInput, setNomeInput] = useState(mappa.studente.nome);
  const [cognomeInput, setCognomeInput] = useState(mappa.studente.cognome);
  const oggi = new Date().toLocaleDateString("it-IT", { day: "2-digit", month: "2-digit", year: "numeric" });
  const [dataInput, setDataInput] = useState(mappa.studente.data || oggi);
  const [classeInput, setClasseInput] = useState(mappa.studente.classe || "");
  const fileInputRef = useRef<HTMLInputElement>(null);
  // ── Color states ──
  const [coloreTitolo, setColoreTitolo] = useState(mappa.coloreTitolo || "#E05D2E");
  const [coloreRamoInput, setColoreRamoInput] = useState(COLORI_RAMI[0].valore);
  const [coloreParolaInput, setColoreParolaInput] = useState("#3498DB");

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    const postiLiberi = Math.max(0, MAX_IMMAGINI - mappa.immagini.length);
    if (postiLiberi <= 0) {
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }
    const daCaricare = Array.from(files).slice(0, postiLiberi);
    Promise.all(daCaricare.map((file, indice) => new Promise<ImmagineMappa>((resolve, reject) => {
      const reader = new FileReader();
      // Non impilare le immagini sul titolo: sono visibili in una piccola
      // fila in basso e ciascuna si può trascinare dove si preferisce.
      const posizione = mappa.immagini.length + indice;
      const x = -45 + (posizione % 5) * 21;
      const y = 155 - Math.floor(posizione / 5) * 22;
      reader.onload = () => resolve({ dataUrl: String(reader.result), x, y, larghezza: 12, altezza: 12 });
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    }))).then(nuove => {
      // Non troncare mai le immagini già salvate, anche se superano il nuovo limite.
      salvaMappa(prev => ({ immagini: [...prev.immagini, ...nuove.slice(0, Math.max(0, MAX_IMMAGINI - prev.immagini.length))] }));
    }).catch(() => toast.error("Non riesco a caricare le immagini. Riprova."));
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const rimuoviImmagine = (index: number) => {
    salvaMappa(prev => ({ immagini: prev.immagini.filter((_, i) => i !== index) }));
  };

  const handleImmaginiPosizioni = (posizioni: { x: number; y: number }[]) => {
    salvaMappa(prev => ({ immagini: prev.immagini.map((img, i) => ({
      ...img,
      x: posizioni[i]?.x ?? img.x,
      y: posizioni[i]?.y ?? img.y,
    })) }));
  };

  const aggiornaDimensione = (index: number, campo: 'larghezza' | 'altezza', valore: number) => {
    // Accetta qualsiasi valore; clampa solo su blur per sicurezza
    const v = isNaN(valore) ? 4 : Math.max(1, Math.min(50, valore));
    salvaMappa(prev => ({ immagini: prev.immagini.map((img, i) => i === index ? { ...img, [campo]: v } : img) }));
  };

  const entra = () => {
    if (!nomeInput.trim() || !cognomeInput.trim()) return;
    salvaMappa({ studente: { nome: nomeInput.trim(), cognome: cognomeInput.trim(), data: dataInput.trim(), classe: classeInput.trim() }, completata: false });
    mostraIncoraggiamento();
    vaiAlPasso(1);
  };

  // L'esportazione usa sempre l'intera mappa a 1080px, indipendentemente da
  // zoom, larghezza del telefono e posizione dello scroll nel riquadro.
  const creaCanvasEsportazione = async (scala: number) => {
    const element = document.getElementById("mappa-da-stampare");
    if (!element) throw new Error("Mappa non disponibile");
    const copia = element.cloneNode(true) as HTMLDivElement;
    copia.dataset.exportMappa = "true";
    Object.assign(copia.style, {
      position: "fixed", top: "0", left: "0", width: "1080px", maxWidth: "none",
      opacity: "0", pointerEvents: "none", zIndex: "-1",
    });
    const canvasInterno = copia.querySelector<HTMLElement>(".mappa-canvas");
    if (canvasInterno) canvasInterno.style.maxWidth = "none";
    document.body.appendChild(copia);
    try {
      return await html2canvas(copia, {
        scale: scala,
        backgroundColor: "#FFFFFF",
        windowWidth: Math.max(1200, window.innerWidth),
        onclone: (doc) => {
          const elemento = doc.querySelector<HTMLElement>('[data-export-mappa="true"]');
          if (elemento) {
            elemento.style.opacity = "1";
            elemento.style.zIndex = "1";
            elemento.style.position = "absolute";
            elemento.style.top = "0";
            elemento.style.left = "0";
          }
        },
      });
    } finally {
      copia.remove();
    }
  };

  const scaricaPDF = async () => {
    if (esportazione) return;
    setEsportazione("pdf");
    try {
      const canvas = await creaCanvasEsportazione(2);
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({
        orientation: canvas.width > canvas.height ? "landscape" : "portrait",
        unit: "px",
        format: [canvas.width, canvas.height],
        compress: true,
      });
      pdf.addImage(imgData, "PNG", 0, 0, canvas.width, canvas.height, undefined, "FAST");
      pdf.save("mappa-concettuale.pdf");
    } catch (err) {
      console.error("Errore PDF:", err);
      toast.error("Non riesco a creare il PDF. Riprova.");
    } finally {
      setEsportazione(null);
    }
  };

  const scaricaImmagine = async () => {
    if (esportazione) return;
    setEsportazione("png");
    try {
      // 1080 × 2 = 2160px: stessa risoluzione dell'export originale,
      // con meno memoria richiesta rispetto a un canvas a 3240px su telefono.
      const canvas = await creaCanvasEsportazione(2);
      const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, "image/png"));
      if (!blob) throw new Error("Impossibile creare il file PNG");
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "mappa-concettuale.png";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (err) {
      console.error("Errore immagine:", err);
      toast.error("Non riesco a creare l'immagine. Riprova.");
    } finally {
      setEsportazione(null);
    }
  };

  const salvaMappa = useCallback((aggiornamenti: Partial<MappaConcettuale> | ((precedente: MappaConcettuale) => Partial<MappaConcettuale>)) => {
    setMappa(prev => {
      const patch = typeof aggiornamenti === "function" ? aggiornamenti(prev) : aggiornamenti;
      const nuova = { ...prev, ...patch };
      try {
        localStorage.setItem("mappa-concettuale-3passi", JSON.stringify(nuova));
      } catch (errore) {
        console.error("Impossibile salvare la mappa nel browser", errore);
        toast.error("La memoria del browser è piena: scarica la mappa e riduci le immagini.", { id: "salvataggio-mappa" });
      }
      return nuova;
    });
  }, []);

  const aggiornaLegame = (ramoId: string, parolaId: string | undefined, valore: string) => {
    salvaMappa(prev => {
      const ramo = prev.rami.find(item => item.id === ramoId);
      const precedente = parolaId ? ramo?.parole.find(parola => parola.id === parolaId)?.parolaLegame : ramo?.parolaLegame;
      if (!precedente?.trim() && valore.trim() && contaParoleLegame(prev.rami) >= MAX_PAROLE_LEGAME) return {};
      return {
        rami: prev.rami.map(item => item.id !== ramoId ? item : parolaId
          ? { ...item, parole: item.parole.map(parola => parola.id === parolaId ? { ...parola, parolaLegame: valore.slice(0, 32) } : parola) }
          : { ...item, parolaLegame: valore.slice(0, 32) }),
      };
    });
  };

  const handlePosizioniMappa = (rami: Record<string, { x: number; y: number }>, parole: Record<string, { x: number; y: number }>) => {
    salvaMappa(prev => ({
      rami: prev.rami.map(ramo => ({
        ...ramo,
        ...(rami[ramo.id] || {}),
        parole: ramo.parole.map(parola => ({ ...parola, ...(parole[parola.id] || {}) })),
      })),
    }));
  };

  const handlePosizioniLegami = (posizioni: Record<string, { x: number; y: number }>) => {
    salvaMappa(prev => ({
      rami: prev.rami.map(ramo => ({
        ...ramo,
        ...(posizioni[`tronco-${ramo.id}`] ? { spostamentoLegame: posizioni[`tronco-${ramo.id}`] } : {}),
        parole: ramo.parole.map(parola => ({
          ...parola,
          ...(posizioni[`foglia-${parola.id}`] ? { spostamentoLegame: posizioni[`foglia-${parola.id}`] } : {}),
        })),
      })),
    }));
  };

  useEffect(() => {
    const viewport = viewportMappaRef.current;
    if (!viewport) return;
    const frame = requestAnimationFrame(() => {
      viewport.scrollLeft = Math.max(0, (viewport.scrollWidth - viewport.clientWidth) / 2);
      viewport.scrollTop = Math.max(0, (viewport.scrollHeight - viewport.clientHeight) / 2);
    });
    return () => cancelAnimationFrame(frame);
  }, [zoomMappa, currentStep, mappa.completata]);

  // ALTEZZA DINAMICA PER L'EMBED (cornice dinamica su Blogger)
  // ⚠️ Il mittente NON è più qui: era un DOPPIO mittente con una misura
  // diversa (`document.body.scrollHeight`, 8 px in meno del contenuto reale)
  // che si alternava al valore corretto di `lib/heightSync.ts` e creava una
  // micro-oscillazione dell'altezza dell'iframe (misurata il 10/09/2026:
  // ~1.300 messaggi in 10 s, altezza 554 ↔ 562 px).
  // Ora esiste UNA SOLA misura in `lib/heightSync.ts` (chiamato da main.tsx),
  // che invia sia `labvisivo:height` (protocollo corrente, con token) sia
  // `mappaconcettuale:height` (per le vecchie cornici già incollate nei post)
  // con lo stesso valore, con soglia anti-oscillazione e deduplica.

  // PRIMA PAGINA (BENVENUTO) — margini pareggiati come in Latino Facile.
  // In vista AUTONOMA (window.self === window.top) la classe lf-welcome-top
  // su <html> rende bianco il canvas sotto la card e disattiva il min-h-screen
  // del wrapper: la pagina "termina" subito dopo la card (niente grande vuoto
  // crema sotto). Dentro la cornice (iframe) NON va aggiunta: lì è heightSync
  // a segnalare l'altezza reale e lo sfondo crema resta coerente con le altre
  // pagine (regole html.lf-embedded in index.css).
  useEffect(() => {
    if (currentStep === 0 && window.self === window.top) {
      document.documentElement.classList.add("lf-welcome-top");
    } else {
      document.documentElement.classList.remove("lf-welcome-top");
    }
    return () => document.documentElement.classList.remove("lf-welcome-top");
  }, [currentStep]);

  const mostraIncoraggiamento = () => {};

  const vaiAlPasso = (passo: number) => {
    if (passo !== 3) setMostraCampiParola(false);
    setCurrentStep(passo);
    salvaMappa({ step: passo });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const aggiungiRamo = () => {
    const t = ramoInput.trim().toUpperCase();
    if (!t) return;
    if (mappa.rami.length >= MAX_RAMI) return;
    if (ramoLegameInput.trim() && contaParoleLegame(mappa.rami) >= MAX_PAROLE_LEGAME) {
      toast.info(`Puoi aggiungere al massimo ${MAX_PAROLE_LEGAME} parole-legame.`);
      return;
    }
    if (mappa.rami.some(r => r.titolo === t)) {
      toast.info("Questo ramo è già presente. Prova un altro sottotitolo.");
      return;
    }
    const colore = coloreRamoInput || COLORI_RAMI[mappa.rami.length % COLORI_RAMI.length].valore;
    const nuovoRamo: Ramo = { id: crypto.randomUUID(), titolo: t, colore, parole: [], parolaLegame: ramoLegameInput.trim() };
    // Prepara il prossimo colore di default
    setColoreRamoInput(COLORI_RAMI[(mappa.rami.length + 1) % COLORI_RAMI.length].valore);
    salvaMappa({ rami: [...mappa.rami, nuovoRamo] });
    setRamoInput("");
    setRamoLegameInput("");
    mostraIncoraggiamento();
  };

  const rimuoviRamo = (id: string) => {
    const ramo = mappa.rami.find(item => item.id === id);
    if (ramo && ramo.parole.length > 0 && !window.confirm(`Rimuovere il ramo ${ramo.titolo} e le sue parole chiave?`)) return;
    salvaMappa(prev => ({ rami: prev.rami.filter(r => r.id !== id) }));
    if (parolaRamoId === id) {
      setParolaRamoId("");
      setMostraCampiParola(false);
    }
  };

  const aggiungiParolaARamo = () => {
    if (!parolaRamoId || !parolaRamoTesto.trim()) return;
    const ramoScelto = mappa.rami.find(ramo => ramo.id === parolaRamoId);
    if (!ramoScelto) return;
    if (ramoScelto.parole.length >= MAX_FOGLIE_PER_RAMO) return;
    if (parolaLegameInput.trim() && contaParoleLegame(mappa.rami) >= MAX_PAROLE_LEGAME) {
      toast.info(`Puoi aggiungere al massimo ${MAX_PAROLE_LEGAME} parole-legame.`);
      return;
    }
    const nuoviRami = mappa.rami.map(r => {
      if (r.id === parolaRamoId) {
        return {
          ...r,
          parole: [...r.parole, { id: crypto.randomUUID(), testo: parolaRamoTesto.trim().toUpperCase(), hashtag: "", colore: coloreParolaInput || r.colore, parolaLegame: parolaLegameInput.trim() }],
        };
      }
      return r;
    });
    salvaMappa({ rami: nuoviRami });
    setParolaRamoTesto("");
    setParolaLegameInput("");
    setMostraCampiParola(false);
    requestAnimationFrame(() => document.getElementById(`scegli-ramo-${parolaRamoId}`)?.focus({ preventScroll: true }));
    mostraIncoraggiamento();
  };

  const rimuoviParolaDaRamo = (ramoId: string, parolaId: string) => {
    const nuoviRami = mappa.rami.map(r => {
      if (r.id === ramoId) {
        return { ...r, parole: r.parole.filter(p => p.id !== parolaId) };
      }
      return r;
    });
    salvaMappa({ rami: nuoviRami });
  };

  const completaMappa = () => {
    setMostraCampiParola(false);
    salvaMappa({ completata: true, step: 3 });
    setCurrentStep(3);
    mostraIncoraggiamento();
  };

  const ricomincia = () => {
    localStorage.removeItem("mappa-concettuale-3passi");
    setMappa({
      studente: { nome: "", cognome: "", data: "", classe: "" }, step: 0, testoOriginale: "",
      riassunto: "", paroleRipetute: [], appunti: "", hashtags: [],
      titoloCentrale: "", rami: [], completata: false, immagini: [],
    });
    setTitoloInput("");
    setRamoInput(""); setRamoLegameInput(""); setParolaRamoId(""); setMostraCampiParola(false); setParolaRamoTesto(""); setParolaLegameInput("");
    setMostraLegami(false); setZoomMappa(1);
    setNomeInput(""); setCognomeInput(""); setDataInput(oggi); setClasseInput("");
    setColoreTitolo("#E05D2E"); setColoreRamoInput(COLORI_RAMI[0].valore); setColoreParolaInput("#3498DB");
    setCurrentStep(0);
  };

  const richiediRicomincia = () => {
    if (window.confirm("Vuoi cancellare questa mappa e ricominciare? Questa azione non si può annullare.")) ricomincia();
  };

  const modificaMappa = () => {
    salvaMappa({ completata: false, step: 1 });
    setCurrentStep(1);
    setMostraCampiParola(false);
    setMostraLegami(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const puoiAvanzare = useCallback((): boolean => {
    switch (currentStep) {
      case 0: return true;
      case 1: return titoloInput.trim().length > 0;
      case 2: return mappa.rami.length >= 1;
      case 3: return mappa.rami.some(r => r.parole.length > 0);
      default: return true;
    }
  }, [currentStep, titoloInput, mappa.rami]);

  const avanza = () => {
    if (currentStep === 1) {
      salvaMappa({ titoloCentrale: titoloInput.toUpperCase(), coloreTitolo });
    }
    if (currentStep === 3) {
      completaMappa();
      return;
    }
    mostraIncoraggiamento();
    vaiAlPasso(currentStep + 1);
  };

  const indietro = () => {
    if (currentStep > 0) vaiAlPasso(currentStep - 1);
  };

  const TOTAL_STEPS = 3;
  const livelliZoom = [1, 1.5, 2, 2.5, 3];
  const indiceZoom = livelliZoom.indexOf(zoomMappa);
  const numeroLegami = contaParoleLegame(mappa.rami);
  const foglieRamoScelto = mappa.rami.find(ramo => ramo.id === parolaRamoId)?.parole.length ?? 0;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* HEADER */}
      <header className="bg-background pt-6 md:pt-10">
        <div className="container py-2 flex flex-col items-center justify-center gap-3 text-center">
          <h1 className="text-2xl sm:text-3xl font-bold leading-tight text-foreground text-center">MAPPA CONCETTUALE</h1>
          {currentStep > 0 && (
            <button
              onClick={richiediRicomincia}
              className="min-h-11 text-sm bg-secondary hover:bg-secondary/80 text-secondary-foreground px-3 py-2 rounded-xl font-bold transition-colors"
              title="RICOMINCIARE DA CAPO"
            >
              RICOMINCIA
            </button>
          )}
        </div>
      </header>

      {/* STEP INDICATOR */}
      {currentStep >= 0 && currentStep <= TOTAL_STEPS && (
        <div className="bg-background">
          <div className="container py-2 sm:py-2.5">
            <div className="flex items-center justify-center gap-1 sm:gap-1.5 flex-wrap">
              {/* INIZIO */}
              <button
                onClick={() => currentStep > 0 ? vaiAlPasso(0) : null}
                aria-label={currentStep === 0 ? "INIZIO: schermata iniziale" : "Torna alla schermata iniziale"}
                aria-current={currentStep === 0 ? "step" : undefined}
                disabled={currentStep === 0}
                className={`h-10 min-w-10 sm:h-7 sm:min-w-0 rounded-full flex items-center justify-center font-extrabold text-[10px] transition-all px-2
                  ${currentStep === 0
                    ? "bg-primary text-primary-foreground scale-110 shadow-lg"
                    : currentStep > 0
                      ? "bg-step-completed text-white cursor-pointer hover:scale-105"
                      : "bg-muted text-muted-foreground cursor-not-allowed"
                  }`}
              >
                {currentStep > 0 ? "✓" : "INIZIO"}
              </button>

              {/* Divider */}
              <span className="w-0.5 h-0.5 sm:w-1 sm:h-1 rounded-full bg-border" />

              {Array.from({ length: TOTAL_STEPS }, (_, i) => (
                <button
                  key={i}
                  onClick={() => {
                    if (i + 1 <= currentStep) {
                      if (mappa.completata) salvaMappa({ completata: false });
                      vaiAlPasso(i + 1);
                    }
                  }}
                  aria-label={STEP_TITLES[i + 1]}
                  aria-current={!mappa.completata && i + 1 === currentStep ? "step" : undefined}
                  disabled={i + 1 > currentStep}
                  className={`w-10 h-10 sm:w-7 sm:h-7 rounded-full flex items-center justify-center font-extrabold text-[10px]
                    transition-all duration-300
                    ${mappa.completata
                      ? "bg-step-completed text-white"
                      : i + 1 === currentStep
                        ? "bg-primary text-primary-foreground scale-110 shadow-lg"
                        : i + 1 < currentStep
                          ? "bg-step-completed text-white cursor-pointer hover:scale-105"
                          : "bg-muted text-muted-foreground cursor-not-allowed"
                    }`}
                >
                  {mappa.completata || i + 1 < currentStep ? "✓" : i + 1}
                </button>
              ))}

              {/* Divider */}
              <span className="w-0.5 h-0.5 sm:w-1 sm:h-1 rounded-full bg-border" />

              {/* FINE */}
              <button
                aria-label={mappa.completata ? "Mappa completata" : "FINE: mappa non ancora completata"}
                aria-current={mappa.completata ? "step" : undefined}
                disabled
                className={`h-10 min-w-10 sm:h-7 sm:min-w-0 rounded-full flex items-center justify-center font-extrabold text-[10px] transition-all px-2
                  ${mappa.completata
                    ? "bg-primary text-primary-foreground scale-110 shadow-lg"
                    : "bg-muted text-muted-foreground cursor-not-allowed"
                  }`}
              >
                {mappa.completata ? "✓" : "FINE"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MAIN CONTENT */}
      {/* Lo step 0 (BENVENUTO) gestisce i propri margini pareggiati via
          .lf-welcome (24px sotto la step bar e 24px sotto la card): per
          questo il main non aggiunge padding verticale quando currentStep===0. */}
      <main className={`container flex-1 flex flex-col ${currentStep === 0 ? "lf-welcome-main" : "py-3 md:py-5"}`}>
        {/* STEP TITLE (no subtitle) */}
        {currentStep >= 1 && currentStep <= TOTAL_STEPS && !mappa.completata && (
          <div className="text-center mb-3 md:mb-4 animate-slide-up" key={currentStep}>
            <h2 className="text-lg md:text-xl font-extrabold text-foreground">
              {STEP_TITLES[currentStep]}
            </h2>
          </div>
        )}

        {/* STEP 0: WELCOME — designed to match reference photo */}
        {currentStep === 0 && (
          <div className="lf-welcome flex w-full flex-col items-center animate-slide-up">
            <div className="bg-card border border-border rounded-[20px] p-5 md:p-6 w-full max-w-[400px] shadow-[0_8px_25px_rgba(43,36,33,0.06)] flex flex-col items-center text-center">
              {/* Book icon */}
              <div className="bg-[#F0E5DF] p-2.5 rounded-[12px] mb-3">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#8B3A1A" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                  <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
                  <line x1="12" y1="6" x2="12" y2="18" />
                </svg>
              </div>

              {/* Main heading */}
              <h2 className="text-base font-bold text-foreground tracking-wide mb-1">
                MAPPA CONCETTUALE
              </h2>
              <p className="text-[11px] text-[#5a4a38] mb-4 tracking-wide">
                COSTRUISCI LA TUA MAPPA IN <span style={{ color: '#8B3A1A', fontWeight: 600 }}>3 PASSI</span>
              </p>

              {/* Name inputs */}
              <div className="grid grid-cols-2 gap-2 w-full mb-2">
                <input
                  value={cognomeInput}
                  onChange={e => setCognomeInput(e.target.value)}
                  placeholder="Cognome"
                  aria-label="Cognome"
                  className="flex-1 bg-[#FAF8F5] border border-[#D6CEC4] rounded-[10px] px-3 py-2.5 text-sm text-black placeholder:text-black placeholder:opacity-100 outline-none text-center font-[Cambria,Georgia,serif] focus:border-[#D4B2A0] focus:ring-2 focus:ring-[#D4B2A0]/20 transition-all"
                />
                <input
                  value={nomeInput}
                  onChange={e => setNomeInput(e.target.value)}
                  placeholder="Nome"
                  aria-label="Nome"
                  className="flex-1 bg-[#FAF8F5] border border-[#D6CEC4] rounded-[10px] px-3 py-2.5 text-sm text-black placeholder:text-black placeholder:opacity-100 outline-none text-center font-[Cambria,Georgia,serif] focus:border-[#D4B2A0] focus:ring-2 focus:ring-[#D4B2A0]/20 transition-all"
                />
              </div>

              {/* Data e Classe */}
              <div className="grid grid-cols-2 gap-2 w-full mb-2">
                <input
                  value={dataInput}
                  onChange={e => setDataInput(e.target.value)}
                  placeholder="Data (es. 31/07/2026)"
                  aria-label="Data"
                  className="flex-1 bg-[#FAF8F5] border border-[#D6CEC4] rounded-[10px] px-3 py-2.5 text-sm text-black placeholder:text-black placeholder:opacity-100 outline-none text-center font-[Cambria,Georgia,serif] focus:border-[#D4B2A0] focus:ring-2 focus:ring-[#D4B2A0]/20 transition-all"
                />
                <input
                  value={classeInput}
                  onChange={e => setClasseInput(e.target.value)}
                  placeholder="Classe (es. 2A)"
                  aria-label="Classe"
                  className="flex-1 bg-[#FAF8F5] border border-[#D6CEC4] rounded-[10px] px-3 py-2.5 text-sm text-black placeholder:text-black placeholder:opacity-100 outline-none text-center font-[Cambria,Georgia,serif] focus:border-[#D4B2A0] focus:ring-2 focus:ring-[#D4B2A0]/20 transition-all"
                />
              </div>

              {/* ENTER button */}
              <button
                onClick={entra}
                disabled={!nomeInput.trim() || !cognomeInput.trim()}
                className="w-full py-2.5 rounded-[10px] text-sm font-bold tracking-wider transition-all duration-200"
                style={{
                  backgroundColor: '#9D674E',
                  color: '#FFFFFF',
                  opacity: (nomeInput.trim() && cognomeInput.trim()) ? 1 : 0.55,
                }}
              >
                ENTRA
              </button>
            </div>
          </div>
        )}

        {/* STEP 1: IL TRONCO */}
        {currentStep === 1 && (
          <div className="max-w-3xl mx-auto animate-slide-up">
            <div className="bg-card border-2 border-border rounded-2xl p-4 md:p-5 shadow-lg text-center">
              <div className="bg-accent/50 border border-border rounded-xl p-3 md:p-4 mb-3">
                <p className="text-secondary-foreground font-normal text-sm md:text-base leading-relaxed normal-case text-left">
                  Scrivi il titolo dell'argomento. Sarà il tronco al centro della mappa. Poi premi il pulsante AVANTI.
                </p>
              </div>

              <label className="block text-secondary-foreground font-bold text-base mt-6 mb-2">
                TITOLO CENTRALE DELLA MAPPA:
              </label>
              <input
                value={titoloInput}
                onChange={e => setTitoloInput(e.target.value.slice(0, 40))}
                placeholder="SCRIVI IL TITOLO..."
                maxLength={40}
                aria-label="Titolo principale della mappa"
                className="w-full p-4 bg-input border-2 border-border rounded-2xl text-foreground placeholder:text-secondary-foreground placeholder:font-normal text-sm md:text-base font-extrabold text-center focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/20 transition-all"
              />
              <span className={`text-xs mt-1 inline-block ${titoloInput.length >= 40 ? 'text-red-500 font-bold' : 'text-secondary-foreground'}`}>
                {titoloInput.length}/40 caratteri
              </span>

              {/* Color picker per il titolo */}
              <div className="flex items-center justify-center gap-3 mt-3 flex-wrap">
                <label htmlFor="colore-titolo" className="text-sm font-bold text-secondary-foreground">COLORE TITOLO:</label>
                <input
                  id="colore-titolo"
                  aria-label="Colore del titolo centrale"
                  type="color"
                  value={coloreTitolo}
                  onChange={e => setColoreTitolo(e.target.value)}
                  className="w-10 h-10 rounded-lg border-2 border-border cursor-pointer bg-transparent"
                  title="Scegli il colore del titolo centrale"
                />
                <span className="text-xs text-secondary-foreground font-mono">{coloreTitolo}</span>
              </div>

              {titoloInput.trim() && (
                <div className="mt-4 flex justify-center">
                  <div
                    className="text-white font-extrabold text-lg px-6 py-4 rounded-full shadow-lg border-4 animate-pop-in"
                    style={{ backgroundColor: coloreTitolo, borderColor: darkenColor(coloreTitolo) }}
                  >
                    {titoloInput.toUpperCase()}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* STEP 2: I RAMI */}
        {currentStep === 2 && (
          <div className="max-w-3xl mx-auto animate-slide-up">
            <div className="bg-card border-2 border-border rounded-2xl p-4 md:p-5 shadow-lg text-center">
              <div className="bg-accent/50 border border-border rounded-xl p-3 md:p-4 mb-3">
                <p className="text-secondary-foreground font-normal text-sm md:text-base leading-relaxed normal-case text-left">
                  Aggiungi almeno un sottotitolo: sarà un ramo. Se vuoi, scrivi una parola-legame tra il titolo e ogni ramo. Poi premi il pulsante AVANTI.
                </p>
              </div>

              <div className="mt-6 flex flex-col gap-2 mb-5 text-left">
                <label htmlFor="nuovo-ramo" className="text-center text-sm font-bold text-secondary-foreground">SOTTOTITOLO DEL RAMO</label>
                <input
                  id="nuovo-ramo"
                  value={ramoInput}
                  onChange={e => setRamoInput(e.target.value.slice(0, 28))}
                  onKeyDown={e => e.key === "Enter" && aggiungiRamo()}
                  placeholder="Scrivi un sottotitolo"
                  maxLength={28}
                  aria-label="Sottotitolo del ramo"
                  className="w-full min-h-11 p-3 bg-input border-2 border-border rounded-xl text-foreground placeholder:text-secondary-foreground text-sm md:text-base normal-case focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/20"
                />
                <span className={`text-xs ${ramoInput.length >= 28 ? 'text-red-500 font-bold' : 'text-secondary-foreground'}`}>
                  {ramoInput.length}/28 caratteri
                </span>
                <label htmlFor="nuovo-legame-ramo" className="mt-5 text-center text-sm font-bold text-secondary-foreground">PAROLA-LEGAME <span className="font-normal normal-case">(facoltativa)</span></label>
                <input
                  id="nuovo-legame-ramo"
                  value={ramoLegameInput}
                  disabled={numeroLegami >= MAX_PAROLE_LEGAME}
                  aria-describedby="limite-legami-ramo"
                  onChange={e => setRamoLegameInput(e.target.value.slice(0, 32))}
                  onKeyDown={e => e.key === "Enter" && aggiungiRamo()}
                  placeholder="Esempio: comprende"
                  maxLength={32}
                  aria-label="Parola-legame tra titolo e nuovo ramo, facoltativa"
                  className="w-full min-h-11 p-3 bg-input border-2 border-border rounded-xl text-foreground placeholder:text-secondary-foreground text-sm md:text-base normal-case focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/20"
                />
                <p id="limite-legami-ramo" className="text-xs text-secondary-foreground normal-case">Compare tra titolo e ramo. Puoi modificarla dopo. Parole-legame: {numeroLegami}/{MAX_PAROLE_LEGAME}.{numeroLegami >= MAX_PAROLE_LEGAME && " Limite raggiunto: rimuovi un legame per aggiungerne un altro."}</p>
                <div className="mt-4 flex flex-col items-center justify-center gap-3">
                  <label className="flex items-center justify-center gap-2 text-sm font-bold text-secondary-foreground">
                    COLORE
                    <input type="color" value={coloreRamoInput} onChange={e => setColoreRamoInput(e.target.value)}
                      className="w-11 h-11 rounded-lg border-2 border-border cursor-pointer bg-transparent" aria-label="Colore del nuovo ramo" />
                    <span className="text-xs text-secondary-foreground font-mono font-normal">{coloreRamoInput}</span>
                  </label>
                  <button onClick={aggiungiRamo} disabled={!ramoInput.trim() || mappa.rami.length >= MAX_RAMI}
                    className="min-h-11 bg-primary hover:bg-primary/90 text-primary-foreground font-extrabold px-5 py-3 rounded-xl text-sm disabled:opacity-50 disabled:cursor-not-allowed">
                    AGGIUNGI RAMO
                  </button>
                </div>
              </div>
              <p className="mb-2 text-center text-sm font-bold text-secondary-foreground" aria-live="polite">RAMI AGGIUNTI: {mappa.rami.length}/{MAX_RAMI}{mappa.rami.length >= MAX_RAMI && <span className="block font-normal normal-case">Limite raggiunto: rimuovi un ramo per aggiungerne un altro.</span>}</p>

              <div className="space-y-3 mb-4">
                {mappa.rami.map((ramo) => (
                  <div
                    key={ramo.id}
                    className="flex items-center gap-3 p-3 rounded-xl border-2 animate-pop-in"
                    style={{ borderColor: ramo.colore, backgroundColor: ramo.colore + "15" }}
                  >
                    <span className="w-5 h-5 rounded-full shrink-0" style={{ backgroundColor: ramo.colore }} />
                    <div className="flex-1 text-left min-w-0">
                      <span className="font-extrabold text-base break-words" style={{ color: ramo.colore }}>{ramo.titolo}</span>
                      {ramo.parolaLegame && <p className="text-xs normal-case text-secondary-foreground">Legame: {ramo.parolaLegame}</p>}
                    </div>
                    <button onClick={() => rimuoviRamo(ramo.id)} aria-label={`Rimuovi il ramo ${ramo.titolo}`} className="min-w-11 min-h-11 text-muted-foreground hover:text-destructive transition-colors font-bold text-lg">X</button>
                  </div>
                ))}
              </div>

              {mappa.rami.length > 0 && titoloInput && (
                <div className="mt-6 bg-muted border border-border rounded-2xl p-3 max-w-[200px] mx-auto">
                  <p className="text-center text-xs font-bold text-secondary-foreground mb-2">ANTEPRIMA DELLA MAPPA</p>
                  <ConceptMapCanvas titolo={titoloInput.toUpperCase()} rami={mappa.rami} studente={mappa.studente} coloreTitolo={coloreTitolo} mini />
                </div>
              )}
            </div>
          </div>
        )}

        {/* STEP 3: LE FOGLIE */}
        {currentStep === 3 && !mappa.completata && (
          <div className="max-w-3xl mx-auto animate-slide-up">
            <div className="bg-card border-2 border-border rounded-2xl p-4 md:p-5 shadow-lg text-center">
              <div className="bg-accent/50 border border-border rounded-xl p-3 md:p-4 mb-3">
                <p className="text-secondary-foreground font-normal text-sm md:text-base leading-relaxed normal-case text-left">
                  Scegli un ramo e aggiungi almeno una parola chiave. La parola-legame è facoltativa. Alla fine puoi inserire immagini o QR code. Poi premi il pulsante AVANTI.
                </p>
              </div>

              <label className="block text-secondary-foreground font-bold text-base mt-6 mb-2">
                SCEGLI UN RAMO, POI SCRIVI UNA PAROLA CHIAVE:
              </label>
              <div className="flex flex-wrap justify-center gap-2 mb-4">
                {mappa.rami.map(ramo => (
                  <button
                    key={ramo.id}
                    id={`scegli-ramo-${ramo.id}`}
                    onClick={() => { setParolaRamoId(ramo.id); setColoreParolaInput(ramo.colore); setMostraCampiParola(true); }}
                    aria-pressed={parolaRamoId === ramo.id}
                    aria-expanded={parolaRamoId === ramo.id && mostraCampiParola}
                    aria-controls={parolaRamoId === ramo.id && mostraCampiParola ? "campi-parola-chiave" : undefined}
                    className="w-[calc((100%-0.5rem)/2)] sm:w-[calc((100%-1rem)/3)] min-w-0 min-h-11 p-3 rounded-2xl border-2 font-extrabold text-sm transition-all hover:scale-105 active:scale-95 break-words"
                    style={{
                      borderColor: ramo.colore,
                      backgroundColor: parolaRamoId === ramo.id ? ramo.colore + "30" : "transparent",
                      color: ramo.colore,
                    }}
                  >
                    {parolaRamoId === ramo.id ? "OK " : ""}{ramo.titolo}
                  </button>
                ))}
              </div>

              {parolaRamoId && (
                <div className="flex flex-col gap-2 mb-6 text-left animate-slide-up">
                  <p className="text-center text-sm font-bold text-secondary-foreground">RAMO SCELTO: {mappa.rami.find(r => r.id === parolaRamoId)?.titolo}</p>
                  <p className="text-center text-xs text-secondary-foreground normal-case" aria-live="polite">Foglie in questo ramo: {foglieRamoScelto}/{MAX_FOGLIE_PER_RAMO}.{foglieRamoScelto >= MAX_FOGLIE_PER_RAMO && " Limite raggiunto: elimina una foglia per aggiungerne un'altra."}</p>
                  {mostraCampiParola && <div id="campi-parola-chiave" className="flex flex-col gap-2">
                  <label htmlFor="nuova-parola" className="mt-4 text-center text-sm font-bold text-secondary-foreground">PAROLA CHIAVE</label>
                  <input
                    id="nuova-parola"
                    value={parolaRamoTesto}
                    onChange={e => setParolaRamoTesto(e.target.value.slice(0, 32))}
                    onKeyDown={e => e.key === "Enter" && aggiungiParolaARamo()}
                    placeholder="Scrivi una parola chiave"
                    maxLength={32}
                    aria-label="Parola chiave della foglia"
                    className="w-full min-h-11 p-3 bg-input border-2 border-border rounded-xl text-foreground placeholder:text-secondary-foreground text-sm md:text-base normal-case focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/20"
                  />
                  <span className={`text-xs ${parolaRamoTesto.length >= 32 ? 'text-red-500 font-bold' : 'text-secondary-foreground'}`}>
                    {parolaRamoTesto.length}/32 caratteri
                  </span>
                  <label htmlFor="nuovo-legame-parola" className="mt-5 text-center text-sm font-bold text-secondary-foreground">PAROLA-LEGAME <span className="font-normal normal-case">(facoltativa)</span></label>
                  <input
                    id="nuovo-legame-parola"
                    value={parolaLegameInput}
                    disabled={numeroLegami >= MAX_PAROLE_LEGAME}
                    aria-describedby="limite-legami-foglia"
                    onChange={e => setParolaLegameInput(e.target.value.slice(0, 32))}
                    onKeyDown={e => e.key === "Enter" && aggiungiParolaARamo()}
                    placeholder="Esempio: contiene"
                    maxLength={32}
                    aria-label="Parola-legame tra ramo e nuova parola chiave, facoltativa"
                    className="w-full min-h-11 p-3 bg-input border-2 border-border rounded-xl text-foreground placeholder:text-secondary-foreground text-sm md:text-base normal-case focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/20"
                  />
                  <p id="limite-legami-foglia" className="text-xs text-secondary-foreground normal-case">Compare sulla linea tra ramo e parola chiave. Parole-legame: {numeroLegami}/{MAX_PAROLE_LEGAME}.{numeroLegami >= MAX_PAROLE_LEGAME && " Limite raggiunto: rimuovi un legame per aggiungerne un altro."}</p>
                  <div className="mt-4 flex flex-col items-center justify-center gap-3">
                    <label className="flex items-center justify-center gap-2 text-sm font-bold text-secondary-foreground">
                      COLORE
                      <input type="color" value={coloreParolaInput} onChange={e => setColoreParolaInput(e.target.value)}
                        className="w-11 h-11 rounded-lg border-2 border-border cursor-pointer bg-transparent" aria-label="Colore della nuova parola chiave" />
                      <span className="text-xs text-secondary-foreground font-mono font-normal">{coloreParolaInput}</span>
                    </label>
                    <button onClick={aggiungiParolaARamo} disabled={!parolaRamoTesto.trim() || foglieRamoScelto >= MAX_FOGLIE_PER_RAMO}
                      className="min-h-11 bg-primary hover:bg-primary/90 text-primary-foreground font-extrabold px-5 py-3 rounded-xl text-sm disabled:opacity-50 disabled:cursor-not-allowed">
                      AGGIUNGI PAROLA
                    </button>
                  </div>
                  </div>}
                </div>
              )}

              <div className="space-y-4">
                {mappa.rami.map(ramo => (
                  <div key={ramo.id} className="border-2 rounded-2xl p-4" style={{ borderColor: ramo.colore, backgroundColor: ramo.colore + "10" }}>
                    <h4 className="font-extrabold text-base text-center break-words" style={{ color: ramo.colore }}>{ramo.titolo}</h4>
                    {ramo.parolaLegame?.trim() && (
                      <p className="text-xs normal-case text-secondary-foreground text-center break-words">Legame: {ramo.parolaLegame}</p>
                    )}
                    <div className="mt-2 flex flex-wrap justify-center gap-2">
                      {ramo.parole.length > 0 ? (
                        ramo.parole.map(p => (
                          <span key={p.id} className="inline-flex items-center gap-2 text-white font-bold px-3 py-1.5 rounded-xl text-sm animate-pop-in" style={{ backgroundColor: ramo.colore }}>
                            {p.testo}
                            <button onClick={() => rimuoviParolaDaRamo(ramo.id, p.id)} aria-label={`Rimuovi la parola ${p.testo} dal ramo ${ramo.titolo}`} className="min-w-8 min-h-8 hover:text-white/70 transition-colors text-xs">X</button>
                          </span>
                        ))
                      ) : (
                        <span className="text-secondary-foreground text-sm italic text-center w-full block">NESSUNA PAROLA CHIAVE IN QUESTO RAMO</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {(mappa.rami.some(r => r.parole.length > 0)) && (
                <div className="mt-6 bg-muted border border-border rounded-2xl p-3 max-w-[200px] mx-auto">
                  <p className="text-center text-xs font-bold text-secondary-foreground mb-2">ANTEPRIMA DELLA MAPPA</p>
                  <ConceptMapCanvas titolo={titoloInput.toUpperCase() || mappa.titoloCentrale} rami={mappa.rami} studente={mappa.studente} coloreTitolo={coloreTitolo} mini />
                </div>
              )}
            </div>
          </div>
        )}

        {/* COMPLETED VIEW */}
        {currentStep === TOTAL_STEPS && mappa.completata && (
          <div className="w-full max-w-6xl mx-auto animate-slide-up">
            <div className="text-center mb-4">
              <h2 className="text-lg md:text-xl font-extrabold text-foreground mb-2">MAPPA COMPLETATA</h2>
            </div>

            <div className="mb-4 flex flex-wrap items-center justify-center gap-2 print:hidden">
              <button type="button" onClick={() => setMostraLegami(aperto => !aperto)}
                aria-expanded={mostraLegami} aria-controls="editor-parole-legame"
                className="w-full max-w-[19rem] min-h-11 inline-flex items-center justify-center gap-2 rounded-xl bg-secondary px-4 py-2 text-sm font-bold text-secondary-foreground hover:bg-secondary/80">
                PAROLE-LEGAME ({numeroLegami}) <ChevronDown aria-hidden="true" className={`size-4 transition-transform ${mostraLegami ? 'rotate-180' : ''}`} />
              </button>
              <button type="button" onClick={modificaMappa}
                className="w-full max-w-[19rem] min-h-11 rounded-xl bg-secondary px-4 py-2 text-sm font-bold text-secondary-foreground hover:bg-secondary/80">
                MODIFICA TITOLO, RAMI E FOGLIE
              </button>
            </div>

            {mostraLegami && <ParoleLegameEditor titolo={mappa.titoloCentrale} rami={mappa.rami} onChange={aggiornaLegame} onTornaMappa={() => {
              setMostraLegami(false);
              requestAnimationFrame(() => document.getElementById("mappa-pannello")?.scrollIntoView({ behavior: "smooth", block: "start" }));
            }} />}

            <section id="mappa-pannello" className="mb-5" aria-label="Area della mappa">
              <div className="mb-2 mx-auto grid w-full max-w-[23rem] grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-stretch gap-1 print:hidden" role="group" aria-label="Ingrandimento della mappa">
                <button type="button" onClick={() => setZoomMappa(livelliZoom[Math.max(0, indiceZoom - 1)])}
                  disabled={indiceZoom <= 0} aria-label="Riduci la mappa"
                  className="zoom-mappa-button min-h-11 min-w-0 inline-flex items-center justify-center gap-1 rounded-xl bg-secondary px-1 py-2 text-xs sm:text-sm font-bold text-secondary-foreground hover:bg-secondary/80 disabled:opacity-50 disabled:cursor-not-allowed">
                  <Minus className="zoom-mappa-icon size-4 shrink-0" aria-hidden="true" /> <span className="min-w-0 break-words">RIDUCI</span>
                </button>
                <span className="self-center text-center text-sm font-bold text-muted-foreground" aria-live="polite">{Math.round(zoomMappa * 100)}%</span>
                <button type="button" onClick={() => setZoomMappa(livelliZoom[Math.min(livelliZoom.length - 1, indiceZoom + 1)])}
                  disabled={indiceZoom >= livelliZoom.length - 1} aria-label="Ingrandisci la mappa"
                  className="zoom-mappa-button min-h-11 min-w-0 inline-flex items-center justify-center gap-1 rounded-xl bg-secondary px-1 py-2 text-xs sm:text-sm font-bold text-secondary-foreground hover:bg-secondary/80 disabled:opacity-50 disabled:cursor-not-allowed">
                  <Plus className="zoom-mappa-icon size-4 shrink-0" aria-hidden="true" /> <span className="min-w-0 break-words">INGRAN<wbr />DISCI</span>
                </button>
              </div>
              <div ref={viewportMappaRef} tabIndex={0} role="region" aria-label="Mappa scorrevole"
                className="mappa-viewport w-full overflow-auto rounded-2xl border border-border bg-white overscroll-contain"
                style={{ maxHeight: zoomMappa > 1 ? "560px" : undefined }}>
                <div id="mappa-da-stampare" style={{ width: `${zoomMappa * 100}%` }} className="bg-white border-2 border-border rounded-2xl p-4 md:p-5 shadow-md print:shadow-none print:border-0 print:p-0">
                  <ConceptMapCanvas
                    titolo={mappa.titoloCentrale}
                    rami={mappa.rami}
                    immagini={mappa.immagini}
                    onImmaginiPosizioni={handleImmaginiPosizioni}
                    onPosizioniMappa={handlePosizioniMappa}
                    onPosizioniLegami={handlePosizioniLegami}
                    studente={mappa.studente}
                    coloreTitolo={mappa.coloreTitolo || coloreTitolo}
                    zoom={zoomMappa}
                    fullSize
                  />
                </div>
              </div>
            </section>

            {/* Upload immagini e controlli dimensione */}
            <div className="mb-4 max-w-lg mx-auto print:hidden">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handleImageUpload}
                className="hidden"
                id="upload-immagini-finale"
              />
              <div className="text-center mb-4">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={mappa.immagini.length >= MAX_IMMAGINI}
                  className="w-full max-w-[15.5rem] min-h-14 bg-secondary hover:bg-secondary/80 text-secondary-foreground text-base font-bold px-4 py-3 rounded-xl shadow-md transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  SCEGLI IMMAGINI ({mappa.immagini.length}/{MAX_IMMAGINI})
                </button>
              </div>

              {mappa.immagini.length > 0 && (
                <div className="space-y-4">
                  {mappa.immagini.map((img, i) => (
                    <div key={i} className="flex items-center gap-4 bg-muted rounded-2xl p-4">
                      <img src={img.dataUrl} className="w-14 h-14 rounded-lg object-cover border border-border shrink-0" alt="" />
                      <div className="flex-1 text-left min-w-0">
                        <span className="text-sm font-normal text-secondary-foreground">Immagine {i + 1}</span>
                        <div className="flex flex-wrap gap-3 mt-1.5">
                          <label className="text-sm md:text-base text-secondary-foreground normal-case">
                            LARGHEZZA:
                            <input type="number" value={img.larghezza} onChange={(e) => aggiornaDimensione(i, 'larghezza', Number(e.target.value))} onFocus={(e) => e.target.select()} className="w-14 ml-1.5 px-1.5 py-1 bg-input border border-border rounded text-sm md:text-base text-center" />
                          </label>
                          <label className="text-sm md:text-base text-secondary-foreground normal-case">
                            ALTEZZA:
                            <input type="number" value={img.altezza} onChange={(e) => aggiornaDimensione(i, 'altezza', Number(e.target.value))} onFocus={(e) => e.target.select()} className="w-14 ml-1.5 px-1.5 py-1 bg-input border border-border rounded text-sm md:text-base text-center" />
                          </label>
                        </div>
                      </div>
                      <button onClick={() => rimuoviImmagine(i)} aria-label={`Rimuovi immagine ${i + 1}`} className="min-w-11 min-h-11 text-muted-foreground hover:text-destructive transition-colors font-bold text-lg shrink-0">X</button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <p className="mb-2 text-center text-sm text-secondary-foreground normal-case" role="status" aria-live="polite">
              {esportazione ? `Preparazione ${esportazione === "pdf" ? "del PDF" : "dell'immagine"} in corso...` : ""}
            </p>
            <div className="flex flex-col sm:flex-row items-center gap-4 justify-center flex-wrap">
              <button
                onClick={scaricaPDF}
                disabled={esportazione !== null}
                className="w-full max-w-[15.5rem] min-h-14 bg-secondary hover:bg-secondary/80 text-secondary-foreground text-base font-bold px-4 py-3 rounded-xl shadow-md transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-wait"
              >
                SCARICA PDF
              </button>
              <button
                onClick={scaricaImmagine}
                disabled={esportazione !== null}
                className="w-full max-w-[15.5rem] min-h-14 bg-secondary hover:bg-secondary/80 text-secondary-foreground text-base font-bold px-4 py-3 rounded-xl shadow-md transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-wait"
              >
                SCARICA IMMAGINE
              </button>
            </div>
          </div>
        )}

        {/* NAVIGATION BUTTONS */}
        {currentStep >= 1 && currentStep <= TOTAL_STEPS && !mappa.completata && (
          <div className="w-full max-w-3xl mx-auto mt-6 sm:mt-8">
          <div className="flex justify-between items-center gap-1.5 sm:gap-4">
            <button
              onClick={indietro}
              className="bg-secondary hover:bg-secondary/80 text-secondary-foreground font-extrabold px-3 sm:px-6 py-2.5 sm:py-4 rounded-xl sm:rounded-2xl text-xs sm:text-lg transition-all hover:scale-105 active:scale-95"
            >
              INDIETRO
            </button>

            <span className="text-secondary-foreground font-bold text-[10px] sm:text-sm text-center leading-tight">
              PASSO {currentStep} DI {TOTAL_STEPS}
            </span>

            <button
              onClick={avanza}
              disabled={!puoiAvanzare()}
              className={`
                font-extrabold px-3 sm:px-8 py-2.5 sm:py-4 rounded-xl sm:rounded-2xl text-xs sm:text-lg transition-all
                ${puoiAvanzare()
                  ? "bg-primary hover:bg-primary/90 text-primary-foreground hover:scale-105 active:scale-95 shadow-lg"
                  : "bg-muted text-muted-foreground cursor-not-allowed"
                }
              `}
            >
              AVANTI
            </button>
          </div>
          </div>
        )}
      </main>
    </div>
  );
}
