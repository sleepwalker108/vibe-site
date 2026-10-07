import type { SerializedEditorState } from '@payloadcms/richtext-lexical/lexical'
import { type JSXConvertersFunction, RichText } from '@payloadcms/richtext-lexical/react'
import type { CardsBlock, FaqBlock, StatBlock } from '@/payload-types'
import { safeHref } from '@/lib/safeHref'
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

// Як показувати блоки з редактора на сайті
const makeConverters = (newTabLabel: string): JSXConvertersFunction => ({ defaultConverters }) => ({
  ...defaultConverters,
  link: smartLink(newTabLabel, defaultConverters.link),
  autolink: smartLink(newTabLabel, defaultConverters.autolink),
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
export const Prose = ({ data, newTabLabel = '(відкривається в новій вкладці)' }: { data: SerializedEditorState; newTabLabel?: string }) => (
  <div className="prose">
    <RichText data={data} converters={makeConverters(newTabLabel)} />
  </div>
)
