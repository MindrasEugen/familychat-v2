import type { CapacitorConfig } from '@capacitor/cli'

// App Android (Capacitor): la build di Vite (`dist`) è inclusa nell'APK,
// non caricata dal sito su Render. Dopo ogni modifica al codice web:
// `npx vite build && npx cap sync android`.
// `appId` è l'identità permanente dell'app (Firebase, Play Store):
// non cambiarlo dopo aver registrato l'app su Firebase.
const config: CapacitorConfig = {
  appId: 'com.met.familychat',
  appName: 'Chat Famiglia',
  webDir: 'dist',
}

export default config
