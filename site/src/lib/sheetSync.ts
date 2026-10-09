import fs from 'fs'
import path from 'path'
import type { Payload } from 'payload'

// Статистика з Google-форми — ВРУЧНУ: «Статистика гарячих ліній» і «Річний звіт гарячих ліній».
// Відповіді форми потрапляють у Google-таблицю (доступ «усі, хто має посилання»). Коли в адмінці відкривають
// розділ, сайт читає таблицю й показує ОСТАННЮ відповідь: що в ній змінилося порівняно з цифрами в адмінці.
// Цифри переносяться лише кнопкою «Перенести» — як чернетка; на сайт вони потрапляють після «Опублікувати».
// Останнє перенесення можна скасувати. Сам сайт нічого не оновлює.
// Питання форми зіставляються з полями за назвою (без регістру, лапок і розділових знаків):
//   • дати й окремі числа — за ключовими словами (SPECS нижче);
//   • рядки списків — за назвою рядка, як в адмінці; для річного звіту з префіксом списку: «Канали: Месенджери».
// Назви рядків і переклади лишаються в адмінці, з форми беруться лише числа й дати.

type Field = { field: string; label: string; match: RegExp }
type Spec = {
  dates: Field[]
  numbers: Field[]
  arrays: { field: string; label: string; prefix?: string }[] // prefix — питання «Префікс: назва рядка»
  ignore?: RegExp // підсумки, які сайт рахує сам
}

export const SPECS = {
  stats: {
    dates: [{ field: 'asOf', label: 'Станом на', match: /^(станом|дата)/ }],
    numbers: [
      { field: 'registered', label: 'Зареєстровано звернень', match: /зареєстр/ },
      { field: 'messengers', label: 'Звернень через месенджери', match: /месендж/ },
    ],
    arrays: [{ field: 'categories', label: 'Категорії' }],
    ignore: /^(прийнято|всього|загалом|разом)/,
  },
  'annual-report': {
    dates: [
      { field: 'periodFrom', label: 'Період: з', match: /^(період з|з дати|початок)/ },
      { field: 'periodTo', label: 'Період: по', match: /^(період по|по дату|кінець)/ },
    ],
    numbers: [
      { field: 'line1648', label: 'Звернень на гарячу лінію 1648', match: /1648/ },
      { field: 'sms', label: 'Інформаційна SMS-розсилка', match: /sms|смс/ },
    ],
    arrays: [
      { field: 'channels', label: 'Канали', prefix: 'Канали' },
      { field: 'topQuestions', label: 'Топ питань', prefix: 'Топ питань' },
      { field: 'outgoing', label: 'Вихідні', prefix: 'Вихідні' },
    ],
    ignore: /^(всього|загалом|разом|вхідні дзвінки|вихідні дзвінки)/,
  },
} satisfies Record<string, Spec>

export type SheetSlug = keyof typeof SPECS
export const isSheetSlug = (s: unknown): s is SheetSlug => typeof s === 'string' && Object.hasOwn(SPECS, s)

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

type Row = { id?: string | null; name: string; value: number }
type Doc = Record<string, unknown> & { sheetUrl?: string | null }

export type SheetPreview = {
  ok: boolean
  message: string
  questions?: string[] // точні назви питань для форми
  responseAt?: string // позначка часу останньої відповіді — як у таблиці
  responses?: number // скільки всього відповідей у таблиці
  changes?: { label: string; from: string; to: string }[] // що зміниться
  unmatched?: string[] // питання форми, яким не знайшлося поля
  applied?: boolean
  undo?: { at: string } // останнє перенесення можна скасувати (коли воно було)
  undone?: boolean
}
type Parsed = SheetPreview & { data?: Record<string, unknown> }

const rowsOf = (doc: Doc, field: string): Row[] => ((doc[field] as Row[] | null) || []).map((r) => ({ id: r.id, name: r.name, value: r.value }))

// Питання форми — у тому порядку, як поля в адмінці
const questionsOf = (spec: Spec, doc: Doc) => [
  ...spec.dates.map((d) => `${d.label} (дата)`),
  ...spec.arrays.flatMap((a) => rowsOf(doc, a.field).map((r) => (a.prefix ? `${a.prefix}: ${r.name}` : r.name))),
  ...spec.numbers.map((n) => n.label),
]

const loadDoc = async (payload: Payload, slug: SheetSlug) =>
  (await payload.findGlobal({ slug, draft: true, locale: 'uk', depth: 0, overrideAccess: true })) as unknown as Doc

// Читає таблицю й готує зміни (нічого не записує)
const readSheet = async (payload: Payload, slug: SheetSlug): Promise<Parsed> => {
  const spec: Spec = SPECS[slug]
  const doc = await loadDoc(payload, slug)
  const questions = questionsOf(spec, doc)
  if (!doc.sheetUrl?.trim()) return { ok: false, questions, message: 'Посилання на Google-таблицю ще не вказано.' }
  const url = toCsvUrl(doc.sheetUrl)
  if (!url) return { ok: false, questions, message: 'Це не посилання на Google-таблицю (має починатися з https://docs.google.com/spreadsheets/…).' }

  const res = await fetch(url, { redirect: 'follow', signal: AbortSignal.timeout(20000), cache: 'no-store' })
  const text = await res.text()
  if (!res.ok || /^\s*<(!doctype|html)/i.test(text))
    return {
      ok: false,
      questions,
      message: `Google не віддав таблицю (код ${res.status}). Перевірте доступ до таблиці: «Поділитися» → «Усі, хто має посилання» (читач).`,
    }
  if (text.length > 5_000_000) return { ok: false, questions, message: 'Таблиця завелика (понад 5 МБ).' }

  const rows = parseCsv(text).filter((r) => r.some((c) => c.trim()))
  if (rows.length < 2) return { ok: true, questions, message: 'У формі ще немає відповідей.', responses: 0 }
  const header = rows[0]
  const last = rows[rows.length - 1]

  const arrays = spec.arrays.map((a) => ({ ...a, rows: rowsOf(doc, a.field), p: a.prefix ? norm(a.prefix) : '' }))
  const findRow = (list: Row[], h: string) =>
    list.find((r) => norm(r.name) === h) || list.find((r) => norm(r.name).length > 5 && (h.startsWith(norm(r.name)) || norm(r.name).startsWith(h)))

  const dates: Record<string, string> = {}
  const numbers: Record<string, number> = {}
  const found = new Map<Row, number>()
  const unmatched: string[] = []
  let responseAt = ''

  header.forEach((title, i) => {
    const h = norm(title)
    const value = (last[i] || '').trim()
    if (!h) return
    if (/^(позначка часу|timestamp|отметка времени)/.test(h)) {
      responseAt = value
      return
    }
    // «Префікс: назва рядка»
    const colon = title.indexOf(':')
    if (colon > 0) {
      const p = norm(title.slice(0, colon))
      const list = arrays.find((a) => a.p && a.p === p)
      if (list) {
        const row = findRow(list.rows, norm(title.slice(colon + 1)))
        const n = toNumber(value)
        if (row && n != null) found.set(row, n)
        else if (value) unmatched.push(title.trim())
        return
      }
    }
    if (spec.ignore?.test(h)) return
    const d = spec.dates.find((x) => x.match.test(h))
    if (d) {
      const iso = toDate(value)
      if (iso) dates[d.field] = iso
      return
    }
    const nf = spec.numbers.find((x) => x.match.test(h))
    if (nf) {
      const n = toNumber(value)
      if (n != null) numbers[nf.field] = n
      return
    }
    // рядки списків без префікса
    for (const a of arrays.filter((x) => !x.p)) {
      const row = findRow(a.rows, h)
      const n = toNumber(value)
      if (row && n != null) {
        found.set(row, n)
        return
      }
    }
    if (value) unmatched.push(title.trim())
  })

  const changes: NonNullable<SheetPreview['changes']> = []
  for (const a of arrays)
    for (const r of a.rows) {
      const n = found.get(r)
      if (n == null) continue
      if (r.value !== n) changes.push({ label: a.prefix ? `${a.prefix}: ${r.name}` : r.name, from: fmt(r.value), to: fmt(n) })
      r.value = n
    }
  for (const nf of spec.numbers) {
    const n = numbers[nf.field]
    if (n != null && n !== doc[nf.field]) changes.push({ label: nf.label, from: fmt(doc[nf.field] as number | null), to: fmt(n) })
  }
  for (const d of spec.dates) {
    const iso = dates[d.field]
    if (iso && day(iso) !== day(doc[d.field] as string | null)) changes.push({ label: d.label, from: day(doc[d.field] as string | null), to: day(iso) })
  }

  return {
    ok: true,
    questions,
    responseAt,
    responses: rows.length - 1,
    changes,
    unmatched,
    message: changes.length ? 'В останній відповіді форми є нові цифри.' : 'Остання відповідь форми збігається з цифрами в адмінці — переносити нічого.',
    data: {
      ...Object.fromEntries(arrays.map((a) => [a.field, a.rows])),
      ...numbers,
      ...dates,
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
const undoFile = (slug: SheetSlug) => path.join(process.cwd(), 'logs', `${slug}-sheet-undo.json`)
type Undo = { at: string; before: Record<string, unknown> }
const readUndo = (slug: SheetSlug): Undo | null => {
  try {
    return JSON.parse(fs.readFileSync(undoFile(slug), 'utf8')) as Undo
  } catch {
    return null
  }
}
const undoInfo = (slug: SheetSlug) => {
  const u = readUndo(slug)
  return u ? { undo: { at: u.at } } : {}
}

// Показати останню відповідь форми і що зміниться (нічого не записує)
export const previewSheet = (payload: Payload, slug: SheetSlug) =>
  safe(async () => {
    const { data: _data, ...preview } = await readSheet(payload, slug)
    return { ...preview, ...undoInfo(slug) }
  })

// Перенести цифри з останньої відповіді — як чернетку
export const applySheet = (payload: Payload, slug: SheetSlug) =>
  safe(async () => {
    const { data, ...preview } = await readSheet(payload, slug)
    if (!preview.ok || !data || !preview.changes?.length) return { ...preview, ...undoInfo(slug) }
    // те, що зараз (чернетка або опубліковане), — щоб можна було повернути
    const spec: Spec = SPECS[slug]
    const cur = await loadDoc(payload, slug)
    const before = Object.fromEntries([
      ...spec.arrays.map((a) => [a.field, rowsOf(cur, a.field)]),
      ...[...spec.numbers, ...spec.dates].map((f) => [f.field, cur[f.field] ?? null]),
    ])
    fs.mkdirSync(path.dirname(undoFile(slug)), { recursive: true, mode: 0o700 })
    fs.writeFileSync(undoFile(slug), JSON.stringify({ at: new Date().toISOString(), before } satisfies Undo))
    await payload.updateGlobal({ slug, locale: 'uk', draft: true, depth: 0, overrideAccess: true, data: data as never })
    return {
      ...preview,
      ...undoInfo(slug),
      applied: true,
      message: 'Цифри з форми перенесено як чернетку. Перевірте їх і натисніть «Опублікувати» — або «Скасувати перенесення».',
    }
  })

// Скасувати останнє перенесення: повертаємо цифри, які були до нього (теж як чернетку)
export const undoSheet = (payload: Payload, slug: SheetSlug) =>
  safe(async () => {
    const u = readUndo(slug)
    if (!u) return { ok: false, message: 'Немає перенесення, яке можна скасувати.' }
    await payload.updateGlobal({ slug, locale: 'uk', draft: true, depth: 0, overrideAccess: true, data: u.before as never })
    fs.rmSync(undoFile(slug), { force: true })
    // цифри вже повернуто; таблицю читаємо лише щоб показати, що в ній (якщо Google недоступний — не страшно)
    const { data: _data, ...preview } = await readSheet(payload, slug).catch((): Parsed => ({ ok: true, message: '' }))
    return {
      ...preview,
      undone: true,
      message:
        'Перенесення скасовано — цифри повернуто, як були. Якщо перенесені цифри вже встигли опублікувати, натисніть «Опублікувати», щоб на сайті теж стали старі.',
    }
  })
