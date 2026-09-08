// Edge Function: cleanup-orphan-photos
// Chiamata una volta al giorno da pg_cron (vedi migrazione
// <timestamp>_cleanup_orphan_photos_cron.sql), non da un utente autenticato
// — verify_jwt va disabilitato al deploy (--no-verify-jwt), stesso motivo
// di send-push. Autenticazione manuale via header x-webhook-secret,
// confrontato con CLEANUP_WEBHOOK_SECRET.
//
// Gap che chiude: il job pg_cron "AAA3_chat_messages_retention_30d" cancella
// solo le righe di AAA3_chat_messages più vecchie di 30gg, mai i file
// corrispondenti nel bucket "room-photos" (una riga si cancella con una
// semplice DELETE SQL, un file storage richiede l'API di Storage). Un file
// diventa orfano anche quando una cancellazione manuale di un messaggio
// (useDeleteMessage) rimuove la riga ma il best-effort di rimozione del file
// fallisce. Invece di legare la pulizia all'istante di cancellazione della
// riga (fragile, richiederebbe intercettare ogni punto di cancellazione),
// questa funzione fa l'inverso: scansiona l'intero bucket e cancella solo i
// file che non sono più referenziati da NESSUNA riga viva di
// AAA3_chat_messages, indipendentemente da come/quando sono diventati
// orfani.
//
// Soglia di 30gg anche qui (non solo "non referenziato"): un file appena
// caricato ma il cui insert del messaggio non è ancora arrivato (upload e
// insert sono due passi separati lato client, vedi useSendMessage) non deve
// mai essere cancellato mentre l'invio è ancora in corso — 30gg di margine
// è ampiamente sufficiente a escludere qualunque race, e mantiene la stessa
// finestra di retention già usata per i messaggi testuali.

import { createClient } from "npm:@supabase/supabase-js@2";

const WEBHOOK_SECRET = Deno.env.get("CLEANUP_WEBHOOK_SECRET") ?? "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

const BUCKET = "room-photos";
const ORPHAN_MIN_AGE_MS = 30 * 24 * 60 * 60 * 1000;
const LIST_PAGE_SIZE = 1000;
const REMOVE_CHUNK_SIZE = 100;

interface StorageEntry {
  id: string | null;
  name: string;
  created_at?: string | null;
}

async function listAllFiles(
  supabase: ReturnType<typeof createClient>,
  prefix: string,
): Promise<{ path: string; createdAt: string | null }[]> {
  const files: { path: string; createdAt: string | null }[] = [];
  let offset = 0;

  for (;;) {
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .list(prefix, { limit: LIST_PAGE_SIZE, offset });
    if (error) throw error;
    const entries = (data ?? []) as StorageEntry[];

    for (const entry of entries) {
      const path = prefix ? `${prefix}/${entry.name}` : entry.name;
      // Le "cartelle" (un room_id) sono voci sintetiche senza id proprio,
      // ricavate da Supabase Storage dal path dei file reali che contengono.
      if (entry.id === null) {
        files.push(...(await listAllFiles(supabase, path)));
      } else {
        files.push({ path, createdAt: entry.created_at ?? null });
      }
    }

    if (entries.length < LIST_PAGE_SIZE) break;
    offset += LIST_PAGE_SIZE;
  }

  return files;
}

function chunk<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) chunks.push(items.slice(i, i + size));
  return chunks;
}

Deno.serve(async (req: Request) => {
  if (!WEBHOOK_SECRET || req.headers.get("x-webhook-secret") !== WEBHOOK_SECRET) {
    return new Response("Forbidden", { status: 403 });
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  const { data: referenced, error: referencedError } = await supabase
    .from("AAA3_chat_messages")
    .select("image_path")
    .not("image_path", "is", null);

  if (referencedError) {
    return new Response(JSON.stringify({ error: "Failed to load referenced paths" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  const referencedPaths = new Set((referenced ?? []).map((row) => row.image_path as string));

  let allFiles: { path: string; createdAt: string | null }[];
  try {
    allFiles = await listAllFiles(supabase, "");
  } catch {
    return new Response(JSON.stringify({ error: "Failed to list storage objects" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  const cutoff = Date.now() - ORPHAN_MIN_AGE_MS;
  const orphanPaths = allFiles
    .filter((file) => !referencedPaths.has(file.path))
    .filter((file) => (file.createdAt ? new Date(file.createdAt).getTime() < cutoff : false))
    .map((file) => file.path);

  let deleted = 0;
  for (const batch of chunk(orphanPaths, REMOVE_CHUNK_SIZE)) {
    const { error: removeError, data: removed } = await supabase.storage.from(BUCKET).remove(batch);
    if (!removeError) deleted += removed?.length ?? batch.length;
  }

  return new Response(
    JSON.stringify({ scanned: allFiles.length, orphansFound: orphanPaths.length, deleted }),
    { headers: { "Content-Type": "application/json" } },
  );
});
