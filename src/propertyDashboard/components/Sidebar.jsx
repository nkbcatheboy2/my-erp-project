import { useMemo, useState } from 'react'
import { menuItems } from '../data.js'
import Icon from './Icon.jsx'
import SearchFilter from './SearchFilter.jsx'

export default function Sidebar({ open, onClose, activeItem, onSelect }) {
  const [query, setQuery] = useState('')
  const [expanded, setExpanded] = useState(['Property Pendency', 'MIS Reports'])
  const filteredItems = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()
    if (!normalizedQuery) return menuItems
    return menuItems
      .map((item) => {
        const children = item.children.filter((child) => child.toLowerCase().includes(normalizedQuery))
        return { ...item, children, matches: item.label.toLowerCase().includes(normalizedQuery) }
      })
      .filter((item) => item.matches || item.children.length > 0)
  }, [query])

  const toggleGroup = (label) => {
    setExpanded((current) => current.includes(label)
      ? current.filter((item) => item !== label)
      : [...current, label])
  }

  return (
    <>
      {open && <button className="pm-sidebar-scrim" type="button" aria-label="Close navigation" onClick={onClose} />}
      <aside className={`pm-sidebar${open ? ' is-open' : ''}`} aria-label="Property management navigation">
        <div className="pm-sidebar-heading">
          <span>WORKSPACE</span>
          <button className="pm-sidebar-close" type="button" onClick={onClose} aria-label="Close navigation"><Icon name="close" /></button>
        </div>
        <SearchFilter value={query} onChange={setQuery} placeholder="Search in menu..." label="Search in menu" />
        <nav className="pm-menu">
          <div className="pm-menu-caption">PROPERTY MANAGEMENT</div>
          {filteredItems.map((item) => {
            const isExpanded = query.trim() ? true : expanded.includes(item.label)
            const isActive = activeItem === item.label || item.children.includes(activeItem)
            return (
              <div className="pm-menu-group" key={item.label}>
                <button
                  type="button"
                  className={`pm-menu-link${isActive ? ' is-active' : ''}`}
                  aria-expanded={isExpanded}
                  onClick={() => {
                    toggleGroup(item.label)
                    onSelect(item.label)
                  }}
                >
                  <Icon name={item.icon} size={17} />
                  <span>{item.label}</span>
                  {item.badge && <span className="pm-menu-badge">{item.badge}</span>}
                  <span className={`pm-menu-chevron${isExpanded ? ' is-expanded' : ''}`}><Icon name="chevron" size={14} /></span>
                </button>
                {isExpanded && (
                  <div className="pm-menu-children">
                    {item.children.map((child) => (
                      <button
                        className={`pm-menu-child${activeItem === child ? ' is-active' : ''}`}
                        key={child}
                        type="button"
                        onClick={() => {
                          onSelect(child)
                          onClose()
                        }}
                      >
                        <span className="pm-menu-child-dot" />{child}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
          {filteredItems.length === 0 && <p className="pm-menu-empty">No menu items match “{query}”.</p>}
        </nav>
        {/* <div className="pm-sidebar-footer">
          <span className="pm-sidebar-footer-mark">L</span>
          <span><strong>Lucknow Development Authority</strong><small>Property Management ERP · v1.0</small></span>
        </div> */}
      </aside>
    </>
  )
}
