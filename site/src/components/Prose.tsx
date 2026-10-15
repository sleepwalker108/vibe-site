import type { SerializedEditorState } from '@payloadcms/richtext-lexical/lexical'
import { type JSXConvertersFunction, RichText } from '@payloadcms/richtext-lexical/react'
import type { CardsBlock, FaqBlock, StatBlock } from '@/payload-types'
import { Fragment } from 'react'
import { hasPhone, splitPhones } from '@/lib/phones'
import { safeHref } from '@/lib/safeHref'
import { normalizeContent } from '@/fields/normalizeHeadings'
import { DocCard, type DocLabels } from './DocCard'
import { ResourceIcon } from './ResourceIcon'
import { findLinkGroups, type LinkInfo, type LinkItem } from '@/lib/linkCards'

const OLD_SITE = 'https://dp-reintegration.gov.ua'
const FILE = /\.(pdf|docx?|xlsx?|pptx?|odt|ods|zip|rar)([?#]|$)/i

/**
 * Адреса посилання для відвідувача:
 *  - /wp-content/… (файли, що ще лежать на старому сервері) → повна адреса старого сайту, щоб файл відкривався;
 *  - сторінки старого сайту (той самий домен) → відносні адреси нашого сайту;
 *  - документи (PDF, Word, Excel…) та інші сайти відкриваються в новій вкладці, щоб людина не губила нашу сторінку.
 */
export const resolveLink = (raw?: string | null) => {
  let url = (raw || '').trim()
  if (url.startsWith('/wp-content/')) url = OLD_SITE + url
  const own = url.match(/^https?:\/\/(?:www\.)?dp-reintegration\.gov\.ua(\/.*)?$/i)
  if (own && !/\/wp-content\//i.test(own[1] || '')) url = own[1] || '/'
  return { url: safeHref(url), auto: /^https?:\/\//i.test(url) || FILE.test(url) }
}

// Посилання: правильна адреса + нова вкладка для документів і інших сайтів,
// про що незрячий користувач чує (схована для очей примітка)
const smartLink =
  (label: string, fallback: any) =>
  ({ node, nodesToJSX, ...rest }: any) => {
    if (node.fields?.linkType === 'internal') return fallback({ node, nodesToJSX, ...rest })
    const { url, auto } = resolveLink(node.fields?.url)
    const newTab = !!node.fields?.newTab || auto
    return (
      <a href={url} {...(newTab ? { target: '_blank', rel: 'noopener noreferrer' } : {})}>
        {nodesToJSX({ nodes: node.children })}
        {newTab && <span className="sr-only"> {label}</span>}
      </a>
    )
  }

// Простий текст (картки, підписи) — з клікабельними телефонами
const PhoneText = ({ text }: { text: string }) => (
  <>
    {splitPhones(text).map((p, i) =>
      p.tel ? (
        <a key={i} className="tel-link" href={`tel:${p.tel}`}>
          {p.text}
        </a>
      ) : (
        <Fragment key={i}>{p.text}</Fragment>
      ),
    )}
  </>
)

export type ProseLabels = DocLabels & { newTab: string; yearLatest: string; docsForms: string; docsNone: string; updatedOn: string }

const DOC = /\.(pdf|docx?|xlsx?|pptx?|odt|ods)([?#]|$)/i
const plain = (n: any): string => (n?.text || '') + (n?.children || []).map(plain).join('')

// Абзац, що складається лише з посилання на документ (PDF, Word…), — показуємо карткою документа
const docOf = (node: any): { url: string; title: string } | null => {
  const kids = (node.children || []).filter((k: any) => !(k.type === 'text' && !k.text.trim()) && k.type !== 'linebreak')
  if (!kids.length) return null
  // назва документа буває розбита на кілька посилань з однаковою адресою (частини з різним оформленням) — це один документ
  const isExtLink = (k: any) => (k.type === 'link' || k.type === 'autolink') && k.fields?.linkType !== 'internal'
  if (!kids.every(isExtLink) || new Set(kids.map((k: any) => (k.fields?.url || '').trim())).size !== 1) return null
  const k = kids.length === 1 ? kids[0] : node
  const { url } = resolveLink(kids[0].fields?.url)
  if (!DOC.test(url)) return null
  // старий сайт уже працює через https — щоб перегляд не блокувався як «небезпечний вміст»
  return { url: url.replace(/^http:\/\/(www\.)?dp-reintegration\.gov\.ua/i, 'https://dp-reintegration.gov.ua'), title: plain(k).trim() || url.split('/').pop() || url }
}

// 1 документ, 2 документи, 5 документів
const plural = (n: number, forms: string) => {
  const [one, few, many] = forms.split('|')
  const m10 = n % 10
  const m100 = n % 100
  return `${n} ${m10 === 1 && m100 !== 11 ? one : m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14) ? few : many}`
}
const yearOf = (s: string) => s.match(/\b(19|20)\d{2}\b/)?.[0]

// Картки років: рядки-посилання на сторінки за роками («Звіт за 2025 рік», «2025 рік»)
const LinkCards = ({ items, links, labels }: { items: LinkItem[]; links: LinkInfo; labels: ProseLabels }) => {
  const withYear = items.map((it) => ({ ...it, year: yearOf(it.text) || yearOf(it.slug) }))
  // якщо в усіх є рік — найновіший першим
  const sorted = withYear.every((it) => it.year) ? [...withYear].sort((a, b) => Number(b.year) - Number(a.year)) : withYear
  const latest = sorted[0]?.year && sorted.every((it) => it.year) ? sorted[0].href : null
  return (
    <ul className="year-cards">
      {sorted.map((it) => {
        const info = links[it.slug]
        // «2025 рік» — замало; тоді показуємо назву сторінки («Закупівлі 2025 рік»)
        const title = it.year && it.text.replace(it.year, '').replace(/рік|year/i, '').trim().length < 2 && info?.title ? info.title : it.text
        const date = info?.updatedAt ? new Date(info.updatedAt).toLocaleDateString('uk-UA') : ''
        return (
          <li key={it.href}>
            <a className={`year-card${latest === it.href ? ' is-latest' : ''}`} href={it.href}>
              {latest === it.href && <span className="yc-badge">{labels.yearLatest}</span>}
              <span className="yc-ico" aria-hidden="true">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                </svg>
              </span>
              {it.year && <span className="yc-year">{it.year}</span>}
              <span className="yc-title">{title}</span>
              <span className="yc-meta">
                {info ? (info.docs ? plural(info.docs, labels.docsForms) : labels.docsNone) : ''}
                {info && date && latest === it.href ? ` · ${labels.updatedOn} ${date}` : ''}
              </span>
              <span className="yc-arrow" aria-hidden="true">→</span>
            </a>
          </li>
        )
      })}
    </ul>
  )
}

// Як показувати блоки з редактора на сайті
const makeConverters = (labels: ProseLabels, links: LinkInfo = {}): JSXConvertersFunction => ({ defaultConverters }) => ({
  ...defaultConverters,
  linkcards: ({ node }: { node: { items: LinkItem[] } }) => <LinkCards items={node.items} links={links} labels={labels} />,
  paragraph: (args: any) => {
    const doc = docOf(args.node)
    if (doc) return <DocCard url={doc.url} title={doc.title} labels={labels} />
    return (defaultConverters.paragraph as any)(args)
  },
  // телефонні номери в тексті (зокрема в заголовках) — клікабельні (дзвінок). Текст, що вже є посиланням, не чіпаємо.
  text: (args: any) => {
    const t: string = args.node?.text || ''
    let skip = !hasPhone(t)
    for (let p = args.parent; p && !skip; p = p.parent) if (p.type === 'link' || p.type === 'autolink') skip = true
    const plainText = (s: string) => (defaultConverters.text as any)({ ...args, node: { ...args.node, text: s } })
    if (skip) return plainText(t)
    return (
      <>
        {splitPhones(t).map((part, i) =>
          part.tel ? (
            <a key={i} className="tel-link" href={`tel:${part.tel}`}>
              {plainText(part.text)}
            </a>
          ) : (
            <Fragment key={i}>{plainText(part.text)}</Fragment>
          ),
        )}
      </>
    )
  },
  // документ, вставлений кнопкою «Файл з медіатеки» (а не посиланням), — теж карткою документа
  upload: (args: any) => {
    const file = args.node?.value
    if (file && typeof file === 'object' && file.url && DOC.test(file.filename || file.url)) {
      const title = (args.node.fields?.alt || file.alt || '').trim() || String(file.filename).replace(/\.[a-z0-9]+$/i, '')
      return <DocCard url={file.url} title={title} labels={labels} />
    }
    return (defaultConverters.upload as any)(args)
  },
  link: smartLink(labels.newTab, defaultConverters.link),
  autolink: smartLink(labels.newTab, defaultConverters.autolink),
  blocks: {
    // «Запитання — відповіді»: розгортні пункти (<details>), працюють з клавіатури й без JavaScript
    faq: ({ node }: { node: { fields: FaqBlock } }) => (
      <div className="faq">
        {node.fields.items?.map((item, i) => (
          <details key={item.id || i} className="faq-item">
            <summary>{item.question}</summary>
            <div className="faq-answer">{item.answer && <RichText data={item.answer} converters={makeConverters(labels)} />}</div>
          </details>
        ))}
      </div>
    ),
    // «Картки з іконками»
    cards: ({ node }: { node: { fields: CardsBlock } }) => (
      <div className="prose-cards">
        {node.fields.items?.map((item, i) => (
          <div key={item.id || i} className="prose-card">
            <span className="prose-card-ico">
              <ResourceIcon name={item.icon} />
            </span>
            <div className="prose-card-title">{item.title}</div>
            {item.text && (
              <p>
                <PhoneText text={item.text} />
              </p>
            )}
          </div>
        ))}
      </div>
    ),
    // «Виділена цифра»
    stat: ({ node }: { node: { fields: StatBlock } }) => (
      <div className="prose-stat">
        <div className="prose-stat-num">{node.fields.number}</div>
        <div className="prose-stat-label">{node.fields.label}</div>
        {node.fields.note && (
          <p className="prose-stat-note">
            <PhoneText text={node.fields.note} />
          </p>
        )}
      </div>
    ),
  },
})

// Текст сторінки чи новини, оформлений стилями .prose
// Рядки-посилання на сторінки (2+ поспіль) — замінюємо одним вузлом «картки років»
const withLinkCards = (data: SerializedEditorState): SerializedEditorState => {
  const children = (data?.root?.children || []) as any[]
  const groups = findLinkGroups(children)
  if (!groups.length) return data
  const out: any[] = []
  let gi = 0
  for (let i = 0; i < children.length; i++) {
    const g = groups[gi]
    if (g && i === g.start) {
      out.push({ type: 'linkcards', version: 1, items: g.items })
      i = g.end
      gi++
    } else out.push(children[i])
  }
  return { ...data, root: { ...data.root, children: out } } as SerializedEditorState
}

// Текст сторінки чи новини, оформлений стилями .prose
// links — дані про сторінки, на які ведуть картки років (скільки документів, коли оновлено)
export const Prose = ({ data, labels, links }: { data: SerializedEditorState; labels: ProseLabels; links?: LinkInfo }) => (
  <div className="prose">
    <RichText data={withLinkCards(normalizeContent(data))} converters={makeConverters(labels, links)} />
  </div>
)
