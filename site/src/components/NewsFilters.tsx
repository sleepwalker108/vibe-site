import type { Dict } from '@/lib/dictionary'
import { hasNewsFilter, withParams, type NewsFilter } from '@/lib/newsFilters'
import type { TopicItem } from '@/lib/topics'
import { FilterForm } from './FilterForm'
import { FilterSelect } from './FilterSelect'
import { NavLink } from './ListNav'

type SP = Record<string, string | string[] | undefined>

// Панель фільтрів новин: категорії з адмінки (кнопки з кількістю), рік, місяць, порядок; на сторінці «Новини» — ще й пошук у новинах
export const NewsFilters = ({
  path,
  sp,
  filter,
  counts,
  topics,
  years,
  t,
  query,
  hidden = {},
}: {
  path: string
  sp: SP
  filter: NewsFilter
  counts: { all: number; byTopic: Record<string, number> }
  topics: TopicItem[]
  years: number[]
  t: Dict
  query?: string // поле «Пошук у новинах» (лише на сторінці «Новини»)
  hidden?: Record<string, string>
}) => {
  const active = hasNewsFilter(filter) || filter.sort === 'old' || !!query
  const resetHref = withParams(path, hidden, {})
  return (
    <div className="filters">
      <p className="filters-title">{t.filterTopic}</p>
      <nav className="topic-chips" aria-label={t.filterTopic}>
        <NavLink
          href={withParams(path, sp, { topic: undefined })}
          aria-current={!filter.topic ? 'true' : undefined}
        >
          {t.filterAll} <span>{counts.all}</span>
        </NavLink>
        {/* категорії без жодної новини (з урахуванням інших фільтрів) не показуємо */}
        {topics
          .filter((tp) => counts.byTopic[tp.slug] || filter.topic?.id === tp.id)
          .map((tp) => (
            <NavLink
              key={tp.id}
              href={withParams(path, sp, { topic: tp.slug })}
              aria-current={filter.topic?.id === tp.id ? 'true' : undefined}
            >
              {tp.name} <span>{counts.byTopic[tp.slug] || 0}</span>
            </NavLink>
          ))}
      </nav>
      {/* key: після переходу (напр. «Скинути фільтри») списки показують актуальні значення */}
      <FilterForm
        key={`${filter.topic?.slug}-${filter.year}-${filter.month}-${filter.sort}-${query ?? ''}`}
        className="filter-form"
        action={path}
      >
        {Object.entries(hidden).map(([k, v]) => (
          <input key={k} type="hidden" name={k} value={v} />
        ))}
        {filter.topic && <input type="hidden" name="topic" value={filter.topic.slug} />}
        {query !== undefined && (
          <label className="filter-field filter-q">
            <span>{t.search}</span>
            <input
              type="search"
              name="q"
              defaultValue={query}
              placeholder={t.newsSearchPlaceholder}
            />
          </label>
        )}
        <FilterSelect
          name="year"
          label={t.filterYear}
          value={filter.year ? String(filter.year) : ''}
          options={[
            { value: '', label: t.anyYear },
            ...years.map((y) => ({ value: String(y), label: String(y) })),
          ]}
        />
        <FilterSelect
          name="month"
          label={t.filterMonth}
          value={filter.month ? String(filter.month) : ''}
          disabled={!filter.year}
          options={[
            { value: '', label: t.anyMonth },
            ...t.months.map((m, i) => ({ value: String(i + 1), label: m })),
          ]}
        />
        <FilterSelect
          name="sort"
          label={t.sortLabel}
          value={filter.sort}
          options={[
            { value: 'new', label: t.sortNew },
            { value: 'old', label: t.sortOld },
          ]}
        />
        <button type="submit" className="filter-apply">
          {t.filterApply}
        </button>
        {active && (
          <NavLink className="filter-reset" href={resetHref}>
            {t.filterReset}
          </NavLink>
        )}
      </FilterForm>
    </div>
  )
}
