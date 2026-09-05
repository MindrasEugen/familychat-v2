import type { PostgrestError } from '@supabase/supabase-js'

const UNIQUE_VIOLATION = '23505'

export function describeProfileInsertError(error: PostgrestError): string {
  if (error.code === UNIQUE_VIOLATION) {
    return 'Questo username è già in uso, scegline un altro.'
  }
  return `Errore nella creazione del profilo: ${error.message}`
}
