import type { CollectionBeforeChangeHook, Field } from 'payload'
import { buildSearchText } from '../lib/searchText'

// Приховане поле «текст для пошуку» — заповнюється автоматично, редактори його не бачать
export const searchTextField: Field = {
  name: 'searchText',
  type: 'textarea',
  localized: true,
  admin: { hidden: true, disableListColumn: true, disableListFilter: true },
}

// Перед кожним збереженням збираємо текст для пошуку з указаних полів (заголовок, опис, вміст…)
export const fillSearchText =
  (fields: string[]): CollectionBeforeChangeHook =>
  ({ data, originalDoc }) => {
    data.searchText = buildSearchText(...fields.map((f) => (f in data ? data[f] : originalDoc?.[f])))
    return data
  }
