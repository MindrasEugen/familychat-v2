import { act, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { CHECK_INTERVAL_MS, isNewVersion, mainScriptFromHtml, shouldCheck, useNewVersionAvailable } from './versionCheck'

// Come lo genera Vite in produzione.
function indexHtml(script: string) {
  return `<!doctype html><html><head>
    <script>document.documentElement.dataset.theme = 'dark'</script>
    <script type="module" crossorigin src="${script}"></script>
    <link rel="stylesheet" crossorigin href="/assets/index-Cx1.css">
  </head><body><div id="root"></div></body></html>`
}

describe('confronto delle versioni', () => {
  it('trova il file JS principale e ignora gli script normali', () => {
    expect(mainScriptFromHtml(indexHtml('/assets/index-iA1Crtk3.js'))).toBe('/assets/index-iA1Crtk3.js')
    expect(mainScriptFromHtml('<html><body>nessuno script</body></html>')).toBeNull()
  })

  it('nuova versione solo se il file principale è cambiato', () => {
    expect(isNewVersion('/assets/index-A.js', indexHtml('/assets/index-B.js'))).toBe(true)
    expect(isNewVersion('/assets/index-A.js', indexHtml('/assets/index-A.js'))).toBe(false)
    // Pagina inattesa (errore, manutenzione) o script in esecuzione ignoto: niente avviso.
    expect(isNewVersion('/assets/index-A.js', '<html>502</html>')).toBe(false)
    expect(isNewVersion(null, indexHtml('/assets/index-B.js'))).toBe(false)
  })

  it('al massimo un controllo ogni 10 minuti', () => {
    expect(shouldCheck(null, 1_000)).toBe(true)
    expect(shouldCheck(0, CHECK_INTERVAL_MS - 1)).toBe(false)
    expect(shouldCheck(0, CHECK_INTERVAL_MS)).toBe(true)
  })
})

describe('controllo al ritorno in primo piano', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    document.head.querySelector('script[data-test]')?.remove()
  })

  function runningScript(src: string) {
    const script = document.createElement('script')
    script.type = 'module'
    script.dataset.test = ''
    script.setAttribute('src', src)
    document.head.appendChild(script)
  }

  it('chiede index.html al sito senza cache, al massimo una volta ogni 10 minuti, e segnala la nuova versione', async () => {
    runningScript('/assets/index-A.js')
    const fetchMock = vi.fn(async () => new Response(indexHtml('/assets/index-B.js')))
    vi.stubGlobal('fetch', fetchMock)

    const { result } = renderHook(() => useNewVersionAvailable(true))
    expect(result.current).toBe(false)

    await act(async () => {
      document.dispatchEvent(new Event('visibilitychange'))
      document.dispatchEvent(new Event('visibilitychange'))
    })
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock).toHaveBeenCalledWith('/', { cache: 'no-store' })
    expect(result.current).toBe(true)
  })

  it('stessa versione: nessun avviso', async () => {
    runningScript('/assets/index-A.js')
    vi.stubGlobal('fetch', vi.fn(async () => new Response(indexHtml('/assets/index-A.js'))))
    const { result } = renderHook(() => useNewVersionAvailable(true))
    await act(async () => {
      document.dispatchEvent(new Event('visibilitychange'))
    })
    expect(result.current).toBe(false)
  })

  it('in sviluppo non controlla niente', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    renderHook(() => useNewVersionAvailable(false))
    await act(async () => {
      document.dispatchEvent(new Event('visibilitychange'))
    })
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
