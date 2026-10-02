// Одноразово: варіант Б — евакуація поруч з карткою 1548, решта карток в один ряд
import { getPayload } from 'payload'
import config from '../payload.config'

const payload = await getPayload({ config: await config })
const home = await payload.findGlobal({ slug: 'home', depth: 0 })
const cards = home.cards || []
const find = (pred: (c: (typeof cards)[number]) => boolean) => cards.find(pred)

const big = find((c) => c.number === '1548')
const c1648 = find((c) => c.number === '1648')
const vpo = find((c) => !!c.label?.includes('ВПО'))
const list = find((c) => !!c.label?.includes('перелік'))
const info = find((c) => !!c.label?.includes('Корисна'))
if (!big || !c1648 || !vpo || !list || !info) throw new Error('Не знайшов усі картки — перевірте вручну в адмінці')

const strip = <T extends { id?: string | null }>(c: T) => ({ ...c, id: undefined })

await payload.updateGlobal({
  slug: 'home',
  data: {
    _status: 'published',
    cards: [
      {
        ...strip(big),
        icon: 'phone',
        text: 'Надаємо швидку та надійну допомогу українським громадянам у складних ситуаціях: евакуація, житло, виплати для ВПО',
        chips: [...(big.chips || []).map(strip), { text: '1,4 млн звернень з 2022 року' }],
        linkLabel: big.linkLabel || 'Детальніше',
      },
      { ...strip(c1648), size: 'normal', icon: 'search', linkLabel: 'Детальніше', url: c1648.url || '/cilodobova-garyacha-liniya-z-krizovih-pitan-1548' },
      { ...strip(vpo), size: 'normal', title: 'Цілодобова гаряча лінія' },
      { ...strip(list), size: 'normal', icon: 'document' },
      {
        ...strip(info),
        size: 'normal',
        icon: 'info',
        title: 'Інформація для громадян, які звертаються на гарячі лінії 1548 та 1648',
      },
    ] as any,
    evacuation: {
      show: true,
      highlight: 'Подзвоніть зараз та дізнайтеся',
      title: 'все, що вас хвилює про виїзд',
      steps: [
        { title: 'Транспорт', text: 'Вас заберуть автобусом або спецтранспортом для маломобільних людей із можливістю перевезення лежачих' },
        { title: 'Транзитний центр', text: 'Тут допоможуть з документами, квитками, нагодують та поселять' },
        { title: 'Житло', text: 'За кілька днів вам підшукають безкоштовне місце тимчасового проживання (МТП)' },
        { title: 'Виплати', text: '→ Одноразова виплата 12 300 грн на людину\n→ Щомісячні виплати для ВПО' },
      ],
      footer: 'Буде складно',
      footerHighlight: 'але врешті все буде добре',
    },
  },
})

payload.logger.info('Готово: евакуацію додано, картки перебудовано')
process.exit(0)
