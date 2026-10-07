import Link from 'next/link'
import type { Dict, Locale } from '@/lib/dictionary'
import { hasNewsFilter, withParams, type NewsFilter } from '@/lib/newsFilters'
import { TOPICS, type Topic } from '@/lib/topics'
import { FilterForm } from './FilterForm'
import { FilterSelect } from './FilterSelect'

type SP = Record<string, string | string[] | undefined>

// Панель фільтрів новин: теми (кнопки з кількістю), рік, місяць, порядок; на сторінці «Новини» — ще й пошук у новинах
export const NewsFilters = ({
  path,
  sp,
  filter,
  counts,
  years,
  t,
  locale,
  query,
  hidden = {},
}: {
  path: string
  sp: SP
  filter: NewsFilter
  counts: { all: number; byTopic: Record<Topic, number> }
  years: number[]
  t: Dict
  locale: Locale
  query?: string // поле «Пошук у новинах» (лише на сторінці «Новини»)
  hidden?: Record<string, string>
}) => {
  const active = hasNewsFilter(filter) || filter.sort === 'old' || !!query
  const resetHref = withParams(path, hidden, {})
  return (
    <div className="filters">
      <nav className="topic-chips" aria-label={t.filterTopic}>
        <Link href={withParams(path, sp, { topic: undefined })} aria-current={!filter.topic ? 'true' : undefined} scroll={false}>
          {t.filterAll} <span>{counts.all}</span>
        </Link>
        {TOPICS.filter((tp) => counts.byTopic[tp.value] || filter.topic === tp.value).map((tp) => (
          <Link
            key={tp.value}
            href={withParams(path, sp, { topic: tp.value })}
            aria-current={filter.topic === tp.value ? 'true' : undefined}
            scroll={false}
          >
            {tp[locale]} <span>{counts.byTopic[tp.value]}</span>
          </Link>
        ))}
      </nav>
      {/* key: після переходу (напр. «Скинути фільтри») списки показують актуальні значення */}
      <FilterForm key={`${filter.topic}-${filter.year}-${filter.month}-${filter.sort}-${query ?? ""}`} className="filter-form" action={path}>
        {Object.entries(hidden).map(([k, v]) => (
          <input key={k} type="hidden" name={k} value={v} />
        ))}
        {filter.topic && <input type="hidden" name="topic" value={filter.topic} />}
        {query !== undefined && (
          <label className="filter-field filter-q">
            <span>{t.search}</span>
            <input type="search" name="q" defaultValue={query} placeholder={t.newsSearchPlaceholder} />
          </label>
        )}
        <FilterSelect
          name="year"
          label={t.filterYear}
          value={filter.year ? String(filter.year) : ''}
          options={[{ value: '', label: t.anyYear }, ...years.map((y) => ({ value: String(y), label: String(y) }))]}
        />
        <FilterSelect
          name="month"
          label={t.filterMonth}
          value={filter.month ? String(filter.month) : ''}
          disabled={!filter.year}
          options={[{ value: '', label: t.anyMonth }, ...t.months.map((m, i) => ({ value: String(i + 1), label: m }))]}
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
          <Link className="filter-reset" href={resetHref}>
            {t.filterReset}
          </Link>
        )}
      </FilterForm>
    </div>
  )
}
