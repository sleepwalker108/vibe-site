import { Fragment, type ReactNode } from 'react'

// Робить клікабельним текст із контактів (підвал сайту), як його вписали в адмінці:
//  • телефони: «+38 (093) 367-83-66», «1548» → дзвінок;
//  • «Viber», «WhatsApp», «Telegram» поруч із номером → відкрити месенджер із цим номером;
//  • «@назва_бота» → бот у Telegram;
//  • адреси пошти → лист.
const PHONE = /\+?\d[\d ()‑-]{7,}\d/
const SHORT = /(?<![\d+])\b1[0-9]{3}\b(?![\d-])/ // короткі номери гарячих ліній: 1548, 1648
const TOKEN = new RegExp(
  [
    '[\\w.+-]+@[\\w-]+\\.[\\w.-]+', // пошта
    '@[A-Za-z][A-Za-z0-9_]{3,}', // Telegram
    PHONE.source,
    '\\b(?:Viber|WhatsApp|Telegram)\\b',
  ].join('|'),
  'g',
)

const digits = (s: string) => s.replace(/[^\d+]/g, '')
const ext = { target: '_blank', rel: 'noopener noreferrer' } as const

export const Linkify = ({ text, shortNumbers = false }: { text: string; shortNumbers?: boolean }) => {
  // номер у рядку — для посилань «Viber / WhatsApp / Telegram»
  const phone = text.match(PHONE)?.[0]
  const intl = phone ? digits(phone).replace(/^\+?/, '') : ''
  const out: ReactNode[] = []
  let last = 0
  for (const m of text.matchAll(TOKEN)) {
    const s = m[0]
    const i = m.index ?? 0
    if (i > last) out.push(<Fragment key={`t${last}`}>{text.slice(last, i)}</Fragment>)
    let node: ReactNode = s
    if (s.includes('@') && !s.startsWith('@')) node = <a href={`mailto:${s}`}>{s}</a>
    else if (s.startsWith('@'))
      node = (
        <a href={`https://t.me/${s.slice(1)}`} {...ext}>
          {s}
        </a>
      )
    else if (/^(Viber|WhatsApp|Telegram)$/.test(s)) {
      const href = !intl
        ? null
        : s === 'Viber'
          ? `viber://chat?number=%2B${intl}`
          : s === 'WhatsApp'
            ? `https://wa.me/${intl}`
            : `https://t.me/+${intl}`
      node = href ? (
        <a href={href} {...(s === 'Viber' ? {} : ext)}>
          {s}
        </a>
      ) : (
        s
      )
    } else if (digits(s).replace('+', '').length >= 9) node = <a href={`tel:${digits(s)}`}>{s}</a>
    out.push(<Fragment key={i}>{node}</Fragment>)
    last = i + s.length
  }
  if (last < text.length) out.push(<Fragment key="end">{text.slice(last)}</Fragment>)

  // короткі номери (1548) — лише там, де їх явно просять (рядок «номер гарячої лінії»)
  if (shortNumbers && last === 0 && SHORT.test(text)) {
    const n = text.match(SHORT)![0]
    const [a, b] = text.split(n)
    return (
      <>
        {a}
        <a href={`tel:${n}`}>{n}</a>
        {b}
      </>
    )
  }
  return <>{out}</>
}
