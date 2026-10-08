import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { useDataApi } from '../../lib/dataApi'
import type { SendFriendRequestResult } from '../../lib/supabaseDataApi'

// Amici, richieste, codice amico e chat private. Le regole stanno nel
// database (vedi la migrazione 20261008150000_friends_and_direct_chats.sql):
// qui solo letture, azioni e aggiornamento della cache.

export function friendCodeQueryKey(userId: string | undefined) {
  return ['friend-code', userId] as const
}

export function friendsQueryKey(userId: string | undefined) {
  return ['friends', userId] as const
}

export function friendRequestsQueryKey(userId: string | undefined) {
  return ['friend-requests', userId] as const
}

export function canSendQueryKey(roomId: string | undefined) {
  return ['can-send', roomId] as const
}

// "ABCDEFGH" → "ABCD-EFGH", più facile da dettare e ricopiare.
export function formatFriendCode(code: string) {
  return code.length === 8 ? `${code.slice(0, 4)}-${code.slice(4)}` : code
}

export function useMyFriendCode(userId: string | undefined) {
  const api = useDataApi()
  return useQuery({
    queryKey: friendCodeQueryKey(userId),
    queryFn: () => api.getMyFriendCode(),
    enabled: Boolean(userId),
    staleTime: Infinity,
  })
}

export function useRegenerateFriendCode(userId: string | undefined) {
  const queryClient = useQueryClient()
  const api = useDataApi()
  return useMutation<string, Error, void>({
    mutationFn: () => api.regenerateFriendCode(),
    onSuccess: (code) => queryClient.setQueryData(friendCodeQueryKey(userId), code),
  })
}

export function useFriends(userId: string | undefined) {
  const api = useDataApi()
  return useQuery({
    queryKey: friendsQueryKey(userId),
    queryFn: () => api.getFriends(userId as string),
    enabled: Boolean(userId),
  })
}

// Si ricarica anche al ritorno in primo piano (default di React Query):
// basta per vedere le richieste nuove senza un canale realtime.
export function useFriendRequests(userId: string | undefined) {
  const api = useDataApi()
  return useQuery({
    queryKey: friendRequestsQueryKey(userId),
    queryFn: () => api.getFriendRequests(userId as string),
    enabled: Boolean(userId),
  })
}

function useInvalidateFriends(userId: string | undefined) {
  const queryClient = useQueryClient()
  return () => {
    queryClient.invalidateQueries({ queryKey: friendsQueryKey(userId) })
    queryClient.invalidateQueries({ queryKey: friendRequestsQueryKey(userId) })
    // Diventare (o smettere di essere) amici cambia chi può scrivere nelle
    // chat private.
    queryClient.invalidateQueries({ queryKey: ['can-send'] })
  }
}

export function useSendFriendRequest(userId: string | undefined) {
  const api = useDataApi()
  const invalidate = useInvalidateFriends(userId)
  return useMutation<SendFriendRequestResult, Error, string>({
    mutationFn: (code) => api.sendFriendRequest(code),
    onSuccess: invalidate,
  })
}

export function useAcceptFriendRequest(userId: string | undefined) {
  const api = useDataApi()
  const invalidate = useInvalidateFriends(userId)
  return useMutation<void, Error, string>({
    mutationFn: (requestId) => api.acceptFriendRequest(requestId),
    onSettled: invalidate,
  })
}

// Rifiutare una richiesta ricevuta o annullarne una inviata.
export function useDeleteFriendRequest(userId: string | undefined) {
  const api = useDataApi()
  const invalidate = useInvalidateFriends(userId)
  return useMutation<void, Error, string>({
    mutationFn: (requestId) => api.deleteFriendRequest(requestId),
    onSettled: invalidate,
  })
}

export function useRemoveFriend(userId: string | undefined) {
  const api = useDataApi()
  const invalidate = useInvalidateFriends(userId)
  return useMutation<void, Error, string>({
    mutationFn: (friendId) => api.removeFriend(userId as string, friendId),
    onSettled: invalidate,
  })
}

// Apre la chat privata con una persona (amico o compagno di camera) e ci
// porta dentro.
export function useOpenDirectChat() {
  const api = useDataApi()
  const navigate = useNavigate()
  return useMutation<string, Error, string>({
    mutationFn: (otherUserId) => api.openDirectChat(otherUserId),
    onSuccess: (roomId) => navigate(`/rooms/${roomId}`),
  })
}

// Nelle chat private: false quando non c'è più un legame (sola lettura).
export function useCanSendInRoom(roomId: string | undefined, enabled: boolean) {
  const api = useDataApi()
  return useQuery({
    queryKey: canSendQueryKey(roomId),
    queryFn: () => api.canSendInRoom(roomId as string),
    enabled: Boolean(roomId) && enabled,
  })
}

// Dalla scheda di una persona in una camera (senza codice).
export function useSendFriendRequestToUser(userId: string | undefined) {
  const api = useDataApi()
  const invalidate = useInvalidateFriends(userId)
  return useMutation<SendFriendRequestResult, Error, string>({
    mutationFn: (otherUserId) => api.sendFriendRequestToUser(otherUserId),
    onSuccess: invalidate,
  })
}

export function useSharedRooms(otherUserId: string | undefined) {
  const api = useDataApi()
  return useQuery({
    queryKey: ['shared-rooms', otherUserId],
    queryFn: () => api.getSharedRooms(otherUserId as string),
    enabled: Boolean(otherUserId),
  })
}
