// Одноразово: 8 відео зі сторінки «Відеоматеріали» старого сайту.
// Поки що відео відтворюються зі старого сервера (посиланням). Під час переїзду на свій сервер
// файли варто завантажити в медіатеку й перемкнути «Звідки відео» на «Файл».
import { getPayload } from 'payload'
import config from '../payload.config'

const payload = await getPayload({ config: await config })
const BASE = 'https://dp-reintegration.gov.ua/wp-content/uploads/'

const videos: [string, string, string][] = [
  ['Евакуація: шлях до безпеки та підтримки', '2026/08/Evacuation_45_N.mp4', 'Evacuation: the path to safety and support'],
  ['Основна діяльність гарячої лінії 1548', '2024/11/Video-1548.mp4', 'Main activities of the 1548 hotline'],
  ['Контакт-центр 1548', '2023/12/Мульт-Гаряча-лінія-1.mp4', 'Contact centre 1548'],
  ['В гостях у 1548', '2024/10/minreintegration-2.mp4', 'Visiting 1548'],
  ['Основна діяльність гарячої лінії 1648', '2024/11/Video-1648.mp4', 'Main activities of the 1648 hotline'],
  ['1548 – допомога/підтримка', '2023/12/Мульт-Гаряча-лінія-2.mp4', '1548 – help and support'],
  ['Програма «Прихисток»', '2024/02/Прихисток.mp4', '“Prykhystok” programme'],
  ['Найпоширеніші питання ВПО', '2025/01/Дизайн-без-назви-1.mp4', 'Most common questions from IDPs'],
]

// Порядок на сторінці — як на старому сайті: робимо дати за спаданням
const start = Date.UTC(2026, 8, 1)
for (const [i, [title, file, titleEn]] of videos.entries()) {
  const url = BASE + file.split('/').map(encodeURIComponent).join('/')
  const exists = await payload.count({ collection: 'videos', where: { url: { equals: url } } })
  if (exists.totalDocs) continue
  const doc = await payload.create({
    collection: 'videos',
    locale: 'uk',
    data: { title, source: 'link', url, publishedAt: new Date(start - i * 86400000).toISOString() },
  })
  await payload.update({ collection: 'videos', id: doc.id, locale: 'en', data: { title: titleEn } })
  payload.logger.info(`  ✓ ${title}`)
}

// Пункт меню «Відеоматеріали» → нова сторінка /video
const nav = await payload.findGlobal({ slug: 'navigation', depth: 0 })
await payload.updateGlobal({
  slug: 'navigation',
  data: {
    _status: 'published',
    items: (nav.items || []).map((i) => (i.url && decodeURIComponent(i.url) === '/відеоматеріали' ? { ...i, url: '/video' } : i)) as any,
  },
})
payload.logger.info('Готово: відео додано, меню оновлено')
process.exit(0)
