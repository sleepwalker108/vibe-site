// Оптимізація PDF медіатеки для швидкого відкриття на сайті (програма qpdf):
//  • «швидкий веб-перегляд» (linearize): перша сторінка показується одразу, ще до завантаження всього файлу —
//    браузер довантажує решту частинами (сервер підтримує часткове завантаження, Range);
//  • службові дані PDF стискаються (object streams) — файл зазвичай стає ще й меншим.
// Зміст, якість і вигляд документа не змінюються. Працює у фоні, по одному файлу:
// автоматично після завантаження нового PDF або для всіх одразу — sudo nartu-task optimize-pdfs.
// Якщо qpdf на сервері немає — нічого не робить (файли віддаються як є).
import { spawn, spawnSync } from 'child_process'
import fs from 'fs'
import path from 'path'
import type { Payload } from 'payload'
import { SITE_DIR } from './backups'

const MEDIA_DIR = path.join(SITE_DIR, 'media')

let qpdfBin: string | null | undefined
export const qpdf = (): string | null => {
  if (qpdfBin !== undefined) return qpdfBin
  const bin = process.env.QPDF_PATH || 'qpdf'
  qpdfBin = spawnSync(bin, ['--version'], { stdio: 'ignore', windowsHide: true }).status === 0 ? bin : null
  return qpdfBin
}

const run = (args: string[]) =>
  new Promise<void>((resolve, reject) => {
    const p = spawn(qpdf()!, args, { windowsHide: true })
    let err = ''
    p.stderr.on('data', (d) => (err = (err + d).slice(-2000)))
    const timer = setTimeout(() => p.kill('SIGKILL'), 10 * 60_000)
    p.on('error', (e) => {
      clearTimeout(timer)
      reject(e)
    })
    p.on('close', (code) => {
      clearTimeout(timer)
      // 0 — успіх, 3 — успіх із попередженнями (типово для PDF, зроблених у Word тощо)
      code === 0 || code === 3 ? resolve() : reject(new Error(err.trim().split('\n').pop() || `qpdf завершився з кодом ${code}`))
    })
  })

// Ознака «швидкого веб-перегляду» стоїть на самому початку файлу
const isLinearized = (file: string) => {
  const fd = fs.openSync(file, 'r')
  try {
    const buf = Buffer.alloc(2048)
    const n = fs.readSync(fd, buf, 0, buf.length, 0)
    return buf.subarray(0, n).toString('latin1').includes('/Linearized')
  } finally {
    fs.closeSync(fd)
  }
}

export type PdfResult = { action: string; before: number; after: number }

export const optimizePdf = async (payload: Payload, doc: { id: number; filename: string }): Promise<PdfResult> => {
  const file = path.join(MEDIA_DIR, doc.filename)
  if (!file.startsWith(MEDIA_DIR + path.sep) || !fs.existsSync(file)) throw new Error('файлу немає на диску')
  const before = fs.statSync(file).size
  if (isLinearized(file)) return { action: 'уже оптимальний', before, after: before }
  if (!qpdf()) return { action: 'пропущено (на сервері немає qpdf)', before, after: before }

  const tmp = `${file}.opt.pdf`
  try {
    await run([
      '--linearize',
      '--object-streams=generate',
      '--compress-streams=y',
      '--recompress-flate',
      '--compression-level=9',
      file,
      tmp,
    ])
    const after = fs.statSync(tmp).size
    // «швидкий перегляд» додає трохи службових даних; якщо файл помітно виріс — лишаємо оригінал
    if (after > before * 1.05) return { action: 'лишено як є (оптимізований виходив більшим)', before, after: before }
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
    await (payload.db as any).client.execute({ sql: 'UPDATE media SET filesize = ? WHERE id = ?', args: [after, doc.id] })
    return { action: 'швидкий веб-перегляд', before, after }
  } finally {
    fs.rmSync(tmp, { force: true })
  }
}

// ---------- черга: по одному файлу у фоні ----------
const queue: number[] = []
let working = false

const work = async (payload: Payload) => {
  if (working) return
  working = true
  try {
    // невелика пауза: нове завантаження має встигнути зберегтися в базі
    await new Promise((r) => setTimeout(r, 3000))
    while (queue.length) {
      const id = queue.shift()!
      try {
        const doc = (await payload.findByID({ collection: 'media', id, depth: 0, overrideAccess: true })) as {
          id: number
          filename?: string
          mimeType?: string
        }
        if (doc?.mimeType !== 'application/pdf' || !doc.filename) continue
        const r = await optimizePdf(payload, { id: doc.id, filename: doc.filename })
        payload.logger.info(`PDF ${doc.filename}: ${r.action}, ${(r.before / 1e6).toFixed(1)} → ${(r.after / 1e6).toFixed(1)} МБ`)
      } catch (e) {
        payload.logger.error(`PDF #${id}: ${(e as Error).message}`)
      }
    }
  } finally {
    working = false
  }
}

// Новий PDF (після завантаження в медіатеку)
export const enqueuePdf = (payload: Payload, id: number) => {
  if (!qpdf() || queue.includes(id)) return
  queue.push(id)
  void work(payload)
}
