import { getDeviceLang } from '../../lib/deviceLang'

// Testi del tutorial di benvenuto, scritti a mano (non tradotti a macchina)
// nelle lingue della famiglia. Il resto dell'app è solo in italiano: per
// questo i nomi dei pulsanti restano in italiano tra virgolette anche nelle
// altre lingue, così chi legge li ritrova identici sullo schermo.

export type TutorialLang = 'it' | 'ro' | 'en' | 'fr'
export type TutorialStepId = 'rooms' | 'chat' | 'translation' | 'notifications' | 'account'

export interface TutorialTexts {
  steps: Record<TutorialStepId, { title: string; body: string }>
  next: string
  back: string
  skip: string
  start: string
  dialogLabel: string
  progress: (current: number, total: number) => string
}

export const TUTORIAL_STEP_ORDER: TutorialStepId[] = ['rooms', 'chat', 'translation', 'notifications', 'account']

const TEXTS: Record<TutorialLang, TutorialTexts> = {
  it: {
    steps: {
      rooms: {
        title: 'Benvenuto in Chat Famiglia',
        body: 'Le conversazioni sono divise in camere. Creane una con «Crea camera», oppure entra in quella di un parente con il codice invito che ti manda (pulsante «Unisciti»).',
      },
      chat: {
        title: 'Scrivi e manda foto',
        body: "Apri una camera per chattare. Con l'icona della fotocamera scatti una foto, con quella della galleria la scegli dal telefono (fino a 10 per messaggio). Tocca una foto ricevuta per vederla grande e scaricarla.",
      },
      translation: {
        title: 'Ognuno legge nella sua lingua',
        body: "I messaggi vengono tradotti in automatico nella lingua del tuo telefono: lo riconosci dall'etichetta «Tradotto». Se una traduzione non ti convince, tocca «Correggi»: la tua versione varrà per tutta la famiglia.",
      },
      notifications: {
        title: 'Non perdere i messaggi',
        body: 'Tocca la campanella in alto nella pagina delle camere per ricevere una notifica quando arriva un messaggio.',
      },
      account: {
        title: 'Fai come a casa tua',
        body: 'Nella pagina «Account» scegli il tema scuro o chiaro, aggiungi un secondo account e puoi rivedere questa guida quando vuoi.',
      },
    },
    next: 'Avanti',
    back: 'Indietro',
    skip: 'Salta',
    start: 'Inizia',
    dialogLabel: 'Guida di benvenuto',
    progress: (current, total) => `Passo ${current} di ${total}`,
  },
  ro: {
    steps: {
      rooms: {
        title: 'Bun venit în Chat Famiglia',
        body: 'Conversațiile sunt împărțite în camere. Creează una cu „Crea camera” sau intră în camera unei rude cu codul de invitație primit de la ea (butonul „Unisciti”).',
      },
      chat: {
        title: 'Scrie și trimite poze',
        body: 'Deschide o cameră ca să vorbești. Cu pictograma aparatului foto faci o poză, cu cea a galeriei alegi una din telefon (până la 10 pe mesaj). Atinge o poză primită ca s-o vezi mare și s-o descarci.',
      },
      translation: {
        title: 'Fiecare citește în limba lui',
        body: 'Mesajele sunt traduse automat în limba telefonului tău: le recunoști după eticheta „Tradotto”. Dacă o traducere nu te convinge, atinge „Correggi”: varianta ta va fi folosită pentru toată familia.',
      },
      notifications: {
        title: 'Nu rata niciun mesaj',
        body: 'Atinge clopoțelul din partea de sus a paginii cu camere ca să primești o notificare când sosește un mesaj.',
      },
      account: {
        title: 'Simte-te ca acasă',
        body: 'În pagina „Account” alegi tema închisă sau deschisă, adaugi un al doilea cont și poți revedea acest ghid oricând.',
      },
    },
    next: 'Înainte',
    back: 'Înapoi',
    skip: 'Sari peste',
    start: 'Începe',
    dialogLabel: 'Ghid de bun venit',
    progress: (current, total) => `Pasul ${current} din ${total}`,
  },
  en: {
    steps: {
      rooms: {
        title: 'Welcome to Chat Famiglia',
        body: 'Conversations are grouped into rooms. Create one with “Crea camera”, or join a relative’s room with the invite code they send you (the “Unisciti” button).',
      },
      chat: {
        title: 'Chat and share photos',
        body: 'Open a room to chat. Use the camera icon to take a photo, or the gallery icon to pick one from your phone (up to 10 per message). Tap a photo you receive to see it full size and download it.',
      },
      translation: {
        title: 'Everyone reads in their own language',
        body: 'Messages are translated automatically into your phone’s language: look for the “Tradotto” label. If a translation sounds wrong, tap “Correggi”: your version will be used for the whole family.',
      },
      notifications: {
        title: 'Never miss a message',
        body: 'Tap the bell at the top of the rooms page to get a notification when a new message arrives.',
      },
      account: {
        title: 'Make yourself at home',
        body: 'On the “Account” page you can switch between dark and light theme, add a second account, and see this guide again anytime.',
      },
    },
    next: 'Next',
    back: 'Back',
    skip: 'Skip',
    start: 'Get started',
    dialogLabel: 'Welcome guide',
    progress: (current, total) => `Step ${current} of ${total}`,
  },
  fr: {
    steps: {
      rooms: {
        title: 'Bienvenue dans Chat Famiglia',
        body: 'Les conversations sont réparties en salons. Crée-en un avec « Crea camera », ou rejoins celui d’un proche avec le code d’invitation qu’il t’envoie (bouton « Unisciti »).',
      },
      chat: {
        title: 'Écris et envoie des photos',
        body: 'Ouvre un salon pour discuter. L’icône appareil photo prend une photo, l’icône galerie en choisit une sur ton téléphone (jusqu’à 10 par message). Touche une photo reçue pour l’afficher en grand et la télécharger.',
      },
      translation: {
        title: 'Chacun lit dans sa langue',
        body: 'Les messages sont traduits automatiquement dans la langue de ton téléphone : repère l’étiquette « Tradotto ». Si une traduction ne te convient pas, touche « Correggi » : ta version servira pour toute la famille.',
      },
      notifications: {
        title: 'Ne rate aucun message',
        body: 'Touche la cloche en haut de la page des salons pour recevoir une notification à chaque nouveau message.',
      },
      account: {
        title: 'Fais comme chez toi',
        body: 'Sur la page « Account », choisis le thème sombre ou clair, ajoute un deuxième compte et revois ce guide quand tu veux.',
      },
    },
    next: 'Suivant',
    back: 'Retour',
    skip: 'Passer',
    start: 'Commencer',
    dialogLabel: 'Guide de bienvenue',
    progress: (current, total) => `Étape ${current} sur ${total}`,
  },
}

// Lingua del dispositivo (stessa euristica della traduzione in chat); per
// tutte le lingue non previste si usa l'inglese.
export function getTutorialLang(): TutorialLang {
  const lang = getDeviceLang()
  return lang === 'it' || lang === 'ro' || lang === 'fr' ? lang : 'en'
}

export function getTutorialTexts(lang: TutorialLang = getTutorialLang()): TutorialTexts {
  return TEXTS[lang]
}

// ---------- Tour guidato e demo (sandbox) ----------
// Stesse regole della guida: nomi dei pulsanti in italiano tra «», dati
// d'esempio (camera «Famiglia», Nonna Maria, Mihai, Anna) mai tradotti.

export type TourStepId =
  | 'welcome'
  | 'signup'
  | 'profile'
  | 'createRoom'
  | 'invite'
  | 'send'
  | 'translation'
  | 'delete'
  | 'finish'

export interface TourTexts {
  dialogLabel: string
  progress: (current: number, total: number) => string
  skip: string
  back: string
  next: string
  finishSignup: string
  finishReview: string
  reviewDoneTitle: string
  reviewDoneBody: string
  steps: Record<TourStepId, { title: string; body: string }>
  tryDemo: string
  watchTour: string
  exitDemo: string
  sandbox: { guestName: string; joinRoomError: string }
}

const TOUR_TEXTS: Record<TutorialLang, TourTexts> = {
  it: {
    dialogLabel: 'Tour di benvenuto',
    progress: (current, total) => `${current} di ${total}`,
    skip: 'Salta',
    back: 'Indietro',
    next: 'Avanti',
    finishSignup: 'Crea il tuo account',
    finishReview: 'Torna all’app',
    reviewDoneTitle: 'Tutto chiaro',
    reviewDoneBody: 'Ora sai come funziona. Torna all’app per ritrovare le tue camere.',
    steps: {
      welcome: {
        title: 'Benvenuto in Chat Famiglia',
        body: 'Ti mostro in pochi passi come funziona, con una famiglia d’esempio. Niente di quello che fai qui viene salvato.',
      },
      signup: {
        title: 'Crea il tuo account',
        body: 'Servono solo email e password. Qui è tutto finto e già compilato: tocca «Crea account».',
      },
      profile: {
        title: 'Il tuo profilo',
        body: 'Scegli il nome con cui la famiglia ti vedrà e, se vuoi, una foto. Tocca «Continua».',
      },
      createRoom: {
        title: 'Crea una camera',
        body: 'Una camera è una chat per una parte della famiglia. Scrivi un nome (per esempio «Cugini») e tocca «Crea camera».',
      },
      invite: {
        title: 'Invita qualcuno',
        body: 'Tocca «Genera nuovo invito»: manda il codice a chi vuoi far entrare, lo scriverà in «Codice invito».',
      },
      send: {
        title: 'Scrivi un messaggio',
        body: 'Questa è la camera «Famiglia» d’esempio, con la nonna e Mihai. Scrivi qualcosa e invialo.',
      },
      translation: {
        title: 'Traduzione automatica',
        body: 'I messaggi scritti in un’altra lingua li leggi già nella tua. Se una traduzione non ti convince, tocca «Correggi».',
      },
      delete: {
        title: 'Cancellare un messaggio',
        body: 'Hai sbagliato? Tocca «Elimina» sotto il tuo messaggio: sparisce per tutti.',
      },
      finish: {
        title: 'Ora tocca a te',
        body: 'Hai visto come funziona. Crea il tuo account vero per entrare nelle camere della tua famiglia.',
      },
    },
    tryDemo: 'Prova la demo',
    watchTour: 'Come funziona? Guarda il tour',
    exitDemo: 'Esci dalla demo',
    sandbox: {
      guestName: 'Ospite',
      joinRoomError: 'Nella prova non puoi unirti a una camera vera: crea il tuo account per usare un codice invito.',
    },
  },
  ro: {
    dialogLabel: 'Tur de bun venit',
    progress: (current, total) => `${current} din ${total}`,
    skip: 'Sari peste',
    back: 'Înapoi',
    next: 'Înainte',
    finishSignup: 'Creează-ți contul',
    finishReview: 'Înapoi la aplicație',
    reviewDoneTitle: 'Totul e clar',
    reviewDoneBody: 'Acum știi cum funcționează. Revino în aplicație ca să-ți regăsești camerele.',
    steps: {
      welcome: {
        title: 'Bine ai venit în Chat Famiglia',
        body: 'În câțiva pași îți arăt cum funcționează, cu o familie de exemplu. Nimic din ce faci aici nu este salvat.',
      },
      signup: {
        title: 'Creează-ți contul',
        body: 'Ai nevoie doar de e-mail și parolă. Aici totul este fals și deja completat: atinge «Crea account».',
      },
      profile: {
        title: 'Profilul tău',
        body: 'Alege numele sub care te va vedea familia și, dacă vrei, o fotografie. Atinge «Continua».',
      },
      createRoom: {
        title: 'Creează o cameră',
        body: 'O cameră este un chat pentru o parte a familiei. Scrie un nume (de exemplu «Verișori») și atinge «Crea camera».',
      },
      invite: {
        title: 'Invită pe cineva',
        body: 'Atinge «Genera nuovo invito»: trimite codul persoanei pe care vrei s-o primești, îl va scrie la «Codice invito».',
      },
      send: {
        title: 'Scrie un mesaj',
        body: 'Aceasta este camera «Famiglia» de exemplu, cu bunica și Mihai. Scrie ceva și trimite.',
      },
      translation: {
        title: 'Traducere automată',
        body: 'Mesajele scrise într-o altă limbă le citești deja în limba ta. Dacă o traducere nu te convinge, atinge «Correggi».',
      },
      delete: {
        title: 'Ștergerea unui mesaj',
        body: 'Ai greșit? Atinge «Elimina» sub mesajul tău: dispare pentru toți.',
      },
      finish: {
        title: 'Acum e rândul tău',
        body: 'Ai văzut cum funcționează. Creează-ți contul real ca să intri în camerele familiei tale.',
      },
    },
    tryDemo: 'Încearcă demo-ul',
    watchTour: 'Cum funcționează? Vezi turul',
    exitDemo: 'Ieși din demo',
    sandbox: {
      guestName: 'Oaspete',
      joinRoomError: 'În demo nu te poți alătura unei camere reale: creează-ți contul ca să folosești un cod de invitație.',
    },
  },
  en: {
    dialogLabel: 'Welcome tour',
    progress: (current, total) => `${current} of ${total}`,
    skip: 'Skip',
    back: 'Back',
    next: 'Next',
    finishSignup: 'Create your account',
    finishReview: 'Back to the app',
    reviewDoneTitle: 'All clear',
    reviewDoneBody: 'Now you know how it works. Go back to the app to find your rooms.',
    steps: {
      welcome: {
        title: 'Welcome to Chat Famiglia',
        body: "In a few steps I'll show you how it works, with an example family. Nothing you do here is saved.",
      },
      signup: {
        title: 'Create your account',
        body: 'You only need an email and a password. Everything here is fake and pre-filled: tap «Crea account».',
      },
      profile: {
        title: 'Your profile',
        body: 'Choose the name your family will see and, if you like, a photo. Tap «Continua».',
      },
      createRoom: {
        title: 'Create a room',
        body: 'A room is a chat for one part of the family. Type a name (for example «Cousins») and tap «Crea camera».',
      },
      invite: {
        title: 'Invite someone',
        body: "Tap «Genera nuovo invito»: send the code to whoever you want to let in, and they'll enter it in «Codice invito».",
      },
      send: {
        title: 'Write a message',
        body: 'This is the example room «Famiglia», with Grandma and Mihai. Write something and send it.',
      },
      translation: {
        title: 'Automatic translation',
        body: "Messages written in another language are already shown in yours. If a translation doesn't look right, tap «Correggi».",
      },
      delete: {
        title: 'Deleting a message',
        body: 'Made a mistake? Tap «Elimina» under your message: it disappears for everyone.',
      },
      finish: {
        title: 'Your turn',
        body: "You've seen how it works. Create your real account to join your family's rooms.",
      },
    },
    tryDemo: 'Try the demo',
    watchTour: 'How does it work? Watch the tour',
    exitDemo: 'Exit the demo',
    sandbox: {
      guestName: 'Guest',
      joinRoomError: "In the demo you can't join a real room: create your account to use an invite code.",
    },
  },
  fr: {
    dialogLabel: 'Visite de bienvenue',
    progress: (current, total) => `${current} sur ${total}`,
    skip: 'Passer',
    back: 'Retour',
    next: 'Suivant',
    finishSignup: 'Crée ton compte',
    finishReview: 'Retour à l’application',
    reviewDoneTitle: 'Tout est clair',
    reviewDoneBody: 'Tu sais maintenant comment ça marche. Retourne dans l’application pour retrouver tes salons.',
    steps: {
      welcome: {
        title: 'Bienvenue dans Chat Famiglia',
        body: 'En quelques étapes, je te montre comment ça marche, avec une famille d’exemple. Rien de ce que tu fais ici n’est enregistré.',
      },
      signup: {
        title: 'Crée ton compte',
        body: 'Il suffit d’un e-mail et d’un mot de passe. Ici tout est fictif et déjà rempli : touche «Crea account».',
      },
      profile: {
        title: 'Ton profil',
        body: 'Choisis le nom sous lequel ta famille te verra et, si tu veux, une photo. Touche «Continua».',
      },
      createRoom: {
        title: 'Crée un salon',
        body: 'Un salon est un chat pour une partie de la famille. Écris un nom (par exemple «Cousins») et touche «Crea camera».',
      },
      invite: {
        title: 'Invite quelqu’un',
        body: 'Touche «Genera nuovo invito» : envoie le code à la personne que tu veux faire entrer, elle l’écrira dans «Codice invito».',
      },
      send: {
        title: 'Écris un message',
        body: 'Voici le salon «Famiglia» d’exemple, avec la grand-mère et Mihai. Écris quelque chose et envoie-le.',
      },
      translation: {
        title: 'Traduction automatique',
        body: 'Les messages écrits dans une autre langue, tu les lis déjà dans la tienne. Si une traduction ne te convainc pas, touche «Correggi».',
      },
      delete: {
        title: 'Supprimer un message',
        body: 'Une erreur ? Touche «Elimina» sous ton message : il disparaît pour tout le monde.',
      },
      finish: {
        title: 'À toi de jouer',
        body: 'Tu as vu comment ça marche. Crée ton vrai compte pour rejoindre les salons de ta famille.',
      },
    },
    tryDemo: 'Essayer la démo',
    watchTour: 'Comment ça marche ? Regarde la visite',
    exitDemo: 'Quitter la démo',
    sandbox: {
      guestName: 'Invité',
      joinRoomError: 'Dans la démo, tu ne peux pas rejoindre un vrai salon : crée ton compte pour utiliser un code d’invitation.',
    },
  },
}

export function getTourTexts(lang: TutorialLang = getTutorialLang()): TourTexts {
  return TOUR_TEXTS[lang]
}
