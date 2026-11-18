// Журнал помилок сайту для розділу «Стан сервера»: останні помилки сервера зберігаються у logs/errors.jsonl
// (по одному JSON на рядок). Файл не росте безкінечно — лишаються останні 200 записів.
import path from 'path'
import { jsonlLog } from './jsonlLog'

export const ERROR_LOG = path.join(process.cwd(), 'logs', 'errors.jsonl')

export type ErrorEntry = { at: string; path: string; method: string; message: string; digest?: string; kind?: string }

const log = jsonlLog<ErrorEntry>(ERROR_LOG, { maxBytes: 512 * 1024, keep: 200 })

export const logError = (e: ErrorEntry) => log.append(e)

// Останні помилки — найновіші першими
export const readErrors = (limit = 15): ErrorEntry[] => log.read(limit)
