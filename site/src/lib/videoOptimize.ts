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
    const p = spawn(ffmpeg(), ['-hide_banner', '-loglevel', 'error', ...args], { windowsHide: true })
    let err = ''
    p.stderr.on('data', (d) => (err = (err + d).slice(-2000)))
    const timer = setTimeout(() => p.kill('SIGKILL'), 60 * 60_000)
    p.on('error', (e) => {
      clearTimeout(timer)
      reject(e)
    })
    p.on('close', (code) => {
      clearTimeout(timer)
      code === 0 ? resolve() : reject(new Error(err.trim().split('\n').pop() || `ffmpeg завершився з кодом ${code}`))
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
        '-c:v', 'libx264', '-preset', 'fast', '-crf', '23', '-maxrate', '4000k', '-bufsize', '8000k',
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
