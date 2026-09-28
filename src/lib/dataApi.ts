import { createContext, useContext } from 'react'
import { supabaseDataApi, type DataApi } from './supabaseDataApi'

// Sorgente dati dell'app: Supabase di default, la sandbox in memoria dentro
// tour e demo (vedi features/sandbox). Stessi componenti e stessi hook,
// cambia solo chi risponde.
export const DataApiContext = createContext<DataApi>(supabaseDataApi)

export function useDataApi() {
  return useContext(DataApiContext)
}
