import Icon from './Icon.jsx'

export default function ReportCard({ report, onSelect }) {
  return (
    <button className="pm-report-card" type="button" onClick={() => onSelect(report)} aria-label={`Open ${report.name} report`}>
      <span className="pm-report-copy">
        <span className="pm-report-name">{report.name}</span>
        <span className="pm-report-description">{report.description}</span>
        <span className="pm-report-tag">{report.tag}</span>
      </span>
      <span className="pm-report-action"><Icon name="arrowUpRight" size={16} /></span>
    </button>
  )
}
