// Невеликий журнал-файл для розділу «Стан сервера»: по одному JSON на рядок, лишаються останні `keep` записів.
// Використовують журнал помилок (errorLog.ts) і «самописець» затримок (slowLog.ts).
import fs from 'fs'
import path from 'path'

export const jsonlLog = <T>(file: string, { maxBytes, keep }: { maxBytes: number; keep: number }) => ({
  append: (entry: T) => {
    try {
      fs.mkdirSync(path.dirname(file), { recursive: true, mode: 0o700 })
      fs.appendFileSync(file, JSON.stringify(entry) + '\n', { mode: 0o600 })
      if (fs.statSync(file).size > maxBytes) {
        const lines = fs.readFileSync(file, 'utf8').trim().split('\n')
        // через тимчасовий файл: обрізаний журнал з'являється цілком, а не наполовину записаним
        const tmp = `${file}.${process.pid}.tmp`
        fs.writeFileSync(tmp, lines.slice(-keep).join('\n') + '\n', { mode: 0o600 })
        fs.renameSync(tmp, file)
      }
    } catch {
      // журнал не повинен сам ламати сайт
    }
  },
  // останні записи — найновіші першими
  read: (limit: number): T[] => {
    try {
      return fs
        .readFileSync(file, 'utf8')
        .trim()
        .split('\n')
        .slice(-limit)
        .reverse()
        .map((l) => {
          try {
            return JSON.parse(l) as T
          } catch {
            return null
          }
        })
        .filter((e): e is T => e !== null)
    } catch {
      return []
    }
  },
})
