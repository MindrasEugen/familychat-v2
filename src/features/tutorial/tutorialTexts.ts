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
