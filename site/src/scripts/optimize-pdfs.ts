// Усі PDF медіатеки — «швидкий веб-перегляд» (перша сторінка відкривається одразу) і стиснення службових даних.
// Нові PDF оптимізуються самі після завантаження; це — для тих, що вже є.
//
//   На сервері:  sudo nartu-task optimize-pdfs
//
// Зміст і вигляд документів не змінюються. Повторний запуск безпечний: уже оптимізовані файли пропускаються.
import { getPayload } from 'payload'
import config from '../payload.config'
import { optimizePdf, qpdf } from '../lib/pdfOptimize'

const payload = await getPayload({ config: await config })
const log = (m: string) => payload.logger.info(m)

if (!qpdf()) {
  payload.logger.error('Не знайдено програму qpdf. Встановіть:  sudo apt install -y qpdf  (або оновіть сервер: sudo nartu-update)')
  process.exit(1)
}

const { docs } = await payload.find({
  collection: 'media',
  where: { mimeType: { equals: 'application/pdf' } },
  limit: 0,
  pagination: false,
  depth: 0,
  overrideAccess: true,
})
log(`PDF у медіатеці: ${docs.length}`)

let done = 0
let before = 0
let after = 0
let failed = 0
for (const d of docs as { id: number; filename?: string }[]) {
  if (!d.filename) continue
  try {
    const r = await optimizePdf(payload, { id: d.id, filename: d.filename })
    before += r.before
    after += r.after
    if (r.before !== r.after || r.action === 'швидкий веб-перегляд') done++
    log(`  ${r.action === 'уже оптимальний' ? '·' : '✓'} ${d.filename} — ${r.action}, ${(r.before / 1e6).toFixed(1)} → ${(r.after / 1e6).toFixed(1)} МБ`)
  } catch (e) {
    failed++
    payload.logger.error(`  ✗ ${d.filename}: ${(e as Error).message}`)
  }
}
log(`Готово: оптимізовано ${done}, з помилками ${failed}. Разом ${(before / 1e6).toFixed(1)} → ${(after / 1e6).toFixed(1)} МБ`)
process.exit(0)
