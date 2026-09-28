import { useEffect, useState, type ReactNode } from 'react'

const PADDING = 6
const GAP = 12
// Spazio che basta al riquadro del testo sotto l'elemento (dove si legge meglio).
const BOX_ROOM = 240
// Oltre questo tempo senza l'elemento (es. nessun messaggio tradotto nella
// lingua del telefono) il riquadro compare comunque, al centro.
const MISSING_TARGET_MS = 1500

// Posizione dell'elemento da evidenziare, ricalcolata a ogni fotogramma:
// gli elementi compaiono dopo il caricamento dei dati e si spostano con lo
// scroll, la tastiera del telefono o una rotazione.
function useTargetRect(target: string | undefined) {
  const [rect, setRect] = useState<DOMRect | null>(null)

  useEffect(() => {
    setRect(null)
    if (!target) return
    const selector = target
    let scrolled = false
    function measure() {
      const element = document.querySelector(selector)
      if (!element) return setRect(null)
      if (!scrolled) {
        element.scrollIntoView({ block: 'center' })
        scrolled = true
      }
      const next = element.getBoundingClientRect()
      setRect((prev) =>
        prev && prev.top === next.top && prev.left === next.left && prev.width === next.width && prev.height === next.height
          ? prev
          : next,
      )
    }
    let frame = requestAnimationFrame(function loop() {
      measure()
      frame = requestAnimationFrame(loop)
    })
    return () => cancelAnimationFrame(frame)
  }, [target])

  return rect
}

// Overlay scuro con un "buco" sull'elemento del passo: il buco resta
// cliccabile (lì si fa l'azione richiesta), il resto dello schermo no. Il
// riquadro del testo va sopra o sotto l'elemento, dove c'è più spazio, così
// su telefono non lo copre mai.
// target: selettore CSS dell'elemento da evidenziare (nessuno = riquadro al centro).
export function TourOverlay({ target, label, children }: { target?: string; label: string; children: ReactNode }) {
  const rect = useTargetRect(target)
  const [missingFor, setMissingFor] = useState<string | null>(null)
  useEffect(() => {
    if (!target) return
    const timer = setTimeout(() => setMissingFor(target), MISSING_TARGET_MS)
    return () => clearTimeout(timer)
  }, [target])
  const viewportHeight = window.innerHeight
  const viewportWidth = window.innerWidth

  const hole = rect && {
    top: Math.max(rect.top - PADDING, 0),
    left: Math.max(rect.left - PADDING, 0),
    width: rect.width + PADDING * 2,
    height: rect.height + PADDING * 2,
  }

  const spaceAbove = hole ? hole.top : 0
  const spaceBelow = hole ? viewportHeight - (hole.top + hole.height) : 0
  const boxStyle = !hole
    ? { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }
    : spaceBelow >= BOX_ROOM || spaceBelow >= spaceAbove
      ? { top: hole.top + hole.height + GAP, left: '50%', transform: 'translateX(-50%)' }
      : { bottom: viewportHeight - hole.top + GAP, left: '50%', transform: 'translateX(-50%)' }

  return (
    <div className="tour-layer">
      {hole ? (
        <>
          <div className="tour-spotlight" style={hole} />
          {/* Quattro fasce trasparenti bloccano i tocchi fuori dal buco. */}
          <div className="tour-block" style={{ top: 0, left: 0, width: viewportWidth, height: hole.top }} />
          <div className="tour-block" style={{ top: hole.top + hole.height, left: 0, width: viewportWidth, bottom: 0 }} />
          <div className="tour-block" style={{ top: hole.top, left: 0, width: hole.left, height: hole.height }} />
          <div
            className="tour-block"
            style={{ top: hole.top, left: hole.left + hole.width, right: 0, height: hole.height }}
          />
        </>
      ) : (
        <div className="tour-block dim" style={{ inset: 0 }} />
      )}
      {/* Finché l'elemento del passo non è sullo schermo, niente riquadro:
          al centro rischierebbe di coprirlo proprio quando compare. */}
      {(!target || hole || missingFor === target) && (
        <div className="tour-box" role="dialog" aria-label={label} style={boxStyle}>
          {children}
        </div>
      )}
    </div>
  )
}
