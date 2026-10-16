import { useMemo } from 'react'
import { reportGroups } from '../data.js'
import Icon from './Icon.jsx'
import ReportCard from './ReportCard.jsx'

export default function MISGrid({ query, onSelect }) {
  const groups = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()
    if (!normalizedQuery) return reportGroups

    return reportGroups
      .map((group) => ({
        ...group,
        reports: group.reports.filter((report) => (
          `${report.name} ${report.description} ${report.tag} ${group.name}`.toLowerCase().includes(normalizedQuery)
        )),
      }))
      .filter((group) => group.reports.length > 0)
  }, [query])

  if (groups.length === 0) {
    return (
      <div className="pm-empty-state" role="status">
        <span className="pm-empty-icon"><Icon name="search" size={21} /></span>
        <strong>No reports found</strong>
        <span>Try a different keyword or clear your search.</span>
      </div>
    )
  }

  return (
    <div className="pm-report-groups">
      {groups.map((group) => (
        <section className="pm-report-group" key={group.name}>
          <div className="pm-group-heading">
            <span className={`pm-group-icon tone-${group.tone}`}><Icon name={group.icon} size={17} /></span>
            <h3>{group.name}</h3>
            <span className="pm-group-count">{group.reports.length.toString().padStart(2, '0')}</span>
            <span className="pm-group-rule" />
          </div>
          <div className="pm-report-list">
            {group.reports.map((report) => <ReportCard key={report.name} report={report} onSelect={onSelect} />)}
          </div>
        </section>
      ))}
    </div>
  )
}
