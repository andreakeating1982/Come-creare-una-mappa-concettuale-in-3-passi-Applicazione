import { type Ramo, MAX_PAROLE_LEGAME, contaParoleLegame } from "@/lib/tipi-mappa";

export function idCampoLegame(ramoId: string, parolaId?: string): string {
  return `parola-legame-${ramoId}-${parolaId || "tronco"}`;
}

interface Props {
  titolo: string;
  rami: Ramo[];
  onChange: (ramoId: string, parolaId: string | undefined, valore: string) => void;
  onTornaMappa: () => void;
}

/** Un campo per ogni linea, anche quando non contiene ancora una parola. */
export default function ParoleLegameEditor({ titolo, rami, onChange, onTornaMappa }: Props) {
  const numeroLegami = contaParoleLegame(rami);
  const limiteRaggiunto = numeroLegami >= MAX_PAROLE_LEGAME;
  return (
    <section id="editor-parole-legame" className="mb-4 rounded-2xl border-2 border-border bg-card p-4 md:p-5 text-left shadow-sm" aria-labelledby="titolo-editor-legami">
      <h3 id="titolo-editor-legami" className="text-center text-base md:text-lg font-extrabold text-foreground">PAROLE-LEGAME</h3>
      <p className="mt-1 mb-4 text-sm md:text-base text-secondary-foreground normal-case leading-relaxed">
        Su ogni linea puoi scrivere una parola o una breve frase. Esempio: «la foresta comprende gli alberi». I campi sono facoltativi.
      </p>
      <p id="conteggio-legami" className="mb-4 text-center text-sm text-secondary-foreground normal-case" aria-live="polite">
        Parole-legame: {numeroLegami}/{MAX_PAROLE_LEGAME}.{limiteRaggiunto && " Limite raggiunto: modifica o rimuovi un legame esistente per aggiungerne un altro."}
      </p>
      <div className="space-y-4">
        {rami.map(ramo => (
          <div key={ramo.id} className="rounded-xl border border-border bg-white p-3 sm:p-4" style={{ borderLeft: `5px solid ${ramo.colore}` }}>
            <label htmlFor={idCampoLegame(ramo.id)} className="block text-sm font-bold text-secondary-foreground break-words">
              {titolo} <span aria-hidden="true">→</span> {ramo.titolo}
            </label>
            <input
              id={idCampoLegame(ramo.id)}
              value={ramo.parolaLegame || ""}
              disabled={limiteRaggiunto && !ramo.parolaLegame?.trim()}
              aria-describedby="conteggio-legami"
              onChange={e => onChange(ramo.id, undefined, e.target.value)}
              aria-label={`Parola-legame da ${titolo} a ${ramo.titolo}`}
              placeholder="Esempio: comprende"
              maxLength={32}
              className="mt-1 w-full min-h-11 rounded-xl border-2 border-border bg-input px-3 py-2 text-sm md:text-base normal-case text-foreground placeholder:text-secondary-foreground focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/20"
            />
            {ramo.parole.length > 0 && (
              <div className="mt-3 space-y-3 border-t border-border pt-3">
                {ramo.parole.map(parola => (
                  <div key={parola.id}>
                    <label htmlFor={idCampoLegame(ramo.id, parola.id)} className="block text-sm font-bold text-secondary-foreground break-words">
                      {ramo.titolo} <span aria-hidden="true">→</span> {parola.testo}
                    </label>
                    <input
                      id={idCampoLegame(ramo.id, parola.id)}
                      value={parola.parolaLegame || ""}
                      disabled={limiteRaggiunto && !parola.parolaLegame?.trim()}
                      aria-describedby="conteggio-legami"
                      onChange={e => onChange(ramo.id, parola.id, e.target.value)}
                      aria-label={`Parola-legame da ${ramo.titolo} a ${parola.testo}`}
                      placeholder="Esempio: contiene"
                      maxLength={32}
                      className="mt-1 w-full min-h-11 rounded-xl border-2 border-border bg-input px-3 py-2 text-sm md:text-base normal-case text-foreground placeholder:text-secondary-foreground focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/20"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
      <div className="mt-4 flex justify-center">
        <button type="button" onClick={onTornaMappa} className="min-h-11 rounded-xl bg-secondary px-5 py-2 text-sm font-bold text-secondary-foreground hover:bg-secondary/80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary">
          TORNA ALLA MAPPA
        </button>
      </div>
    </section>
  );
}

