import type { CollectionBeforeChangeHook, Field } from 'payload'

/**
 * Перемикання мов «як у WordPress»:
 *  - hasEnglish — чи є англійська версія (ставиться автоматично, коли зберігають англійську назву);
 *    у списку показується колонкою «EN ✓ / + EN» з переходом до англійської версії;
 *  - languages — блок «Мови» у правій колонці форми з перемикачем Українська / English.
 */
export const translationFields = (collection: 'news' | 'pages'): Field[] => [
  {
    name: 'languages',
    type: 'ui',
    admin: {
      position: 'sidebar',
      components: { Field: '/components/admin/LanguagePanel#LanguagePanel' },
    },
  },
  {
    name: 'hasEnglish',
    type: 'checkbox',
    label: 'Англійська',
    defaultValue: false,
    admin: {
      condition: () => false, // у формі не показуємо (стан видно в блоці «Мови»), а в списку — колонка
      components: { Cell: { path: '/components/admin/EnglishCell#EnglishCell', clientProps: { collection } } },
    },
  },
]

// Під час збереження англійської версії відмічаємо, чи заповнена англійська назва
export const markEnglish: CollectionBeforeChangeHook = ({ data, req }) => {
  if (req.locale === 'en') data.hasEnglish = Boolean(data.title && String(data.title).trim())
  return data
}
