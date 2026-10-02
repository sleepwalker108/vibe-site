'use client'

type Props = { cellData?: boolean | null; rowData?: { id?: string | number }; collection?: string }

// Колонка «Англійська» у списку: «EN ✓» — переклад є (відкрити), «+ EN» — додати переклад
export const EnglishCell = ({ cellData, rowData, collection }: Props) => {
  if (!rowData?.id || !collection) return null
  const href = `/admin/collections/${collection}/${rowData.id}?locale=en`
  return (
    <a
      href={href}
      onClick={(e) => e.stopPropagation()}
      title={cellData ? 'Відкрити англійську версію' : 'Додати англійську версію'}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        padding: '2px 10px',
        borderRadius: 999,
        fontSize: 12,
        fontWeight: 600,
        textDecoration: 'none',
        whiteSpace: 'nowrap',
        border: '1px solid',
        borderColor: cellData ? '#2f9e5f' : 'var(--theme-elevation-250)',
        color: cellData ? '#2f9e5f' : 'var(--theme-elevation-600)',
      }}
    >
      {cellData ? 'EN ✓' : '+ EN'}
    </a>
  )
}
