import { Form } from 'react-router'
import { useI18n } from '../i18n/provider.tsx'

export const MAX_QUESTION = 300

// Posts to /ask, so a question is answered only when someone asks it, never by a crawler following a link.
export function AskForm({ heading, id = 'ask-q' }: { heading?: string; id?: string }) {
  const { t, path } = useI18n()
  return (
    <Form method="post" action={path('/ask')} className="ask-form">
      {heading && <h2>{heading}</h2>}
      <label htmlFor={id}>{t.ask.label}</label>
      <textarea id={id} name="q" rows={3} maxLength={MAX_QUESTION} placeholder={t.ask.placeholder} required />
      <p className="ask-note">{t.ask.private}</p>
      <button type="submit">{t.ask.submit}</button>
    </Form>
  )
}
