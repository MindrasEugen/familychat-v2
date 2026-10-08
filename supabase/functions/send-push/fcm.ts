// Invio delle notifiche all'app Android nativa tramite Firebase Cloud
// Messaging (API HTTP v1). Le credenziali sono il JSON del service account
// Firebase, salvato come secret FIREBASE_SERVICE_ACCOUNT del progetto
// Supabase (mai nel repo, che è pubblico). Da lì si firma un JWT e lo si
// scambia con un access token OAuth di Google, valido un'ora: lo si tiene in
// memoria finché l'istanza della funzione resta calda.

import { importPKCS8, SignJWT } from "npm:jose@5.9.6";

export interface ServiceAccount {
  project_id: string;
  client_email: string;
  private_key: string;
}

export interface FcmNotification {
  title: string;
  body: string;
  roomId: string;
}

// "unregistered": app disinstallata o token non più valido → la riga va
// cancellata (come 404/410 per le Web Push).
export type FcmResult = "sent" | "unregistered" | "error";

const FCM_SCOPE = "https://www.googleapis.com/auth/firebase.messaging";
const TOKEN_URL = "https://oauth2.googleapis.com/token";

let cachedAccessToken: { value: string; expiresAt: number } | null = null;

export function parseServiceAccount(raw: string): ServiceAccount | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (parsed?.project_id && parsed?.client_email && parsed?.private_key) return parsed;
  } catch {
    // JSON non valido: trattato come "non configurato", senza stampare il contenuto.
  }
  return null;
}

async function getAccessToken(account: ServiceAccount): Promise<string> {
  if (cachedAccessToken && cachedAccessToken.expiresAt > Date.now() + 60_000) {
    return cachedAccessToken.value;
  }

  const key = await importPKCS8(account.private_key, "RS256");
  const now = Math.floor(Date.now() / 1000);
  const assertion = await new SignJWT({ scope: FCM_SCOPE })
    .setProtectedHeader({ alg: "RS256", typ: "JWT" })
    .setIssuer(account.client_email)
    .setSubject(account.client_email)
    .setAudience(TOKEN_URL)
    .setIssuedAt(now)
    .setExpirationTime(now + 3600)
    .sign(key);

  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion }),
  });
  if (!response.ok) throw new Error(`Google OAuth: ${response.status}`);

  const json = await response.json();
  cachedAccessToken = { value: json.access_token, expiresAt: Date.now() + json.expires_in * 1000 };
  return cachedAccessToken.value;
}

export async function sendFcm(
  account: ServiceAccount,
  token: string,
  notification: FcmNotification,
): Promise<FcmResult> {
  const response = await fetch(`https://fcm.googleapis.com/v1/projects/${account.project_id}/messages:send`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${await getAccessToken(account)}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      message: {
        token,
        // Con "notification" la mostra Android stesso, anche ad app chiusa.
        notification: { title: notification.title, body: notification.body },
        data: { room_id: notification.roomId },
        android: {
          // Priorità alta: consegna immediata anche in standby (Doze),
          // invece di raggrupparle al risveglio. TTL come per le Web Push.
          priority: "HIGH",
          ttl: "86400s",
          notification: {
            // Una notifica per camera: la nuova sostituisce la precedente.
            // L'app chiude le notifiche con questo tag all'apertura della camera.
            tag: `room-${notification.roomId}`,
            channel_id: "messages",
          },
        },
      },
    }),
  });

  if (response.ok) return "sent";

  // 404 UNREGISTERED: il token non esiste più. 400 con errore sul token
  // (INVALID_ARGUMENT su "registration token"): token malformato o vecchio.
  const errorBody = await response.text();
  if (response.status === 404 || (response.status === 400 && /registration token/i.test(errorBody))) {
    return "unregistered";
  }
  console.error(`FCM: invio non riuscito (${response.status})`);
  return "error";
}
