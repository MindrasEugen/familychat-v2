// Edge Function: translate-message
// Catena di fallback (vedi PROMPT_REACT_REWRITE.md, "Traduzione: raccomandazione
// per la v2"): Google Cloud Translation (primario) -> Azure AI Translator
// (secondo livello) -> Mistral (rete di sicurezza finale, già in uso da v1).
// Ogni livello è attivo solo se la propria chiave è configurata (Deno.env.get
// ritorna undefined altrimenti) — nessuno dei tre blocca gli altri due.
//
// Scelta del secondo livello, verificata al momento dell'implementazione
// (i prezzi in questo settore cambiano spesso, vedi nota nel documento):
// DeepL era il candidato originale, ma da luglio 2026 il suo piano gratuito
// è diventato un pacchetto "Developer" da 1M caratteri UNA TANTUM, non più
// ricorrente mensile — non un vero equivalente del livello gratuito di
// Google, quindi escluso. Lara Translate ha un piano gratuito ricorrente ma
// solo 10.000 caratteri/mese e richiede un SDK proprietario con firma delle
// richieste (niente REST semplice documentata pubblicamente) — poco pratico
// per una Edge Function Deno leggera. Scelto **Azure AI Translator** (livello
// F0): 2.000.000 di caratteri/mese, ricorrente e permanente (più del livello
// gratuito di Google), REST API semplice con una singola chiave in header,
// nessun SDK necessario.
//
// Cache/memoria condivisa: prima di chiamare qualunque servizio, il client
// controlla già AAA3_translation_memory (lookup diretto, RLS permissiva) — qui
// arriva solo su un vero cache miss. Dopo aver ottenuto una traduzione, questa
// funzione la scrive in cache con SUPABASE_SERVICE_ROLE_KEY (bypassa RLS,
// appropriato per una scrittura autoritativa lato server) — il vincolo DB
// "no_silent_noop" e il trigger anti-sovrascrittura delle correzioni manuali
// restano comunque in vigore per qualunque ruolo, è lì che vivono le garanzie
// vere (vedi migrazione), non in questo codice.

import { createClient } from "jsr:@supabase/supabase-js@2";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MAX_ATTEMPTS = 3;
const RETRY_DELAYS_MS = [300, 900];

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Mappatura codice ISO 639-1 -> nome lingua in inglese, usata solo dal
// fallback Mistral (un'API di traduzione dedicata come Google riceve codici
// ISO standard direttamente, non ha bisogno di questa tabella — è proprio
// il motivo per cui Google elimina strutturalmente questa classe di bug,
// vedi lezione 4 del documento di decisioni).
const LANG_NAMES: Record<string, string> = {
  fr: "French", en: "English", it: "Italian", ro: "Romanian", es: "Spanish",
  de: "German", pt: "Portuguese", nl: "Dutch", pl: "Polish", ru: "Russian",
  uk: "Ukrainian", el: "Greek", tr: "Turkish", ar: "Arabic", zh: "Chinese",
  ja: "Japanese", ko: "Korean", hi: "Hindi", sv: "Swedish", no: "Norwegian",
  da: "Danish", fi: "Finnish", cs: "Czech", sk: "Slovak", hu: "Hungarian",
  bg: "Bulgarian", hr: "Croatian", sr: "Serbian", sl: "Slovenian", lt: "Lithuanian",
  lv: "Latvian", et: "Estonian", he: "Hebrew", th: "Thai", vi: "Vietnamese",
  id: "Indonesian", ms: "Malay", fa: "Persian", ur: "Urdu", sq: "Albanian",
  mk: "Macedonian", bs: "Bosnian",
};

interface TranslationResult {
  translatedText: string;
  sourceLang: string;
  provider: "google" | "azure" | "mistral";
}

// Google Cloud Translation v2 (REST, chiave API semplice — non richiede
// service account/OAuth). Ritorna null (mai lancia) su qualunque errore:
// quota gratuita esaurita, chiave assente/non valida, rete — in ogni caso
// il chiamante deve solo passare al fallback Mistral, non fallire la richiesta.
async function translateWithGoogle(text: string, targetLang: string): Promise<TranslationResult | null> {
  const apiKey = Deno.env.get("GOOGLE_TRANSLATE_API_KEY");
  if (!apiKey) return null;

  try {
    const response = await fetch(
      `https://translation.googleapis.com/language/translate/v2?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ q: text, target: targetLang, format: "text" }),
      },
    );

    if (!response.ok) {
      const detail = await response.text();
      console.error(`translate-message: Google ${response.status}, falling back to Mistral`, detail);
      return null;
    }

    const result = await response.json();
    const translation = result?.data?.translations?.[0];
    if (!translation?.translatedText) return null;

    return {
      translatedText: translation.translatedText,
      sourceLang: translation.detectedSourceLanguage ?? "auto",
      provider: "google",
    };
  } catch (err) {
    console.error("translate-message: Google fetch error, falling back to Mistral", err);
    return null;
  }
}

// Azure AI Translator (REST v3, "from" omesso per il rilevamento automatico
// della lingua sorgente, stessa filosofia di Google). Come per Google, non
// lancia mai: qualunque errore (chiave assente/non valida, quota esaurita,
// rete) passa semplicemente al livello successivo.
async function translateWithAzure(text: string, targetLang: string): Promise<TranslationResult | null> {
  const apiKey = Deno.env.get("AZURE_TRANSLATOR_KEY");
  if (!apiKey) return null;

  // Richiesta solo per risorse Translator "regionali/multi-servizio" — una
  // risorsa "globale" (quella raccomandata da Microsoft per un progetto
  // nuovo) non la richiede affatto, vedi commento nel README della funzione.
  const region = Deno.env.get("AZURE_TRANSLATOR_REGION");

  try {
    const headers: Record<string, string> = {
      "Ocp-Apim-Subscription-Key": apiKey,
      "Content-Type": "application/json",
    };
    if (region) headers["Ocp-Apim-Subscription-Region"] = region;

    const response = await fetch(
      `https://api.cognitive.microsofttranslator.com/translate?api-version=3.0&to=${targetLang}`,
      {
        method: "POST",
        headers,
        body: JSON.stringify([{ Text: text }]),
      },
    );

    if (!response.ok) {
      const detail = await response.text();
      console.error(`translate-message: Azure ${response.status}, falling back to Mistral`, detail);
      return null;
    }

    const result = await response.json();
    const entry = result?.[0];
    const translation = entry?.translations?.[0];
    if (!translation?.text) return null;

    return {
      translatedText: translation.text,
      sourceLang: entry?.detectedLanguage?.language ?? "auto",
      provider: "azure",
    };
  } catch (err) {
    console.error("translate-message: Azure fetch error, falling back to Mistral", err);
    return null;
  }
}

// Fallback Mistral esistente (stesso prompt/few-shot già in produzione su
// v1, generalizzato per non assumere più una sorgente sempre italiana: la
// chat v2 può avere mittenti in lingue diverse, non solo italiano).
async function translateWithMistral(text: string, targetLang: string): Promise<TranslationResult | null> {
  const apiKey = Deno.env.get("MISTRAL_API_KEY");
  if (!apiKey) return null;

  const langName = LANG_NAMES[targetLang] ?? targetLang;

  const FEW_SHOT_NOTE =
    langName === "French"
      ? ` For example, Italian "sì" must become French "oui", never left as "si" (French "si" means "if"/"so" and is a different word) - a visual match with a ${langName} word is not the same as the text already being in ${langName}.`
      : ` For example, Italian "sì" (an affirmative confirmation meaning "yes" - NOT a greeting) must become the actual word for "yes" in ${langName}, never left unchanged and never confused with a greeting just because it is short.`;

  let lastDetail = "";

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    try {
      const mistralResponse = await fetch("https://api.mistral.ai/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "mistral-small-latest",
          temperature: 0,
          messages: [
            {
              role: "system",
              content: `You are a translation engine embedded in a family chat app. Detect the language of the input text automatically. Your ONLY job is to translate it into ${langName}. Rules: (1) Always produce the actual ${langName} word or phrase for the meaning of the input, even for short, common, one-word, or familiar-looking text (greetings, "yes"/"no", interjections) - never leave a word in its original language just because it looks short or simple.${FEW_SHOT_NOTE} (2) The only exception is text that is a proper noun / brand name with no translation, or that is unambiguously already written in ${langName} (not merely similar-looking to a ${langName} word). (3) Keep every emoji, emoticon (like ":)"), number, URL and punctuation mark exactly as it is in the input, in the same position: never replace an emoji with words or words with an emoji. (4) Reply with ONLY the translated text: no quotes, no explanations, no extra commentary.`,
            },
            { role: "user", content: `Translate this text into ${langName}:\n\n${text}` },
          ],
        }),
      });

      if (!mistralResponse.ok) {
        const status = mistralResponse.status;
        lastDetail = await mistralResponse.text();
        const retryable = status === 429 || status >= 500;
        if (retryable && attempt < MAX_ATTEMPTS - 1) {
          console.error(`translate-message: Mistral ${status} on attempt ${attempt + 1}, retrying`, lastDetail);
          await sleep(RETRY_DELAYS_MS[attempt]);
          continue;
        }
        console.error(`translate-message: Mistral ${status} on attempt ${attempt + 1}, giving up`, lastDetail);
        return null;
      }

      const result = await mistralResponse.json();
      const translatedText = result.choices?.[0]?.message?.content?.trim();
      if (!translatedText) return null;

      return { translatedText, sourceLang: "auto", provider: "mistral" };
    } catch (err) {
      lastDetail = err instanceof Error ? err.message : String(err);
      if (attempt < MAX_ATTEMPTS - 1) {
        console.error(`translate-message: fetch error on attempt ${attempt + 1}, retrying`, lastDetail);
        await sleep(RETRY_DELAYS_MS[attempt]);
        continue;
      }
    }
  }

  console.error("translate-message: Mistral exhausted all attempts", lastDetail);
  return null;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: CORS_HEADERS });
  }

  let body: { text?: string; targetLang?: string };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  const { text, targetLang } = body;
  if (!text || !targetLang) {
    return new Response(JSON.stringify({ error: "Missing text or targetLang" }), {
      status: 400,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  // Niente da tradurre in un messaggio senza lettere (solo emoji,
  // punteggiatura, numeri): Mistral le "interpretava" (😘 → "Ti amo",
  // "?" → "da"). Si restituisce il testo invariato, senza chiamare servizi
  // e senza scrivere in cache. Stesso controllo anche nel client
  // (useTranslation.ts), che così non legge nemmeno le vecchie voci errate.
  if (!/\p{L}/u.test(text)) {
    return new Response(JSON.stringify({ translatedText: text, sourceLang: "und" }), {
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  const result =
    (await translateWithGoogle(text, targetLang)) ??
    (await translateWithAzure(text, targetLang)) ??
    (await translateWithMistral(text, targetLang));

  if (!result) {
    return new Response(JSON.stringify({ error: "Translation not configured or all providers failed" }), {
      status: 502,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  // Scrittura in cache best-effort: se fallisce (inclusa la violazione
  // 23514 del vincolo "no_silent_noop" su un eco, o il trigger che protegge
  // una correzione manuale già presente) non deve mai far fallire la
  // risposta all'utente — la traduzione è comunque valida da mostrare ora,
  // semplicemente non entra (o non aggiorna) la cache condivisa.
  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    await supabase.from("AAA3_translation_memory").upsert(
      {
        source_text: text,
        source_lang: result.sourceLang,
        target_lang: targetLang,
        translated_text: result.translatedText,
        provider: result.provider,
      },
      { onConflict: "source_text_normalized,source_lang,target_lang" },
    );
  } catch (err) {
    console.error("translate-message: cache write failed (non-fatal)", err);
  }

  return new Response(JSON.stringify({ translatedText: result.translatedText, sourceLang: result.sourceLang }), {
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
});
