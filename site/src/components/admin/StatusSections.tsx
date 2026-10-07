'use client'
import { useEffect, useState } from 'react'
import { kyivTime, plural } from '@/lib/adminFormat'
import type { LinkIssue, LinkIssueKind, LinkReport } from '@/lib/linkCheck'
import type { UpdatesInfo } from '@/lib/serverStatus'

// Ці дві частини «Стану сервера» вантажаться окремо (звернення до GitHub і перевірка всіх текстів),
// щоб сама сторінка відкривалася миттєво
const useApi = <T,>(url: string, reloadKey = 0) => {
  const [data, setData] = useState<T | null>(null)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => {
    setData(null)
    setError(null)
    fetch(url, { credentials: 'include', cache: 'no-store' })
      .then(async (r) => (r.ok ? setData(await r.json()) : setError(`Помилка ${r.status}`)))
      .catch(() => setError('Немає зв’язку із сервером'))
  }, [url, reloadKey])
  return { data, error }
}

export const UpdatesSection = () => {
  const { data, error } = useApi<UpdatesInfo>('/api/status/updates')
  const chip = !data ? (error ? ['warn', 'невідомо'] : ['', 'перевіряю…']) : data.state === 'current' ? ['ok', 'встановлено найновішу'] : data.state === 'behind' ? ['warn', 'є нові зміни'] : ['warn', 'невідомо']
  return (
    <section className="ss-section">
      <div className="ss-section-head">
        <h2>Оновлення з GitHub</h2>
        <span className={`ss-chip ${chip[0]}`}>{chip[1]}</span>
      </div>
      {!data && !error && <p className="ss-muted ss-pulse">Звіряю версію з GitHub…</p>}
      {error && <p className="ss-muted">{error}</p>}
      {data?.state === 'current' && <p className="ss-muted">На сервері встановлена остання версія з GitHub.</p>}
      {data?.state === 'unknown' && <p className="ss-muted">{data.reason}</p>}
      {data?.state === 'behind' && (
        <>
          <p>
            {data.count ? (
              <>
                На GitHub є <b>{plural(data.count, ['нова зміна', 'нові зміни', 'нових змін'])}</b>, які ще не встановлені на сервері:
              </>
            ) : (
              'На GitHub є нові зміни, які ще не встановлені на сервері.'
            )}
          </p>
          {!!data.commits.length && (
            <ul className="ss-list">
              {data.commits.map((c) => (
                <li key={c.short}>
                  <span className="ss-when">{c.date ? kyivTime(c.date) : ''}</span>
                  <code>{c.short}</code>
                  <span className="ss-msg">{c.message}</span>
                </li>
              ))}
            </ul>
          )}
          <p className="ss-hint">
            Щоб установити, на сервері виконайте: <code>sudo nartu-update</code>
          </p>
        </>
      )}
    </section>
  )
}

const KINDS: Record<LinkIssueKind, { label: string; broken: boolean }> = {
  'missing-page': { label: 'Посилання на сторінку чи новину, якої немає', broken: true },
  'missing-file': { label: 'Посилання на файл, якого немає в медіатеці', broken: true },
  'missing-image': { label: 'Картинка або файл видалені з медіатеки', broken: true },
  empty: { label: 'Порожні посилання (без адреси)', broken: true },
  'old-site-page': { label: 'Посилання на сторінки старого сайту, яких немає на новому', broken: false },
  'old-site-file': { label: 'Файли, що досі лежать на старому сайті (wp-content)', broken: false },
}

const IssueList = ({ items }: { items: LinkIssue[] }) => {
  const [all, setAll] = useState(false)
  const shown = all ? items : items.slice(0, 20)
  return (
    <>
      <ul className="ss-list">
        {shown.map((l, i) => (
          <li key={i}>
            <a className="ss-doc" href={`/admin/collections/${l.collection}/${l.id}`}>
              {l.collection === 'news' ? 'Новина' : 'Сторінка'}: {l.title}
            </a>
            {l.locale === 'en' && <span className="ss-chip small">EN</span>}
            <span className="ss-msg">
              {l.text && <>«{l.text}» → </>}
              <code>{l.url}</code>
            </span>
          </li>
        ))}
      </ul>
      {items.length > 20 && (
        <button type="button" className="ss-btn small" onClick={() => setAll(!all)}>
          {all ? 'Згорнути' : `Показати всі (${items.length})`}
        </button>
      )}
    </>
  )
}

export const LinksSection = () => {
  const [key, setKey] = useState(0)
  const { data, error } = useApi<LinkReport>('/api/status/links', key)
  const groups = data
    ? (Object.keys(KINDS) as LinkIssueKind[]).map((k) => ({ kind: k, ...KINDS[k], items: data.issues.filter((i) => i.kind === k) })).filter((g) => g.items.length)
    : []
  const broken = groups.filter((g) => g.broken).reduce((n, g) => n + g.items.length, 0)
  const old = groups.filter((g) => !g.broken).reduce((n, g) => n + g.items.length, 0)
  return (
    <section className="ss-section">
      <div className="ss-section-head">
        <h2>Посилання й картинки в текстах</h2>
        <span className={`ss-chip ${!data ? '' : broken ? 'bad' : old ? 'warn' : 'ok'}`}>
          {!data ? (error ? 'помилка' : 'перевіряю…') : broken ? plural(broken, ['бите', 'битих', 'битих']) : 'битих немає'}
        </span>
        {data && (
          <button type="button" className="ss-btn small" onClick={() => setKey(key + 1)}>
            Перевірити ще раз
          </button>
        )}
      </div>
      {!data && !error && <p className="ss-muted ss-pulse">Перевіряю всі новини й сторінки…</p>}
      {error && <p className="ss-muted">{error}</p>}
      {data && (
        <>
          <p className="ss-muted">
            Перевірено {plural(data.checked, ['посилання й картинку', 'посилання й картинки', 'посилань і картинок'])} у {plural(data.docs, ['тексті', 'текстах', 'текстах'])} (українською та англійською).
          </p>
          {!groups.length && <p>Усі посилання й картинки на місці.</p>}
          {groups.map((g) => (
            <details key={g.kind} className={`ss-group ${g.broken ? 'bad' : 'warn'}`} open={g.broken}>
              <summary>
                <b>{g.items.length}</b> {g.label}
                {!g.broken && <span className="ss-muted"> — працюють, поки працює старий сайт</span>}
              </summary>
              <IssueList items={g.items} />
            </details>
          ))}
        </>
      )}
    </section>
  )
}
