import { getTutorialLang, type TutorialLang } from '../tutorial/tutorialTexts'

// Testi dell'installazione dell'app e dell'avviso di nuova versione, nelle
// lingue della guida (stesso sistema di tutorialTexts.ts). I nomi dei
// pulsanti dell'app restano in italiano tra «»; «Condividi» e «Aggiungi alla
// schermata Home» invece sono voci di Safari e del browser, quindi scritte
// come appaiono sul telefono in quella lingua.

export interface AppTexts {
  install: {
    title: string
    body: string
    button: string
    dismiss: string
    iosTitle: string
    iosBody: string
    accountLabel: string
    installed: string
    unavailable: string
  }
  update: {
    available: string
    reload: string
  }
}

const TEXTS: Record<TutorialLang, AppTexts> = {
  it: {
    install: {
      title: 'Installa Chat Famiglia',
      body: 'Aprila come un’app dalla schermata Home, senza passare dal browser.',
      button: 'Installa',
      dismiss: 'Non ora',
      iosTitle: 'Aggiungila alla schermata Home',
      iosBody:
        'In Safari tocca «Condividi», poi «Aggiungi alla schermata Home». Su iPhone le notifiche arrivano solo così (iOS 16.4 o successivi).',
      accountLabel: 'App sul telefono',
      installed: 'L’app è già installata su questo dispositivo.',
      unavailable:
        'Da qui il browser non permette l’installazione: cerca «Installa app» o «Aggiungi alla schermata Home» nel suo menu.',
    },
    update: {
      available: 'È disponibile una nuova versione.',
      reload: 'Aggiorna',
    },
  },
  ro: {
    install: {
      title: 'Instalează Chat Famiglia',
      body: 'Deschide-o ca pe o aplicație din ecranul principal, fără să mai treci prin browser.',
      button: 'Instalează',
      dismiss: 'Nu acum',
      iosTitle: 'Adaug-o pe ecranul principal',
      iosBody:
        'În Safari atinge «Partajare», apoi «Adăugare la ecranul principal». Pe iPhone notificările ajung doar așa (iOS 16.4 sau mai nou).',
      accountLabel: 'Aplicația pe telefon',
      installed: 'Aplicația este deja instalată pe acest dispozitiv.',
      unavailable:
        'De aici browserul nu permite instalarea: caută «Instalează aplicația» sau «Adăugare la ecranul principal» în meniul lui.',
    },
    update: {
      available: 'Este disponibilă o versiune nouă.',
      reload: 'Actualizează',
    },
  },
  en: {
    install: {
      title: 'Install Chat Famiglia',
      body: 'Open it like an app from your Home Screen, without going through the browser.',
      button: 'Install',
      dismiss: 'Not now',
      iosTitle: 'Add it to your Home Screen',
      iosBody: 'In Safari tap «Share», then «Add to Home Screen». On iPhone, notifications only arrive this way (iOS 16.4 or later).',
      accountLabel: 'App on your phone',
      installed: 'The app is already installed on this device.',
      unavailable: "This browser doesn't allow installing from here: look for «Install app» or «Add to Home screen» in its menu.",
    },
    update: {
      available: 'A new version is available.',
      reload: 'Update',
    },
  },
  // Bozza da far verificare: nel testo ricevuto il francese si fermava dopo
  // la prima frase di iosBody; il resto di iosBody e le chiavi seguenti
  // sono scritti sullo stile delle altre lingue.
  fr: {
    install: {
      title: 'Installe Chat Famiglia',
      body: 'Ouvre-la comme une application depuis l’écran d’accueil, sans passer par le navigateur.',
      button: 'Installer',
      dismiss: 'Pas maintenant',
      iosTitle: 'Ajoute-la à l’écran d’accueil',
      iosBody:
        'Dans Safari, touche «Partager», puis «Sur l’écran d’accueil». Sur iPhone, les notifications n’arrivent que de cette façon (iOS 16.4 ou plus récent).',
      accountLabel: 'L’application sur ton téléphone',
      installed: 'L’application est déjà installée sur cet appareil.',
      unavailable:
        'D’ici, le navigateur ne permet pas l’installation : cherche «Installer l’application» ou «Sur l’écran d’accueil» dans son menu.',
    },
    update: {
      available: 'Une nouvelle version est disponible.',
      reload: 'Mettre à jour',
    },
  },
}

export function getAppTexts(lang: TutorialLang = getTutorialLang()): AppTexts {
  return TEXTS[lang]
}
