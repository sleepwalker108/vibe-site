import fs from 'fs'
import path from 'path'
import type { Payload } from 'payload'
import { regionName } from '../data/regionNames'

// Статистика з Google-форми — ВРУЧНУ: «Статистика гарячих ліній», «Річний звіт гарячих ліній», «Мапа: статуси територій».
// Відповіді форми потрапляють у Google-таблицю (доступ «усі, хто має посилання»). Коли в адмінці відкривають
// розділ, сайт читає таблицю й показує ОСТАННЮ відповідь: що в ній змінилося порівняно з цифрами в адмінці.
// Цифри переносяться лише кнопкою «Перенести» — як чернетка; на сайт вони потрапляють після «Опублікувати».
// Останнє перенесення можна скасувати. Сам сайт нічого не оновлює.
// Питання форми зіставляються з полями за назвою (без регістру, лапок і розділових знаків):
//   • дати й окремі числа — за назвою поля або ключовими словами (SPECS нижче);
//   • рядки списків — за назвою рядка, як в адмінці; для річного звіту з префіксом списку: «Канали: Месенджери»;
//   • таблиці «рядок × стовпець» (мапа) — «Донецька область: Активних бойових дій».
// Назви рядків і переклади лишаються в адмінці, з форми беруться лише числа й дати.

type Field = { field: string; label: string; match?: RegExp } // field може бути «група.поле»; без match — збіг за назвою
type List = { field: string; label: string; prefix?: string } // рядки «назва + кількість»; prefix — питання «Префікс: назва»
type Matrix = { field: string; rowName: (row: Record<string, unknown>) => string; columns: { field: string; label: string }[] }
type Spec = {
  dates: Field[]
  numbers: Field[]
  arrays: List[]
  matrix?: Matrix[]
  ignore?: RegExp // підсумки, які сайт рахує сам
}

const STATUSES = [
  { field: 'possible', label: 'Можливих бойових дій' },
  { field: 'eres', label: 'Активних бойових дій (з е-ресурсами)' },
  { field: 'active', label: 'Активних бойових дій' },
  { field: 'occupied', label: 'Тимчасово окуповані' },
]
const regionTitle = (row: Record<string, unknown>) => {
  const name = regionName(row.region as string) || String(row.region || '')
  return /крим/i.test(name) ? name : `${name} область`
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
  territories: {
    dates: [],
    // громади (ТГ) за статусами: «Громади (ТГ): Можливих бойових дій»
    numbers: STATUSES.map((s) => ({ field: `communities.${s.field}`, label: `Громади (ТГ): ${s.label}` })),
    arrays: [],
    // населені пункти (НП) за статусами по кожній області зі списку в адмінці
    matrix: [{ field: 'regions', rowName: regionTitle, columns: STATUSES }],
    ignore: /^(всього|загалом|разом)/,
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
  if (u.protocol !== 'https:') return null
  // Google-скрипт (deploy/google-form.gs, функція siteLinks): віддає відповіді закритої таблиці за секретним ключем
  if (u.hostname === 'script.google.com' && /^\/macros\/s\/[\w-]+\/exec$/.test(u.pathname)) return u.toString()
  if (u.hostname !== 'docs.google.com' || !u.pathname.startsWith('/spreadsheets/d/')) return null
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
const matrixRows = (doc: Doc, field: string) => ((doc[field] as Record<string, unknown>[] | null) || []).map((r) => ({ ...r }))
// «група.поле» → значення
const getPath = (doc: Doc, p: string) => p.split('.').reduce<unknown>((o, k) => (o && typeof o === 'object' ? (o as Record<string, unknown>)[k] : undefined), doc)
const groupOf = (p: string) => (p.includes('.') ? p.split('.')[0] : null)

// Питання форми — у тому порядку, як поля в адмінці
const questionsOf = (spec: Spec, doc: Doc) => [
  ...spec.dates.map((d) => `${d.label} (дата)`),
  ...spec.arrays.flatMap((a) => rowsOf(doc, a.field).map((r) => (a.prefix ? `${a.prefix}: ${r.name}` : r.name))),
  ...spec.numbers.map((n) => n.label),
  ...(spec.matrix || []).flatMap((m) => matrixRows(doc, m.field).flatMap((r) => m.columns.map((c) => `${m.rowName(r)}: ${c.label}`))),
]

const loadDoc = async (payload: Payload, slug: SheetSlug) =>
  (await payload.findGlobal({ slug, draft: true, locale: 'uk', depth: 0, overrideAccess: true })) as unknown as Doc

// Поля, які перенесення може змінити, — у вигляді для збереження (групи — цілком, списки — усі рядки)
const snapshot = (spec: Spec, doc: Doc) => {
  const out: Record<string, unknown> = {}
  for (const a of spec.arrays) out[a.field] = rowsOf(doc, a.field)
  for (const m of spec.matrix || []) out[m.field] = matrixRows(doc, m.field)
  for (const f of [...spec.numbers, ...spec.dates]) {
    const g = groupOf(f.field)
    if (g) out[g] = { ...((doc[g] as object) || {}) }
    else out[f.field] = doc[f.field] ?? null
  }
  return out
}

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
      message: /script\.google\.com/.test(url)
        ? `Google-скрипт не віддав відповіді (код ${res.status}). Перевірте, що скрипт розгорнуто як веб-застосунок з доступом «Усі» (Anyone), і скопіюйте посилання ще раз (функція siteLinks).`
        : `Google не віддав таблицю (код ${res.status}). Перевірте доступ до таблиці: «Поділитися» → «Усі, хто має посилання» (читач) — або підключіть закриту таблицю через Google-скрипт (функція siteLinks).`,
    }
  // відмова самого скрипта (неправильний ключ, таблицю не знайдено) — він відповідає «ПОМИЛКА: …»
  if (/^ПОМИЛКА:/.test(text.trim())) return { ok: false, questions, message: `Google-скрипт: ${text.trim().slice(9, 300)}` }
  if (text.length > 5_000_000) return { ok: false, questions, message: 'Таблиця завелика (понад 5 МБ).' }

  const rows = parseCsv(text).filter((r) => r.some((c) => c.trim()))
  if (rows.length < 2) return { ok: true, questions, message: 'У формі ще немає відповідей.', responses: 0 }
  const header = rows[0]
  const last = rows[rows.length - 1]

  const data = snapshot(spec, doc) // сюди записуємо нові значення
  const arrays = spec.arrays.map((a) => ({ ...a, rows: data[a.field] as Row[], p: a.prefix ? norm(a.prefix) : '' }))
  const matrices = (spec.matrix || []).map((m) => ({ ...m, rows: data[m.field] as Record<string, unknown>[] }))
  const similar = (a: string, b: string) => a === b || (b.length > 5 && a.startsWith(b)) || (a.length > 5 && b.startsWith(a))
  const findRow = (list: Row[], h: string) => list.find((r) => norm(r.name) === h) || list.find((r) => similar(h, norm(r.name)))

  const changes: NonNullable<SheetPreview['changes']> = []
  const unmatched: string[] = []
  let responseAt = ''
  const setNumber = (label: string, from: unknown, to: number, write: () => void) => {
    if (from !== to) changes.push({ label, from: fmt(from as number | null), to: fmt(to) })
    write()
  }

  header.forEach((title, i) => {
    const h = norm(title)
    const value = (last[i] || '').trim()
    if (!h) return
    if (/^(позначка часу|timestamp|отметка времени)/.test(h)) {
      responseAt = value
      return
    }
    const n = toNumber(value)
    const colon = title.indexOf(':')
    if (colon > 0) {
      const left = norm(title.slice(0, colon))
      const right = norm(title.slice(colon + 1))
      // «Префікс: назва рядка» — списки річного звіту
      const list = arrays.find((a) => a.p && a.p === left)
      if (list) {
        const row = findRow(list.rows, right)
        if (row && n != null) setNumber(title.trim(), row.value, n, () => (row.value = n))
        else if (value) unmatched.push(title.trim())
        return
      }
      // «Рядок: стовпець» — таблиця мапи (область: статус)
      for (const m of matrices) {
        const row = m.rows.find((r) => similar(left, norm(m.rowName(r))))
        const col = m.columns.find((c) => norm(c.label) === right)
        if (row && col) {
          if (n != null) setNumber(`${m.rowName(row)}: ${col.label}`, row[col.field], n, () => (row[col.field] = n))
          else if (value) unmatched.push(title.trim())
          return
        }
      }
    }
    if (spec.ignore?.test(h)) return
    const d = spec.dates.find((x) => (x.match ? x.match.test(h) : norm(x.label) === h))
    if (d) {
      const iso = toDate(value)
      if (iso && day(iso) !== day(doc[d.field] as string | null)) changes.push({ label: d.label, from: day(doc[d.field] as string | null), to: day(iso) })
      if (iso) data[d.field] = iso
      return
    }
    const nf = spec.numbers.find((x) => (x.match ? x.match.test(h) : norm(x.label) === h))
    if (nf) {
      if (n == null) return
      const g = groupOf(nf.field)
      setNumber(nf.label, getPath(doc, nf.field), n, () => {
        if (g) (data[g] as Record<string, unknown>)[nf.field.split('.')[1]] = n
        else data[nf.field] = n
      })
      return
    }
    // рядки списків без префікса
    for (const a of arrays.filter((x) => !x.p)) {
      const row = findRow(a.rows, h)
      if (row && n != null) {
        setNumber(row.name, row.value, n, () => (row.value = n))
        return
      }
    }
    if (value) unmatched.push(title.trim())
  })

  return {
    ok: true,
    questions,
    responseAt,
    responses: rows.length - 1,
    changes,
    unmatched,
    message: changes.length ? 'В останній відповіді форми є нові цифри.' : 'Остання відповідь форми збігається з цифрами в адмінці — переносити нічого.',
    data,
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
    const before = snapshot(SPECS[slug], await loadDoc(payload, slug))
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
