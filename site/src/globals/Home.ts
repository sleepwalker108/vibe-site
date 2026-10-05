import type { GlobalConfig } from 'payload'
import { isLoggedIn } from '../access'

// Іконки для карток і корисних ресурсів (малюються в components/ResourceIcon.tsx)
export const ICON_OPTIONS = [
  { label: 'Будівля (міністерство, установа)', value: 'building' },
  { label: 'Пошук людини (НІБ, зниклі)', value: 'search' },
  { label: 'Телефон (гаряча лінія)', value: 'phone' },
  { label: 'Серце (допомога, донати)', value: 'heart' },
  { label: 'Попередження (мінна безпека)', value: 'warning' },
  { label: 'Терези (юридична допомога)', value: 'scales' },
  { label: 'Дім (житло, прихисток)', value: 'home' },
  { label: 'Мапа (території)', value: 'map' },
  { label: 'Документ', value: 'document' },
  { label: 'Інформація', value: 'info' },
  { label: 'Глобус (інше)', value: 'globe' },
]

const link = (name: string, label: string) => ({
  name,
  type: 'group' as const,
  label,
  fields: [
    {
      type: 'row' as const,
      fields: [
        { name: 'label', type: 'text' as const, label: 'Текст кнопки', localized: true },
        { name: 'url', type: 'text' as const, label: 'Посилання', admin: { description: 'Напр.: tel:1548 або /news' } },
      ],
    },
  ],
})

export const Home: GlobalConfig = {
  slug: 'home',
  label: 'Головна сторінка',
  admin: {
    group: 'Сайт',
    livePreview: { url: '/?preview=1' },
  },
  versions: { drafts: { autosave: { interval: 400 } }, max: 50 },
  access: { read: () => true, update: isLoggedIn },
  fields: [
    {
      type: 'tabs',
      tabs: [
        {
          label: 'Перший екран',
          name: 'hero',
          fields: [
            { name: 'kicker', type: 'text', label: 'Надпис над назвою', localized: true },
            { name: 'title', type: 'text', label: 'Головний заголовок', localized: true },
            { name: 'text', type: 'textarea', label: 'Підзаголовок', localized: true },
            link('primary', 'Жовта кнопка'),
            link('secondary', 'Прозора кнопка'),
            {
              name: 'flagMode',
              type: 'radio',
              label: 'Фон першого екрана',
              defaultValue: 'animated',
              options: [
                { label: 'Намальований прапор (чіткий на будь-якому екрані)', value: 'animated' },
                { label: 'Відео прапора', value: 'video' },
              ],
            },
            {
              name: 'flagVideo',
              type: 'upload',
              relationTo: 'media',
              label: 'Відео прапора (MP4)',
              admin: {
                condition: (_, s) => s?.flagMode === 'video',
                description: 'Найкраще — 1920×1080 або 3840×2160 (4K), до 15 МБ, без звуку, із безшовним повтором.',
              },
            },
            {
              name: 'videoSpeed',
              type: 'number',
              label: 'Швидкість відео',
              defaultValue: 0.6,
              min: 0.1,
              max: 2,
              admin: {
                step: 0.05,
                condition: (_, s) => s?.flagMode === 'video',
                description: '1 — як у файлі. 0.5 — вдвічі повільніше.',
              },
            },
            {
              name: 'flagSpeed',
              type: 'number',
              label: 'Швидкість прапора',
              defaultValue: 0.32,
              min: 0,
              max: 2,
              admin: {
                step: 0.05,
                condition: (_, s) => s?.flagMode !== 'video',
                description: '0 — прапор нерухомий. 0.3 — повільно. 1 — швидко.',
              },
            },
          ],
        },
        {
          label: 'Гасло',
          name: 'statement',
          fields: [
            { name: 'title', type: 'textarea', label: 'Великий заголовок', localized: true },
            { name: 'text', type: 'textarea', label: 'Текст під ним', localized: true },
          ],
        },
        {
          label: 'Картки гарячих ліній',
          fields: [
            {
              name: 'cards',
              type: 'array',
              label: 'Картки',
              labels: { singular: 'Картка', plural: 'Картки' },
              admin: {
                description: 'Порядок можна змінювати перетягуванням.',
                components: { RowLabel: '/components/admin/CardRowLabel#CardRowLabel' },
              },
              fields: [
                {
                  type: 'row',
                  fields: [
                    {
                      name: 'color',
                      type: 'select',
                      label: 'Колір',
                      defaultValue: 'white',
                      options: [
                        { label: 'Синя', value: 'navy' },
                        { label: 'Жовта', value: 'yellow' },
                        { label: 'Блакитна', value: 'sky' },
                        { label: 'Біла', value: 'white' },
                      ],
                    },
                    {
                      name: 'size',
                      type: 'select',
                      label: 'Розмір',
                      defaultValue: 'normal',
                      options: [
                        { label: 'Велика (2×2)', value: 'big' },
                        { label: 'Широка (2×1)', value: 'wide' },
                        { label: 'Звичайна', value: 'normal' },
                      ],
                    },
                    { name: 'live', type: 'checkbox', label: 'Зелений вогник «працює зараз»' },
                    { name: 'icon', type: 'select', label: 'Іконка (необов’язково)', options: ICON_OPTIONS },
                  ],
                },
                { name: 'label', type: 'text', label: 'Малий надпис зверху', localized: true },
                { name: 'number', type: 'text', label: 'Велике число', admin: { description: 'Напр.: 1548 або 1,4 млн' } },
                { name: 'title', type: 'text', label: 'Заголовок', localized: true },
                { name: 'text', type: 'textarea', label: 'Опис', localized: true },
                {
                  name: 'chips',
                  type: 'array',
                  label: 'Плашки (телефони, боти)',
                  fields: [{ name: 'text', type: 'text', label: 'Текст', required: true, localized: true }],
                },
                {
                  type: 'row',
                  fields: [
                    { name: 'linkLabel', type: 'text', label: 'Текст посилання', localized: true },
                    { name: 'url', type: 'text', label: 'Посилання' },
                  ],
                },
              ],
            },
          ],
        },
        {
          label: 'Евакуація',
          name: 'evacuation',
          description: 'Блок поруч із великою карткою 1548: «Подзвоніть зараз та дізнайтеся все про виїзд».',
          fields: [
            { name: 'show', type: 'checkbox', label: 'Показувати блок', defaultValue: true },
            {
              type: 'row',
              fields: [
                { name: 'highlight', type: 'text', label: 'Заголовок: жовта частина', localized: true },
                { name: 'title', type: 'text', label: 'Заголовок: продовження', localized: true },
              ],
            },
            {
              name: 'steps',
              type: 'array',
              label: 'Кроки',
              labels: { singular: 'Крок', plural: 'Кроки' },
              maxRows: 6,
              admin: { description: 'Номери ставляться автоматично. Кожен новий рядок у тексті — окремий абзац.' },
              fields: [
                { name: 'title', type: 'text', label: 'Назва кроку', required: true, localized: true },
                { name: 'text', type: 'textarea', label: 'Текст', localized: true },
              ],
            },
            {
              type: 'row',
              fields: [
                { name: 'footer', type: 'text', label: 'Підпис унизу', localized: true },
                { name: 'footerHighlight', type: 'text', label: 'Підпис унизу: жовта частина', localized: true },
              ],
            },
          ],
        },
      ],
    },
  ],
}
