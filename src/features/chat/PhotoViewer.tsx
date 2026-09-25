import { useEffect, useRef, useState } from 'react'
import { BackIcon, CloseIcon, ForwardIcon } from '../../components/icons'
import { downloadPhoto, usePhotoUrl } from './photoUrls'

function ViewerImage({ imagePath }: { imagePath: string }) {
  const urlQuery = usePhotoUrl(imagePath)

  if (urlQuery.isPending) return <p className="viewer-status">Caricamento foto…</p>
  if (urlQuery.isError || !urlQuery.data) return <p className="viewer-status">Foto non disponibile.</p>

  return <img className="viewer-image" src={urlQuery.data} alt="Foto in chat" />
}

// Vista a schermo intero delle foto di un messaggio. <dialog> + showModal()
// dà gratis focus intrappolato, Esc per chiudere e lo sfondo (::backdrop).
export function PhotoViewer({
  imagePaths,
  startIndex,
  onClose,
}: {
  imagePaths: string[]
  startIndex: number
  onClose: () => void
}) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [index, setIndex] = useState(startIndex)
  const [isDownloading, setIsDownloading] = useState(false)
  const [downloadFailed, setDownloadFailed] = useState(false)

  const hasMany = imagePaths.length > 1
  const isFirst = index === 0
  const isLast = index === imagePaths.length - 1
  const currentPath = imagePaths[index]

  useEffect(() => {
    const dialog = dialogRef.current
    if (dialog && !dialog.open) dialog.showModal()
    // Niente dialog.close() allo smontaggio: togliere il dialog dalla pagina
    // lo rimuove già dal livello modale. Chiamarlo farebbe partire un evento
    // "close" in ritardo, che in sviluppo (StrictMode monta, smonta e
    // rimonta) chiuderebbe il dialog appena aperto.
  }, [])

  function goTo(next: number) {
    if (next < 0 || next >= imagePaths.length) return
    setIndex(next)
    setDownloadFailed(false)
  }

  async function handleDownload() {
    setIsDownloading(true)
    setDownloadFailed(false)
    try {
      await downloadPhoto(currentPath)
    } catch {
      setDownloadFailed(true)
    } finally {
      setIsDownloading(false)
    }
  }

  return (
    <dialog
      ref={dialogRef}
      className="photo-viewer"
      aria-label="Foto a schermo intero"
      // Esc: il browser chiude il dialog da solo, qui avvisiamo il genitore.
      onClose={onClose}
      onClick={(event) => {
        // Clic sullo sfondo (fuori dalla foto e dai pulsanti) = chiudi.
        if (event.target === event.currentTarget || (event.target as HTMLElement).classList.contains('viewer-stage')) {
          onClose()
        }
      }}
      onKeyDown={(event) => {
        if (event.key === 'ArrowLeft') goTo(index - 1)
        if (event.key === 'ArrowRight') goTo(index + 1)
      }}
    >
      <div className="viewer-bar">
        <button type="button" className="icon-btn" aria-label="Chiudi" onClick={onClose}>
          <CloseIcon />
        </button>
        <span className="viewer-count">{hasMany && `${index + 1} / ${imagePaths.length}`}</span>
        <button type="button" onClick={handleDownload} disabled={isDownloading}>
          {isDownloading ? 'Scarico…' : 'Scarica'}
        </button>
      </div>

      {downloadFailed && (
        <p role="alert" className="viewer-alert">
          Download non riuscito. Riprova.
        </p>
      )}

      <div className="viewer-stage">
        {hasMany && (
          <button
            type="button"
            className="icon-btn viewer-nav prev"
            aria-label="Foto precedente"
            onClick={() => goTo(index - 1)}
            disabled={isFirst}
          >
            <BackIcon />
          </button>
        )}
        <ViewerImage key={currentPath} imagePath={currentPath} />
        {hasMany && (
          <button
            type="button"
            className="icon-btn viewer-nav next"
            aria-label="Foto successiva"
            onClick={() => goTo(index + 1)}
            disabled={isLast}
          >
            <ForwardIcon />
          </button>
        )}
      </div>
    </dialog>
  )
}
