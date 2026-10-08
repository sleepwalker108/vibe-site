import type { GlobalConfig } from 'payload'
import { isLoggedIn } from '../access'
import { languageSwitcher } from '../fields/translations'

const rows = (name: string, label: string, description?: string) => ({
  name,
  type: 'array' as const,
  label,
  labels: { singular: 'Рядок', plural: 'Рядки' },
  admin: description ? { description } : undefined,
  fields: [
    {
      type: 'row' as const,
      fields: [
        { name: 'name', type: 'text' as const, label: 'Назва', required: true, localized: true, admin: { width: '70%' } },
        { name: 'value', type: 'number' as const, label: 'Кількість', required: true, min: 0, admin: { width: '30%' } },
      ],
    },
  ],
})

export const AnnualReport: GlobalConfig = {
  slug: 'annual-report',
  label: 'Річний звіт гарячих ліній',
  admin: {
    // кнопка «Скасувати» біля збереження/публікації
    components: { elements: { beforeDocumentControls: ['/components/admin/CancelButton#CancelButton'] } },
    group: 'Сайт',
    description:
      'Загальну кількість, вхідні та вихідні дзвінки рахувати не треба — сайт сам додає відповідні рядки.',
    livePreview: { url: '/?preview=1#report' },
  },
  versions: { drafts: { autosave: { interval: 400 } }, max: 50 },
  access: { read: () => true, update: isLoggedIn },
  fields: [
    // перемикач Українська / English (як у новинах)
    languageSwitcher,
    {
      type: 'row',
      fields: [
        { name: 'show', type: 'checkbox', label: 'Показувати блок на головній', defaultValue: true },
        { name: 'periodFrom', type: 'date', label: 'Період: з', admin: { date: { displayFormat: 'dd.MM.yyyy' } } },
        { name: 'periodTo', type: 'date', label: 'по', admin: { date: { displayFormat: 'dd.MM.yyyy' } } },
      ],
    },
    { name: 'title', type: 'text', label: 'Заголовок', localized: true },
    { name: 'subtitle', type: 'text', label: 'Підзаголовок', localized: true },
    rows(
      'channels',
      'Вхідні звернення за каналами (кругова діаграма)',
      'Сума цих рядків = «Вхідні дзвінки». Кольори йдуть по черзі: синій, блакитний, жовтий, сірий. Не більше 4 рядків.',
    ),
    {
      type: 'row',
      fields: [
        { name: 'line1648', type: 'number', label: 'Звернень на гарячу лінію 1648', min: 0 },
        { name: 'sms', type: 'number', label: 'Інформаційна SMS-розсилка', min: 0 },
      ],
    },
    rows('topQuestions', 'Топ питань громадян', 'Показуються в тому порядку, як тут — від найчастішого.'),
    rows('outgoing', 'Вихідні дзвінки за типами', 'Сума цих рядків = «Вихідні дзвінки».'),
  ],
}
