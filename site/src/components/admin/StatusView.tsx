import type { AdminViewServerProps } from 'payload'
import { DefaultTemplate } from '@payloadcms/next/templates'
import { redirect } from 'next/navigation'
import { duration, kyivTime, plural, size } from '@/lib/adminFormat'
import { readErrors } from '@/lib/errorLog'
import { getServerStatus } from '@/lib/serverStatus'
import { LinksSection, UpdatesSection } from './StatusSections'
import { STATUS_CSS } from './statusStyles'

const MONTHS = ['січня', 'лютого', 'березня', 'квітня', 'травня', 'червня', 'липня', 'серпня', 'вересня', 'жовтня', 'листопада', 'грудня']
// дата резервної копії записана часом сервера — показуємо як є
const backupWhen = (d: string) => `${Number(d.slice(8, 10))} ${MONTHS[Number(d.slice(5, 7)) - 1]}, ${d.slice(11, 16)}`
const hoursAgo = (d: string) => (Date.now() - new Date(d).getTime()) / 3.6e6

type Level = 'ok' | 'warn' | 'bad'
const Meter = ({ part, total, level }: { part: number; total: number; level: Level }) => (
  <div className={`ss-meter ${level}`} role="img" aria-label={`${Math.round((part / total) * 100)}%`}>
    <i style={{ width: `${Math.min(100, (part / total) * 100)}%` }} />
  </div>
)

// Розділ адмінки «Стан сервера»: /admin/status (лише для адміністраторів)
export const StatusView = async ({ initPageResult, params, searchParams }: AdminViewServerProps) => {
  const { req, permissions, visibleEntities, locale } = initPageResult
  if (!req.user) redirect('/admin/login?redirect=%2Fadmin%2Fstatus')
  const template = (children: React.ReactNode) => (
    <DefaultTemplate
      i18n={req.i18n}
      locale={locale}
      params={params}
      payload={req.payload}
      permissions={permissions}
      searchParams={searchParams}
      user={req.user ?? undefined}
      visibleEntities={visibleEntities}
    >
      <style>{STATUS_CSS}</style>
      <div className="ss-wrap">{children}</div>
    </DefaultTemplate>
  )
  if (req.user.role !== 'admin') return template(<><h1>Стан сервера</h1><p>Цей розділ доступний лише адміністраторам.</p></>)

  const s = await getServerStatus(req.payload)
  const errors = readErrors(15)
  const errors24 = errors.filter((e) => Date.now() - new Date(e.at).getTime() < 864e5).length

  // ---- що потребує уваги ----
  const alerts: { level: Level; text: string }[] = []
  const diskUsed = s.disk ? s.disk.total - s.disk.free : 0
  const diskLevel: Level = !s.disk ? 'ok' : s.disk.free < 1e9 || s.disk.free / s.disk.total < 0.05 ? 'bad' : s.disk.free / s.disk.total < 0.1 ? 'warn' : 'ok'
  if (diskLevel !== 'ok' && s.disk) alerts.push({ level: diskLevel, text: `Мало місця на диску: вільно лише ${size(s.disk.free)}. Видаліть старі копії або великі файли.` })
  const memLevel: Level = s.memory.used / s.memory.total > 0.92 ? 'warn' : 'ok'
  if (memLevel !== 'ok') alerts.push({ level: 'warn', text: 'Оперативна пам’ять майже вся зайнята — сайт може сповільнитися.' })
  const lastDb = s.backups.lastDb
  const backupAge = lastDb ? hoursAgo(lastDb.date) : Infinity
  const backupLevel: Level = backupAge > 72 ? 'bad' : backupAge > 26 ? 'warn' : 'ok'
  if (backupLevel !== 'ok')
    alerts.push({
      level: backupLevel,
      text: lastDb
        ? `Остання копія бази — ${duration(backupAge * 3600)} тому. Щоденна автоматична копія, схоже, не спрацювала.`
        : 'Резервних копій бази ще немає.',
    })
  if (errors24) alerts.push({ level: 'warn', text: `За добу на сайті було ${plural(errors24, ['помилка', 'помилки', 'помилок'])} — див. нижче.` })
  const worst: Level = alerts.some((a) => a.level === 'bad') ? 'bad' : alerts.length ? 'warn' : 'ok'

  const repoUrl = s.version?.origin.match(/github\.com[:/](.+?)(\.git)?$/)?.[1]

  return template(
    <>
      <div className="ss-head">
        <div>
          <h1>Стан сервера</h1>
          <p className="ss-sub">
            {s.host} · дані на {kyivTime(new Date())}
          </p>
        </div>
        <a className="ss-btn" href="/admin/status">
          Оновити
        </a>
      </div>

      <div className={`ss-banner ${worst}`} role="status">
        <span className="ss-dot" aria-hidden />
        {alerts.length ? (
          <div>
            <b>Потребує уваги</b>
            <ul>
              {alerts.map((a) => (
                <li key={a.text} className={a.level}>
                  {a.text}
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <div>
            <b>Все гаразд.</b> Місця й пам’яті достатньо, резервні копії свіжі, помилок за добу не було.
          </div>
        )}
      </div>

      <div className="ss-grid">
        <section className="ss-card">
          <h2>Версія сайту</h2>
          {s.version ? (
            <>
              <p className="ss-big">
                {repoUrl ? (
                  <a href={`https://github.com/${repoUrl}/commit/${s.version.sha}`} target="_blank" rel="noreferrer">
                    {s.version.short}
                  </a>
                ) : (
                  s.version.short
                )}
              </p>
              <p className="ss-line">«{s.version.subject}»</p>
              <dl>
                <dt>Зміни від</dt>
                <dd>{kyivTime(s.version.committed)}</dd>
                {s.built && (
                  <>
                    <dt>Встановлено</dt>
                    <dd>{kyivTime(s.built)}</dd>
                  </>
                )}
              </dl>
            </>
          ) : (
            <p className="ss-muted">Не вдалося прочитати версію.</p>
          )}
        </section>

        <section className="ss-card">
          <h2>Робота без перерви</h2>
          <p className="ss-big">{duration(s.uptime.site)}</p>
          <p className="ss-line ss-muted">сайт працює з останнього перезапуску</p>
          <dl>
            <dt>Сервер увімкнено</dt>
            <dd>{duration(s.uptime.server)} тому</dd>
            <dt>Node.js</dt>
            <dd>{s.node}</dd>
          </dl>
        </section>

        <section className="ss-card">
          <h2>Диск</h2>
          {s.disk ? (
            <>
              <p className="ss-big">
                {size(s.disk.free)} <small>вільно з {size(s.disk.total)}</small>
              </p>
              <Meter part={diskUsed} total={s.disk.total} level={diskLevel} />
            </>
          ) : (
            <p className="ss-muted">Невідомо</p>
          )}
          <dl>
            <dt>База даних</dt>
            <dd>{size(s.sizes.db)}</dd>
            <dt>Медіатека</dt>
            <dd>{size(s.sizes.media)}</dd>
            <dt>Резервні копії</dt>
            <dd>{size(s.sizes.backups)}</dd>
          </dl>
        </section>

        <section className="ss-card">
          <h2>Оперативна пам’ять</h2>
          <p className="ss-big">
            {size(s.memory.total - s.memory.used)} <small>вільно з {size(s.memory.total)}</small>
          </p>
          <Meter part={s.memory.used} total={s.memory.total} level={memLevel} />
          <dl>
            <dt>Займає сайт</dt>
            <dd>{size(s.memory.site)}</dd>
          </dl>
        </section>

        <section className="ss-card">
          <h2>Вміст сайту</h2>
          <dl className="ss-counts">
            <dt>
              <a href="/admin/collections/news">Новини</a>
            </dt>
            <dd>
              {s.counts.news.toLocaleString('uk-UA')}
              {!!s.counts.newsDraft && <small> + {plural(s.counts.newsDraft, ['чернетка', 'чернетки', 'чернеток'])}</small>}
            </dd>
            <dt>
              <a href="/admin/collections/pages">Сторінки</a>
            </dt>
            <dd>{s.counts.pages}</dd>
            <dt>
              <a href="/admin/collections/media">Файли в медіатеці</a>
            </dt>
            <dd>{s.counts.media.toLocaleString('uk-UA')}</dd>
            <dt>
              <a href="/admin/collections/users">Користувачі</a>
            </dt>
            <dd>{s.counts.users}</dd>
          </dl>
        </section>

        <section className="ss-card">
          <h2>Резервні копії</h2>
          <p className={`ss-big ${backupLevel}`}>{lastDb ? `${duration(backupAge * 3600)} тому` : 'немає'}</p>
          <p className="ss-line ss-muted">остання копія бази{lastDb ? ` · ${backupWhen(lastDb.date)}` : ''}</p>
          <dl>
            <dt>Копія файлів</dt>
            <dd>{s.backups.lastMedia ? backupWhen(s.backups.lastMedia.date) : 'ще не було'}</dd>
            <dt>Усього копій</dt>
            <dd>{s.backups.total}</dd>
          </dl>
          <a className="ss-more" href="/admin/backups">
            Резервні копії →
          </a>
        </section>
      </div>

      <UpdatesSection />
      <LinksSection />

      <section className="ss-section">
        <div className="ss-section-head">
          <h2>Останні помилки сайту</h2>
          <span className={`ss-chip ${errors.length ? (errors24 ? 'warn' : 'ok') : 'ok'}`}>{errors.length ? `${errors.length} в журналі` : 'немає'}</span>
        </div>
        {errors.length ? (
          <ul className="ss-list">
            {errors.map((e, i) => (
              <li key={i}>
                <span className="ss-when">{kyivTime(e.at)}</span>
                <code>
                  {e.method} {decodeURIComponentSafe(e.path)}
                </code>
                <span className="ss-msg">{e.message}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="ss-muted">Помилок не зафіксовано.</p>
        )}
      </section>
    </>,
  )
}

const decodeURIComponentSafe = (s: string) => {
  try {
    return decodeURI(s)
  } catch {
    return s
  }
}
