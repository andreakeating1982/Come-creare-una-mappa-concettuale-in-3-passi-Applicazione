# Mappa Concettuale 3 Passi — progetto dell'aggiornamento

## Direzione
Preservare l'identità esistente: sfondo crema `#F5F3ED`, card `#FAF8F5`, terracotta `#B8846A`, testo `#2B2421`, accenti marrone `#8B3A1A` e colori dei rami esistenti. La barra di accessibilità e OpenDyslexic restano invariati; il canvas conserva Cambria/Georgia per coerenza con le esportazioni. Nessuna immagine decorativa nuova: è uno strumento didattico.

## Ritocchi richiesti: riferimento Latino Facile
- Ripristinare le dimensioni compatte della barra di accessibilità di Latino Facile anche su mobile, conservando etichette accessibili, funzioni e colori originali; ampliare invisibilmente le superfici touch senza cambiare l'aspetto.
- Nella prima pagina rendere neri testo e segnaposto dei quattro campi studente; coordinare titolo, sottotitolo e testo bianco del pulsante ENTRA alla pagina di Latino Facile, senza cambiare struttura o margini. Il terracotta del pulsante è leggermente più scuro (#9D674E) per conservare contrasto accessibile con il testo bianco.
- In tutti i passi mantenere centrati i selettori COLORE: COLORE TITOLO nel passo 1, COLORE e AGGIUNGI RAMO nel passo 2, COLORE e AGGIUNGI PAROLA nel passo 3 per ciascun ramo selezionato. Lasciare invariati campi, funzioni, palette e altri allineamenti.

## Indicatori di avanzamento completati
- Sostituire il verde delle pillole con un arancio terracotta vivo `#BC4B24`, coordinato al tronco e alla palette calda dell'app; conservare spunte bianche, posizione, stato attivo e navigazione. Usare un contrasto leggibile e rispettare la modalità alto contrasto.

## Fascia iniziale e pulsante RICOMINCIA
- In tutte le schermate la fascia degli indicatori usa lo stesso sfondo crema del corpo pagina, senza cambiare colori e funzionamento degli indicatori o la gestione dei margini nell'embed; i riquadri di lavoro conservano il loro colore.
- Il pulsante RICOMINCIA non compare nella schermata iniziale: dal passo 1 alla mappa completata si trova in una riga propria, centrata sotto il titolo principale. La conferma prima della cancellazione rimane invariata.

## Rifiniture intestazione e selezione rami
- Rimuovere solamente le due linee orizzontali sopra e sotto gli indicatori, lasciando invariati indicatori e puntini. Eliminare nome e cognome dalla testata, conservandoli nella mappa esportata PDF e PNG.
- Centrare l'insieme dei pulsanti di selezione dei rami e il testo RAMO SCELTO. Aumentare uniformemente il distacco fra istruzioni e TITOLO CENTRALE DELLA MAPPA, SOTTOTITOLO DEL RAMO e SCEGLI UN RAMO nei rispettivi passi, senza modificare il resto della card.

## Spaziatura delle foglie
- Aumentare la distanza verticale tra il contatore «Foglie in questo ramo» e il titolo «PAROLA CHIAVE», senza alterare campi o funzionalità.

## Spaziatura controlli colore
- Rimuovere la sola dicitura «(ALMENO 1)» dal contatore dei rami, lasciando il minimo di un ramo. Nei passi 2 e 3 aumentare allo stesso modo il margine sopra COLORE rispetto alla spiegazione delle parole-legame, senza cambiare funzioni o palette.

## Un solo ramo
- Consentire di proseguire con un solo ramo, mantenendo il requisito di almeno un ramo e gli altri limiti invariati; aggiornare istruzioni e contatore senza cambiare lo stile.

## Limiti per mappe leggibili
- Uniformare il pulsante PAROLE-LEGAME ai pulsanti secondari rosa-beige. Introdurre massimo 4 rami, 3 foglie per ramo e 16 parole-legame complessive (una per linea, max 32 caratteri); mostrare contatori e avvisi comprensibili. Le mappe esistenti sopra soglia restano intatte e modificabili, ma non si aggiungono elementi oltre i limiti. Il limite delle immagini è stato successivamente ridotto a 4; le mappe esistenti oltre soglia non vengono tagliate.

## Centratura, immagini e icone della cornice
- Centrare TORNA ALLA MAPPA nell'editor mantenendo lo stile e il focus.
- Limitare i nuovi caricamenti a 4 immagini, senza rimuovere le immagini delle mappe già salvate; aggiornare contatore e documentazione.
- Rendere indipendenti dai CSS del blog le icone SVG schermo intero e ricarica, conservando i pulsanti e la cornice esistenti. Verificare la cornice anche sotto stili del blog conflittuali.

## Pulsanti finali e istruzioni
- Rimuovere CREA UN'ALTRA MAPPA dalla pagina finale: resta RICOMINCIA in alto con la consueta conferma. Caricamento e due pulsanti di download restano compatti e centrati; parole-legame e modifica mappa mantengono una larghezza comune. Conservare altezza touch, colori e funzioni.
- I testi delle istruzioni sono allineati a sinistra e restano marroni; titoli e altri elementi centrati conservano l'allineamento attuale.

## Centratura parole chiave nei rami
- Nei riquadri dei rami del passo 3, centrare orizzontalmente le parole chiave colorate e disporre al centro anche ogni riga successiva su mobile. Lasciare invariati titoli, legami, messaggio del ramo vuoto e comandi di rimozione.

## Riepilogo legami, spaziature e titoli
- Mostrare sotto il titolo di ciascun ramo nel passo 3 la sua parola-legame facoltativa, come nel riepilogo dei rami del passo 2; se assente non aggiungere indicazioni vuote.
- Separare chiaramente la sezione sottotitolo e contatore dal campo parola-legame e applicare la stessa distanza fra parola chiave e parola-legame nel passo 3. Centrare titoli e intestazioni delle sezioni, incluso l'editor PAROLE-LEGAME; conservare leggibili e allineati a sinistra i testi descrittivi e i valori immessi.

## Istruzioni, colori e inserimento progressivo
- Aggiungere «Poi premi il pulsante AVANTI» in fondo alle istruzioni dei tre passi e rinominare AVANTI il comando finale del passo 3, senza cambiare la validazione.
- Mostrare il codice esadecimale accanto ai selettori colore dei passi 2 e 3, con lo stesso stile del passo 1 e aggiornamento immediato.
- Nel passo 3 mantenere visibili ramo scelto e contatore come nell'immagine. I campi parola chiave/legame appaiono solo premendo un ramo e si richiudono dopo ogni aggiunta riuscita; un nuovo clic sul ramo li riapre. Conservare rami, contenuti e limiti esistenti e il focus accessibile.

## Studente e percorso
- Conservare la schermata iniziale, i margini bilanciati e il percorso TRONCO → RAMI → FOGLIE.
- Rendere esplicito che cosa fare, quanti elementi servono e dove inserire/modificare le parole-legame: la parola sul collegamento tra titolo e ramo e quella fra ramo e foglia sono facoltative, indipendenti e associate al rispettivo elemento.
- Offrire alla fine una sezione chiara per inserire o correggere le parole-legame, con esempi e campi etichettati; i dati devono essere riapribili e compatibili con le mappe già salvate.
- Usare spiegazioni brevi e un esempio essenziale, senza rinunciare alle indicazioni necessarie per procedere. Tutte le istruzioni sono nel marrone dell'app (`--secondary-foreground`, `#8B3A1A`); i campi per scrivere la mappa hanno la stessa dimensione delle spiegazioni, mantenendo lo zoom accessibile.
- Rendere distinguibili navigazione, messaggi di completamento e azioni irreversibili; consentire di tornare alle fasi della mappa senza perderla.
- Su richiesta, rimuovere le indicazioni ripetute vicino ai pulsanti dei tre passi, le note su salvataggio e navigazione della mappa e la frase sulle immagini; lasciare invariati controlli, accessibilità, caricamento e salvataggio.

## Canvas desktop e mobile
- Eliminare il comando ADATTA: RIDUCI e INGRANDISCI restano ai lati della percentuale, con la stessa larghezza, su un'unica riga compatta anche su telefono. Lo zoom resta progressivo e accessibile, senza cambiare la mappa o le esportazioni.
- Rendere la superficie finale più ampia su schermi grandi. Su telefono mostrare la mappa intera inizialmente, con controlli comprensibili per ingrandirla e un'area scorrevole interna (non la pagina) per spostarsi. Rendere fluido il trascinamento touch di tutti gli elementi, mantenendo nativi lo scorrimento dall'area vuota e l'alternativa tastiera.
- Rimuovere dalla pagina finale la frase «Trascina elementi e parole-legame. Per cambiare il testo usa il pulsante PAROLE-LEGAME», senza modificare i pulsanti.
- Etichette dei collegamenti ben leggibili, su fondo bianco e trascinabili indipendentemente con mouse, tocco o tastiera. Il loro spostamento è salvato rispetto alla linea, così le etichette seguono i nodi quando vengono spostati; l'editor si apre soltanto dal pulsante dedicato. Con due rami il layout diagonale sfrutta la superficie e lascia spazio ai legami.
- Le nuove immagini vengono disposte in fila, anziché impilate sul titolo; restano trascinabili. L'area bianca della mappa rimane il contenuto di esportazione; controlli e scorrimento restano fuori dalla mappa esportata. PDF e PNG devono contenere l'intera mappa, con le parole-legame anche quando lo schermo è piccolo o zoomato.

## Accessibilità e compatibilità
- Pulsanti e campi con nomi accessibili, focus visibile e target adatti al tocco. Impedire che un comando distruttivo cancelli la mappa senza conferma.
- Conservare il sistema ref-based di drag, lo sfondo bianco, gli embed `labvisivo:height`/legacy e la barra accessibilità.
- Nessun intervento sul database. Dati e preferenze rimangono nello storage locale del browser come prima.

## Controlli
Test di percorso completo e riapertura per mappe vecchie e nuove; export PDF/PNG; trascinamento mouse/touch e tastiera; screenshot desktop e mobile; verifica dello scroll interno e della cornice embed.

