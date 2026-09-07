-- ---------------------------------------------------------
-- Storage — bucket foto profilo
-- A differenza di "room-photos" (privato, scoping per camera), questo
-- bucket è PUBBLICO: la tabella AAA3_profiles ha già la policy
-- "profiles_select_all" (using (true)) — qualunque utente autenticato può
-- già leggere qualunque profilo, quindi non ha senso restringere la lettura
-- della foto associata dietro un signed URL. avatar_url in AAA3_profiles
-- salva l'URL pubblico completo, non un path (a differenza di image_path
-- su AAA3_chat_messages, che invece richiede sempre createSignedUrl).
-- Convenzione path upload: "<user_id>/<nome-file>" — solo il proprietario
-- può scrivere/sovrascrivere/cancellare la propria cartella.
-- ---------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('profile-photos', 'profile-photos', true)
on conflict (id) do nothing;

create policy "profile_photos_insert_own"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'profile-photos'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

create policy "profile_photos_update_own"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'profile-photos'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

create policy "profile_photos_delete_own"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'profile-photos'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);
