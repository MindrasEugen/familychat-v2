// Edge Function: send-push
// Chiamata da un Database Webhook (trigger Postgres) su ogni INSERT in
// AAA3_chat_messages. Invia una Web Push (VAPID) a tutti i membri della
// camera DIVERSI dal mittente, su ognuno dei loro dispositivi registrati.
// verify_jwt è disabilitato perché la chiamata arriva dal webhook del
// database, non da un utente autenticato — l'autenticazione è manuale
// tramite l'header x-webhook-secret, confrontato con PUSH_WEBHOOK_SECRET.
//
// A differenza di v1 (un "account" condiviso da più dispositivi/persone,
// da cui la necessità di escludere il singolo endpoint del mittente):
// in v2 ogni persona ha un proprio account, quindi escludere il mittente
// dalla lista dei MEMBRI della camera esclude già tutti i suoi dispositivi
// in un colpo solo (lezione 8: esclusione lato server, non solo client).
// Con il multi-account però un dispositivo può appartenere anche a un altro
// membro: per questo si escludono anche gli endpoint del mittente.

import webpush from "npm:web-push@3.6.7";
import { createClient } from "npm:@supabase/supabase-js@2";

const VAPID_PUBLIC_KEY = Deno.env.get("VAPID_PUBLIC_KEY") ?? "";
const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY") ?? "";
const VAPID_SUBJECT = Deno.env.get("VAPID_SUBJECT") ?? "mailto:example@example.com";
const WEBHOOK_SECRET = Deno.env.get("PUSH_WEBHOOK_SECRET") ?? "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

interface ChatMessageRecord {
  id: string;
  room_id: string;
  sender_id: string;
  body: string | null;
  image_paths: string[] | null;
}

Deno.serve(async (req: Request) => {
  if (!WEBHOOK_SECRET || req.headers.get("x-webhook-secret") !== WEBHOOK_SECRET) {
    return new Response("Forbidden", { status: 403 });
  }

  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
    return new Response(JSON.stringify({ error: "Push not configured" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  let body: { record?: ChatMessageRecord };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const message = body.record;
  if (!message?.room_id || !message.sender_id) {
    return new Response(JSON.stringify({ error: "Missing message record" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  const [{ data: members, error: membersError }, { data: sender }] = await Promise.all([
    supabase
      .from("AAA3_room_members")
      .select("user_id")
      .eq("room_id", message.room_id)
      .neq("user_id", message.sender_id)
      // Chi ha silenziato questa camera (Info camera) non riceve notifiche.
      .eq("notifications_muted", false),
    supabase.from("AAA3_profiles").select("username").eq("id", message.sender_id).maybeSingle(),
  ]);

  if (membersError || !members) {
    return new Response(JSON.stringify({ error: "Failed to load room members" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  const recipientIds = members.map((m) => m.user_id);
  if (recipientIds.length === 0) {
    return new Response(JSON.stringify({ sent: 0 }), { headers: { "Content-Type": "application/json" } });
  }

  const [{ data: subs, error: subsError }, { data: senderSubs, error: senderSubsError }] = await Promise.all([
    supabase.from("AAA3_push_subscriptions").select("endpoint, p256dh, auth").in("user_id", recipientIds),
    supabase.from("AAA3_push_subscriptions").select("endpoint").eq("user_id", message.sender_id),
  ]);

  if (subsError || !subs || senderSubsError || !senderSubs) {
    return new Response(JSON.stringify({ error: "Failed to load subscriptions" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Stesso dispositivo iscritto con due account (multi-account) entrambi
  // membri della camera: una sola notifica per endpoint, non due. E se uno
  // dei due è il mittente, quel dispositivo non riceve nulla: escludere il
  // mittente come persona non basta, il suo telefono arriverebbe comunque
  // tramite l'altro account (lezione 8, verificato il 2026-09-26).
  const senderEndpoints = new Set(senderSubs.map((sub) => sub.endpoint));
  const uniqueSubs = [
    ...new Map(subs.filter((sub) => !senderEndpoints.has(sub.endpoint)).map((sub) => [sub.endpoint, sub])).values(),
  ];

  const title = sender?.username || "Nuovo messaggio";
  const bodyText = message.body ? message.body.slice(0, 120) : "📷 Foto";
  const notificationPayload = JSON.stringify({ title, body: bodyText, room_id: message.room_id });

  await Promise.all(
    uniqueSubs.map((sub) =>
      webpush
        .sendNotification({ endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } }, notificationPayload)
        .catch(async (err: { statusCode?: number }) => {
          // 404/410: l'endpoint non esiste più lato browser (disinstallato,
          // permesso revocato) — pulizia, non un errore da segnalare.
          if (err?.statusCode === 404 || err?.statusCode === 410) {
            await supabase.from("AAA3_push_subscriptions").delete().eq("endpoint", sub.endpoint);
          }
        }),
    ),
  );

  return new Response(JSON.stringify({ sent: uniqueSubs.length }), {
    headers: { "Content-Type": "application/json" },
  });
});
