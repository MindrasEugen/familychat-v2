import type { Session } from '@supabase/supabase-js'
import { createStore } from 'zustand/vanilla'
import type { Database } from '../../lib/database.types'
import type { CorrectTranslationInput, DataApi, RoomOverview, TranslationResult } from '../../lib/supabaseDataApi'

// Sorgente dati del tour e della demo: stessa forma di supabaseDataApi, ma
// tutto vive in memoria (uno store creato a ogni apertura, buttato alla
// chiusura). Nessuna chiamata di rete: niente Supabase, niente traduttori.

type Room = Database['public']['Tables']['AAA3_rooms']['Row']
type Message = Database['public']['Tables']['AAA3_chat_messages']['Row']
type Profile = Database['public']['Tables']['AAA3_profiles']['Row']
type RoomInvite = Database['public']['Tables']['AAA3_room_invites']['Row']
type RoomMember = Awaited<ReturnType<DataApi['getRoomMembers']>>[number]

interface MemberRow {
  room_id: string
  user_id: string
  role: 'founder' | 'member'
  joined_at: string
  notifications_muted: boolean
}

export interface SandboxState {
  profile: Profile | null
  relatives: Record<string, { username: string; avatar_url: string | null }>
  rooms: Room[]
  members: MemberRow[]
  messages: Message[]
  invites: RoomInvite[]
  readAt: Record<string, string>
  // Correzioni manuali della traduzione: "testo normalizzato|lingua" -> testo.
  corrections: Record<string, string>
  // Foto scelte nella sandbox: restano nel browser come object URL.
  photoUrls: Record<string, string>
}

export type SandboxStore = ReturnType<typeof createSandboxStore>

export const SANDBOX_USER_ID = 'sandbox-me'
export const SANDBOX_ROOM_ID = 'sandbox-famiglia'
const NONNA_ID = 'sandbox-nonna'
const MIHAI_ID = 'sandbox-mihai'

// Traduzioni fisse dei messaggi d'esempio (la traduzione vera non si
// chiama mai dalla sandbox). Chiave: testo normalizzato.
const FIXED_TRANSLATIONS: Record<string, { sourceLang: string; texts: Record<string, string> }> = {
  'domenica pranzo da me, chi viene?': {
    sourceLang: 'it',
    texts: { ro: 'Duminică prânz la mine, cine vine?', en: "Sunday lunch at my place, who's coming?", fr: 'Dimanche déjeuner chez moi, qui vient ?' },
  },
  'vin și eu! aduc desertul.': {
    sourceLang: 'ro',
    texts: { it: "Vengo anch'io! Porto il dolce.", en: "I'm coming too! I'll bring dessert.", fr: 'Je viens aussi ! J’apporte le dessert.' },
  },
  "perfetto, allora ci vediamo all'una.": {
    sourceLang: 'it',
    texts: { ro: 'Perfect, atunci ne vedem la ora unu.', en: "Perfect, see you at one o'clock then.", fr: 'Parfait, on se voit à une heure alors.' },
  },
}

function normalize(text: string) {
  return text.trim().toLowerCase()
}

function minutesAgo(minutes: number) {
  return new Date(Date.now() - minutes * 60_000).toISOString()
}

function randomCode() {
  return crypto.randomUUID().replace(/-/g, '').slice(0, 8).toUpperCase()
}

// withProfile: la demo parte con un profilo già pronto; il tour lo crea al
// passo "profilo", come dopo una registrazione vera.
export function createSandboxStore({ withProfile }: { withProfile: boolean }) {
  const now = new Date().toISOString()
  return createStore<SandboxState>(() => ({
    profile: withProfile
      ? { id: SANDBOX_USER_ID, username: 'Ospite', avatar_url: null, created_at: now, tutorial_seen_at: now }
      : null,
    relatives: {
      [NONNA_ID]: { username: 'Nonna Maria', avatar_url: null },
      [MIHAI_ID]: { username: 'Mihai', avatar_url: null },
    },
    rooms: [{ id: SANDBOX_ROOM_ID, name: 'Famiglia', founder_id: NONNA_ID, created_at: minutesAgo(60 * 24 * 30) }],
    members: [
      { room_id: SANDBOX_ROOM_ID, user_id: NONNA_ID, role: 'founder', joined_at: minutesAgo(60 * 24 * 30), notifications_muted: false },
      { room_id: SANDBOX_ROOM_ID, user_id: MIHAI_ID, role: 'member', joined_at: minutesAgo(60 * 24 * 20), notifications_muted: false },
      { room_id: SANDBOX_ROOM_ID, user_id: SANDBOX_USER_ID, role: 'member', joined_at: minutesAgo(60 * 24 * 10), notifications_muted: false },
    ],
    messages: [
      { id: 'sandbox-m1', room_id: SANDBOX_ROOM_ID, sender_id: NONNA_ID, body: 'Domenica pranzo da me, chi viene?', image_paths: [], created_at: minutesAgo(125) },
      { id: 'sandbox-m2', room_id: SANDBOX_ROOM_ID, sender_id: MIHAI_ID, body: 'Vin și eu! Aduc desertul.', image_paths: [], created_at: minutesAgo(110) },
      { id: 'sandbox-m3', room_id: SANDBOX_ROOM_ID, sender_id: NONNA_ID, body: "Perfetto, allora ci vediamo all'una.", image_paths: [], created_at: minutesAgo(95) },
    ],
    invites: [],
    readAt: { [SANDBOX_ROOM_ID]: minutesAgo(120) },
    corrections: {},
    photoUrls: {},
  }))
}

export function createSandboxDataApi(store: SandboxStore): DataApi {
  const get = store.getState
  const set = store.setState

  function usernameOf(userId: string | null) {
    if (!userId) return null
    if (userId === SANDBOX_USER_ID) return get().profile?.username ?? 'Tu'
    return get().relatives[userId]?.username ?? null
  }

  function photoUrl(imagePath: string) {
    const url = get().photoUrls[imagePath]
    if (!url) throw new Error('Foto non disponibile.')
    return url
  }

  function overview(room: Room): RoomOverview {
    const roomMessages = get().messages.filter((message) => message.room_id === room.id)
    const last = roomMessages.at(-1)
    const readAt = get().readAt[room.id] ?? ''
    return {
      ...room,
      last_message_at: last?.created_at ?? null,
      last_message_body: last?.body ?? null,
      last_message_photo_count: last?.image_paths.length ?? 0,
      last_message_sender_id: last?.sender_id ?? null,
      last_message_sender_name: usernameOf(last?.sender_id ?? null),
      unread_count: roomMessages.filter((message) => message.sender_id !== SANDBOX_USER_ID && message.created_at > readAt)
        .length,
    }
  }

  function myRooms() {
    const mine = new Set(get().members.filter((member) => member.user_id === SANDBOX_USER_ID).map((member) => member.room_id))
    return get().rooms.filter((room) => mine.has(room.id))
  }

  const sandboxSession = { user: { id: SANDBOX_USER_ID }, access_token: '', refresh_token: '' } as unknown as Session

  return {
    sandbox: true,
    sandboxSession,

    async getMyRooms() {
      return myRooms()
        .map(overview)
        .sort((a, b) => (b.last_message_at ?? b.created_at).localeCompare(a.last_message_at ?? a.created_at))
    },

    async markRoomRead(roomId) {
      set({ readAt: { ...get().readAt, [roomId]: new Date().toISOString() } })
    },

    async createRoom(roomName) {
      const room: Room = { id: `sandbox-${crypto.randomUUID()}`, name: roomName.trim(), founder_id: SANDBOX_USER_ID, created_at: new Date().toISOString() }
      set({
        rooms: [...get().rooms, room],
        members: [
          ...get().members,
          { room_id: room.id, user_id: SANDBOX_USER_ID, role: 'founder', joined_at: room.created_at, notifications_muted: false },
        ],
      })
      return room
    },

    async joinRoom() {
      throw new Error('Nella prova non puoi unirti a una camera vera: crea il tuo account per usare un codice invito.')
    },

    async getRoom(roomId) {
      return myRooms().find((room) => room.id === roomId) ?? null
    },

    async getRoomMembers(roomId) {
      return get()
        .members.filter((member) => member.room_id === roomId)
        .map(
          (member): RoomMember => ({
            user_id: member.user_id,
            role: member.role,
            joined_at: member.joined_at,
            notifications_muted: member.notifications_muted,
            AAA3_profiles:
              member.user_id === SANDBOX_USER_ID
                ? { username: get().profile?.username ?? 'Tu', avatar_url: get().profile?.avatar_url ?? null }
                : (get().relatives[member.user_id] ?? null),
          }) as RoomMember,
        )
    },

    async removeRoomMember(roomId, memberUserId) {
      set({ members: get().members.filter((member) => !(member.room_id === roomId && member.user_id === memberUserId)) })
    },

    async deleteRoom(roomId) {
      set({
        rooms: get().rooms.filter((room) => room.id !== roomId),
        members: get().members.filter((member) => member.room_id !== roomId),
        messages: get().messages.filter((message) => message.room_id !== roomId),
      })
    },

    async setRoomNotificationsMuted(roomId, muted) {
      set({
        members: get().members.map((member) =>
          member.room_id === roomId && member.user_id === SANDBOX_USER_ID ? { ...member, notifications_muted: muted } : member,
        ),
      })
    },

    async getRoomInvites(roomId) {
      return get()
        .invites.filter((invite) => invite.room_id === roomId)
        .sort((a, b) => b.created_at.localeCompare(a.created_at))
    },

    async createRoomInvite(roomId, userId) {
      const invite: RoomInvite = {
        id: `sandbox-${crypto.randomUUID()}`,
        room_id: roomId,
        code: randomCode(),
        created_by: userId,
        created_at: new Date().toISOString(),
        expires_at: null,
        max_uses: 1,
        uses_count: 0,
        revoked_at: null,
      }
      set({ invites: [...get().invites, invite] })
      return invite
    },

    async revokeRoomInvite(inviteId) {
      set({
        invites: get().invites.map((invite) =>
          invite.id === inviteId ? { ...invite, revoked_at: new Date().toISOString() } : invite,
        ),
      })
    },

    async getMessages(roomId, before) {
      return get().messages.filter((message) => message.room_id === roomId && (!before || message.created_at < before))
    },

    async sendMessage(roomId, userId, body, imageFiles) {
      const photoUrls = { ...get().photoUrls }
      const imagePaths = imageFiles.map((file) => {
        const path = `sandbox/${crypto.randomUUID()}`
        photoUrls[path] = URL.createObjectURL(file)
        return path
      })
      const message: Message = {
        id: `sandbox-${crypto.randomUUID()}`,
        room_id: roomId,
        sender_id: userId,
        body: body.trim() || null,
        image_paths: imagePaths,
        created_at: new Date().toISOString(),
      }
      set({ messages: [...get().messages, message], photoUrls })
      return message
    },

    async deleteMessage(id) {
      set({ messages: get().messages.filter((message) => message.id !== id) })
    },

    async getPhotoUrl(imagePath) {
      return photoUrl(imagePath)
    },

    async getPhotoDownloadUrl(imagePath) {
      return photoUrl(imagePath)
    },

    // Risposte fisse per i messaggi d'esempio; per tutto il resto il testo
    // resta com'è (nessun servizio di traduzione dalla sandbox).
    async translate(text, targetLang): Promise<TranslationResult> {
      const key = normalize(text)
      const corrected = get().corrections[`${key}|${targetLang}`]
      const fixed = FIXED_TRANSLATIONS[key]
      if (corrected) return { translatedText: corrected, sourceLang: fixed?.sourceLang ?? targetLang }
      if (!fixed) return { translatedText: text, sourceLang: targetLang }
      return { translatedText: fixed.texts[targetLang] ?? text, sourceLang: fixed.sourceLang }
    },

    async correctTranslation({ sourceText, targetLang, correctedText }: CorrectTranslationInput) {
      set({ corrections: { ...get().corrections, [`${normalize(sourceText)}|${targetLang}`]: correctedText.trim() } })
    },

    async getProfile(userId) {
      return userId === SANDBOX_USER_ID ? get().profile : null
    },

    async createProfile(userId, username, avatarFile) {
      const profile: Profile = {
        id: userId,
        username: username.trim(),
        avatar_url: avatarFile ? URL.createObjectURL(avatarFile) : null,
        created_at: new Date().toISOString(),
        tutorial_seen_at: null,
      }
      set({ profile })
      return profile
    },

    async updateAvatar(_userId, file) {
      const profile = { ...(get().profile as Profile), avatar_url: URL.createObjectURL(file) }
      set({ profile })
      return profile
    },

    async markTutorialSeen() {},
  }
}
