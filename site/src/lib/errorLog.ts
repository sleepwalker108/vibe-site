// Журнал помилок сайту для розділу «Стан сервера»: останні помилки сервера зберігаються у logs/errors.jsonl
// (по одному JSON на рядок). Файл не росте безкінечно — лишаються останні 200 записів.
import fs from 'fs'
import path from 'path'

export const ERROR_LOG = path.join(process.cwd(), 'logs', 'errors.jsonl')
const MAX_BYTES = 512 * 1024
const KEEP = 200

export type ErrorEntry = { at: string; path: string; method: string; message: string; digest?: string; kind?: string }

export const logError = (e: ErrorEntry) => {
  try {
    fs.mkdirSync(path.dirname(ERROR_LOG), { recursive: true })
    fs.appendFileSync(ERROR_LOG, JSON.stringify(e) + '\n')
    if (fs.statSync(ERROR_LOG).size > MAX_BYTES) {
      const lines = fs.readFileSync(ERROR_LOG, 'utf8').trim().split('\n')
      fs.writeFileSync(ERROR_LOG, lines.slice(-KEEP).join('\n') + '\n')
    }
  } catch {
    // журнал помилок не повинен сам ламати сайт
  }
}

// Останні помилки — найновіші першими
export const readErrors = (limit = 15): ErrorEntry[] => {
  try {
    return fs
      .readFileSync(ERROR_LOG, 'utf8')
      .trim()
      .split('\n')
      .slice(-limit)
      .reverse()
      .map((l) => {
        try {
          return JSON.parse(l) as ErrorEntry
        } catch {
          return null
        }
      })
      .filter((e): e is ErrorEntry => !!e)
  } catch {
    return []
  }
}
