import { Link } from 'react-router'
import { useI18n } from '../i18n/provider.tsx'
import type { AskResult } from '../lib/ask-action.ts'

export function ChatAnswerView({ result }: { result: Extract<AskResult, { state: 'answered' }> }) {
  const { t, path } = useI18n()
  const { answer } = result
  return (
    <section aria-labelledby="answer-heading" className="ask-answer">
      <h2 id="answer-heading">
        {t.ask.youAsked}: <q>{result.question}</q>
      </h2>
      {answer.paragraphs.map((paragraph, index) => (
        <p key={paragraph} className={answer.crisis && index === 0 ? 'ask-crisis' : undefined}>
          <Dialable text={paragraph} />
        </p>
      ))}
      {answer.citations.length > 0 && (
        <>
          <h3>{t.ask.sources}</h3>
          <ul>
            {answer.citations.map(citation => (
              <li key={citation.id}>
                {citation.listingId ? (
                  <Link to={path(`/resources/${citation.listingId}`)}>{citation.name}</Link>
                ) : (
                  citation.name
                )}
                {citation.site && <> ({t.ask.from(citation.site)})</>}
              </li>
            ))}
          </ul>
        </>
      )}
      {answer.asOf && <p className="ask-note">{t.chat.asOf(answer.asOf)}</p>}
    </section>
  )
}

// Phone numbers in an answer, crisis lines included, are one tap to call.
const PHONE = /(\b(?:911|988|211)\b|\b\d{3}-\d{3}-\d{4}\b)/

function Dialable({ text }: { text: string }) {
  return text.split(PHONE).map((part, index) =>
    index % 2 === 1 ? (
      // biome-ignore lint/suspicious/noArrayIndexKey: the parts of one fixed string, never reordered
      <a key={index} href={`tel:${part.replace(/\D/g, '')}`}>
        {part}
      </a>
    ) : (
      part
    ),
  )
}
