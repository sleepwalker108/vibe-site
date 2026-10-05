import {
  EXPERIMENTAL_TableFeature,
  FixedToolbarFeature,
  HeadingFeature,
  LinkFeature,
  type FeatureProviderServer,
} from '@payloadcms/richtext-lexical'
import { HistoryFeature } from '../features/history/server'
import { BlockToolbarFeature } from '../features/blockToolbar/server'

const safeDecode = (s: string) => {
  try {
    return decodeURIComponent(s)
  } catch {
    return s
  }
}
// м'яке розкодування: не чіпає службові символи (%2F, %3F, %26…), тож параметри посилань не ламаються
const softDecode = (s: string) => {
  try {
    return decodeURI(s)
  } catch {
    return s
  }
}

/**
 * Приводить адресу посилання до однієї стабільної форми.
 * Стандартний редактор кодує адреси з українськими літерами при КОЖНОМУ збереженні
 * (/звіти → %2F%D0%B7… → %252F…), і посилання ламаються. Тут ми:
 *  - розкодовуємо раніше зіпсовані адреси (%25…, %2F…, http%3A…);
 *  - виправляємо подвоєння «http://http://»;
 *  - кодуємо лише небезпечні символи (encodeURI) — повторне збереження нічого не змінює.
 */
export const normalizeUrl = (value?: string | null) => {
  if (!value) return value
  let v = value.trim()
  for (let i = 0; i < 5 && /%25[0-9a-f]{2}/i.test(v); i++) v = safeDecode(v)
  if (/^(%2F|https?%3A|mailto%3A|tel%3A)/i.test(v)) v = safeDecode(v)
  v = v.replace(/^(https?:\/\/)+https?:\/\//i, (m) => (m.toLowerCase().startsWith('https') ? 'https://' : 'http://'))
  return encodeURI(softDecode(v))
}

// Посилання: та сама форма, що й стандартна, але з нашою нормалізацією адреси замість подвійного кодування
const Link = LinkFeature({
  fields: ({ defaultFields }) =>
    defaultFields.map((f) =>
      'name' in f && f.name === 'url' ? { ...f, hooks: { beforeChange: [({ value }) => normalizeUrl(value)] } } : f,
    ),
})

// Зайве для редакторів новин: «Стосунки», чекбокси, верхній/нижній індекс, код
const HIDDEN = new Set(['toolbarInline', 'link', 'heading', 'relationship', 'checklist', 'subscript', 'superscript', 'inlineCode'])

/**
 * Можливості редактора тексту для сторінок, новин і відповідей:
 * як у WordPress — над абзацом із курсором з’являється панель блоку (features/blockToolbar):
 * тип блоку, переміщення, вирівнювання, жирний/курсив/посилання, дії з блоком.
 * Угорі редактора лишається вузька панель: скасувати/повторити, «Вставити», «Блоки»
 * (решту груп ховає components/admin/EditorHints, бо вони дублюють панель блоку).
 */
export const editorFeatures =
  (extra: FeatureProviderServer<any, any, any>[] = []) =>
  ({ defaultFeatures }: { defaultFeatures: FeatureProviderServer<any, any, any>[] }) => [
    ...defaultFeatures.filter((f) => !HIDDEN.has(f.key)),
    HeadingFeature({ enabledHeadingSizes: ['h2', 'h3', 'h4'] }),
    Link,
    HistoryFeature(),
    BlockToolbarFeature(),
    FixedToolbarFeature({
      customGroups: {
        text: { type: 'buttons', order: 5 },
        format: { order: 8 },
        features: { order: 9 },
        align: { type: 'buttons', order: 12 },
        indent: { order: 14 },
        add: { order: 20 },
        blocks: { order: 22 },
      },
    }),
    EXPERIMENTAL_TableFeature(),
    ...extra,
  ]
