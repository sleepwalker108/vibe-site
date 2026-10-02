import { lexicalEditor } from '@payloadcms/richtext-lexical'
import { editorFeatures } from '../fields/editor'
import type { Block } from 'payload'

// Блок для редактора тексту: розгортні «Запитання — відповіді» (акордеон)
export const FaqBlock: Block = {
  slug: 'faq',
  labels: { singular: 'Запитання — відповіді', plural: 'Запитання — відповіді' },
  interfaceName: 'FaqBlock',
  fields: [
    {
      name: 'items',
      type: 'array',
      label: 'Запитання',
      labels: { singular: 'Запитання', plural: 'Запитання' },
      minRows: 1,
      admin: { components: { RowLabel: '/components/admin/FaqRowLabel#FaqRowLabel' } },
      fields: [
        { name: 'question', type: 'text', label: 'Запитання', required: true },
        // окремий редактор без блоків — інакше блок містив би сам себе
        { name: 'answer', type: 'richText', label: 'Відповідь', editor: lexicalEditor({ features: editorFeatures() }) },
      ],
    },
  ],
}
