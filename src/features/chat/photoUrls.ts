import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabaseClient'

const PHOTO_BUCKET = 'room-photos'
const SIGNED_URL_TTL_SECONDS = 3600
const DOWNLOAD_URL_TTL_SECONDS = 60

// Bucket "room-photos" privato: niente getPublicUrl, serve un signed URL per
// ogni foto. Stessa queryKey per miniatura e vista a schermo intero, così
// aprire una foto già vista in chat non la richiede di nuovo.
export function usePhotoUrl(imagePath: string) {
  return useQuery({
    queryKey: ['message-photo-signed-url', imagePath],
    queryFn: async () => {
      const { data, error } = await supabase.storage
        .from(PHOTO_BUCKET)
        .createSignedUrl(imagePath, SIGNED_URL_TTL_SECONDS)
      if (error) throw error
      return data.signedUrl
    },
    staleTime: (SIGNED_URL_TTL_SECONDS / 2) * 1000,
  })
}

// Un <a download> non funziona con un URL di un altro dominio (Supabase):
// il browser lo ignora e apre l'immagine. Con l'opzione `download` è
// Supabase a rispondere come allegato, e il browser salva il file anche su
// telefono e nell'app installata.
export async function downloadPhoto(imagePath: string) {
  const fileName = imagePath.split('/').pop() ?? 'foto.jpg'
  const { data, error } = await supabase.storage
    .from(PHOTO_BUCKET)
    .createSignedUrl(imagePath, DOWNLOAD_URL_TTL_SECONDS, { download: fileName })
  if (error) throw error

  const link = document.createElement('a')
  link.href = data.signedUrl
  link.rel = 'noopener'
  document.body.appendChild(link)
  link.click()
  link.remove()
}
