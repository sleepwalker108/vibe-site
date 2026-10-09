import fs from 'fs'
import path from 'path'
import type { Payload } from 'payload'

// «Статистика гарячих ліній» з Google-форми — ВРУЧНУ.
// Відповіді форми потрапляють у Google-таблицю (доступ «усі, хто має посилання» або «Опублікувати в інтернеті»).
// Коли в адмінці відкривають «Статистику гарячих ліній», сайт читає таблицю й показує ОСТАННЮ відповідь:
// що в ній змінилося порівняно з цифрами на сайті. Цифри переносяться лише кнопкою «Перенести в статистику» —
// як чернетка; на сайт вони потрапляють після «Опублікувати». Сам сайт нічого не оновлює.
// Стовпці таблиці (питання форми) зіставляються з полями за назвою: «Станом на», «Зареєстровано звернень»,
// «Звернень через месенджери» і назви категорій — такі самі, як в адмінці. Назви категорій і переклади
// лишаються в адмінці, з форми беруться лише числа й дата.

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
type StatsDoc = {
  sheetUrl?: string | null
  asOf?: string | null
  registered?: number | null
  messengers?: number | null
  categories?: Category[] | null
}

export type SheetPreview = {
  ok: boolean
  message: string
  responseAt?: string // позначка часу останньої відповіді — як у таблиці
  responses?: number // скільки всього відповідей у таблиці
  changes?: { label: string; from: string; to: string }[] // що зміниться на сайті
  unmatched?: string[] // питання форми, яким не знайшлося поля
  applied?: boolean
  undo?: { at: string } // останнє перенесення можна скасувати (коли воно було)
  undone?: boolean
}

type Parsed = SheetPreview & { data?: Record<string, unknown> }

// Читає таблицю й готує зміни (нічого не записує)
const readSheet = async (payload: Payload): Promise<Parsed> => {
  const stats = (await payload.findGlobal({ slug: 'stats', draft: true, locale: 'uk', depth: 0, overrideAccess: true })) as unknown as StatsDoc
  if (!stats.sheetUrl?.trim()) return { ok: false, message: 'Посилання на Google-таблицю ще не вказано.' }
  const url = toCsvUrl(stats.sheetUrl)
  if (!url) return { ok: false, message: 'Це не посилання на Google-таблицю (має починатися з https://docs.google.com/spreadsheets/…).' }

  const res = await fetch(url, { redirect: 'follow', signal: AbortSignal.timeout(20000), cache: 'no-store' })
  const text = await res.text()
  if (!res.ok || /^\s*<(!doctype|html)/i.test(text))
    return {
      ok: false,
      message: `Google не віддав таблицю (код ${res.status}). Перевірте доступ до таблиці: «Поділитися» → «Усі, хто має посилання» (читач).`,
    }
  if (text.length > 5_000_000) return { ok: false, message: 'Таблиця завелика (понад 5 МБ).' }

  const rows = parseCsv(text).filter((r) => r.some((c) => c.trim()))
  if (rows.length < 2) return { ok: true, message: 'У формі ще немає відповідей.', responses: 0 }
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

  const changes: NonNullable<SheetPreview['changes']> = []
  for (const [cat, n] of found) {
    if (cat.value !== n) changes.push({ label: cat.name, from: fmt(cat.value), to: fmt(n) })
    cat.value = n
  }
  if (registered != null && registered !== stats.registered) changes.push({ label: 'Зареєстровано звернень', from: fmt(stats.registered), to: fmt(registered) })
  if (messengers != null && messengers !== stats.messengers) changes.push({ label: 'Звернень через месенджери', from: fmt(stats.messengers), to: fmt(messengers) })
  if (asOf && day(asOf) !== day(stats.asOf)) changes.push({ label: 'Станом на', from: day(stats.asOf), to: day(asOf) })

  return {
    ok: true,
    responseAt,
    responses: rows.length - 1,
    changes,
    unmatched,
    message: changes.length ? 'В останній відповіді форми є нові цифри.' : 'Остання відповідь форми збігається з цифрами в адмінці — переносити нічого.',
    data: {
      categories: categories.map((c) => ({ id: c.id, name: c.name, value: c.value })),
      ...(registered != null ? { registered } : {}),
      ...(messengers != null ? { messengers } : {}),
      ...(asOf ? { asOf } : {}),
    },
  }
}

const safe = async (fn: () => Promise<SheetPreview>): Promise<SheetPreview> => {
  try {
    return await fn()
  } catch (e) {
    return { ok: false, message: `Не вдалося прочитати таблицю: ${(e as Error).message}` }
  }
}

// «Скасувати перенесення»: перед перенесенням запам'ятовуємо цифри, які були (файл переживає перезапуск сайту)
const UNDO_FILE = path.join(process.cwd(), 'logs', 'stats-sheet-undo.json')
type Undo = { at: string; before: Record<string, unknown> }
const readUndo = (): Undo | null => {
  try {
    return JSON.parse(fs.readFileSync(UNDO_FILE, 'utf8')) as Undo
  } catch {
    return null
  }
}
const undoInfo = () => {
  const u = readUndo()
  return u ? { undo: { at: u.at } } : {}
}

// Показати останню відповідь форми і що зміниться (нічого не записує)
export const previewSheet = (payload: Payload) =>
  safe(async () => {
    const { data: _data, ...preview } = await readSheet(payload)
    return { ...preview, ...undoInfo() }
  })

// Перенести цифри з останньої відповіді в «Статистику гарячих ліній» — як чернетку
export const applySheet = (payload: Payload) =>
  safe(async () => {
    const { data, ...preview } = await readSheet(payload)
    if (!preview.ok || !data || !preview.changes?.length) return { ...preview, ...undoInfo() }
    // те, що зараз (чернетка або опубліковане), — щоб можна було повернути
    const cur = (await payload.findGlobal({ slug: 'stats', draft: true, locale: 'uk', depth: 0, overrideAccess: true })) as unknown as StatsDoc
    const before = {
      categories: (cur.categories || []).map((c) => ({ id: c.id, name: c.name, value: c.value })),
      registered: cur.registered ?? null,
      messengers: cur.messengers ?? null,
      asOf: cur.asOf ?? null,
    }
    fs.mkdirSync(path.dirname(UNDO_FILE), { recursive: true, mode: 0o700 })
    fs.writeFileSync(UNDO_FILE, JSON.stringify({ at: new Date().toISOString(), before } satisfies Undo))
    await payload.updateGlobal({ slug: 'stats', locale: 'uk', draft: true, depth: 0, overrideAccess: true, data: data as never })
    return {
      ...preview,
      ...undoInfo(),
      applied: true,
      message: 'Цифри з форми перенесено як чернетку. Перевірте їх і натисніть «Опублікувати» — або «Скасувати перенесення».',
    }
  })

// Скасувати останнє перенесення: повертаємо цифри, які були до нього (теж як чернетку)
export const undoSheet = (payload: Payload) =>
  safe(async () => {
    const u = readUndo()
    if (!u) return { ok: false, message: 'Немає перенесення, яке можна скасувати.' }
    await payload.updateGlobal({ slug: 'stats', locale: 'uk', draft: true, depth: 0, overrideAccess: true, data: u.before as never })
    fs.rmSync(UNDO_FILE, { force: true })
    // цифри вже повернуто; таблицю читаємо лише щоб показати, що в ній (якщо Google недоступний — не страшно)
    const { data: _data, ...preview } = await readSheet(payload).catch((): Parsed => ({ ok: true, message: '' }))
    return {
      ...preview,
      undone: true,
      message:
        'Перенесення скасовано — цифри повернуто, як були. Якщо перенесені цифри вже встигли опублікувати, натисніть «Опублікувати», щоб на сайті теж стали старі.',
    }
  })
