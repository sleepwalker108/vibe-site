import fs from 'fs'
import path from 'path'
import sharp from 'sharp'
import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-sqlite'

// Легкі копії картинок для карток і широких блоків — у WebP.
// Картинки, перенесені зі старого сайту, лишились у PNG/JPEG, і їхні зменшені копії для карток новин важили
// 0,8–1,3 МБ (на сторінці новин — 12 таких), а частина взагалі не мала зменшеної копії й показувалась оригіналом.
// Тут для таких картинок робимо копії «card» (до 800 px) і «wide» (до 1600 px) у WebP — як для нових завантажень.
// Оригінал і його адреса не змінюються (на нього можуть посилатися тексти), старі зменшені копії видаляються.
// Можна безпечно запускати повторно: картинки, що вже мають WebP-копії, пропускаються.
const SIZES = [
  { name: 'card', width: 800, quality: 80 },
  { name: 'wide', width: 1600, quality: 82 },
] as const

type Row = { id: number; filename: string; width: number | null; mime_type: string } & Record<string, unknown>

export async function up({ db, payload }: MigrateUpArgs): Promise<void> {
  // сайт у цей час працює й теж пише в базу — чекаємо, поки база звільниться
  await db.run(sql`PRAGMA busy_timeout = 30000`)
  const dir = path.resolve(process.cwd(), 'media')
  const rows = (await db.all(
    sql`SELECT * FROM media WHERE mime_type IN ('image/png','image/jpeg','image/webp','image/avif')
        AND (sizes_card_mime_type IS NULL OR sizes_card_mime_type != 'image/webp'
          OR ((width > 1600 OR mime_type != 'image/webp') AND (sizes_wide_mime_type IS NULL OR sizes_wide_mime_type != 'image/webp')))`,
  )) as Row[]
  let done = 0
  let saved = 0
  for (const row of rows) {
    const src = path.join(dir, row.filename)
    if (!fs.existsSync(src)) continue // файлу немає на цьому сервері — пропускаємо
    try {
      const meta = await sharp(src).metadata()
      const w = meta.width || row.width || 0
      const h = meta.height || 0
      if (!w || !h) continue
      const base = row.filename.replace(/\.[^.]+$/, '')
      for (const s of SIZES) {
        if (row[`sizes_${s.name}_mime_type`] === 'image/webp') continue
        // широку копію для невеликих картинок робимо лише тоді, коли оригінал не WebP (інакше оригінал і так легкий);
        // більшою за оригінал копія не буває
        if (s.name === 'wide' && w <= s.width && row.mime_type === 'image/webp') continue
        const tw = Math.min(s.width, w)
        const th = Math.round((h * tw) / w)
        const name = `${base}-${tw}x${th}.webp`
        const info = await sharp(src).rotate().resize({ width: tw, withoutEnlargement: true }).webp({ quality: s.quality }).toFile(path.join(dir, name))
        const old = row[`sizes_${s.name}_filename`] as string | null
        const oldSize = Number(row[`sizes_${s.name}_filesize`]) || 0
        if (old && old !== name && old !== row.filename) fs.rmSync(path.join(dir, old), { force: true })
        saved += Math.max(0, oldSize - info.size)
        await db.run(
          sql.raw(
            `UPDATE media SET sizes_${s.name}_url = '/api/media/file/${encodeURIComponent(name).replace(/'/g, "''")}', ` +
              `sizes_${s.name}_width = ${info.width}, sizes_${s.name}_height = ${info.height}, sizes_${s.name}_mime_type = 'image/webp', ` +
              `sizes_${s.name}_filesize = ${info.size}, sizes_${s.name}_filename = '${name.replace(/'/g, "''")}' WHERE id = ${row.id}`,
          ),
        )
      }
      done++
    } catch (e) {
      payload.logger.warn(`Картинка ${row.filename}: не вдалося зробити легкі копії — ${(e as Error).message}`)
    }
  }
  payload.logger.info(`Легкі копії картинок (WebP): ${done} картинок, зекономлено ~${Math.round(saved / 1024 / 1024)} МБ у копіях`)
}

export async function down({}: MigrateDownArgs): Promise<void> {
  // нічого: старі важкі копії не відновлюємо (оригінали картинок не змінювались)
}
