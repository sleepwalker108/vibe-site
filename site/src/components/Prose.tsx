import type { SerializedEditorState } from '@payloadcms/richtext-lexical/lexical'
import { type JSXConvertersFunction, RichText } from '@payloadcms/richtext-lexical/react'
import type { CardsBlock, FaqBlock, StatBlock } from '@/payload-types'
import { safeHref } from '@/lib/safeHref'
import { DocCard, type DocLabels } from './DocCard'
import { ResourceIcon } from './ResourceIcon'

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

export type ProseLabels = DocLabels & { newTab: string }

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

// Як показувати блоки з редактора на сайті
const makeConverters = (labels: ProseLabels): JSXConvertersFunction => ({ defaultConverters }) => ({
  ...defaultConverters,
  paragraph: (args: any) => {
    const doc = docOf(args.node)
    if (doc) return <DocCard url={doc.url} title={doc.title} labels={labels} />
    return (defaultConverters.paragraph as any)(args)
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
            <div className="faq-answer">{item.answer && <RichText data={item.answer} />}</div>
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
            {item.text && <p>{item.text}</p>}
          </div>
        ))}
      </div>
    ),
    // «Виділена цифра»
    stat: ({ node }: { node: { fields: StatBlock } }) => (
      <div className="prose-stat">
        <div className="prose-stat-num">{node.fields.number}</div>
        <div className="prose-stat-label">{node.fields.label}</div>
        {node.fields.note && <p className="prose-stat-note">{node.fields.note}</p>}
      </div>
    ),
  },
})

// Текст сторінки чи новини, оформлений стилями .prose
export const Prose = ({ data, labels }: { data: SerializedEditorState; labels: ProseLabels }) => (
  <div className="prose">
    <RichText data={data} converters={makeConverters(labels)} />
  </div>
)
