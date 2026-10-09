import fs from 'fs'
import path from 'path'
import type { Payload } from 'payload'

// «Статистика гарячих ліній» з Google-форми.
// Відповіді форми потрапляють у Google-таблицю; таблицю публікують в інтернеті (CSV). Сайт раз на 15 хвилин
// (і за кнопкою «Оновити зараз» в адмінці) бере ОСТАННЮ відповідь і зберігає цифри як ЧЕРНЕТКУ «Статистики
// гарячих ліній» — на сайт вони потрапляють, коли хтось в адмінці натисне «Опублікувати».
// Стовпці таблиці (питання форми) зіставляються з полями за назвою: «Станом на», «Зареєстровано звернень»,
// «Звернень через месенджери» і назви категорій — такі самі, як в адмінці. Назви категорій і переклади
// лишаються в адмінці, з форми беруться лише числа й дата.

const STATE_FILE = path.join(process.cwd(), 'logs', 'sheet-sync.json')
const EVERY = 15 * 60 * 1000

export type SyncState = {
  checkedAt?: string // коли сайт востаннє перевіряв таблицю
  ok?: boolean
  message?: string
  responseKey?: string // остання оброблена відповідь (позначка часу з таблиці)
  responseAt?: string // позначка часу останньої відповіді — як у таблиці
  draftAt?: string // коли з неї востаннє створено чернетку
  changes?: string[] // що змінилось в останній чернетці
  unmatched?: string[] // стовпці таблиці, яким не знайшлося поля
  running?: boolean
}

let state: SyncState = (() => {
  try {
    return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8')) as SyncState
  } catch {
    return {}
  }
})()
const save = (patch: SyncState) => {
  state = { ...state, ...patch }
  try {
    fs.mkdirSync(path.dirname(STATE_FILE), { recursive: true, mode: 0o700 })
    fs.writeFileSync(STATE_FILE, JSON.stringify({ ...state, running: false }))
  } catch {}
}
export const getSyncState = (): SyncState => state

// Лише таблиці Google (захист: сервер не має ходити на довільні адреси з адмінки)
export const toCsvUrl = (raw: string): string | null => {
  let u: URL
  try {
    u = new URL(raw.trim())
  } catch {
    return null
  }
  if (u.protocol !== 'https:' || u.hostname !== 'docs.google.com' || !u.pathname.startsWith('/spreadsheets/d/')) return null
  // «Файл → Поділитися → Опублікувати в інтернеті» → …/d/e/<id>/pub?output=csv (або pubhtml)
  if (u.pathname.startsWith('/spreadsheets/d/e/')) {
    u.pathname = u.pathname.replace(/\/pub(html)?$/, '/pub')
    if (!u.pathname.endsWith('/pub')) u.pathname = u.pathname.replace(/\/+$/, '') + '/pub'
    u.searchParams.set('output', 'csv')
    u.hash = ''
    return u.toString()
  }
  // звичайне посилання на таблицю (доступ «усі, хто має посилання») → експорт аркуша в CSV
  const id = u.pathname.split('/')[3]
  if (!id) return null
  const gid = /gid=(\d+)/.exec(u.hash + u.search)?.[1]
  return `https://docs.google.com/spreadsheets/d/${encodeURIComponent(id)}/export?format=csv${gid ? `&gid=${gid}` : ''}`
}

// CSV → рядки (з лапками, комами й переносами всередині значень)
export const parseCsv = (text: string): string[][] => {
  const rows: string[][] = []
  let row: string[] = []
  let cell = ''
  let quoted = false
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') {
        cell += '"'
        i++
      } else if (ch === '"') quoted = false
      else cell += ch
    } else if (ch === '"') quoted = true
    else if (ch === ',') {
      row.push(cell)
      cell = ''
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++
      row.push(cell)
      rows.push(row)
      row = []
      cell = ''
    } else cell += ch
  }
  if (cell || row.length) {
    row.push(cell)
    rows.push(row)
  }
  return rows
}

// для порівняння назв: без регістру, лапок, розділових знаків і зайвих пробілів
const norm = (s: string) =>
  s
    .toLowerCase()
    .replace(/[’'`ʼ«»"“”„]/g, '')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()

// «1 234», «1234», «1 234,0» → 1234
const toNumber = (s: string): number | null => {
  const t = s.replace(/[\s  ]/g, '').replace(',', '.')
  if (!/^\d+(\.\d+)?$/.test(t)) return null
  return Math.round(Number(t))
}

// дата з форми: 09.10.2026 / 2026-10-09 / 10/9/2026 (англомовна таблиця) → ISO (полудень, щоб не «з'їхала» на день)
const toDate = (s: string): string | null => {
  const t = s.trim()
  let m = /^(\d{1,2})\.(\d{1,2})\.(\d{4})/.exec(t)
  if (m) return new Date(Date.UTC(+m[3], +m[2] - 1, +m[1], 12)).toISOString()
  m = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(t)
  if (m) return new Date(Date.UTC(+m[1], +m[2] - 1, +m[3], 12)).toISOString()
  m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})/.exec(t)
  if (m) return new Date(Date.UTC(+m[3], +m[1] - 1, +m[2], 12)).toISOString()
  return null
}

const fmt = (n?: number | null) => (n == null ? '—' : n.toLocaleString('uk-UA'))
const day = (iso?: string | null) => (iso ? new Date(iso).toLocaleDateString('uk-UA', { timeZone: 'UTC' }) : '—')

type Category = { id?: string | null; name: string; value: number }

let running = false

export const syncFromSheet = async (payload: Payload, { force = false } = {}): Promise<SyncState> => {
  if (running) return { ...state, running: true }
  running = true
  const checkedAt = new Date().toISOString()
  try {
    const stats = (await payload.findGlobal({ slug: 'stats', draft: true, locale: 'uk', depth: 0, overrideAccess: true })) as unknown as {
      sheetUrl?: string | null
      asOf?: string | null
      registered?: number | null
      messengers?: number | null
      categories?: Category[] | null
    }
    if (!stats.sheetUrl?.trim()) {
      save({ checkedAt, ok: false, message: 'Посилання на Google-таблицю не вказано.' })
      return state
    }
    const url = toCsvUrl(stats.sheetUrl)
    if (!url) {
      save({ checkedAt, ok: false, message: 'Це не посилання на Google-таблицю (має починатися з https://docs.google.com/spreadsheets/…).' })
      return state
    }

    const res = await fetch(url, { redirect: 'follow', signal: AbortSignal.timeout(20000), cache: 'no-store' })
    const text = await res.text()
    if (!res.ok || /^\s*<(!doctype|html)/i.test(text)) {
      save({
        checkedAt,
        ok: false,
        message: `Google не віддав таблицю (код ${res.status}). Перевірте, що таблицю опубліковано: «Файл → Поділитися → Опублікувати в інтернеті», формат CSV.`,
      })
      return state
    }
    if (text.length > 5_000_000) {
      save({ checkedAt, ok: false, message: 'Таблиця завелика (понад 5 МБ).' })
      return state
    }

    const rows = parseCsv(text).filter((r) => r.some((c) => c.trim()))
    if (rows.length < 2) {
      save({ checkedAt, ok: true, message: 'У таблиці ще немає відповідей.' })
      return state
    }
    const header = rows[0]
    const last = rows[rows.length - 1]

    const categories = (stats.categories || []).map((c) => ({ ...c }))
    const byName = new Map(categories.map((c) => [norm(c.name), c]))
    let asOf: string | null = null
    let registered: number | null = null
    let messengers: number | null = null
    let responseAt = ''
    const found = new Map<Category, number>()
    const unmatched: string[] = []

    header.forEach((title, i) => {
      const h = norm(title)
      const value = (last[i] || '').trim()
      if (!h) return
      if (/^(позначка часу|timestamp|отметка времени)/.test(h)) responseAt = value
      else if (/^(станом|дата)/.test(h)) asOf = toDate(value)
      else if (/зареєстр/.test(h)) registered = toNumber(value)
      else if (/месендж/.test(h)) messengers = toNumber(value)
      else if (/^(прийнято|всього|загалом|разом)/.test(h)) return // загальну кількість сайт рахує сам
      else {
        const cat = byName.get(h) || categories.find((c) => norm(c.name).length > 5 && (h.startsWith(norm(c.name)) || norm(c.name).startsWith(h)))
        const n = toNumber(value)
        if (cat && n != null) found.set(cat, n)
        else if (value) unmatched.push(title.trim())
      }
    })

    const responseKey = responseAt || JSON.stringify(last)
    if (!force && state.responseKey === responseKey) {
      save({ checkedAt, ok: true, message: 'Нових відповідей у формі немає.', unmatched })
      return state
    }

    // що змінилось порівняно з поточною версією (чернеткою або опублікованою)
    const changes: string[] = []
    for (const [cat, n] of found) {
      if (cat.value !== n) changes.push(`${cat.name}: ${fmt(cat.value)} → ${fmt(n)}`)
      cat.value = n
    }
    if (registered != null && registered !== stats.registered) changes.push(`Зареєстровано звернень: ${fmt(stats.registered)} → ${fmt(registered)}`)
    if (messengers != null && messengers !== stats.messengers) changes.push(`Через месенджери: ${fmt(stats.messengers)} → ${fmt(messengers)}`)
    if (asOf && day(asOf) !== day(stats.asOf)) changes.push(`Станом на: ${day(stats.asOf)} → ${day(asOf)}`)

    if (!changes.length) {
      save({ checkedAt, ok: true, responseKey, responseAt, message: 'Остання відповідь форми збігається з цифрами на сайті — змін немає.', changes: [], unmatched })
      return state
    }

    await payload.updateGlobal({
      slug: 'stats',
      locale: 'uk',
      draft: true,
      depth: 0,
      overrideAccess: true,
      data: {
        categories: categories.map((c) => ({ id: c.id, name: c.name, value: c.value })),
        ...(registered != null ? { registered } : {}),
        ...(messengers != null ? { messengers } : {}),
        ...(asOf ? { asOf } : {}),
      } as never,
    })
    save({
      checkedAt,
      ok: true,
      responseKey,
      responseAt,
      draftAt: checkedAt,
      changes,
      unmatched,
      message: 'Нові цифри з форми збережено як чернетку. Перевірте їх і натисніть «Опублікувати».',
    })
    return state
  } catch (e) {
    save({ checkedAt, ok: false, message: `Не вдалося оновити: ${(e as Error).message}` })
    return state
  } finally {
    running = false
  }
}

// Перевірка раз на 15 хвилин — запускається разом із сайтом (instrumentation.ts)
export const startSheetSync = () => {
  const g = globalThis as { __nartuSheetSync?: boolean }
  if (g.__nartuSheetSync) return
  g.__nartuSheetSync = true
  const tick = async () => {
    try {
      const { getPayload } = await import('payload')
      const config = (await import('@/payload.config')).default
      const payload = await getPayload({ config: await config })
      const stats = (await payload.findGlobal({ slug: 'stats', depth: 0, draft: true, overrideAccess: true })) as { sheetUrl?: string | null }
      if (stats.sheetUrl?.trim()) await syncFromSheet(payload)
    } catch {}
  }
  setTimeout(tick, 60_000)
  setInterval(tick, EVERY)
}
