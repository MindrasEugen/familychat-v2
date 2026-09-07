// Stessa euristica di v1 (getDeviceLang in app.js): la lingua del lettore è
// quella del dispositivo, non una preferenza salvata — niente da configurare.
export function getDeviceLang(): string {
  return (navigator.language || 'en').split('-')[0].toLowerCase()
}
