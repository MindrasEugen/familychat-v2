-- Fix per la migrazione precedente (20260907190000): mancava la policy
-- SELECT su storage.objects per "profile-photos". Il bucket pubblico
-- bypassa RLS solo per il download via URL pubblico (endpoint
-- /storage/v1/object/public/...), ma la Storage API autenticata (usata da
-- "remove"/"update"/"list") deve prima vedere la riga in storage.objects
-- via una query soggetta a RLS — senza questa policy, un proprietario non
-- riesce mai a cancellare/sostituire la propria foto (fallimento silenzioso:
-- "remove" ritorna un array vuoto, nessun errore). Scoperto testando il
-- cleanup di un file di prova, non da un utente reale, ma il bug è reale.
create policy "profile_photos_select_all"
on storage.objects
for select
to authenticated
using (bucket_id = 'profile-photos');
