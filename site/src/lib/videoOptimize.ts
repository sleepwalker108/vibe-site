// Оптимізація відео медіатеки для перегляду на сайті:
//  • завеликі відео (бітрейт понад 5 Мбіт/с або більше за 1080p) — перестискаються в H.264 до 1080p, ~4 Мбіт/с;
//  • «паспорт» відео (moov) переноситься на початок файлу — показ починається одразу, без завантаження всього файлу;
//  • для відео з розділу «Відео» без обкладинки робиться обкладинка з кадру (галерея не вантажить самі ролики).
// Працює у фоні, по одному відео. Запуск: кнопка в «Стані сервера» (усі відео) або автоматично після завантаження нового.
import { spawn, spawnSync } from 'child_process'
import { createRequire } from 'module'
import fs from 'fs'
import os from 'os'
import path from 'path'
import type { Payload } from 'payload'
import { SITE_DIR } from './backups'

const MEDIA_DIR = path.join(SITE_DIR, 'media')
const MAX_MBPS = 5 // вище — перестискаємо
const MAX_HEIGHT = 1080
const THREADS = Math.max(1, Math.floor(os.cpus().length / 2))

export type VideoItem = { name: string; before: number; after: number; action: string }
export type VideoState = {
  running: boolean
  startedAt?: string
  finishedAt?: string
  current?: string
  total: number
  done: number
  items: VideoItem[]
  failed: { name: string; reason: string }[]
}
let state: VideoState = { running: false, total: 0, done: 0, items: [], failed: [] }
export const getVideoState = () => state

// ---------- ffmpeg: системна (якщо встановлена) або з пакета проєкту ----------
let ffmpegBin: string | null = null
const ffmpeg = (): string => {
  if (ffmpegBin) return ffmpegBin
  if (process.env.FFMPEG_PATH) return (ffmpegBin = process.env.FFMPEG_PATH)
  if (spawnSync('ffmpeg', ['-version'], { stdio: 'ignore', windowsHide: true }).status === 0) return (ffmpegBin = 'ffmpeg')
  // пакет шукаємо від папки проєкту (не через збирач сайту — інакше шлях до програми був би неправильний)
  const p: string = createRequire(path.join(SITE_DIR, 'package.json'))('@ffmpeg-installer/ffmpeg').path
  try {
    fs.chmodSync(p, 0o755) // пакет може встановитися без прав на запуск
  } catch {}
  return (ffmpegBin = p)
}

const run = (args: string[]) =>
  new Promise<void>((resolve, reject) => {
    // Стиснення не має гальмувати сайт: ffmpeg бере не більше половини ядер і працює з найнижчим пріоритетом —
    // система дає йому процесор лише тоді, коли він не потрібен сайту (без цього адмінка «підвисала» на час стиснення)
    const p = spawn(ffmpeg(), ['-hide_banner', '-loglevel', 'error', '-threads', String(THREADS), ...args], { windowsHide: true })
    try {
      if (p.pid) os.setPriority(p.pid, os.constants.priority.PRIORITY_LOW)
    } catch {}
    let err = ''
    p.stderr.on('data', (d) => (err = (err + d).slice(-2000)))
    const timer = setTimeout(() => p.kill('SIGKILL'), 60 * 60_000)
    p.on('error', (e) => {
      clearTimeout(timer)
      reject(e)
    })
    p.on('close', (code) => {
      clearTimeout(timer)
      if (code === 0) resolve()
      else reject(new Error(err.trim().split('\n').pop() || `ffmpeg завершився з кодом ${code}`))
    })
  })

// ---------- будова mp4: де «паспорт», тривалість, роздільність ----------
type Info = { size: number; seconds: number; height: number; moovFirst: boolean; mbps: number }
export const analyze = (file: string): Info | null => {
  const size = fs.statSync(file).size
  const fd = fs.openSync(file, 'r')
  try {
    const order: string[] = []
    let pos = 0
    let moov: { pos: number; len: number } | null = null
    while (pos < size && order.length < 16) {
      const h = Buffer.alloc(16)
      fs.readSync(fd, h, 0, 16, pos)
      let len = h.readUInt32BE(0)
      const type = h.toString('latin1', 4, 8)
      if (len === 1) len = Number(h.readBigUInt64BE(8))
      if (len === 0) len = size - pos
      order.push(type)
      if (type === 'moov') moov = { pos, len }
      if (len < 8) break
      pos += len
    }
    if (!moov) return null
    const b = Buffer.alloc(Math.min(moov.len, 8_000_000))
    fs.readSync(fd, b, 0, b.length, moov.pos)
    let seconds = 0
    const mv = b.indexOf('mvhd')
    if (mv > 0) {
      const v1 = b[mv + 4] === 1
      const scale = v1 ? b.readUInt32BE(mv + 24) : b.readUInt32BE(mv + 16)
      const dur = v1 ? Number(b.readBigUInt64BE(mv + 28)) : b.readUInt32BE(mv + 20)
      seconds = scale ? dur / scale : 0
    }
    let height = 0
    for (let i = b.indexOf('tkhd'); i > 0 && !height; i = b.indexOf('tkhd', i + 1)) {
      const off = i + 4 + (b[i + 4] === 1 ? 88 : 76)
      if (off + 8 <= b.length) height = b.readUInt32BE(off + 4) >> 16
    }
    const mdat = order.indexOf('mdat')
    return { size, seconds, height, moovFirst: mdat < 0 || order.indexOf('moov') < mdat, mbps: seconds ? (size * 8) / seconds / 1e6 : 0 }
  } finally {
    fs.closeSync(fd)
  }
}

// ---------- одне відео ----------
const optimizeFile = async (payload: Payload, doc: { id: number; filename: string }) => {
  const file = path.join(MEDIA_DIR, doc.filename)
  if (!file.startsWith(MEDIA_DIR + path.sep) || !fs.existsSync(file)) throw new Error('файлу немає на диску')
  const info = analyze(file)
  if (!info) throw new Error('не вдалося прочитати будову файлу')
  const tmp = `${file}.opt.mp4`
  const heavy = info.mbps > MAX_MBPS || info.height > MAX_HEIGHT
  let action = ''
  try {
    if (heavy) {
      await run([
        '-y', '-i', file,
        '-map', '0:v:0', '-map', '0:a:0?',
        '-c:v', 'libx264', '-threads', String(THREADS), '-preset', 'fast', '-crf', '23', '-maxrate', '4000k', '-bufsize', '8000k',
        '-vf', `scale='min(1920,iw)':-2`, '-pix_fmt', 'yuv420p',
        '-c:a', 'aac', '-b:a', '128k',
        '-movflags', '+faststart', tmp,
      ])
      // стиснене має бути помітно менше — інакше лишаємо оригінал (лише з «паспортом» на початку)
      if (fs.statSync(tmp).size < info.size * 0.9) action = `стиснуто (${info.mbps.toFixed(0)} → ~4 Мбіт/с)`
      else fs.rmSync(tmp, { force: true })
    }
    if (!action && !info.moovFirst) {
      await run(['-y', '-i', file, '-map', '0', '-c', 'copy', '-movflags', '+faststart', tmp])
      action = 'швидкий старт (без втрати якості)'
    }
    if (!action) return { action: 'уже оптимальне', before: info.size, after: info.size }
    // підміна файлу: спершу старий — у резерв, потім новий на його місце
    const bak = `${file}.orig`
    fs.renameSync(file, bak)
    try {
      fs.renameSync(tmp, file)
      fs.rmSync(bak, { force: true })
    } catch (e) {
      fs.renameSync(bak, file)
      throw e
    }
    const after = fs.statSync(file).size
    await (payload.db as any).client.execute({ sql: 'UPDATE media SET filesize = ? WHERE id = ?', args: [after, doc.id] })
    return { action, before: info.size, after }
  } finally {
    fs.rmSync(tmp, { force: true })
  }
}

// ---------- кадр-картинка для мініатюр відео ----------
// Мініатюри відео в медіатеці, списках і галереї раніше були справжніми <video>. Браузер тримає для кожного
// відкрите з'єднання з сервером, поки вантажить початок ролика, а з'єднань до одного сайту лише 6 (HTTP/1.1).
// Кілька відео на сторінці займали всі — і перехід в інший розділ адмінки не мав чим піти, «зависав» і падав
// («Failed to fetch RSC payload»). Тепер замість відео показується звичайна картинка-кадр.
// Кадр робиться у фоні (ffmpeg, низький пріоритет, по одному): одразу після завантаження відео, після його
// стиснення і для всіх відео — після запуску сервера. Запит картинки ніколи не чекає на ffmpeg: якщо кадру ще
// немає, одразу віддається заглушка (інакше, поки кадри робляться, запити знову займали б усі з'єднання).
// Невдача теж запам'ятовується (файл .fail) — ffmpeg не запускається знову на кожен показ.
// Кадри лежать у .cache/video-frames як «назва-файлу-<час зміни>.jpg»; застарілі й «осиротілі» видаляються.
const FRAMES_DIR = path.join(SITE_DIR, '.cache', 'video-frames')
const FRAME_NAME = /^(.*)-(\d+)\.(jpg|fail)$/
const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

const frameFiles = (filename: string) => {
  const src = path.join(MEDIA_DIR, filename)
  try {
    const stem = path.join(FRAMES_DIR, `${filename}-${Math.round(fs.statSync(src).mtimeMs)}`)
    return { src, jpg: `${stem}.jpg`, fail: `${stem}.fail` }
  } catch {
    return null // такого файлу немає
  }
}

// Готовий кадр (шлях) — або null, якщо кадру ще немає чи його не вдалося зробити
export const cachedFrame = (filename: string): string | null => {
  const f = frameFiles(filename)
  return f && fs.existsSync(f.jpg) ? f.jpg : null
}

// прибрати кадри цього файлу, крім поточних (після перестискання відео в нього новий час зміни)
const pruneFrames = (filename: string, keep: string[]) => {
  const re = new RegExp(`^${escapeRe(filename)}-\\d+\\.(jpg|fail)$`)
  try {
    for (const n of fs.readdirSync(FRAMES_DIR)) if (re.test(n) && !keep.includes(path.join(FRAMES_DIR, n))) fs.rmSync(path.join(FRAMES_DIR, n), { force: true })
  } catch {}
}

const makeFrame = async (filename: string) => {
  const f = frameFiles(filename)
  if (!f || fs.existsSync(f.jpg) || fs.existsSync(f.fail)) return
  fs.mkdirSync(FRAMES_DIR, { recursive: true })
  const tmp = `${f.jpg}.${process.pid}.tmp.jpg`
  let ok = false
  // кадр на 1-й секунді; якщо ролик коротший — найперший
  for (const ss of ['1', '0']) {
    try {
      await run(['-y', '-ss', ss, '-i', f.src, '-frames:v', '1', '-vf', `scale='min(640,iw)':-2`, '-q:v', '4', tmp])
      if (fs.existsSync(tmp) && fs.statSync(tmp).size > 0) {
        fs.renameSync(tmp, f.jpg)
        ok = true
        break
      }
    } catch {}
  }
  fs.rmSync(tmp, { force: true })
  if (!ok) fs.writeFileSync(f.fail, '')
  pruneFrames(filename, [ok ? f.jpg : f.fail])
}

// черга кадрів: по одному, у фоні
const frameQueue: string[] = []
let framesBusy = false
const frameWork = async () => {
  if (framesBusy) return
  framesBusy = true
  try {
    while (frameQueue.length) await makeFrame(frameQueue.shift()!).catch(() => {})
  } finally {
    framesBusy = false
  }
}

// Поставити в чергу кадр для відео (якщо його ще немає і не було невдачі)
export const requestFrame = (filename: string) => {
  const f = frameFiles(filename)
  if (!f || fs.existsSync(f.jpg) || fs.existsSync(f.fail) || frameQueue.includes(filename)) return
  frameQueue.push(filename)
  void frameWork()
}

// Після запуску сервера (payload.config → onInit): кадри для всіх відео, яких ще немає; кадри видалених файлів — прибрати
export const warmFrames = async (payload: Payload) => {
  const { docs } = await payload.find({
    collection: 'media',
    where: { mimeType: { like: 'video/' } },
    limit: 0,
    pagination: false,
    depth: 0,
    overrideAccess: true,
    select: { filename: true },
  })
  const names = new Set(docs.map((d) => String((d as { filename?: string }).filename || '')).filter(Boolean))
  try {
    for (const n of fs.readdirSync(FRAMES_DIR)) {
      const m = n.match(FRAME_NAME)
      // позначки невдачі — теж: після перезапуску (напр. коли встановили ffmpeg) пробуємо ще раз, але лише раз
      if (!m || !names.has(m[1]) || m[3] === 'fail') fs.rmSync(path.join(FRAMES_DIR, n), { force: true })
    }
  } catch {}
  names.forEach(requestFrame)
}

// Обкладинка для відео з розділу «Відео», у яких її немає
const makePosters = async (payload: Payload, media: { id: number; filename: string; url: string }) => {
  const { docs } = await payload.find({ collection: 'videos', limit: 100, depth: 0, overrideAccess: true, locale: 'uk' })
  const targets = (docs as any[]).filter(
    (v) => !v.poster && ((v.source === 'file' && Number(v.file) === media.id) || (typeof v.url === 'string' && v.url.includes(media.url))),
  )
  if (!targets.length) return 0
  const base = media.filename.replace(/\.[a-z0-9]+$/i, '')
  const jpg = path.join(os.tmpdir(), `${base}-obkladynka.jpg`)
  try {
    await run(['-y', '-ss', '2', '-i', path.join(MEDIA_DIR, media.filename), '-frames:v', '1', '-vf', `scale='min(1280,iw)':-2`, '-q:v', '3', jpg])
    const poster = await payload.create({ collection: 'media', data: { alt: targets[0].title || base }, filePath: jpg, overrideAccess: true })
    for (const v of targets) await payload.update({ collection: 'videos', id: v.id, data: { poster: poster.id } as any, overrideAccess: true })
    return targets.length
  } finally {
    fs.rmSync(jpg, { force: true })
  }
}

// ---------- черга ----------
const queue: number[] = []
const work = async (payload: Payload) => {
  if (state.running) return
  state.running = true
  try {
    while (queue.length) {
      const id = queue.shift()!
      const doc = (await payload.findByID({ collection: 'media', id, depth: 0, overrideAccess: true }).catch(() => null)) as any
      if (!doc?.mimeType?.startsWith('video/')) {
        state.done++
        continue
      }
      state.current = doc.filename
      try {
        const r = await optimizeFile(payload, doc)
        const posters = await makePosters(payload, doc)
        // кадр-мініатюра — після стиснення (у файлу новий час зміни — старий кадр прибереться)
        requestFrame(doc.filename)
        state.items.push({ name: doc.filename, before: r.before, after: r.after, action: r.action + (posters ? ' · обкладинка' : '') })
        payload.logger.info(`Відео ${doc.filename}: ${r.action}, ${(r.before / 1e6).toFixed(0)} → ${(r.after / 1e6).toFixed(0)} МБ`)
      } catch (e) {
        state.failed.push({ name: doc.filename, reason: (e as Error).message })
        payload.logger.error(`Відео ${doc.filename}: ${(e as Error).message}`)
      }
      state.done++
    }
  } finally {
    state.running = false
    state.current = undefined
    state.finishedAt = new Date().toISOString()
  }
}

const reset = (total: number) => {
  state = { running: false, startedAt: new Date().toISOString(), total, done: 0, items: [], failed: [] }
}

// Усі відео медіатеки (кнопка в «Стані сервера»)
export const startVideoOptimization = async (payload: Payload): Promise<VideoState> => {
  if (state.running) return state
  const { docs } = await payload.find({
    collection: 'media',
    where: { mimeType: { like: 'video/' } },
    limit: 0,
    pagination: false,
    depth: 0,
    overrideAccess: true,
  })
  reset(docs.length)
  queue.push(...docs.map((d) => d.id as number))
  void work(payload)
  return state
}

// Одне нове відео (після завантаження або коли в «Відео» вибрали файл без обкладинки)
export const enqueueVideo = (payload: Payload, id: number) => {
  if (queue.includes(id)) return
  if (!state.running) reset(0)
  state.total++
  queue.push(id)
  void work(payload)
}
