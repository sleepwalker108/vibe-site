// Кадр-картинка відео з медіатеки — для мініатюр замість справжнього <video> (див. lib/videoOptimize.ts):
//   GET /api/media-frame/<назва файлу>  → JPEG; поки кадру немає — одразу заглушка (кадр робиться у фоні)
// Самі відеофайли й так публічні (/api/media/file/…), тож і кадр з них доступний без входу.
import fs from 'fs'
import path from 'path'
import type { Endpoint } from 'payload'
import { cachedFrame, requestFrame } from '../lib/videoOptimize'

// темний прямокутник 16:9 — на його місці з'явиться кадр, щойно сервер його зробить
const PLACEHOLDER = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 9"><rect width="16" height="9" fill="#1d2633"/></svg>'

const decode = (s: string) => {
  try {
    return decodeURIComponent(s)
  } catch {
    return s // уже розкодована назва (або з «%» у самій назві)
  }
}

export const videoFrameEndpoints: Endpoint[] = [
  {
    path: '/media-frame/:filename',
    method: 'get',
    handler: async (req) => {
      const filename = decode(String(req.routeParams?.filename || ''))
      const notFound = () => new Response(null, { status: 404 })
      // лише назва файлу, без шляхів — і лише відео, яке справді є в медіатеці
      if (!filename || filename !== path.basename(filename) || filename.startsWith('.')) return notFound()
      const { docs } = await req.payload.find({
        collection: 'media',
        where: { filename: { equals: filename } },
        limit: 1,
        depth: 0,
        overrideAccess: true,
        select: { mimeType: true },
      })
      if (!String(docs[0]?.mimeType || '').startsWith('video/')) return notFound()
      const file = cachedFrame(filename)
      if (file) {
        return new Response(fs.readFileSync(file), {
          headers: { 'Content-Type': 'image/jpeg', 'Cache-Control': 'public, max-age=86400' },
        })
      }
      // кадру ще немає: не чекаємо на ffmpeg (запит тримав би з'єднання) — заглушка зараз, кадр у фоні
      requestFrame(filename)
      return new Response(PLACEHOLDER, { headers: { 'Content-Type': 'image/svg+xml', 'Cache-Control': 'no-store' } })
    },
  },
]
