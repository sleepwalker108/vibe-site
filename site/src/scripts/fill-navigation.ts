// Одноразово: меню як на старому сайті dp-reintegration.gov.ua (+ «Новини»)
import { getPayload } from 'payload'
import config from '../payload.config'

const payload = await getPayload({ config: await config })

await payload.updateGlobal({
  slug: 'navigation',
  data: {
    _status: 'published',
    items: [
      {
        label: 'Про нас',
        children: [
          { label: 'Діяльність', url: '/diyalnist' },
          { label: 'Керівництво', url: '/kerivnictvo' },
        ],
      },
      {
        label: 'Гаряча лінія',
        children: [
          { label: 'Цілодобова Гаряча лінія Уповноваженого з питань ВПО', url: '/cilodobova-garyacha-liniya-upovnovazhenogo-z-pitan-vpo' },
          { label: 'Цілодобова Гаряча лінія з кризових питань 1548', url: '/cilodobova-garyacha-liniya-z-krizovih-pitan-1548' },
          { label: 'Корисна інформація', url: '/infografika' },
        ],
      },
      {
        label: 'Запобігання корупції',
        children: [
          {
            label: 'Антикорупційна програма ДНТ «Національна агенція розвитку територій України»',
            url: '/antikorupcijna-programa-dp-reintegraciya-ta-vidnovlennya',
          },
          { label: 'Контакти Уповноваженого з питань корупції', url: '/kontakti-upovnovazhenogo-z-pitan-korupciyi' },
        ],
      },
      {
        label: 'Фінансова звітність',
        children: [
          { label: 'Фінансова звітність', url: '/finansova-zvitnist' },
          { label: 'Бюджет', url: '/byudzhet' },
          { label: 'Закупівлі', url: '/zakupivli' },
          { label: 'Звіти діяльності підприємства', url: '/звіти-по-діяльності' },
        ],
      },
      {
        label: 'Законодавство',
        children: [{ label: 'Перелік законів, актів та постанов', url: '/perelik-zakoniv-aktiv-ta-postanov' }],
      },
      {
        label: 'Вакансії',
        children: [{ label: 'Доступні вакансії та контакти', url: '/dostupni-vakansiyi-ta-kontakti' }],
      },
      { label: 'Відеоматеріали', url: '/відеоматеріали' },
      { label: 'Новини', url: '/news' },
    ],
  },
})

payload.logger.info('Готово: меню заповнено')
process.exit(0)
