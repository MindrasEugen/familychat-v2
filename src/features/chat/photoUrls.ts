import { useQuery } from '@tanstack/react-query'
import { useDataApi } from '../../lib/dataApi'
import type { DataApi } from '../../lib/supabaseDataApi'

const SIGNED_URL_TTL_SECONDS = 3600

// Bucket "room-photos" privato: niente getPublicUrl, serve un signed URL per
// ogni foto. Stessa queryKey per miniatura e vista a schermo intero, così
// aprire una foto già vista in chat non la richiede di nuovo.
export function usePhotoUrl(imagePath: string) {
  const api = useDataApi()

  return useQuery({
    queryKey: ['message-photo-signed-url', imagePath],
    queryFn: () => api.getPhotoUrl(imagePath),
    staleTime: (SIGNED_URL_TTL_SECONDS / 2) * 1000,
  })
}

// Salva la foto sul dispositivo (vedi getPhotoDownloadUrl).
export async function downloadPhoto(api: DataApi, imagePath: string) {
  const fileName = imagePath.split('/').pop() ?? 'foto.jpg'
  const url = await api.getPhotoDownloadUrl(imagePath, fileName)

  const link = document.createElement('a')
  link.href = url
  link.rel = 'noopener'
  document.body.appendChild(link)
  link.click()
  link.remove()
}
