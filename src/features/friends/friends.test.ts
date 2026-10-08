import { describe, expect, it } from 'vitest'
import { createSandboxDataApi, createSandboxStore, SANDBOX_USER_ID } from '../sandbox/sandboxDataApi'
import { formatFriendCode } from './useFriends'

describe('codice amico', () => {
  it('si mostra con il trattino a metà', () => {
    expect(formatFriendCode('ABCDEFGH')).toBe('ABCD-EFGH')
    // Lunghezza inattesa: com'è, senza inventare un formato.
    expect(formatFriendCode('ABC')).toBe('ABC')
  })
})

describe('chat private nella demo', () => {
  function demoApi() {
    return createSandboxDataApi(createSandboxStore({ withProfile: true }))
  }

  it('una sola chat per persona, nascosta dalla lista finché è vuota', async () => {
    const api = demoApi()
    const roomId = await api.openDirectChat('sandbox-nonna')
    expect(await api.openDirectChat('sandbox-nonna')).toBe(roomId)
    expect((await api.getMyRooms()).some((room) => room.id === roomId)).toBe(false)

    await api.sendMessage(roomId, SANDBOX_USER_ID, 'Ciao nonna', [])
    const direct = (await api.getMyRooms()).find((room) => room.id === roomId)
    expect(direct).toMatchObject({ kind: 'direct', other_user_id: 'sandbox-nonna', other_username: 'Nonna Maria' })
  })

  it('aggiungere amici veri non è possibile', async () => {
    await expect(demoApi().sendFriendRequest('ABCD-EFGH')).rejects.toThrow()
  })
})
