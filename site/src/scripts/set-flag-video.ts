// Одноразово: завантажує відео прапора в медіатеку і вмикає його на головній
import fs from 'fs'
import path from 'path'
import { getPayload } from 'payload'
import config from '../payload.config'

const file = path.resolve('public/video/flag-source.mp4')
const payload = await getPayload({ config: await config })
const data = fs.readFileSync(file)

const video = await payload.create({
  collection: 'media',
  data: { alt: 'Прапор України розвівається' },
  file: { data, mimetype: 'video/mp4', name: 'flag.mp4', size: data.length },
})

const home = await payload.findGlobal({ slug: 'home', depth: 0 })
await payload.updateGlobal({
  slug: 'home',
  data: {
    _status: 'published',
    hero: { ...home.hero, flagMode: 'video', flagVideo: video.id, videoSpeed: 0.6 },
  },
})
payload.logger.info(`Готово: відео #${video.id} (${video.url}) увімкнено на головній`)
process.exit(0)
