// Перенесення файлів зі старого сайту (dp-reintegration.gov.ua/wp-content/uploads/…) у медіатеку нового:
//  • документи, на які посилаються сторінки й новини (PDF, Word, Excel, картинки) — посилання замінюються на нові;
//  • відео (розділ «Відео»), що відтворювалися зі старого сайту, — стають файлами медіатеки.
// Файл береться з розпакованого архіву старого сайту (папка wp-uploads), а якщо його там немає — завантажується зі старого сайту.
// Запускається кнопкою в адмінці («Стан сервера»), працює у фоні; повторний запуск безпечний.
import fs from 'fs'
import os from 'os'
import path from 'path'
import { pipeline } from 'stream/promises'
import { Readable } from 'stream'
import type { Payload } from 'payload'
import { SITE_DIR } from './backups'

const OLD = 'https://dp-reintegration.gov.ua'
const OLD_FILE = /^(?:https?:\/\/(?:www\.)?dp-reintegration\.gov\.ua)?\/wp-content\/uploads\/[^\s"'<>]+$/i
const UPLOADS_DIR = path.resolve(process.env.WP_UPLOADS || path.join(SITE_DIR, '..', 'wp-uploads'))
const CACHE_FILE = path.join(SITE_DIR, '.wp-import-cache.json') // спільний з імпортом новин: адреса старого файлу → id у медіатеці

const MIME: Record<string, string> = {
  pdf: 'application/pdf',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xls: 'application/vnd.ms-excel',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  gif: 'image/gif',
  webp: 'image/webp',
  mp4: 'video/mp4',
}

export type MigrationState = {
  running: boolean
  startedAt?: string
  finishedAt?: string
  stage: string
  total: number
  done: number
  copied: number // нових файлів у медіатеці
  reused: number // уже були в медіатеці
  fromArchive: number
  fromWeb: number
  docsUpdated: number // сторінок/новин, у яких замінено посилання
  videosUpdated: number
  failed: { url: string; reason: string }[]
}

let state: MigrationState = { running: false, stage: '', total: 0, done: 0, copied: 0, reused: 0, fromArchive: 0, fromWeb: 0, docsUpdated: 0, videosUpdated: 0, failed: [] }
export const getMigrationState = () => state

const keyOf = (raw: string) => {
  try {
    const u = new URL(raw, OLD)
    return `${OLD}${u.pathname}`
  } catch {
    return raw
  }
}
const readCache = (): Record<string, number> => {
  try {
    return JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8'))
  } catch {
    return {}
  }
}

// Файл старого сайту → id у медіатеці (з архіву або зі старого сайту)
const toMedia = async (payload: Payload, url: string, cache: Record<string, number>, alt: string): Promise<{ id: number; url: string } | null> => {
  const key = keyOf(url)
  if (cache[key]) {
    const doc = (await payload.findByID({ collection: 'media', id: cache[key], depth: 0, overrideAccess: true }).catch(() => null)) as { id: number; url: string } | null
    if (doc) {
      state.reused++
      return { id: doc.id, url: doc.url }
    }
  }
  const rel = decodeURIComponent(new URL(key).pathname.replace(/^\/wp-content\/uploads\//, ''))
  const name = path.basename(rel)
  const ext = (name.split('.').pop() || '').toLowerCase()
  const mimeType = MIME[ext]
  if (!mimeType) throw new Error(`формат .${ext} не підтримується`)

  let file = path.join(UPLOADS_DIR, rel)
  let tmp: string | null = null
  if (!file.startsWith(UPLOADS_DIR + path.sep) || !fs.existsSync(file)) {
    // немає в архіві — завантажуємо зі старого сайту у тимчасовий файл (великі відео — без завантаження в пам'ять)
    const r = await fetch(key, { signal: AbortSignal.timeout(15 * 60_000) })
    if (!r.ok || !r.body) throw new Error(r.status === 404 ? 'файлу немає й на старому сайті' : `старий сайт відповів ${r.status}`)
    tmp = path.join(os.tmpdir(), `nartu-${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`)
    await pipeline(Readable.fromWeb(r.body as any), fs.createWriteStream(tmp))
    file = tmp
    state.fromWeb++
  } else state.fromArchive++

  try {
    const doc = (await payload.create({
      collection: 'media',
      data: { alt: alt.slice(0, 250) || name },
      filePath: file,
      overrideAccess: true,
    })) as { id: number; url: string }
    cache[key] = doc.id
    fs.writeFileSync(CACHE_FILE, JSON.stringify(cache))
    state.copied++
    return { id: doc.id, url: doc.url }
  } finally {
    if (tmp) fs.rmSync(tmp, { force: true })
  }
}

// Усі адреси старих файлів у вмісті (посилання в тексті, поля блоків)
const collectUrls = (node: unknown, out: Map<string, string>) => {
  if (!node || typeof node !== 'object') return
  if (Array.isArray(node)) return node.forEach((n) => collectUrls(n, out))
  const o = node as Record<string, unknown>
  for (const [k, v] of Object.entries(o)) {
    if (k === 'url' && typeof v === 'string' && OLD_FILE.test(v.trim())) {
      const text = (o as any).text || ''
      if (!out.has(v.trim())) out.set(v.trim(), text)
    } else if (v && typeof v === 'object') collectUrls(v, out)
  }
}
const textOf = (n: any): string => (n?.text || '') + (n?.children || []).map(textOf).join('')
// підпис посилання — як «alt» файлу в медіатеці
const collectTitles = (node: any, out: Map<string, string>) => {
  if (!node || typeof node !== 'object') return
  if (Array.isArray(node)) return node.forEach((n) => collectTitles(n, out))
  if ((node.type === 'link' || node.type === 'autolink') && typeof node.fields?.url === 'string') {
    const u = node.fields.url.trim()
    if (OLD_FILE.test(u) && !out.get(u)) out.set(u, textOf(node).trim())
  }
  for (const v of Object.values(node)) if (v && typeof v === 'object') collectTitles(v, out)
}
const replaceUrls = (node: unknown, map: Map<string, string>): boolean => {
  let changed = false
  const walk = (n: unknown) => {
    if (!n || typeof n !== 'object') return
    if (Array.isArray(n)) return n.forEach(walk)
    const o = n as Record<string, unknown>
    for (const [k, v] of Object.entries(o)) {
      if (k === 'url' && typeof v === 'string' && map.has(v.trim())) {
        o[k] = map.get(v.trim())
        changed = true
      } else if (v && typeof v === 'object') walk(v)
    }
  }
  walk(node)
  return changed
}

export const startOldFilesMigration = (payload: Payload): MigrationState => {
  if (state.running) return state
  state = {
    running: true,
    startedAt: new Date().toISOString(),
    stage: 'Шукаю посилання на файли старого сайту…',
    total: 0,
    done: 0,
    copied: 0,
    reused: 0,
    fromArchive: 0,
    fromWeb: 0,
    docsUpdated: 0,
    videosUpdated: 0,
    failed: [],
  }
  run(payload)
    .catch((e) => {
      state.failed.push({ url: '—', reason: (e as Error).message })
      payload.logger.error(`Перенесення файлів старого сайту: ${(e as Error).message}`)
    })
    .finally(() => {
      state.running = false
      state.finishedAt = new Date().toISOString()
      state.stage = 'Готово'
      payload.logger.info(
        `Перенесення файлів старого сайту: нових ${state.copied}, уже були ${state.reused}, сторінок/новин оновлено ${state.docsUpdated}, відео ${state.videosUpdated}, помилок ${state.failed.length}`,
      )
    })
  return state
}

const run = async (payload: Payload) => {
  const cache = readCache()
  // 1) знайти всі документи з посиланнями на старі файли
  type Doc = { collection: 'pages' | 'news'; id: number; locale: 'uk' | 'en'; content: any }
  const docs: Doc[] = []
  const titles = new Map<string, string>()
  for (const collection of ['pages', 'news'] as const) {
    for (const locale of ['uk', 'en'] as const) {
      const { docs: found } = await payload.find({
        collection,
        limit: 0,
        pagination: false,
        depth: 0,
        locale,
        fallbackLocale: false,
        overrideAccess: true,
        select: { content: true },
      })
      for (const d of found as any[]) {
        if (!d.content) continue
        const urls = new Map<string, string>()
        collectUrls(d.content, urls)
        if (!urls.size) continue
        collectTitles(d.content, titles)
        docs.push({ collection, id: d.id, locale, content: d.content })
      }
    }
  }
  const videos = ((await payload.find({ collection: 'videos', limit: 0, pagination: false, depth: 0, overrideAccess: true, locale: 'uk' })).docs as any[]).filter(
    (v) => v.source !== 'file' && typeof v.url === 'string' && OLD_FILE.test(v.url.trim()),
  )
  const unique = new Set<string>()
  for (const d of docs) {
    const m = new Map<string, string>()
    collectUrls(d.content, m)
    m.forEach((_, u) => unique.add(u))
  }
  state.total = unique.size + videos.length

  // 2) перенести кожен файл один раз
  const map = new Map<string, string>()
  state.stage = 'Переношу документи…'
  for (const u of unique) {
    try {
      const media = await toMedia(payload, u, cache, titles.get(u) || '')
      if (media) map.set(u, media.url)
    } catch (e) {
      state.failed.push({ url: decodeURI(u), reason: (e as Error).message })
    }
    state.done++
  }

  // 3) замінити посилання в сторінках і новинах
  state.stage = 'Оновлюю посилання на сторінках і в новинах…'
  for (const d of docs) {
    if (!replaceUrls(d.content, map)) continue
    try {
      await payload.update({ collection: d.collection, id: d.id, locale: d.locale, data: { content: d.content } as any, overrideAccess: true })
      state.docsUpdated++
    } catch (e) {
      state.failed.push({ url: `${d.collection} #${d.id} (${d.locale})`, reason: (e as Error).message })
    }
  }

  // 4) відео — файлом з медіатеки
  state.stage = 'Переношу відео (великі файли — може тривати кілька хвилин)…'
  for (const v of videos) {
    try {
      const media = await toMedia(payload, v.url.trim(), cache, v.title || '')
      if (media) {
        await payload.update({ collection: 'videos', id: v.id, data: { source: 'file', file: media.id } as any, overrideAccess: true })
        state.videosUpdated++
      }
    } catch (e) {
      state.failed.push({ url: decodeURI(v.url), reason: (e as Error).message })
    }
    state.done++
  }
}
