import Link from 'next/link'
import { AnnualReportSection } from '@/components/AnnualReportSection'
import { Evacuation } from '@/components/Evacuation'
import { Flag } from '@/components/Flag'
import { ResourceIcon } from '@/components/ResourceIcon'
import { NewsCard } from '@/components/NewsCard'
import { SiteShell } from '@/components/SiteShell'
import { StatsAnimator } from '@/components/StatsAnimator'
import { BarsToggle } from '@/components/BarsToggle'
import { TerritoriesSection } from '@/components/TerritoriesSection'
import { formatDate, getClient, isDraftMode, mediaUrl, publishedOnly } from '@/lib/payload'
import { getDict, localeQuery } from '@/lib/i18n'
import { JsonLd } from '@/components/JsonLd'
import { getSeo, pageMetadata, SITE_URL } from '@/lib/seo'
import { safeHref } from '@/lib/safeHref'

export const dynamic = 'force-dynamic'

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> }

// Телефон: скільки категорій статистики показувати до «Показати всі»
const TOP_BARS = 5

const sizeClass = { big: 'c-2x2', wide: 'c-2', normal: '' } as const
const colorClass = { navy: 'navy', yellow: 'yellow', sky: 'sky', white: '' } as const

const domainOf = (url?: string | null) => {
  try {
    return url ? new URL(url).hostname.replace(/^www\./, '') : ''
  } catch {
    return ''
  }
}

export const generateMetadata = () => pageMetadata({ path: '/' })

export default async function HomePage({ searchParams }: Props) {
  const draft = await isDraftMode(await searchParams)
  const { locale, t } = await getDict()
  const lq = localeQuery(locale)
  const payload = await getClient()
  const [home, stats, report, territories, news, contacts, seo, resources] = await Promise.all([
    payload.findGlobal({ slug: 'home', draft, depth: 1, ...lq }),
    payload.findGlobal({ slug: 'stats', draft, depth: 0, ...lq }),
    payload.findGlobal({ slug: 'annual-report', draft, depth: 0, ...lq }),
    payload.findGlobal({ slug: 'territories', draft, depth: 0, ...lq }),
    payload.find({ collection: 'news', draft, limit: 5, sort: '-publishedAt', depth: 1, where: publishedOnly(draft), ...lq }),
    payload.findGlobal({ slug: 'contacts', depth: 0, ...lq }),
    getSeo(locale),
    payload.findGlobal({ slug: 'resources', draft, depth: 0, ...lq }),
  ])

  const { hero, statement, evacuation: evac } = home
  const cats = [...(stats.categories || [])].sort((a, b) => (b.value || 0) - (a.value || 0))
  const total = cats.reduce((s, c) => s + (c.value || 0), 0)
  const max = Math.max(1, ...cats.map((c) => c.value || 0))
  const fmt = (n?: number | null) => (n || 0).toLocaleString('uk-UA')
  const [first, ...rest] = news.docs

  return (
    <SiteShell draft={draft}>
      {/* Хто ми — для Google (картка організації, телефони гарячих ліній) */}
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'GovernmentOrganization',
          name: contacts.orgName || seo.siteTitle,
          alternateName: seo.titleSuffix,
          url: SITE_URL,
          logo: `${SITE_URL}/img/emblem.png`,
          description: seo.description,
          email: contacts.email || undefined,
          address: contacts.address ? { '@type': 'PostalAddress', streetAddress: contacts.address, addressCountry: 'UA' } : undefined,
          contactPoint: [
            ...(contacts.hotline?.number
              ? [{ '@type': 'ContactPoint', telephone: contacts.hotline.number, contactType: 'customer support', areaServed: 'UA', availableLanguage: ['uk'] }]
              : []),
            ...(contacts.phones || []).map((p) => ({ '@type': 'ContactPoint', telephone: p.text, contactType: 'customer support' })),
          ],
        }}
      />
      <JsonLd data={{ '@context': 'https://schema.org', '@type': 'WebSite', name: seo.siteTitle, url: SITE_URL, inLanguage: ['uk', 'en'] }} />
      <section className="hero">
        <Flag
          speed={hero?.flagSpeed}
          videoUrl={hero?.flagMode === 'video' ? mediaUrl(hero?.flagVideo) : undefined}
          videoSpeed={hero?.videoSpeed}
          labels={{ pause: t.flagPause, play: t.flagPlay }}
        />
        <div className="hero-inner">
          <img src="/img/gerb.png" alt="" />
          {hero?.kicker && <div className="kicker">{hero.kicker}</div>}
          <h1>{hero?.title}</h1>
          {hero?.text && <p>{hero.text}</p>}
          <div className="cta">
            {hero?.primary?.label && (
              <a className="btn btn-yellow" href={hero.primary.url || '#'}>
                ☎ {hero.primary.label}
              </a>
            )}
            {hero?.call2?.label && (
              <a className="btn btn-yellow" href={safeHref(hero.call2.url)}>
                ☎ {hero.call2.label}
              </a>
            )}
            {hero?.secondary?.label && (
              <a className="btn btn-ghost" href={hero.secondary.url || '#'}>
                {hero.secondary.label}
              </a>
            )}
          </div>
        </div>
        <div className="scroll-hint">{t.scrollHint}</div>
      </section>

      {/* Телефон: плитки швидких дій під першим екраном */}
      <nav className="quick-tiles wrap" aria-label={t.quickLinks}>
        {[
          { href: '#evacuation', label: t.quickEvac, icon: 'home', tone: 'sun' },
          { href: '#stats', label: t.quickStats, icon: 'info', tone: 'sky' },
          { href: '#territories', label: t.quickMap, icon: 'map', tone: 'rose' },
        ].map((q) => (
          <a key={q.href} href={q.href} className={`quick-tile tone-${q.tone}`}>
            <span className="quick-ico">
              <ResourceIcon name={q.icon} />
            </span>
            <span className="quick-label">{q.label}</span>
            <span className="quick-arrow" aria-hidden="true">
              ↓
            </span>
          </a>
        ))}
      </nav>

      {(statement?.title || statement?.text) && (
        <section className="statement wrap">
          <h2>{statement?.title}</h2>
          {statement?.text && <p>{statement.text}</p>}
        </section>
      )}

      {!!home.cards?.length && (
        <section className="bento-sec wrap">
          <div className="bento">
            {home.cards.map((c, i) => {
              const cls = ['card', colorClass[c.color || 'white'], sizeClass[c.size || 'normal']].filter(Boolean).join(' ')
              const Tag = c.url ? 'a' : 'div'
              const card = (
                <Tag key={c.id} className={cls} {...(c.url ? { href: safeHref(c.url) } : {})}>
                  {(c.label || c.icon) && (
                    <div className="card-head">
                      {c.label ? <div className={`label${c.live ? ' live' : ''}`}>{c.label}</div> : <span />}
                      {c.icon && (
                        <span className="card-ico">
                          <ResourceIcon name={c.icon} />
                        </span>
                      )}
                    </div>
                  )}
                  <div>
                    {c.number && (
                      <div className="big" style={c.size === 'big' ? { fontSize: 'clamp(4rem,8vw,7rem)' } : undefined}>
                        {c.number}
                      </div>
                    )}
                    {c.title && <h3 style={c.number ? { marginTop: 10 } : undefined}>{c.title}</h3>}
                    {c.text && <p style={{ marginTop: 8 }}>{c.text}</p>}
                  </div>
                  {!!c.chips?.length && (
                    <div className="phone-row">
                      {c.chips.map((ch) => (
                        <span key={ch.id} className={c.color === 'navy' ? 'chip' : 'chip light'}>
                          {ch.text}
                        </span>
                      ))}
                    </div>
                  )}
                  {c.linkLabel && <span className="more">{c.linkLabel} →</span>}
                </Tag>
              )
              // Блок евакуації стоїть одразу після першої (великої) картки — праворуч від неї
              return i === 0 && evac?.show !== false && !!evac?.steps?.length ? [card, <Evacuation key="evac" e={evac} />] : card
            })}
          </div>
        </section>
      )}

      {stats.show !== false && cats.length > 0 && (
        <section className="stats-sec" id="stats">
          <div className="wrap">
            <div className="stats-head">
              <div>
                <h2>{stats.title}</h2>
                {stats.subtitle && <p>{stats.subtitle}</p>}
              </div>
              {stats.asOf && <div className="asof">{t.asOf} {formatDate(stats.asOf)} {t.yearShort}</div>}
            </div>
            <div className="stats-grid">
              <div className="bars-col">
                <div className="bars">
                  {cats.map((c, i) => (
                    <div className={`bar${i >= TOP_BARS ? ' bar-extra' : ''}`} key={c.id}>
                      <span className="bar-rank" aria-hidden="true">
                        {i + 1}
                      </span>
                      <div className="name">{c.name}</div>
                      <div className="track">
                        <div className="fill" data-w={(((c.value || 0) / max) * 82).toFixed(2)} />
                        <span className="val">
                          {fmt(c.value)}
                          <small className="bar-pct"> {total ? Math.max(1, Math.round(((c.value || 0) / total) * 100)) : 0}%</small>
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
                {cats.length > TOP_BARS && <BarsToggle count={cats.length} more={t.showAllCats} less={t.showLess} />}
              </div>
              <div className="kpis">
                <div className="kpi main">
                  <div className="k-label">{t.accepted}</div>
                  <div className="k-num" data-target={total}>{fmt(total)}</div>
                  <div className="k-sub">{t.calls}</div>
                </div>
                {stats.registered != null && (
                  <div className="kpi">
                    <div className="k-label">{t.registered}</div>
                    <div className="k-num" data-target={stats.registered}>{fmt(stats.registered)}</div>
                    <div className="k-sub">{t.requests}</div>
                  </div>
                )}
                {stats.messengers != null && (
                  <div className="kpi">
                    <div className="k-label">{t.viaMessengers}</div>
                    <div className="k-num" data-target={stats.messengers}>{fmt(stats.messengers)}</div>
                    <div className="k-sub">{t.requests}</div>
                    <div className="msgr">
                      <span>WhatsApp</span>
                      <span>Viber</span>
                      <span>Telegram</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
            {stats.note && <p className="stats-note">{stats.note}</p>}
          </div>
          <StatsAnimator sectionId="stats" version={JSON.stringify([cats, stats.registered, stats.messengers])} />
        </section>
      )}

      {report.show !== false && <AnnualReportSection r={report} t={t} />}

      {territories.show !== false && !!territories.regions?.length && <TerritoriesSection t={territories} d={t} locale={locale} />}

      {first && (
        <section className="news-sec" id="news">
          <div className="wrap">
            <div className="sec-head">
              <h2>{t.news}</h2>
              <Link className="link-arrow" href="/news">
                {t.allNews}
              </Link>
            </div>
            <div className="news">
              <NewsCard item={first} featured locale={locale} />
              <div className="news-small">
                {rest.map((n) => (
                  <NewsCard key={n.id} item={n} locale={locale} />
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {resources.show !== false && !!resources.items?.length && (
        <section className="res-sec wrap" id="resources" style={{ paddingTop: 80 }}>
          <div className="sec-head">
            <h2>{resources.title || t.resources}</h2>
            {resources.subtitle && <p className="res-sub">{resources.subtitle}</p>}
          </div>
          <div className="res-grid">
            {resources.items.map((r) => (
              <a key={r.id} className="res-card" href={safeHref(r.url)} target="_blank" rel="noopener noreferrer">
                <span className="res-ico">
                  <ResourceIcon name={r.icon} />
                </span>
                <span className="res-body">
                  <span className="res-name">{r.label}</span>
                  <span className="res-desc">{r.description || domainOf(r.url)}</span>
                  <span className="sr-only"> {t.newTab}</span>
                </span>
                <span className="res-arrow" aria-hidden="true">
                  ↗
                </span>
              </a>
            ))}
          </div>
        </section>
      )}
    </SiteShell>
  )
}
