# Prompt: riscrittura Chat Famiglia in React (modello Discord)

Scritto il 2026-09-05, dopo una sessione di stabilizzazione della v1 (vedi commit "Stabilizza notifiche, traduzione e re-login in attesa della riscrittura React" e le note in `PLAN.md`/`SECURITY_REPORT.md`). Pensato per essere incollato come prompt di partenza in una sessione nuova, in una cartella/repository separati da questo.

## Obiettivo

Riscrivere da zero l'attuale "Chat Famiglia" (oggi: PWA statica in HTML/CSS/JS vanilla + Supabase) come applicazione React modulare, in una cartella nuova, in parallelo alla v1 che resta in produzione nel frattempo. **Nota su "modello Discord"**: era un riferimento usato solo per descrivere l'idea di fondo (identità per persona, non un intero sistema di server/canali multipli) — vedi "Modello di camere, identità e permessi" più sotto per la struttura reale decisa. Deve restare una vera app di chat (testo, foto, traduzione automatica, notifiche push), non un giocattolo, e deve essere più fluida e stabile della v1.

## Perché si riscrive, non solo si aggiusta

La v1 soffre di instabilità ricorrente: utenti sloggati dalle "camere", notifiche di sistema che a volte restano visibili anche dopo aver riaperto l'app, traduzioni automatiche con più round di bug. Una parte di questa instabilità viene da scelte architetturali di fondo (account condiviso per gruppo, un file monolitico che sincronizza a mano stato e DOM), non solo da bug isolati — da qui la scelta di ripartire invece di continuare a rincorrere sintomi. Le sezioni sotto raccolgono cosa è stato trovato e imparato, perché non si ripeta.

## Lezioni dalla v1 — da non ripetere

1. **Niente account condiviso per gruppo.** In v1 ogni "camera" è un singolo account Supabase (email+password) usato da più persone/telefoni della famiglia contemporaneamente — scelta dichiarata fin dall'inizio (vedi `SECURITY_REPORT.md` v1, punto 5: chiunque conosca la password legge/cancella tutto, nessuna distinzione fra membri). È quasi certamente anche la causa principale degli sloggamenti frequenti: i refresh token di Supabase sono a uso singolo e ruotano a ogni refresh; più dispositivi collegati alla STESSA sessione condivisa possono competere e invalidarsi a vicenda quando rinfrescano vicino nel tempo. Non è stato possibile confermarlo al 100% sui log di produzione (finestra controllata senza traffico reale), ma è coerente sia con i sintomi riportati sia con la documentazione ufficiale di Supabase sulle sessioni. **Modello Discord = un account per persona**; le "camere"/canali sono semplicemente cose a cui più account hanno accesso, non un'unica identità condivisa.

2. **Isolare bene sessione, canale realtime e stato per ogni account/room, e testare esplicitamente i casi limite**: telefono bloccato/in background a lungo, rete che cade e torna, app riaperta da una notifica push. Sono i momenti in cui la v1 perdeva colpi (canale realtime muto in silenzio finché non si ricaricava tutto, sessione scaduta senza un recupero pulito). Una libreria per lo stato server/realtime (es. TanStack Query, o gli hook ufficiali Supabase) evita di reinventare a mano la riconnessione, ma va comunque testata quella sequenza specifica — non solo il caso felice.

3. **Le notifiche push di sistema vanno chiuse in modo affidabile quando l'app torna in primo piano.** Bug reale trovato e corretto in v1: il messaggio dal client al service worker per chiudere le notifiche usava `navigator.serviceWorker.controller`, che può essere `null` per un istante dopo l'avvio o un aggiornamento del SW — il messaggio si perdeva senza errori, le notifiche restavano in pannello. Usare `navigator.serviceWorker.ready` (aspetta un worker davvero attivo), non `.controller`.

4. **La traduzione automatica via LLM ha bisogno di controesempi espliciti per le parole corte/ambigue**, non solo di regole generiche tipo "traduci sempre tutto". Bug reale in v1: "sì" italiano veniva lasciato invariato verso il francese perché somiglia visivamente a "si" francese (parola diversa, "se"/"if"). Risolto aggiungendo nel prompt di sistema un controesempio nominato esplicitamente, non una regola più generica. Inoltre: non mettere mai in cache una traduzione tornata identica all'originale verso una lingua diversa dalla lingua sorgente attesa — è quasi sempre un fallimento silenzioso, e una cache che non si autocorregge blocca l'errore per sempre finché qualcuno non se ne accorge e forza un'invalidazione manuale (in v1 è già successo due volte). **Causa più profonda confermata da una diagnosi successiva**: la qualità incostante non dipendeva solo da parole ambigue isolate, ma da una tabella di mappatura codice-lingua→nome-lingua incompleta nella Edge Function (solo francese/inglese avevano un nome esplicito passato al modello; qualunque altra lingua, incluso il rumeno, ricadeva sul codice ISO grezzo passato come se fosse un nome — es. "Translate this text into ro" invece di "into Romanian" — funzionante ma inaffidabile). **Passare a un servizio di traduzione dedicato (vedi "Traduzione: raccomandazione per la v2") elimina strutturalmente questo intero problema**: un'API di traduzione riceve codici lingua ISO standard come parametro esplicito, non richiede una mappatura a mano né un prompt scritto in linguaggio naturale — non è quindi solo "un servizio migliore", risolve alla radice la classe di bug osservata, non solo i sintomi già corretti.

5. **Le foto da smartphone (HEIC da iPhone in particolare) sono un caso limite serio**, non un dettaglio da sistemare dopo. La v1 ha dovuto implementare tre strategie di decodifica in cascata (`createImageBitmap` → elemento `<img>` → libreria `heic2any` con timeout) perché nessuna singola strategia bastava su tutti i device reali usati dalla famiglia. Se la nuova app include l'invio foto, prevedere fin da subito un fallback (anche solo "carica il file originale se la compressione fallisce") invece di bloccare l'invio quando la decodifica non riesce.

6. **Riusa quello che esiste già invece di introdurre servizi esterni nuovi senza dirlo.** La Edge Function Supabase `translate-message` (proxy verso Mistral, chiave API lato server) fa già la traduzione automatica. In passato un sub-agente ha aggiunto una funzionalità simile usando un servizio pubblico esterno pur avendo trovato ed escluso questa stessa Edge Function, senza segnalarlo — per un'app di messaggi di famiglia significa testo che esce verso terzi non necessari, deciso senza chiederlo. Prima di aggiungere qualunque libreria o servizio esterno nuovo (traduzione, notifiche, storage, autenticazione), verificare se una capacità equivalente esiste già nel backend scelto per questa v2, e se si decide di non riusarla, fermarsi e chiedere prima di procedere.

7. **Niente file monolitico.** `app.js` della v1 (~1150 righe) gestiva autenticazione multi-account, realtime, push, traduzione e rendering UI tutto insieme, con sincronizzazione manuale stato↔DOM — il punto più fragile del codice secondo le note di progetto della v1. Componenti React separati per responsabilità (autenticazione, lista camere/canali, singola chat, traduttore standalone, gestione notifiche) vanno trattati come requisito esplicito, non solo come conseguenza automatica di "usare React".

8. **L'esclusione del mittente da una notifica push deve avvenire lato server, non solo lato client.** Bug reale in v1: la funzione che invia le push (`send-push`) filtra i destinatari solo per `user_id`, senza escludere l'endpoint del dispositivo che ha appena inviato il messaggio — chi scrive riceve sempre anche la push del proprio messaggio. La soppressione lato client (vedi punto 9) è un secondo livello di difesa, non un sostituto: la funzione server che invia le notifiche deve escludere esplicitamente la sottoscrizione del mittente, non limitarsi a filtrare per utente/camera destinataria.

9. **Non affidare la soppressione delle notifiche (o qualunque stato "sono in questa schermata ora") solo a una variabile in memoria nel service worker.** Bug reale in v1: `activeRoomId` era una variabile in memoria nel service worker, azzerata ogni volta che il browser termina e riavvia il SW dopo un periodo di inattività (comportamento normale, non un errore) — se questo accade tra un aggiornamento di stato e l'arrivo di una notifica, il confronto "sono già su questa chat?" fallisce anche quando è vero, e la notifica appare comunque a chat aperta. Se la v2 usa un meccanismo simile, quello stato va persistito (es. IndexedDB) o, meglio ancora, la soppressione principale va delegata al server (vedi punto 8), non a uno stato in memoria che può sparire in qualunque momento. Collegato: le notifiche di sistema vanno chiuse in modo affidabile anche al **primo caricamento a freddo dell'app** (non solo su un evento di cambio-visibilità del browser, che in v1 non scattava mai su un avvio iniziale già visibile, lasciando le notifiche visibili anche quando l'utente "aveva già aperto l'app").

10. **La lista messaggi non deve mai svuotarsi e ripopolarsi da zero mentre una sottoscrizione realtime è attiva sulla stessa camera.** Bug reale in v1: il caricamento della cronologia svuotava la lista e poi la riempiva da capo con i risultati della fetch; se un messaggio realtime arrivava esattamente in quella finestra, veniva accodato subito (lista già vuota), e poi la cronologia lo "superava" senza riconoscerlo, risultando fuori dall'ordine cronologico corretto — percepito dall'utente come un messaggio perso, specialmente con più persone che scrivono in contemporanea. Il requisito per la v2, che TanStack Query soddisfa se usato correttamente (non automaticamente solo "per il fatto di usarlo"): i messaggi vanno sempre uniti per id (deduplicati) e ordinati per timestamp/sequenza, mai semplicemente accodati in coda a un elenco svuotato in precedenza. Collegato: non ricreare da zero un canale realtime già sano ad ogni evento di ritorno in primo piano/riconnessione di rete — verificare prima se il canale è ancora vivo, e ricrearlo solo se serve davvero, per evitare una finestra (per quanto breve) senza sottoscrizione attiva.



## Funzionalità da non perdere nella riscrittura

- Più account/gruppi collegati sullo stesso dispositivo contemporaneamente (restare "loggati" su più camere/server insieme) — ma un account per persona, non condiviso.
- Invio testo e foto, con retention automatica dei messaggi vecchi (in v1: 30 giorni).
- Traduzione automatica dei messaggi nella lingua di chi legge, più una sezione traduttore standalone indipendente dalla chat.
- Notifiche push anche ad app chiusa o schermo spento.
- PWA installabile (service worker, manifest) — o rivalutare se serve ancora con l'architettura nuova, non darlo per scontato.

## Modello di camere, identità e permessi (deciso)

Struttura semplice — **non** un vero sistema Discord con server e più canali dentro ciascuno. Resta concettualmente la stessa lista di camere/gruppi di oggi, ma con identità e accessi ripensati da zero:

**Profilo utente, non più nome del dispositivo.** La v1 identificava le persone per nome del telefono/device all'interno di un account condiviso. Nella v2, la registrazione crea un vero profilo personale: username e foto profilo, associati a un account Supabase individuale (vedi punto 1 delle "Lezioni dalla v1").

**Camere con invito, non più credenziali condivise.** Chiunque può creare una camera. Per entrare in una camera esistente serve essere invitato da qualcuno che ne fa già parte — non esistono più email/password condivise da distribuire a voce o per messaggio.

**Due ruoli, permessi minimi:**
- **Fondatore della camera** (chi l'ha creata): controllo pieno sulla chat — può cancellare i messaggi di chiunque, gestire i membri, presumibilmente eliminare la camera stessa (da specificare in dettaglio in fase di implementazione, ma il principio è "controllo pieno").
- **Membri**: possono cancellare solo i propri messaggi, e possono invitare terze persone a entrare nella camera. Nessun altro potere amministrativo.

Non è ancora definito nel dettaglio (da chiarire in fase di implementazione, non bloccante per iniziare): cosa succede se un fondatore lascia la camera o elimina il proprio account (la camera resta orfana, viene eliminata, il ruolo passa a qualcun altro?); se un membro può revocare un invito che ha mandato lui stesso prima che venga accettato; se esiste un limite al numero di persone che un membro può invitare.

## Librerie consigliate

Scelte pensate per restare coerenti con l'esperienza già maturata su progetti precedenti (es. `cinema-vicino-app`, dove React Router e Vite hanno già funzionato bene), non solo un elenco generico.

- **Build**: **Vite** — nessun bisogno di SSR per una PWA di chat, e il team ha già esperienza diretta con questo strumento.
- **Routing**: **React Router** — già validato su un progetto precedente dello stesso team.
- **Stato server/realtime**: **TanStack Query** abbinato al client `@supabase/supabase-js` per le sottoscrizioni realtime — pattern comune raccomandato nell'ecosistema Supabase: la sottoscrizione realtime invalida/aggiorna la cache di TanStack Query invece di gestire a mano un array di messaggi mutabile. Questo aiuta specificamente contro i bug di "lettura-modifica-scrittura in concorrenza" già diagnosticati nella v1 (messaggi persi quando più utenti scrivono insieme, notifiche duplicate).
- **Stato locale/UI** (se serve oltre allo stato server): **Zustand** — leggero, meno boilerplate di Redux, adatto a un'app di queste dimensioni. Da valutare se lo stato dei componenti React nativi (`useState`/`useContext`) non basti già.
- **Autenticazione**: il client `@supabase/supabase-js` stesso, senza librerie aggiuntive — non serve un pacchetto di helper SSR (quelli servono per framework con rendering server-side, non per una SPA Vite).
- **Test**: **Vitest** (già in uso) + **React Testing Library** per i componenti; **Playwright** (già in uso) per gli e2e — riuso della suite esistente, non ripartire da zero sul testing.
- **Notifiche push**: Web Push API nativa lato client (nessuna libreria necessaria) + pacchetto **web-push** (Node) lato Edge Function/server per la generazione/invio con chiavi VAPID.
- **Immagini**: **heic2any** (già usato in v1, mantenere la stessa cascata di decodifica) — valutare anche **browser-image-compression** per ridurre la dimensione delle foto prima dell'upload, se non già gestito.
- **PWA**: **vite-plugin-pwa** — automatizza generazione di service worker e manifest dentro Vite, invece di scriverli a mano come probabilmente avveniva in v1.

## Traduzione: raccomandazione per la v2 (deciso: Google, con fallback)

L'approccio attuale (Mistral via prompt generico nella Edge Function `translate-message`) ha già richiesto più cicli di bugfix per problemi di fondo (parole corte/ambigue tradotte male, traduzioni che tornano identiche all'originale senza segnalare un fallimento). Questo è un pattern noto quando si usa un modello linguistico generico per un compito — la traduzione — per cui esistono servizi specializzati, spesso più affidabili proprio sui casi limite che hanno causato i bug precedenti.

**Decisione presa: Google Cloud Translation come servizio primario.** Piano gratuito di 500.000 caratteri al mese, ricorrente e senza scadenza — non una tantum, si azzera ogni mese. Oltre la soglia gratuita, costa 20 dollari per milione di caratteri. Copre oltre 130 lingue con rilevamento automatico della lingua, quindi il rumeno è coperto senza dubbio, così come qualunque altra lingua la famiglia dovesse aggiungere in futuro.

**Suggerimento pratico importante per restare gratis**: se l'obiettivo è non pagare mai, **non abilitare la fatturazione (billing) sul progetto Google Cloud**. Senza fatturazione attiva, le richieste oltre la soglia gratuita mensile vengono semplicemente rifiutate con un errore di quota superata, invece di essere fatturate automaticamente — questo rende sicuro l'uso "solo gratis", e quell'errore specifico è il segnale che l'app deve intercettare per attivare il fallback (vedi sotto), senza rischio di un addebito imprevisto.

**Catena di fallback quando i caratteri gratuiti finiscono, in ordine di preferenza:**
1. Un secondo servizio di traduzione gratuito, se se ne trova uno affidabile al momento dell'implementazione — DeepL è un candidato (confermato supporto per il rumeno, generalmente considerato di qualità superiore per le lingue europee), ma il suo livello gratuito è cambiato a luglio 2026 (oggi: piano "Developer" con 1 milione di caratteri **totali una tantum**, non ricorrente mensile — non un vero equivalente del livello gratuito di Google). Vale la pena verificare al momento dell'implementazione se esiste un'alternativa gratuita e ricorrente migliore di questa, la situazione dei prezzi cambia spesso in questo settore.
2. Se non si trova una seconda opzione gratuita soddisfacente: **tornare all'approccio attuale** (Mistral via la Edge Function `translate-message` già esistente) come rete di sicurezza finale — non ideale quanto un servizio di traduzione dedicato, ma comunque funzionante e già pagato/configurato, meglio che lasciare l'app senza traduzione o iniziare a fatturare inaspettatamente.

Questo design a più livelli (primario → fallback) ricalca lo stesso pattern già usato con successo in un altro progetto del team (`cinema-vicino-app`: ComingSoon.it primario, TMDB come fallback automatico) — un precedente diretto su cui basarsi per l'implementazione, non un'idea nuova da inventare da zero.

**Suggerimento architetturale**: mantenere lo stesso pattern già in uso (una Edge Function Supabase che fa da proxy, con la chiave del servizio scelto lato server, mai esposta al client) — la Edge Function `translate-message` diventa il punto che gestisce l'intera catena di fallback (prova Google → se quota esaurita prova il secondo servizio, se configurato → altrimenti usa Mistral), non la struttura attorno ad essa. Questo rende il cambio contenuto, non un altro pattern architetturale nuovo da introdurre nella stessa sessione della riscrittura React (vedi "Nota di processo" sotto).

**Nota emersa dalla diagnosi della v1**: la sezione traduttore standalone della v1 supporta solo francese e inglese, per scelta esplicita di design (non un bug). Ora che la v2 userà un servizio con copertura di oltre 130 lingue, vale la pena decidere consapevolmente se ampliare anche questa sezione a un elenco più ampio (o a tutte le lingue disponibili), invece di ereditare automaticamente lo stesso limite della v1 senza una scelta esplicita.

## Memoria delle traduzioni — dizionario correggibile (deciso)

Stessa logica già applicata con successo al sistema di instradamento di Chimera (`!feedback +/-` → `quality.jsonl`, per costruire nel tempo una memoria basata su prove reali invece di affidarsi solo a un algoritmo scritto in anticipo): la v2 mantiene uno storico delle traduzioni fatte, che funge sia da cache sia da meccanismo di correzione permanente.

**Cosa registrare**, per ogni traduzione effettuata: testo originale, lingua sorgente, lingua di destinazione, traduzione ottenuta, quale servizio l'ha fornita (Google/fallback/Mistral), quando. Vive in una tabella Supabase dedicata (es. `translation_memory`), non in un file di log locale come `quality.jsonl` di Chimera — qui la memoria deve essere condivisa tra tutti i membri della famiglia, non locale a un dispositivo.

**Uso come cache, prima ancora che come correzione**: prima di chiamare il servizio di traduzione attivo, controllare se quel testo esatto (stessa stringa, stessa lingua sorgente/destinazione) è già presente in `translation_memory`. Se sì, riusare quella traduzione invece di richiamare l'API — riduce il consumo di caratteri gratuiti (aiuta a restare sotto la soglia mensile di Google) e garantisce che la stessa frase si traduca sempre allo stesso modo. Funziona solo per corrispondenze esatte (frasi ricorrenti tipo saluti, espressioni comuni) — non è un sostituto della traduzione per testo nuovo, è un'ottimizzazione su ciò che si ripete.

**Correzione diretta dalla chat**: un membro della famiglia deve poter segnalare che una traduzione mostrata è sbagliata direttamente sul messaggio (es. tocco lungo → "Correggi traduzione"), inserendo la versione corretta. Questo:
- Aggiorna (o crea, se non esisteva già) l'entry in `translation_memory` per quel testo esatto + quella coppia di lingue, marcandola come **corretta manualmente** (campo dedicato, es. `corrected_by_user: true`) — da questo momento, quella entry ha sempre priorità sulla chiamata API per lo stesso identico testo, anche se il servizio di traduzione attivo cambierebbe la risposta.
- Risolve permanentemente casi come il bug del "sì" italiano→francese della v1 (vedi lezione 4): non serve più aspettare una sessione di debug o una patch di codice — basta che qualcuno lo corregga una volta in chat, e resta corretto per tutta la famiglia da quel momento in poi.

**Vincoli tecnici da rispettare**:
- Il confronto per "stesso testo" deve essere normalizzato (case, spazi bianchi iniziali/finali) ma non deve unire frasi diverse solo perché simili — un match parziale/fuzzy rischierebbe di applicare una correzione al posto sbagliato.
- Le entry corrette manualmente (`corrected_by_user: true`) non vanno mai sovrascritte automaticamente da una nuova chiamata API, nemmeno se il servizio di traduzione cambia (es. per il fallback) — restano fisse finché un membro della famiglia non le corregge di nuovo.
- Coerentemente con la lezione 4 della v1: non salvare mai in `translation_memory` una traduzione tornata identica all'originale quando le lingue sorgente/destinazione sono diverse — è quasi sempre un fallimento silenzioso del servizio, non una vera traduzione, e andrebbe a inquinare la cache con un errore permanente invece di uno temporaneo.

## Proposta finale (in base alla diagnosi completa)

La diagnosi non impone la riscrittura (cinque problemi su sette sono patch mirate, non richiedono cambio stack), ma non la sconsiglia nemmeno: il problema più disruptive (1, con il 6 come conseguenza) richiede comunque di cambiare il modello di account — lavoro sostanzioso condiviso da entrambe le strade (React o vanilla JS), già deciso indipendentemente dallo stack. Questo restringe il vero divario di costo tra "patchare la v1" e "riscrivere in React". Proposta concreta:

1. **Procedere con la riscrittura React**, in modo mirato — i problemi 3 e 7 (stato mutabile aggiornato da eventi asincroni concorrenti) sono esattamente il tipo di bug che una disciplina di stato React-style previene per costruzione, un argomento tecnico reale a favore della riscrittura su quei due punti specifici, non solo una preferenza generica.
2. **Backend (decisione ora presa)**: riusare lo stesso progetto Supabase esistente, non ripartire da un backend pulito. La diagnosi ha verificato che schema e configurazione realtime non sono causa di alcun problema (publication attiva, dati corretti) — l'unico pezzo da rifare davvero è il modello di autenticazione/account, non l'intero backend.
3. **Hosting (decisione ora presa)**: restare su Render, nessun motivo emerso per cambiare, coerenza con `cinema-vicino-app`.
4. **Applicare comunque i tre fix economici alla v1** (problemi 2, 4, 5 — bug isolati, patch contenute secondo la diagnosi) mentre la v2 viene costruita in parallelo, così la famiglia continua a usare una v1 meno frustrante nel frattempo, invece di sopportare lo stato attuale per tutta la durata della riscrittura.
5. **I punti 8, 9, 10** delle lezioni sopra vanno trattati come **criteri di accettazione**, non solo linee guida, prima di considerare la v2 pronta a sostituire la v1 in produzione — sono bug reali già riprodotti nella v1, non rischi teorici.

## Decisioni già prese (riassunto)

- Modello di camere/identità/permessi: vedi sezione dedicata sopra.
- Servizio di traduzione: Google Cloud Translation primario, con catena di fallback (secondo servizio gratuito da individuare, poi Mistral esistente) — vedi sezione dedicata sopra.
- Memoria delle traduzioni: dizionario correggibile in Supabase, con correzione diretta dalla chat — vedi sezione dedicata sopra.
- Librerie: vedi sezione dedicata sopra.
- Backend: stesso progetto Supabase esistente (vedi "Proposta finale").
- Hosting: Render (vedi "Proposta finale").

## Nota di processo

Questa riscrittura introduce pattern architetturali nuovi per questo progetto (routing, gestione stato, eventualmente un backend/modello dati diverso). Le decisioni sopra vanno prese da un umano o da Claude direttamente, non delegate a un sub-agente in un colpo solo — nessuno dei worker configurati in questo ambiente è autorizzato a prendere questo tipo di decisione architetturale (vedi le regole di delega globali dell'utente). Una volta prese, l'implementazione dei singoli pezzi ben specificati (un componente, una query, uno stile) torna delegabile secondo le stesse regole.
