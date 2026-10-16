import { useState } from 'react'
import { dashboardMetrics } from './data.js'
import Icon from './components/Icon.jsx'
import MISGrid from './components/MISGrid.jsx'
import Navbar from './components/Navbar.jsx'
import SearchFilter from './components/SearchFilter.jsx'
import Sidebar from './components/Sidebar.jsx'
import './propertyDashboard.css'

const formattedToday = new Intl.DateTimeFormat('en-IN', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
}).format(new Date())

function MetricCard({ metric }) {
  return (
    <article className="pm-metric-card">
      <span className={`pm-metric-icon tone-${metric.tone}`}><Icon name={metric.icon} size={18} /></span>
      <span className="pm-metric-label">{metric.label}</span>
      <strong className="pm-metric-value">{metric.value}</strong>
      <span className={`pm-metric-change${metric.tone === 'amber' ? ' is-warning' : ''}`}>{metric.change}</span>
    </article>
  )
}

export default function PropertyDashboard({ onExit, onOpenLotteryOperations }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [reportSearch, setReportSearch] = useState('')
  const [activeMenu, setActiveMenu] = useState('Dashboard')
  const [selectedReport, setSelectedReport] = useState(null)

  return (
    <div className="pm-shell">
      <Navbar
        onMenuToggle={() => setSidebarOpen((open) => !open)}
        onLogout={onExit}
        onOpenLotteryOperations={onOpenLotteryOperations}
      />
      <div className="pm-workspace">
        <Sidebar
          open={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          activeItem={activeMenu}
          onSelect={setActiveMenu}
        />
        <main className="pm-main">
          <div className="pm-breadcrumb"><span>Home</span><Icon name="chevron" size={13} /><span>Property</span><Icon name="chevron" size={13} /><strong>Dashboard: Property Management</strong></div>
          <section className="pm-page-heading">
            <div>
              <div className="pm-eyebrow"><span className="pm-live-dot" /> PROPERTY MANAGEMENT · OVERVIEW</div>
              <h1>Dashboard <span>/</span> Property Management</h1>
              <p>Good morning, Arun. Here’s your property operations snapshot for today.</p>
            </div>
            <div className="pm-date-chip"><Icon name="clock" size={15} /> {formattedToday}</div>
          </section>

          <section className="pm-metrics" aria-label="Property management summary">
            {dashboardMetrics.map((metric) => <MetricCard key={metric.label} metric={metric} />)}
          </section>

          <section className="pm-mis-section" aria-labelledby="pm-mis-heading">
            <div className="pm-mis-top">
              <div>
                <div className="pm-section-kicker">INSIGHTS &amp; ANALYTICS</div>
                <h2 id="pm-mis-heading">MIS / Report Links <span>of Property Management</span></h2>
                <p>Access operational reports, track service levels, and review collections.</p>
              </div>
              <SearchFilter
                value={reportSearch}
                onChange={setReportSearch}
                placeholder="Search reports..."
                label="Search MIS reports"
              />
            </div>
            <div className="pm-report-summary"><span><span className="pm-summary-dot" /> {reportSearch ? 'FILTERED RESULTS' : 'AVAILABLE REPORTS'}</span><span>{reportSearch ? 'Matching your search' : '25 reports across 4 categories'}</span></div>
            <MISGrid query={reportSearch} onSelect={setSelectedReport} />
          </section>
          <footer className="pm-footer"><span>© 2026 Lucknow Development Authority</span><span>Property Management ERP <i /> Secure internal workspace</span></footer>
        </main>
      </div>
      {selectedReport && (
        <div className="pm-modal-backdrop" role="presentation" onMouseDown={(event) => {
          if (event.target === event.currentTarget) setSelectedReport(null)
        }}>
          <section className="pm-report-modal" role="dialog" aria-modal="true" aria-labelledby="pm-report-title">
            <button className="pm-modal-close" type="button" aria-label="Close report details" onClick={() => setSelectedReport(null)}><Icon name="close" /></button>
            <span className="pm-modal-icon"><Icon name="chart" size={21} /></span>
            <span className="pm-section-kicker">MIS REPORT</span>
            <h2 id="pm-report-title">{selectedReport.name}</h2>
            <p>{selectedReport.description}</p>
            <div className="pm-report-modal-meta"><span>REPORT CATEGORY</span><strong>{selectedReport.tag}</strong></div>
            <div className="pm-report-modal-note">This prototype uses sample dashboard data. Connect the report to an authorised data source to view live records.</div>
            <button className="pm-modal-done" type="button" onClick={() => setSelectedReport(null)}>Close report details</button>
          </section>
        </div>
      )}
    </div>
  )
}
