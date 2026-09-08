-- ---------------------------------------------------------
-- Più foto per messaggio (fino a 10, su richiesta esplicita dell'utente —
-- prima si poteva allegarne solo una). Sostituisce la colonna singola
-- image_path con un array image_paths; ogni elemento segue la stessa
-- convenzione di path "<room_id>/<uuid>.<ext>" di prima (le policy RLS sul
-- bucket "room-photos" leggono solo il primo segmento del path, non
-- cambia nulla lì) — solo ora una riga può referenziarne più di uno.
-- ---------------------------------------------------------
alter table public."AAA3_chat_messages" add column image_paths text[] not null default '{}';

update public."AAA3_chat_messages"
set image_paths = array[image_path]
where image_path is not null;

alter table public."AAA3_chat_messages" drop constraint "AAA3_chat_messages_body_or_image_present";
alter table public."AAA3_chat_messages" drop column image_path;

alter table public."AAA3_chat_messages"
  add constraint "AAA3_chat_messages_body_or_image_present"
  check (body is not null or cardinality(image_paths) > 0);

alter table public."AAA3_chat_messages"
  add constraint "AAA3_chat_messages_image_paths_max_10"
  check (cardinality(image_paths) <= 10);
