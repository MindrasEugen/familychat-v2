import type { Session } from '@supabase/supabase-js'
import { compressImage } from './imageCompression'
import { supabase } from './supabaseClient'
import type { Database } from './database.types'

// Tutte le letture/scritture dell'app verso Supabase (tabelle, funzioni,
// storage, Edge Function) passano da qui. Gli hook React Query le ricevono
// da useDataApi(): nell'app vera è questo oggetto, nel tour e nella demo è
// la versione in memoria (features/sandbox/sandboxDataApi.ts), con la stessa
// forma. Il realtime resta negli hook: nella sandbox semplicemente non parte.

type Room = Database['public']['Tables']['AAA3_rooms']['Row']
type Message = Database['public']['Tables']['AAA3_chat_messages']['Row']
type Profile = Database['public']['Tables']['AAA3_profiles']['Row']
export type RoomOverview = Database['public']['Functions']['get_my_rooms']['Returns'][number]

export interface TranslationResult {
  translatedText: string
  sourceLang: string
}

export interface CorrectTranslationInput {
  sourceText: string
  sourceLang: string
  targetLang: string
  correctedText: string
  userId: string
}

const PHOTO_BUCKET = 'room-photos'
const PROFILE_PHOTO_BUCKET = 'profile-photos'
export const MESSAGES_PAGE_SIZE = 100
const SIGNED_URL_TTL_SECONDS = 3600
const DOWNLOAD_URL_TTL_SECONDS = 60

function fileExtension(file: File): string {
  const match = /\.([a-zA-Z0-9]+)$/.exec(file.name)
  return match ? match[1].toLowerCase() : 'bin'
}

function normalize(text: string) {
  return text.trim().toLowerCase()
}

async function uploadMessagePhoto(roomId: string, file: File): Promise<string> {
  // Se la compressione fallisce su tutte le strategie, carichiamo il file
  // originale così com'è invece di bloccare l'invio (lezione 5): il
  // messaggio deve arrivare comunque.
  const compressed = await compressImage(file)
  const toUpload = compressed ?? file
  const ext = compressed ? 'jpg' : fileExtension(file)
  const contentType = compressed ? 'image/jpeg' : file.type || 'application/octet-stream'
  // Path "<room_id>/<file>": le policy RLS sul bucket leggono il primo
  // segmento come room_id per verificare l'appartenenza alla camera.
  const path = `${roomId}/${crypto.randomUUID()}.${ext}`
  const { error: uploadError } = await supabase.storage.from(PHOTO_BUCKET).upload(path, toUpload, { contentType })
  if (uploadError) throw uploadError
  return path
}

async function uploadAvatar(userId: string, file: File): Promise<string> {
  // Stesso fallback delle foto in chat: se la compressione fallisce
  // carichiamo il file originale invece di bloccare il salvataggio.
  const compressed = await compressImage(file)
  const toUpload = compressed ?? file
  const ext = compressed ? 'jpg' : fileExtension(file)
  const contentType = compressed ? 'image/jpeg' : file.type || 'application/octet-stream'
  // Path "<user_id>/<file>": le policy RLS sul bucket (pubblico in
  // lettura) verificano il primo segmento per limitare la scrittura
  // al proprio utente. Un nome nuovo a ogni caricamento: l'URL cambia,
  // quindi nessuna cache del browser mostra la foto vecchia.
  const path = `${userId}/${crypto.randomUUID()}.${ext}`
  const { error: uploadError } = await supabase.storage
    .from(PROFILE_PHOTO_BUCKET)
    .upload(path, toUpload, { contentType })
  if (uploadError) throw uploadError
  return supabase.storage.from(PROFILE_PHOTO_BUCKET).getPublicUrl(path).data.publicUrl
}

// Path nel bucket di una foto profilo a partire dal suo URL pubblico, solo
// se appartiene a questo utente (mai cancellare file altrui o URL esterni).
function ownAvatarPath(userId: string, avatarUrl: string | null | undefined): string | null {
  const marker = `/object/public/${PROFILE_PHOTO_BUCKET}/`
  const index = avatarUrl?.indexOf(marker) ?? -1
  if (!avatarUrl || index === -1) return null
  const path = decodeURIComponent(avatarUrl.slice(index + marker.length))
  return path.startsWith(`${userId}/`) ? path : null
}

export const supabaseDataApi = {
  // true solo nella sandbox (tour e demo): niente realtime, niente notifiche.
  sandbox: false as boolean,
  // Nella sandbox: la sessione finta dell'utente d'esempio. Qui non serve,
  // la sessione vera arriva da sessionStore.
  sandboxSession: null as Session | null,

  // --- Camere ---

  // Camere dell'utente con ultimo messaggio e numero di non letti, già
  // ordinate dalla più recente (funzione get_my_rooms, security invoker:
  // valgono le stesse RLS di prima, si vedono solo le proprie camere).
  async getMyRooms(): Promise<RoomOverview[]> {
    const { data, error } = await supabase.rpc('get_my_rooms')
    if (error) throw error
    return data
  },

  async markRoomRead(roomId: string): Promise<void> {
    const { error } = await supabase.rpc('mark_room_read', { p_room_id: roomId })
    if (error) throw error
  },

  async createRoom(roomName: string): Promise<Room> {
    const { data, error } = await supabase.rpc('create_room', { room_name: roomName })
    if (error) throw error
    return data
  },

  async joinRoom(inviteCode: string): Promise<Room> {
    const { data, error } = await supabase.rpc('accept_room_invite', { invite_code: inviteCode.trim() })
    if (error) throw error
    return data
  },

  async getRoom(roomId: string) {
    const { data, error } = await supabase.from('AAA3_rooms').select('*').eq('id', roomId).maybeSingle()
    if (error) throw error
    return data
  },

  async getRoomMembers(roomId: string) {
    const { data, error } = await supabase
      .from('AAA3_room_members')
      .select('user_id, role, joined_at, notifications_muted, AAA3_profiles(username, avatar_url)')
      .eq('room_id', roomId)
      .order('joined_at', { ascending: true })
    if (error) throw error
    return data
  },

  async removeRoomMember(roomId: string, memberUserId: string): Promise<void> {
    const { error } = await supabase.from('AAA3_room_members').delete().eq('room_id', roomId).eq('user_id', memberUserId)
    if (error) throw error
  },

  async deleteRoom(roomId: string): Promise<void> {
    const { error } = await supabase.from('AAA3_rooms').delete().eq('id', roomId)
    if (error) throw error
  },

  // Silenzia/riattiva le notifiche di UNA camera per chi chiama (funzione
  // security definer: tocca solo la propria riga e solo questa colonna).
  async setRoomNotificationsMuted(roomId: string, muted: boolean): Promise<void> {
    const { error } = await supabase.rpc('set_room_notifications_muted', { p_room_id: roomId, p_muted: muted })
    if (error) throw error
  },

  // --- Inviti ---

  async getRoomInvites(roomId: string) {
    const { data, error } = await supabase
      .from('AAA3_room_invites')
      .select('*')
      .eq('room_id', roomId)
      .order('created_at', { ascending: false })
    if (error) throw error
    return data
  },

  // Invito monouso di default (max_uses: 1) — il documento di decisioni non
  // specifica un default, questa è la scelta più semplice e prudente: un
  // codice pensato per portare dentro una persona alla volta, non un link
  // permanente. Da rivedere se in futuro serve un invito riutilizzabile.
  async createRoomInvite(roomId: string, userId: string) {
    const { data, error } = await supabase
      .from('AAA3_room_invites')
      .insert({ room_id: roomId, created_by: userId, max_uses: 1 })
      .select()
      .single()

    if (error) {
      // La policy RLS blocca l'insert anche quando un MEMBRO (non il
      // fondatore, che non ha limite) supera il limite di 5 inviti attivi
      // per camera (vedi migrazione
      // 20260908114715_room_invites_active_limit.sql), non solo quando non
      // si è membri — a questo punto della UI la seconda causa è già
      // esclusa (solo un membro vede questo pulsante), quindi un 42501 qui
      // significa quasi certamente il limite. Messaggio dedicato invece
      // del testo grezzo di Postgres ("new row violates row-level security
      // policy...").
      if (error.code === '42501') {
        throw new Error(
          'Hai raggiunto il limite di 5 inviti attivi per questa camera. Revoca un invito non ancora usato per crearne uno nuovo.',
        )
      }
      throw error
    }
    return data
  },

  async revokeRoomInvite(inviteId: string): Promise<void> {
    const { error } = await supabase.rpc('revoke_room_invite', { invite_id: inviteId })
    if (error) throw error
  },

  // --- Messaggi ---

  // Ultima pagina di messaggi (o quella prima del messaggio `before`), in
  // ordine cronologico. A parità di created_at decide l'id, come nell'app
  // (features/chat/messageOrder.ts). La pagina precedente si prende sulla
  // coppia (created_at, id): con il solo created_at, un messaggio con lo
  // stesso orario del più vecchio già caricato verrebbe saltato.
  async getMessages(roomId: string, before?: Pick<Message, 'created_at' | 'id'>): Promise<Message[]> {
    let query = supabase.from('AAA3_chat_messages').select('*').eq('room_id', roomId)
    if (before) {
      const at = before.created_at
      query = query.or(`created_at.lt."${at}",and(created_at.eq."${at}",id.lt.${before.id})`)
    }
    const { data, error } = await query
      .order('created_at', { ascending: false })
      .order('id', { ascending: false })
      .limit(MESSAGES_PAGE_SIZE)
    if (error) throw error
    return [...data].reverse()
  },

  async sendMessage(roomId: string, userId: string, body: string, imageFiles: File[]): Promise<Message> {
    // Compressione + upload in parallelo, non in sequenza: con fino a 10
    // foto (alcune potenzialmente HEIC, cascata di compressione più lenta)
    // un upload sequenziale sarebbe percepibilmente lento senza motivo,
    // ogni file è indipendente dagli altri.
    const imagePaths = await Promise.all(imageFiles.map((file) => uploadMessagePhoto(roomId, file)))

    const { data, error } = await supabase
      .from('AAA3_chat_messages')
      .insert({ room_id: roomId, sender_id: userId, body: body.trim() || null, image_paths: imagePaths })
      .select()
      .single()

    if (error) throw error
    return data
  },

  async deleteMessage(id: string, imagePaths: string[]): Promise<void> {
    const { error } = await supabase.from('AAA3_chat_messages').delete().eq('id', id)
    if (error) throw error

    // Best-effort: prova a rimuovere i file associati (uno o più), ma non
    // bloccare se fallisce — la riga in DB è comunque cancellata
    // correttamente. remove() accetta già un array, una sola chiamata.
    if (imagePaths.length > 0) {
      await supabase.storage.from(PHOTO_BUCKET).remove(imagePaths).catch(() => {})
    }
  },

  // Bucket "room-photos" privato: niente getPublicUrl, serve un signed URL
  // per ogni foto.
  async getPhotoUrl(imagePath: string): Promise<string> {
    const { data, error } = await supabase.storage.from(PHOTO_BUCKET).createSignedUrl(imagePath, SIGNED_URL_TTL_SECONDS)
    if (error) throw error
    return data.signedUrl
  },

  // Un <a download> non funziona con un URL di un altro dominio (Supabase):
  // il browser lo ignora e apre l'immagine. Con l'opzione `download` è
  // Supabase a rispondere come allegato, e il browser salva il file anche su
  // telefono e nell'app installata.
  async getPhotoDownloadUrl(imagePath: string, fileName: string): Promise<string> {
    const { data, error } = await supabase.storage
      .from(PHOTO_BUCKET)
      .createSignedUrl(imagePath, DOWNLOAD_URL_TTL_SECONDS, { download: fileName })
    if (error) throw error
    return data.signedUrl
  },

  // --- Traduzione ---

  // Controlla prima la memoria condivisa (AAA3_translation_memory, RLS
  // permissiva a tutta la famiglia) — solo su un vero cache miss chiama la
  // Edge Function, che gestisce l'intera catena di fallback (Azure -> Google
  // -> Mistral) e scrive lei stessa in cache. Una correzione manuale ha
  // sempre la priorità: il lookup ordina per corrected_by_user così
  // un'entry corretta vince anche se ne esistesse (teoricamente) più di una
  // per lo stesso testo+lingua.
  async translate(text: string, targetLang: string): Promise<TranslationResult> {
    const { data: cached, error: cacheError } = await supabase
      .from('AAA3_translation_memory')
      .select('translated_text, source_lang')
      .eq('source_text_normalized', normalize(text))
      .eq('target_lang', targetLang)
      .order('corrected_by_user', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (cacheError) throw cacheError
    if (cached) return { translatedText: cached.translated_text, sourceLang: cached.source_lang }

    const { data, error } = await supabase.functions.invoke<TranslationResult>('translate-message', {
      body: { text, targetLang },
    })
    if (error) throw error
    if (!data) throw new Error('Nessuna traduzione ricevuta.')
    return data
  },

  async correctTranslation({ sourceText, sourceLang, targetLang, correctedText, userId }: CorrectTranslationInput) {
    const { error } = await supabase.from('AAA3_translation_memory').upsert(
      {
        source_text: sourceText,
        source_lang: sourceLang,
        target_lang: targetLang,
        translated_text: correctedText.trim(),
        provider: 'user',
        corrected_by_user: true,
        corrected_by: userId,
      },
      { onConflict: 'source_text_normalized,source_lang,target_lang' },
    )
    if (error) throw error
  },

  // --- Profilo ---

  async getProfile(userId: string) {
    const { data, error } = await supabase.from('AAA3_profiles').select('*').eq('id', userId).maybeSingle()
    if (error) throw error
    return data
  },

  // tutorialSeenAt: il tour di primo accesso è già stato visto su questo
  // dispositivo prima di registrarsi — si salva insieme al profilo, così la
  // guida non riparte (nemmeno sugli altri dispositivi) senza una richiesta
  // in più.
  async createProfile(userId: string, username: string, avatarFile: File | null, tutorialSeenAt: string | null): Promise<Profile> {
    const avatarUrl = avatarFile ? await uploadAvatar(userId, avatarFile) : null

    const { data, error } = await supabase
      .from('AAA3_profiles')
      .insert({ id: userId, username: username.trim(), avatar_url: avatarUrl, tutorial_seen_at: tutorialSeenAt })
      .select()
      .single()

    if (error) throw error
    return data
  },

  // La foto vecchia viene rimossa dal bucket solo dopo che il profilo punta
  // già a quella nuova, e senza mai far fallire il cambio se la rimozione
  // non riesce.
  async updateAvatar(userId: string, file: File, previousUrl: string | null | undefined): Promise<Profile> {
    const avatarUrl = await uploadAvatar(userId, file)

    const { data, error } = await supabase
      .from('AAA3_profiles')
      .update({ avatar_url: avatarUrl })
      .eq('id', userId)
      .select()
      .single()
    if (error) throw error

    const oldPath = ownAvatarPath(userId, previousUrl)
    if (oldPath) {
      await supabase.storage
        .from(PROFILE_PHOTO_BUCKET)
        .remove([oldPath])
        .catch(() => {})
    }
    return data
  },

  async markTutorialSeen(userId: string, seenAt: string): Promise<void> {
    const { error } = await supabase.from('AAA3_profiles').update({ tutorial_seen_at: seenAt }).eq('id', userId)
    if (error) throw error
  },
}

export type DataApi = typeof supabaseDataApi
