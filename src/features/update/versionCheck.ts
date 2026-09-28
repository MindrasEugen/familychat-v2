import { useEffect, useState } from 'react'

// Nuova versione dopo un deploy: un'app installata (o una scheda) ripresa
// dal background continua a usare il JavaScript vecchio finché non viene
// ricaricata. Al ritorno in primo piano, al massimo ogni 10 minuti, si
// scarica index.html del sito stesso (mai Supabase) senza cache e si
// confronta il file JS principale (nome con hash, generato da Vite) con
// quello in esecuzione. Nessun ricaricamento automatico: si propone e basta.

export const CHECK_INTERVAL_MS = 10 * 60 * 1000

// Il file JS principale citato in un index.html (quello di Vite:
// <script type="module" crossorigin src="/assets/index-XXXX.js">).
export function mainScriptFromHtml(html: string): string | null {
  const tag = /<script\b[^>]*\btype="module"[^>]*>/.exec(html)?.[0]
  return tag ? (/\bsrc="([^"]+)"/.exec(tag)?.[1] ?? null) : null
}

export function isNewVersion(running: string | null, deployedHtml: string): boolean {
  const deployed = mainScriptFromHtml(deployedHtml)
  return running !== null && deployed !== null && deployed !== running
}

export function shouldCheck(lastCheck: number | null, now: number): boolean {
  return lastCheck === null || now - lastCheck >= CHECK_INTERVAL_MS
}

function runningMainScript(): string | null {
  return document.querySelector('script[type="module"][src]')?.getAttribute('src') ?? null
}

// enabled: solo in produzione (in sviluppo il file principale non ha hash).
export function useNewVersionAvailable(enabled: boolean = import.meta.env.PROD) {
  const [available, setAvailable] = useState(false)

  useEffect(() => {
    if (!enabled || available) return
    let lastCheck: number | null = null

    async function check() {
      if (document.visibilityState !== 'visible' || !shouldCheck(lastCheck, Date.now())) return
      lastCheck = Date.now()
      try {
        const response = await fetch('/', { cache: 'no-store' })
        if (response.ok && isNewVersion(runningMainScript(), await response.text())) setAvailable(true)
      } catch {
        // Offline o sito irraggiungibile: si riprova al prossimo ritorno.
      }
    }

    document.addEventListener('visibilitychange', check)
    return () => document.removeEventListener('visibilitychange', check)
  }, [enabled, available])

  return available
}
