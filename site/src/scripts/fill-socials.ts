// Соцмережі/месенджери в контактах: Telegram-боти гарячих ліній зі старого сайту (uk + en)
import { getPayload } from 'payload'
import config from '../payload.config'
const payload = await getPayload({ config: await config })
const saved = await payload.updateGlobal({
  slug: 'contacts',
  locale: 'uk',
  data: {
    socials: [
      { network: 'telegram', label: 'Бот гарячої лінії 1548', url: 'https://t.me/MinRe1548_bot' },
      { network: 'telegram', label: 'Бот Уповноваженого з питань ВПО', url: 'https://t.me/IDP_advisor_bot' },
    ],
    _status: 'published',
  } as any,
})
await payload.updateGlobal({
  slug: 'contacts',
  locale: 'en',
  data: {
    socials: (saved.socials || []).map((s: any, i: number) => ({ ...s, label: ['Hotline 1548 bot', 'IDP Commissioner bot'][i] })),
    _status: 'published',
  } as any,
})
payload.logger.info('Соцмережі заповнено')
process.exit(0)
