import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-sqlite'

// Головна:
//  • перший екран — рядок посилань під кнопками (ГІС РР · DREAM · Мапа територій) з іконками;
//  • блок карток — картки «ГІС регіонального розвитку» і DREAM, у «Актуальному переліку» друге посилання на мапу;
// українською та англійською. Лише додає таблиці й дані, нічого не видаляє.
// Можна безпечно запускати повторно: наявне не дублюється й не перезаписується.

const LINKS = [
  { uk: 'ГІС РР', en: 'GIS RR', icon: 'map', url: 'https://gisrr.gov.ua/' },
  { uk: 'DREAM', en: 'DREAM', icon: 'chart', url: 'https://dream.gov.ua/', urlEn: 'https://dream.gov.ua/en' },
  { uk: 'Мапа територій', en: 'Territories map', icon: 'pin', url: 'https://map.minre.gov.ua/' },
]

type Card = Record<string, any> & { id?: string; url?: string | null }

const NEW_CARDS = [
  {
    match: 'gisrr.gov.ua',
    base: { color: 'white', size: 'wide', icon: 'map', url: 'https://gisrr.gov.ua/' },
    uk: {
      label: 'Регіональний розвиток',
      title: 'ГІС регіонального розвитку',
      text: 'Державна, регіональні та місцеві стратегії розвитку і їхні цілі — на інтерактивній мапі',
      linkLabel: 'Відкрити ГІС РР',
    },
    en: {
      label: 'Regional development',
      title: 'Regional Development GIS',
      text: 'State, regional and local development strategies and their goals on an interactive map',
      linkLabel: 'Open the GIS',
      url: 'https://gisrr.gov.ua/',
    },
  },
  {
    match: 'dream.gov.ua',
    base: { color: 'white', size: 'wide', icon: 'chart', url: 'https://dream.gov.ua/' },
    uk: {
      label: 'Відновлення',
      title: 'DREAM — управління публічними інвестиціями',
      text: 'Проєкти відновлення в одній системі: планування, фінансування та реалізація — відкрито й у реальному часі',
      linkLabel: 'Перейти до DREAM',
    },
    en: {
      label: 'Recovery',
      title: 'DREAM — public investment management',
      text: 'Recovery projects in one system: planning, financing and implementation — openly and in real time',
      linkLabel: 'Go to DREAM',
      url: 'https://dream.gov.ua/en',
    },
  },
]

const MAP = { url: 'https://map.minre.gov.ua/', uk: 'Інтерактивна мапа', en: 'Interactive map' }

// Картка переліку територій: з іконкою документа або з «перелік/list» у назві
const isListCard = (c: Card) => c.icon === 'document' || /перелік|current list/i.test(String(c.label || ''))

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  // сайт у цей час працює й теж пише в базу — чекаємо, поки база звільниться
  await db.run(sql`PRAGMA busy_timeout = 30000`)
  await db.run(sql`CREATE TABLE IF NOT EXISTS \`home_hero_links\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`icon\` text DEFAULT 'globe',
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`home\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX IF NOT EXISTS \`home_hero_links_order_idx\` ON \`home_hero_links\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX IF NOT EXISTS \`home_hero_links_parent_id_idx\` ON \`home_hero_links\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE IF NOT EXISTS \`home_hero_links_locales\` (
  	\`label\` text,
  	\`url\` text,
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`_locale\` text NOT NULL,
  	\`_parent_id\` text NOT NULL,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`home_hero_links\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE UNIQUE INDEX IF NOT EXISTS \`home_hero_links_locales_locale_parent_id_unique\` ON \`home_hero_links_locales\` (\`_locale\`,\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE IF NOT EXISTS \`_home_v_version_hero_links\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`icon\` text DEFAULT 'globe',
  	\`_uuid\` text,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`_home_v\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX IF NOT EXISTS \`_home_v_version_hero_links_order_idx\` ON \`_home_v_version_hero_links\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX IF NOT EXISTS \`_home_v_version_hero_links_parent_id_idx\` ON \`_home_v_version_hero_links\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE IF NOT EXISTS \`_home_v_version_hero_links_locales\` (
  	\`label\` text,
  	\`url\` text,
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`_locale\` text NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`_home_v_version_hero_links\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE UNIQUE INDEX IF NOT EXISTS \`_home_v_version_hero_links_locales_locale_parent_id_unique\` ON \`_home_v_version_hero_links_locales\` (\`_locale\`,\`_parent_id\`);`)

  // ---------- дані ----------
  // Через Payload: головна читається з усіма полями. Якщо колись структура зміниться так, що цей крок не зможе
  // виконатись (напр. при розгортанні з нуля, коли головна ще порожня), — пропускаємо його, не ламаючи оновлення.
  try {
    await fillHome(payload, req)
  } catch (e) {
    payload.logger.warn(`Головна: нові картки й посилання не додано автоматично (${(e as Error).message}) — додайте їх в адмінці`)
  }
}

const fillHome = async (payload: MigrateUpArgs['payload'], req: MigrateUpArgs['req']) => {
  const uk = (await payload.findGlobal({ slug: 'home', locale: 'uk', depth: 0, req, overrideAccess: true })) as any
  if (!uk?.hero?.title || !uk.cards?.length) return // порожня головна (нова база) — заповнює адміністратор

  const cards: Card[] = [...uk.cards]
  let changed = false
  for (const n of NEW_CARDS) {
    if (cards.some((c) => String(c.url || '').includes(n.match))) continue
    cards.push({ ...n.base, ...n.uk })
    changed = true
  }
  const list = cards.find(isListCard)
  if (list && !list.link2Url) {
    list.link2Label = MAP.uk
    list.link2Url = MAP.url
    changed = true
  }
  const addLinks = !uk.hero.links?.length
  if (!changed && !addLinks) return

  const saved = (await payload.updateGlobal({
    slug: 'home',
    locale: 'uk',
    data: {
      cards,
      ...(addLinks ? { hero: { ...uk.hero, links: LINKS.map((l) => ({ label: l.uk, url: l.url, icon: l.icon })) } } : {}),
      _status: 'published',
    } as any,
    req,
    overrideAccess: true,
  })) as any
  const ukCards: Card[] = saved.cards || [] // уже з номерами (id) нових карток

  const en = (await payload.findGlobal({ slug: 'home', locale: 'en', depth: 0, req, overrideAccess: true })) as any
  const enCards: Card[] = (en.cards || []).map((c: Card) => {
    const ukCard = ukCards.find((u) => u.id === c.id)
    const n = NEW_CARDS.find((x) => String(ukCard?.url || c.url || '').includes(x.match))
    // англійського тексту ще немає (порожньо або підставлено українське як запасне)
    if (n && (!c.title || c.title === ukCard?.title)) return { ...c, ...n.en }
    if (ukCard && isListCard(ukCard) && ukCard.link2Url === MAP.url && (!c.link2Label || c.link2Label === ukCard.link2Label))
      return { ...c, link2Label: MAP.en, link2Url: MAP.url }
    return c
  })
  await payload.updateGlobal({
    slug: 'home',
    locale: 'en',
    data: {
      cards: enCards,
      ...(addLinks
        ? {
            hero: {
              ...en.hero,
              links: (saved.hero?.links || []).map((l: any, i: number) => ({
                id: l.id,
                icon: l.icon,
                label: LINKS[i].en,
                url: LINKS[i].urlEn || LINKS[i].url,
              })),
            },
          }
        : {}),
      _status: 'published',
    } as any,
    req,
    overrideAccess: true,
  })
  payload.logger.info('Головна: додано картки ГІС РР і DREAM, посилання на мапу в «Актуальному переліку» та рядок посилань на першому екрані')
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.run(sql`DROP TABLE IF EXISTS \`home_hero_links\`;`)
  await db.run(sql`DROP TABLE IF EXISTS \`home_hero_links_locales\`;`)
  await db.run(sql`DROP TABLE IF EXISTS \`_home_v_version_hero_links\`;`)
  await db.run(sql`DROP TABLE IF EXISTS \`_home_v_version_hero_links_locales\`;`)
}
