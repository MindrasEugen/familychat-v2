// Cascata di decodifica/compressione foto portata da v1 (FamilyChat/app.js) —
// tre strategie in ordine di costo crescente, perché nessuna singola basta su
// tutti i device reali usati dalla famiglia (HEIC da iPhone in particolare).
// Vedi PROMPT_REACT_REWRITE.md, lezione 5.

async function drawToJpegBlob(
  source: ImageBitmap | HTMLImageElement,
  maxDimension: number,
  quality: number,
): Promise<Blob> {
  const naturalWidth = source instanceof HTMLImageElement ? source.naturalWidth : source.width
  const naturalHeight = source instanceof HTMLImageElement ? source.naturalHeight : source.height
  let width = naturalWidth
  let height = naturalHeight
  if (width > maxDimension || height > maxDimension) {
    const scale = maxDimension / Math.max(width, height)
    width = Math.round(width * scale)
    height = Math.round(height * scale)
  }

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas 2d context non disponibile')
  ctx.drawImage(source, 0, 0, width, height)

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('toBlob ha restituito null'))),
      'image/jpeg',
      quality,
    )
  })
}

async function compressViaImageBitmap(file: File, maxDimension: number, quality: number) {
  const bitmap = await createImageBitmap(file)
  try {
    return await drawToJpegBlob(bitmap, maxDimension, quality)
  } finally {
    bitmap.close()
  }
}

// Alcune combinazioni browser/dispositivo non sanno decodificare il file con
// createImageBitmap, pur essendo lo stesso file che un <img> mostra
// correttamente — riusa lo stesso percorso di decodifica di un'anteprima.
async function compressViaImgElement(file: File, maxDimension: number, quality: number) {
  const url = URL.createObjectURL(file)
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image()
      el.onload = () => resolve(el)
      el.onerror = () => reject(new Error('Caricamento <img> fallito'))
      el.src = url
    })
    return await drawToJpegBlob(img, maxDimension, quality)
  } finally {
    URL.revokeObjectURL(url)
  }
}

// La decodifica WASM di heic2any è pesante (~1.3MB) e tutta su CPU: caricata
// solo al primo uso reale (import dinamico), mai ad ogni avvio dell'app.
// Timeout esplicito perché su alcuni device la decodifica non converge mai
// (visto in v1): meglio rinunciare in fretta e caricare l'originale.
const HEIC2ANY_TIMEOUT_MS = 6000

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('timeout')), ms)
    promise.then(
      (value) => {
        clearTimeout(timer)
        resolve(value)
      },
      (error) => {
        clearTimeout(timer)
        reject(error)
      },
    )
  })
}

// Ultima spiaggia: se anche <img> non basta, decodifica esplicitamente via
// heic2any e riparte da un JPEG intermedio, che qualsiasi canvas sa disegnare.
async function compressViaHeic2any(file: File, maxDimension: number, quality: number) {
  const { default: heic2any } = await import('heic2any')
  const converted = await withTimeout(
    heic2any({ blob: file, toType: 'image/jpeg', quality: 0.9 }),
    HEIC2ANY_TIMEOUT_MS,
  )
  const jpegBlob = Array.isArray(converted) ? converted[0] : converted
  const bitmap = await createImageBitmap(jpegBlob)
  try {
    return await drawToJpegBlob(bitmap, maxDimension, quality)
  } finally {
    bitmap.close()
  }
}

// Ridimensiona e ricomprime la foto lato client prima dell'upload. Prova le
// strategie in ordine di costo crescente, passando alla successiva se una
// fallisce in qualsiasi fase. Ritorna null se nessuna funziona (il chiamante
// decide se caricare il file originale — qui ci limitiamo a rinunciare).
export async function compressImage(
  file: File,
  maxDimension = 1600,
  quality = 0.8,
): Promise<Blob | null> {
  const strategies = [compressViaImageBitmap, compressViaImgElement, compressViaHeic2any]
  for (const strategy of strategies) {
    try {
      return await strategy(file, maxDimension, quality)
    } catch {
      continue
    }
  }
  return null
}
