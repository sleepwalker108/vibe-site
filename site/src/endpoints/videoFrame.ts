// Кадр-картинка відео з медіатеки — для мініатюр замість справжнього <video> (див. lib/videoOptimize.ts → videoFrame):
//   GET /api/media-frame/<назва файлу>  → JPEG
// Самі відеофайли й так публічні (/api/media/file/…), тож і кадр з них доступний без входу.
import fs from 'fs'
import path from 'path'
import type { Endpoint } from 'payload'
import { videoFrame } from '../lib/videoOptimize'

export const videoFrameEndpoints: Endpoint[] = [
  {
    path: '/media-frame/:filename',
    method: 'get',
    handler: async (req) => {
      const filename = decodeURIComponent(String(req.routeParams?.filename || ''))
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
      const file = await videoFrame(filename)
      if (!file) return notFound()
      return new Response(fs.readFileSync(file), {
        headers: { 'Content-Type': 'image/jpeg', 'Cache-Control': 'public, max-age=86400' },
      })
    },
  },
]
