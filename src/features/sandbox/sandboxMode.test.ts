import { afterEach, describe, expect, it } from 'vitest'
import { supabase } from '../../lib/supabaseClient'
import { closeSandbox, openSandbox } from './sandboxMode'

describe('Supabase mentre la sandbox è aperta', () => {
  afterEach(() => closeSandbox())

  it('qualunque uso del client lancia un errore durante tour e demo, e torna a funzionare alla chiusura', () => {
    expect(() => supabase.from('AAA3_rooms')).not.toThrow()

    openSandbox('tour')
    expect(() => supabase.from('AAA3_rooms')).toThrow(/durante il tour/)
    expect(() => supabase.rpc('get_my_rooms')).toThrow()
    expect(() => supabase.auth).toThrow()
    expect(() => supabase.storage).toThrow()
    expect(() => supabase.functions).toThrow()
    expect(() => supabase.channel('x')).toThrow()
    closeSandbox()

    openSandbox('demo')
    expect(() => supabase.from('AAA3_rooms')).toThrow(/durante la demo/)
    closeSandbox()

    expect(() => supabase.from('AAA3_rooms')).not.toThrow()
  })

  it('lascia chiudere i canali realtime all’app vera che si smonta', () => {
    openSandbox('tour')
    expect(() => supabase.removeAllChannels).not.toThrow()
    expect(typeof supabase.removeChannel).toBe('function')
  })
})
