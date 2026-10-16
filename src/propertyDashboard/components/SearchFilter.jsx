import Icon from './Icon.jsx'

export default function SearchFilter({ value, onChange, placeholder, label }) {
  return (
    <label className="pm-search">
      <Icon name="search" size={17} />
      <span className="pm-sr-only">{label}</span>
      <input
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
      />
      {value && (
        <button type="button" aria-label="Clear search" onClick={() => onChange('')}>
          <Icon name="close" size={15} />
        </button>
      )}
    </label>
  )
}
