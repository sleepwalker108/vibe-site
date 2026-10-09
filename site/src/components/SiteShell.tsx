import type { ReactNode } from 'react'
import { getClient, mediaUrl } from '@/lib/payload'
import { getDict, localeQuery } from '@/lib/i18n'
import { Header, type MenuItem } from './Header'
import { RefreshRouteOnSave } from './RefreshRouteOnSave'
import { Linkify } from './Linkify'
import { ToTop } from './ToTop'

// Гаряча лінія 1648 у підвалі — у тому ж стилі, що й 1548. На комп'ютері — під контактами (там вільне місце),
// на телефоні — після блоку 1548 (видно лише одну з двох копій)
const Hotline1648 = ({ t, className }: { t: { hotline: string; callsAbroad: string }; className: string }) => (
  <div className={className}>
    <h2 className="foot-h">{t.hotline}</h2>
    <a className="foot-hot" href="tel:1648">
      1648
    </a>
    <p>
      <a href="tel:+380442878165">+38 (044) 287-81-65</a>
      <span className="foot-note">({t.callsAbroad})</span>
    </p>
  </div>
)

// Шапка + підвал + (у режимі перегляду) автооновлення з адмінки
export const SiteShell = async ({ children, draft }: { children: ReactNode; draft: boolean }) => {
  const payload = await getClient()
  const { locale, t } = await getDict()
  const [c, nav] = await Promise.all([
    payload.findGlobal({ slug: 'contacts', draft, depth: 1, ...localeQuery(locale) }),
    payload.findGlobal({ slug: 'navigation', draft, depth: 0, ...localeQuery(locale) }),
  ])
  const logo = mediaUrl(c.logo, 'card') || '/img/emblem.png'

  return (
    // Один спільний блок: Next.js після переходу прокручує саме його початок (а не кожен блок по черзі — тоді сторінку кидало донизу)
    <div className="site">
      <a className="skip-link" href="#main">
        {t.skipToContent}
      </a>
      <Header
        shortName={c.shortName}
        kicker={c.kicker}
        logoUrl={logo}
        menu={(nav.items || []) as MenuItem[]}
        locale={locale}
        t={t}
        contacts={{
          hotline: c.hotline?.number,
          hotlineNote: c.hotline?.lines?.[0]?.text,
          phones: (c.phones || []).map((p) => p.text),
          email: c.email,
          socials: (c.socials || []).map((s) => ({ network: s.network, label: s.label, url: s.url })),
        }}
      />
      <main id="main" tabIndex={-1}>
        {children}
      </main>
      <div className="flag-strip" />
      <footer id="footer">
        <div className="wrap">
          <div className="foot">
            <div>
              <div className="foot-brand">
                <img src={logo} alt="" />
                <div>
                  <strong>{c.orgName}</strong>
                  {c.address && (
                    <p style={{ marginTop: 10 }}>
                      {/* адреса — відкривається на карті */}
                      <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(c.address)}`} target="_blank" rel="noopener noreferrer">
                        {c.address}
                      </a>
                    </p>
                  )}
                </div>
              </div>
            </div>
            <div>
              <h2 className="foot-h">{t.schedule}</h2>
              {c.schedule?.map((l) => <p key={l.id}>{l.text}</p>)}
            </div>
            <div>
              <h2 className="foot-h">{t.contacts}</h2>
              {c.email && (
                <p>
                  <a href={`mailto:${c.email}`}>{c.email}</a>
                </p>
              )}
              {c.phones?.map((l) => (
                <p key={l.id}>
                  <Linkify text={l.text} />
                </p>
              ))}
              <Hotline1648 t={t} className="foot-hot2 foot-hot2-wide" />
            </div>
            <div>
              <h2 className="foot-h">{t.hotline}</h2>
              {c.hotline?.number && (
                <a className="foot-hot" href={`tel:${c.hotline.number.replace(/[^\d+]/g, '')}`}>
                  {c.hotline.number}
                </a>
              )}
              {c.hotline?.lines?.map((l) => (
                <p key={l.id}>
                  <Linkify text={l.text} />
                </p>
              ))}
              {/* на телефоні колонки йдуть одна під одною — тут 1648 стоїть після основної лінії 1548 */}
              <Hotline1648 t={t} className="foot-hot2 foot-hot2-narrow" />
            </div>
          </div>
          <div className="foot-bottom">
            <span>© {new Date().getFullYear()} dp-reintegration.gov.ua</span>
            <ToTop label={t.toTop} />
          </div>
        </div>
      </footer>
      {draft && (
        <>
          <RefreshRouteOnSave />
          <div className="preview-bar">{t.previewBar}</div>
        </>
      )}
    </div>
  )
}
