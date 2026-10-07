'use client'

// Випадний список фільтра: вибір одразу застосовується (без JavaScript — кнопкою «Показати»)
export const FilterSelect = ({
  name,
  label,
  value,
  options,
  disabled,
}: {
  name: string
  label: string
  value: string
  options: { value: string; label: string }[]
  disabled?: boolean
}) => (
  <label className="filter-field">
    <span>{label}</span>
    <select name={name} defaultValue={value} disabled={disabled} onChange={(e) => e.currentTarget.form?.requestSubmit()}>
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  </label>
)
