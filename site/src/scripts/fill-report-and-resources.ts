// Одноразово: річний звіт 2025 (з інфографіки на старому сайті) + іконки корисних ресурсів
import { getPayload } from 'payload'
import config from '../payload.config'

const payload = await getPayload({ config: await config })

await payload.updateGlobal({
  slug: 'annual-report',
  data: {
    _status: 'published',
    show: true,
    periodFrom: '2025-01-01T12:00:00.000Z',
    periodTo: '2025-12-31T12:00:00.000Z',
    title: 'Річний звіт роботи гарячих ліній',
    subtitle: 'Підтримка громадян у кризових питаннях',
    channels: [
      { name: 'Гаряча лінія 15-48', value: 183146 },
      { name: 'Гаряча лінія Уповноваженого з питань ВПО', value: 71174 },
      { name: 'Месенджери', value: 51553 },
    ],
    line1648: 120677,
    sms: 3234,
    topQuestions: [
      { name: 'Грошова допомога ВПО', value: 170918 },
      { name: 'Консультація щодо Постанови КМУ №332', value: 24722 },
      { name: 'Контакти установ та організацій', value: 22994 },
      { name: 'Соціальні виплати', value: 14732 },
      { name: 'Інші питання', value: 24602 },
    ],
    outgoing: [
      { name: 'Перевірка установ', value: 19027 },
      { name: 'Додаткові консультації', value: 24157 },
      { name: 'Інше', value: 33509 },
    ],
  },
})

const meta: Record<string, { icon: string; description: string }> = {
  Мінрозвитку: { icon: 'building', description: 'Міністерство розвитку громад та територій' },
  'Національне інформаційне бюро': { icon: 'search', description: 'Пошук полонених, зниклих безвісти, депортованих' },
  'Портал 1548': { icon: 'phone', description: 'Вебпортал гарячої лінії 1548' },
  United24: { icon: 'heart', description: 'Офіційна платформа збору коштів' },
  'Мінна безпека': { icon: 'warning', description: 'Як поводитися з вибухонебезпечними предметами' },
  Прихисток: { icon: 'home', description: 'Компенсація за розміщення ВПО' },
}

const res = await payload.findGlobal({ slug: 'resources', depth: 0 })
await payload.updateGlobal({
  slug: 'resources',
  data: {
    _status: 'published',
    items: (res.items || []).map((r) => ({ ...r, ...(meta[r.label] || {}) })) as any,
  },
})

payload.logger.info('Готово: річний звіт заповнено, ресурсам додано іконки')
process.exit(0)
