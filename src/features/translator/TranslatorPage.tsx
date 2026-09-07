import { useState } from 'react'
import { useMessageTranslation } from '../chat/useTranslation'

// Stesso elenco curato usato lato server (Edge Function translate-message,
// LANG_NAMES) — scelta esplicita: ora che il servizio di traduzione copre
// oltre 130 lingue non c'è più il limite tecnico che in v1 giustificava
// solo francese/inglese, ma un selettore con tutti i codici ISO possibili
// sarebbe un componente a sé (ricerca, alfabeto non latino, ecc.) fuori
// scope qui — questo elenco copre le lingue plausibili per la famiglia.
const LANGUAGES: Record<string, string> = {
  fr: 'Francese', en: 'Inglese', it: 'Italiano', ro: 'Rumeno', es: 'Spagnolo',
  de: 'Tedesco', pt: 'Portoghese', nl: 'Olandese', pl: 'Polacco', ru: 'Russo',
  uk: 'Ucraino', el: 'Greco', tr: 'Turco', ar: 'Arabo', zh: 'Cinese',
  ja: 'Giapponese', ko: 'Coreano', hi: 'Hindi', sv: 'Svedese', no: 'Norvegese',
  da: 'Danese', fi: 'Finlandese', cs: 'Ceco', sk: 'Slovacco', hu: 'Ungherese',
}

export function TranslatorPage() {
  const [text, setText] = useState('')
  const [targetLang, setTargetLang] = useState('en')
  const [submittedText, setSubmittedText] = useState<string | null>(null)

  const translationQuery = useMessageTranslation(submittedText, targetLang)

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (!text.trim()) return
    setSubmittedText(text.trim())
  }

  return (
    <section>
      <h1>Traduttore</h1>
      <form onSubmit={handleSubmit}>
        <label>
          Testo
          <textarea value={text} onChange={(event) => setText(event.target.value)} required />
        </label>
        <label>
          Lingua di destinazione
          <select value={targetLang} onChange={(event) => setTargetLang(event.target.value)}>
            {Object.entries(LANGUAGES).map(([code, name]) => (
              <option key={code} value={code}>
                {name}
              </option>
            ))}
          </select>
        </label>
        <button type="submit">Traduci</button>
      </form>

      {translationQuery.isPending && submittedText && <p>Traduzione in corso…</p>}
      {translationQuery.isError && <p role="alert">Traduzione non riuscita. Riprova.</p>}
      {translationQuery.data && (
        <p>
          <strong>Traduzione:</strong> {translationQuery.data.translatedText}
        </p>
      )}
    </section>
  )
}
