import type { SerializedEditorState } from '@payloadcms/richtext-lexical/lexical'
import { type JSXConvertersFunction, RichText } from '@payloadcms/richtext-lexical/react'
import type { CardsBlock, FaqBlock, StatBlock } from '@/payload-types'
import { ResourceIcon } from './ResourceIcon'

// Як показувати блоки з редактора на сайті
const converters: JSXConvertersFunction = ({ defaultConverters }) => ({
  ...defaultConverters,
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
export const Prose = ({ data }: { data: SerializedEditorState }) => (
  <div className="prose">
    <RichText data={data} converters={converters} />
  </div>
)
