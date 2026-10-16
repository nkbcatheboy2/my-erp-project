import { lazy, Suspense, useEffect, useMemo, useState } from 'react'
import { loadPortalData, submitApplication } from './services/lotteryApi.js'
import PropertyDashboard from './propertyDashboard/PropertyDashboard.jsx'
import './App.css'

const StaffPortal = lazy(() => import('./StaffPortal.jsx'))

const formatDate = (value) => {
  if (!value) return 'To be announced'
  return new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(`${value}T00:00:00`))
}

const formatDateTime = (value) => value
  ? new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
  : 'To be announced'

function Icon({ name, size = 20 }) {
  const paths = {
    arrow: <><path d="M5 12h14" /><path d="m13 6 6 6-6 6" /></>,
    pin: <><path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z" /><circle cx="12" cy="10" r="2.5" /></>,
    calendar: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M16 3v4M8 3v4M3 10h18" /></>,
    home: <><path d="m3 10 9-7 9 7" /><path d="M5 9v12h14V9M9 21v-7h6v7" /></>,
    search: <><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></>,
    close: <><path d="m18 6-12 12M6 6l12 12" /></>,
    check: <><path d="m5 12 4 4L19 6" /></>,
    shield: <><path d="M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11Z" /><path d="m9 12 2 2 4-4" /></>,
    file: <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" /><path d="M14 2v6h6M8 13h8M8 17h8" /></>,
    trophy: <><path d="M8 21h8m-4-4v4M7 4h10v6a5 5 0 0 1-10 0V4Z" /><path d="M7 6H4v2a4 4 0 0 0 4 4m9-6h3v2a4 4 0 0 1-4 4" /></>,
    menu: <><path d="M4 6h16M4 12h16M4 18h16" /></>,
  }

  return (
    <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      {paths[name]}
    </svg>
  )
}

function App() {
  const [lotteries, setLotteries] = useState([])
  const [auctions, setAuctions] = useState([])
  const [results, setResults] = useState([])
  const [isDemo, setIsDemo] = useState(true)
  const [apiIssue, setApiIssue] = useState('')
  const [activeTab, setActiveTab] = useState('all')
  const [activePlanKind, setActivePlanKind] = useState('lottery')
  const [activeSection, setActiveSection] = useState('schemes')
  const [search, setSearch] = useState('')
  const [selectedLottery, setSelectedLottery] = useState(null)
  const [applicationStatus, setApplicationStatus] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [activePortal, setActivePortal] = useState(() => (
    window.sessionStorage.getItem('lda-portal-view')
    || (window.sessionStorage.getItem('lda-staff-portal') === 'open' ? 'staff' : 'citizen')
  ))

  useEffect(() => {
    document.title = activePortal === 'property'
      ? 'Property Management | LDA ERP'
      : activePortal === 'staff'
        ? 'Lottery Operations | LDA Staff Console'
        : 'LDA Lottery | Citizen Portal'
  }, [activePortal])

  useEffect(() => {
    let isCurrent = true
    loadPortalData().then((data) => {
      if (!isCurrent) return
      setLotteries(data.lotteries)
      setAuctions(data.auctions || [])
      setResults(data.results)
      setIsDemo(data.demo)
      setApiIssue(data.issue)
    })
    return () => { isCurrent = false }
  }, [])

  const activePlans = activePlanKind === 'auction' ? auctions : lotteries
  const filteredLotteries = useMemo(() => activePlans.filter((lottery) => {
    const matchesTab = activeTab === 'all' || lottery.status === activeTab
    const query = search.trim().toLowerCase()
    const matchesSearch = !query || `${lottery.title} ${lottery.scheme} ${lottery.location} ${lottery.category}`.toLowerCase().includes(query)
    return matchesTab && matchesSearch
  }), [activePlans, activeTab, search])

  const openLotteries = lotteries.filter((lottery) => lottery.status === 'open').length
  const featuredLottery = activePlans.find((lottery) => lottery.featured && lottery.status === 'open') || activePlans.find((lottery) => lottery.status === 'open')

  const jumpTo = (section) => {
    setActiveSection(section)
    setMobileMenuOpen(false)
    document.getElementById(section)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const startApplication = (lottery) => {
    setApplicationStatus('')
    setSelectedLottery(lottery)
  }

  const handleApplication = async (event) => {
    event.preventDefault()
    if (!selectedLottery) return
    setIsSubmitting(true)
    setApplicationStatus('')
    const formData = new FormData(event.currentTarget)
    const application = Object.fromEntries(formData.entries())
    try {
      const response = await submitApplication(application, selectedLottery)
      setApplicationStatus(response.demo
        ? `Demo only — application ${response.reference} was not sent. Connect Firebase to submit it.`
        : `Application submitted. Your reference number is ${response.reference}.`)
    } catch (error) {
      setApplicationStatus(error instanceof Error ? error.message : 'Submission failed. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (activePortal === 'staff') return <Suspense fallback={<main className="staff-shell"><div className="staff-loading">Opening staff workspace…</div></main>}><StaffPortal onBack={() => {
    window.sessionStorage.removeItem('lda-staff-portal')
    window.sessionStorage.setItem('lda-portal-view', 'property')
    setActivePortal('property')
  }} /></Suspense>

  if (activePortal === 'property') return <PropertyDashboard
    onExit={() => {
      window.sessionStorage.removeItem('lda-portal-view')
      window.sessionStorage.removeItem('lda-staff-portal')
      setActivePortal('citizen')
    }}
    onOpenLotteryOperations={() => {
      window.sessionStorage.setItem('lda-portal-view', 'staff')
      window.sessionStorage.setItem('lda-staff-portal', 'open')
      setActivePortal('staff')
    }}
  />

  return (
    <div className="portal-shell">
      <div className="topline"><span>LUCKNOW DEVELOPMENT AUTHORITY</span><span>जनहित में जारी <i /> Citizen services portal</span></div>
      <header className="site-header">
        <a className="brand" href="#top" onClick={() => setActiveSection('schemes')} aria-label="LDA home">
          <span className="brand-mark"><Icon name="home" size={23} /></span>
          <span><strong>LDA <b>LOTTERY</b></strong><small>Lucknow Development Authority</small></span>
        </a>
        <button className="mobile-menu-button" type="button" onClick={() => setMobileMenuOpen(!mobileMenuOpen)} aria-label="Toggle navigation"><Icon name="menu" /></button>
        <nav className={mobileMenuOpen ? 'main-nav nav-open' : 'main-nav'} aria-label="Main navigation">
          <button className={activeSection === 'schemes' ? 'nav-link active' : 'nav-link'} onClick={() => jumpTo('schemes')}>Lottery schemes</button>
          <button className={activeSection === 'results' ? 'nav-link active' : 'nav-link'} onClick={() => jumpTo('results')}>Draw results</button>
          <button className={activeSection === 'how-it-works' ? 'nav-link active' : 'nav-link'} onClick={() => jumpTo('how-it-works')}>How it works</button>
        </nav>
          <button className="track-button" type="button" onClick={() => {
            window.sessionStorage.setItem('lda-portal-view', 'property')
            window.sessionStorage.removeItem('lda-staff-portal')
            setActivePortal('property')
          }}><Icon name="shield" size={17} /> Staff / ERP login</button>
      </header>

      {isDemo && <div className="demo-notice"><span><Icon name="shield" size={16} /> {apiIssue ? 'Firebase unavailable — showing sample plans.' : 'Preview mode — showing sample plans.'}</span><span>{apiIssue || 'Published lottery, e-auction and draw data will appear here after Firebase setup.'}</span></div>}

      <main id="top">
        <section className="hero-section">
          <div className="hero-copy">
            <div className="eyebrow"><span className="live-dot" /> OFFICIAL LOTTERY & ALLOTMENT PORTAL</div>
            <h1>Your next chapter<br />could <em>start here.</em></h1>
            <p className="hero-lede">Explore LDA housing schemes, apply online, and follow every lottery draw — all in one place.</p>
            <div className="hero-actions">
              <button className="button button-primary" onClick={() => jumpTo('schemes')}>Explore open schemes <Icon name="arrow" size={18} /></button>
              <button className="button button-quiet" onClick={() => jumpTo('results')}><Icon name="trophy" size={18} /> View draw results</button>
            </div>
            <div className="hero-assurance"><span><Icon name="shield" size={17} /> Secure application</span><span><Icon name="check" size={17} /> Transparent draw</span></div>
          </div>
          <div className="hero-art" aria-label="Illustration of a planned neighbourhood" role="img">
            <div className="sun-disc" />
            <div className="art-label"><span className="label-symbol">✳</span><span><b>Make room for</b><strong>what’s next.</strong></span></div>
            <div className="art-hill hill-back" /><div className="art-hill hill-front" />
            <div className="building building-one"><span /><span /><span /><span /></div>
            <div className="building building-two"><span /><span /><span /><span /><span /><span /></div>
            <div className="building building-three"><span /><span /><span /><span /></div>
            <div className="tree tree-one"><i /><b /></div><div className="tree tree-two"><i /><b /></div><div className="tree tree-three"><i /><b /></div>
            <div className="art-footnote">PLANNED FOR PEOPLE <span>·</span> BUILT FOR TOMORROW</div>
          </div>
          <div className="hero-bottom"><span>LUCKNOW, UTTAR PRADESH</span><span>Housing opportunities, made accessible <b>↘</b></span></div>
        </section>

        <section className="stats-strip" aria-label="Portal overview">
          <div className="stat-intro"><span className="stat-icon"><Icon name="home" size={20} /></span><span><strong>One trusted place</strong><small>for your home search</small></span></div>
          <div className="stat-item"><strong>{String(openLotteries).padStart(2, '0')}</strong><span>Open schemes</span></div>
          <div className="stat-item"><strong>{String(lotteries.filter((lottery) => lottery.status === 'upcoming').length).padStart(2, '0')}</strong><span>Coming soon</span></div>
          <div className="stat-item"><strong>{String(results.length).padStart(2, '0')}</strong><span>Draws published</span></div>
          <div className="stat-caption">Updated from official<br />scheme notifications <span>↗</span></div>
        </section>

        <section className="schemes-section content-section" id="schemes" data-plan-kind={activePlanKind}>
          <div className="plan-type-switch" role="tablist" aria-label="Choose a plan type">
            <button role="tab" aria-selected={activePlanKind === 'lottery'} className={activePlanKind === 'lottery' ? 'selected' : ''} onClick={() => { setActivePlanKind('lottery'); setActiveTab('all') }}><Icon name="home" size={17} /> Housing lotteries <span>{lotteries.length}</span></button>
            <button role="tab" aria-selected={activePlanKind === 'auction'} className={activePlanKind === 'auction' ? 'selected auction-selected' : ''} onClick={() => { setActivePlanKind('auction'); setActiveTab('all') }}><Icon name="trophy" size={17} /> E-auctions <span>{auctions.length}</span></button>
          </div>
          <div className="section-heading">
            <div><span className="section-kicker">FIND YOUR PLACE</span><h2>Opportunities <em>open to you.</em></h2><p>Check eligibility, important dates and scheme details before applying.</p></div>
            <div className="scheme-search"><Icon name="search" size={18} /><input aria-label="Search schemes" placeholder="Search schemes or locations" value={search} onChange={(event) => setSearch(event.target.value)} /><kbd>⌕</kbd></div>
          </div>
          {featuredLottery && <article className="featured-card">
            <div className="featured-art"><div className="featured-orbit orbit-one" /><div className="featured-orbit orbit-two" /><div className="featured-house"><span className="house-roof" /><span className="house-body"><i /><i /><b /></span></div><div className="featured-stamp">LDA<br /><small>2026</small></div><div className="featured-caption">A PLACE TO CALL YOURS <span>↗</span></div></div>
            <div className="featured-content"><div className="featured-topline"><span className="status-pill status-open"><i /> Applications open</span><span className="scheme-code">FEATURED SCHEME&nbsp; / &nbsp;01</span></div><p className="scheme-name">{featuredLottery.scheme}</p><h3>{featuredLottery.title}</h3><p className="scheme-description">{featuredLottery.description}</p>
              <div className="featured-facts"><div><span>LOCATION</span><strong><Icon name="pin" size={16} /> {featuredLottery.location}</strong></div><div><span>PLOT / UNIT SIZE</span><strong>{featuredLottery.area}</strong></div><div><span>PRICE RANGE</span><strong>{featuredLottery.price}</strong></div></div>
              <div className="auction-window"><span><strong>EARNEST MONEY</strong><b>₹{Number(featuredLottery.earnestMoney || 0).toLocaleString('en-IN')}</b></span><span><strong>ONLINE BIDDING</strong><b>{formatDateTime(featuredLottery.bidStart)} – {formatDateTime(featuredLottery.bidEnd)}</b></span></div>
              <div className="deadline-row"><div className="deadline-icon"><Icon name="calendar" /></div><div><span>APPLICATION WINDOW</span><strong>{formatDate(featuredLottery.applicationStart)} <b>—</b> {formatDate(featuredLottery.applicationEnd)}</strong></div><span className="units-note">{featuredLottery.availableUnits} units</span></div>
              <button className="button button-primary featured-apply" onClick={() => startApplication(featuredLottery)}>View details & apply <Icon name="arrow" size={18} /></button>
            </div>
          </article>}

          <div className="catalog-heading"><div><span className="section-kicker">THE LATEST RELEASES</span><h3>{activePlanKind === 'auction' ? 'Open e-auctions' : 'All lottery schemes'} <span className="count-chip">{filteredLotteries.length}</span></h3></div><div className="filter-tabs" role="tablist" aria-label="Filter plans">{[['all', 'All plans'], ['open', 'Open now'], ['upcoming', 'Coming soon']].map(([value, label]) => <button key={value} role="tab" aria-selected={activeTab === value} className={activeTab === value ? 'filter-tab selected' : 'filter-tab'} onClick={() => setActiveTab(value)}>{label}</button>)}</div></div>
          <div className="scheme-grid">{filteredLotteries.map((lottery, index) => <article className="scheme-card" key={lottery.id}><div className={`card-art card-art-${index % 3}`}><span className="card-art-number">0{index + 1}</span><div className="mini-home"><i /><b /></div><span className={`status-pill ${lottery.status === 'open' ? 'status-open' : 'status-upcoming'}`}><i />{lottery.status === 'open' ? 'Open for applications' : 'Opening soon'}</span></div><div className="scheme-card-body"><p className="scheme-name">{lottery.scheme}</p><h4>{lottery.title}</h4><p className="card-location"><Icon name="pin" size={15} /> {lottery.location}</p><div className="card-price"><span>FROM</span><strong>{lottery.price}</strong><span>{lottery.area}</span></div><div className="card-dates"><Icon name="calendar" size={16} /><span>{lottery.status === 'open' ? 'Apply by' : 'Applications open'} <strong>{formatDate(lottery.status === 'open' ? lottery.applicationEnd : lottery.applicationStart)}</strong></span></div><button className="text-button" onClick={() => startApplication(lottery)} disabled={lottery.status !== 'open'}>{lottery.status === 'open' ? 'View scheme & apply' : 'Application opens soon'} <Icon name="arrow" size={17} /></button></div></article>)}</div>
          {filteredLotteries.length === 0 && <div className="empty-state"><span><Icon name="search" size={23} /></span><strong>No schemes found</strong><p>Try another search or choose a different filter.</p></div>}
          <p className="data-note"><span>i</span> Dates, prices and availability shown here are indicative. Refer to the official scheme brochure before applying.</p>
        </section>

        <section className="how-section" id="how-it-works"><div className="how-intro"><span className="section-kicker">SIMPLE. FAIR. ONLINE.</span><h2>A clearer path<br />to <em>your new address.</em></h2><p>From application to allotment, stay informed at every step.</p><button className="text-button how-link" onClick={() => jumpTo('results')}>See published draw results <Icon name="arrow" size={17} /></button></div><div className="steps-list"><article className="step-card"><span className="step-number">01</span><span className="step-icon"><Icon name="file" /></span><div><h3>Choose a scheme</h3><p>Compare locations, eligibility, unit sizes and the application window.</p></div></article><article className="step-card"><span className="step-number">02</span><span className="step-icon"><Icon name="check" /></span><div><h3>Submit your details</h3><p>Complete the citizen application and keep your reference number safe.</p></div></article><article className="step-card"><span className="step-number">03</span><span className="step-icon"><Icon name="trophy" /></span><div><h3>Follow the draw</h3><p>Check published lottery results and the next steps for successful applicants.</p></div></article></div></section>

        <section className="results-section content-section" id="results"><div className="section-heading results-heading"><div><span className="section-kicker">PUBLIC & TRANSPARENT</span><h2>Every draw, <em>in the open.</em></h2><p>Lottery execution updates and published outcomes from LDA.</p></div><span className="results-seal"><Icon name="trophy" size={20} /> OFFICIAL<br />DRAW RECORDS</span></div><div className="results-list">{results.map((result, index) => <article className="result-row" key={result.id}><span className="result-index">0{index + 1}</span><div className="result-main"><span className="result-scheme">{result.scheme}</span><h3>{result.title}</h3><span className="result-location"><Icon name="pin" size={15} /> {result.location}</span></div><div className="result-stat"><strong>{Number(result.applications || 0).toLocaleString('en-IN')}</strong><span>Applications</span></div><div className="result-stat"><strong>{Number(result.winners || 0).toLocaleString('en-IN')}</strong><span>Allottees</span></div><div className="result-date"><span>DRAW PUBLISHED</span><strong>{formatDate(result.publishedAt)}</strong></div><button className="result-action" aria-label={`View ${result.title} draw details`} onClick={() => setApplicationStatus(`Draw record: ${result.title} — ${result.winners} allottees from ${Number(result.applications || 0).toLocaleString('en-IN')} applications. Published ${formatDate(result.publishedAt)}.`)}><Icon name="arrow" size={19} /></button></article>)}</div>{results.length === 0 && <div className="empty-state"><strong>No draw results published yet</strong><p>Published lottery execution details will appear here.</p></div>}<div className="results-footnote"><span><Icon name="shield" size={16} /> Draw results are published by the authority after verification.</span><button className="text-button" onClick={() => setApplicationStatus('To check an application or draw result, use the reference number issued by LDA and contact the scheme help desk.')}>Help with results <Icon name="arrow" size={16} /></button></div></section>

        <section className="help-banner"><div className="help-symbol">?</div><div><span>NEED A HAND?</span><h3>Let’s make this a little easier.</h3><p>Keep your identity, address and income documents ready before you apply.</p></div><button className="button button-light" onClick={() => setApplicationStatus('Before you apply: keep a valid identity proof, address proof, recent photograph and income/caste certificates (if applicable) ready.')}>What should I prepare? <Icon name="arrow" size={17} /></button></section>
      </main>

      <footer className="site-footer"><a className="footer-brand" href="#top"><span className="brand-mark"><Icon name="home" size={20} /></span><span><strong>LDA LOTTERY</strong><small>Lucknow Development Authority</small></span></a><span>© 2026 Lucknow Development Authority</span><span>Citizen-first. Transparent by design.</span></footer>

      {applicationStatus && !selectedLottery && <div className="toast-backdrop" role="presentation" onClick={() => setApplicationStatus('')}><div className="info-toast" role="status" onClick={(event) => event.stopPropagation()}><span className="toast-icon"><Icon name="shield" /></span><p>{applicationStatus}</p><button aria-label="Close message" onClick={() => setApplicationStatus('')}><Icon name="close" size={18} /></button></div></div>}

      {selectedLottery && <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !isSubmitting) setSelectedLottery(null) }}><section className="application-modal" role="dialog" aria-modal="true" aria-labelledby="application-title" data-plan-type={selectedLottery.planType || 'lottery'}>
        <div className="modal-head"><div><span className="section-kicker">{selectedLottery.planType === 'auction' ? 'E-AUCTION REGISTRATION' : 'LOTTERY APPLICATION'}</span><h2 id="application-title">Your details, <em>please.</em></h2><p>{selectedLottery.scheme} · {selectedLottery.title}</p></div><button className="modal-close" type="button" aria-label="Close application" onClick={() => setSelectedLottery(null)}><Icon name="close" /></button></div>
        <div className="modal-scheme-summary"><span className="status-pill status-open"><i /> Applications open</span><span>Apply by <strong>{formatDate(selectedLottery.applicationEnd)}</strong></span></div>
        <form className="application-form" onSubmit={handleApplication}>
          <div className="form-section-title"><span>01</span><div><strong>Applicant information</strong><small>Enter the details as they appear on your documents.</small></div></div>
          <div className="form-grid">
            <label>Full name <b>*</b><input name="fullName" autoComplete="name" required placeholder="As per Aadhaar / ID proof" /></label>
            <label>Father / spouse name <b>*</b><input name="guardianName" required placeholder="Parent or spouse full name" /></label>
            <label>Date of birth <b>*</b><input name="dateOfBirth" type="date" required /></label>
            <label>Gender <b>*</b><select name="gender" required defaultValue=""><option value="" disabled>Select gender</option><option>Female</option><option>Male</option><option>Other</option><option>Prefer not to say</option></select></label>
            <label>Mobile number <b>*</b><input name="mobile" type="tel" autoComplete="tel" pattern="[0-9]{10}" maxLength="10" required placeholder="10-digit mobile number" /></label>
            <label>Email address<input name="email" type="email" autoComplete="email" placeholder="name@example.com" /></label>
            <label>Aadhaar / ID number <b>*</b><input name="identityNumber" required placeholder="Enter your identity number" /></label>
            <label>Annual family income (₹) <b>*</b><input name="annualIncome" type="number" min="0" required placeholder="e.g. 360000" /></label>
            <label>Category <b>*</b><select name="category" required defaultValue=""><option value="" disabled>Select category</option><option>General</option><option>Scheduled Caste (SC)</option><option>Scheduled Tribe (ST)</option><option>Other Backward Class (OBC)</option><option>Economically Weaker Section (EWS)</option><option>Other</option></select></label>
            <label>Occupation<input name="occupation" placeholder="Your occupation" /></label>
          </div>
          {selectedLottery.planType === 'auction' && <div className="form-grid auction-bid-grid"><label className="field-wide">Your intended bid amount (₹) <b>*</b><input name="bidAmount" type="number" min={selectedLottery.reservePrice || 1} required placeholder={`Minimum bid ₹${selectedLottery.reservePrice || 'as per reserve price'}`} /></label></div>}
          <div className="form-section-title address-title"><span>02</span><div><strong>Current address</strong><small>Where we can reach you about this application.</small></div></div>
          <div className="form-grid">
            <label className="field-wide">House / street / locality <b>*</b><input name="address" autoComplete="street-address" required placeholder="House number, street and locality" /></label>
            <label>City / district <b>*</b><input name="city" required defaultValue="Lucknow" /></label>
            <label>State <b>*</b><input name="state" required defaultValue="Uttar Pradesh" /></label>
            <label>PIN code <b>*</b><input name="pinCode" inputMode="numeric" pattern="[0-9]{6}" maxLength="6" required placeholder="6-digit PIN code" /></label>
            <label>Preferred unit size<select name="unitPreference" defaultValue=""><option value="">No preference</option><option>Small</option><option>Medium</option><option>Large</option></select></label>
          </div>
          <div className="document-hint"><Icon name="file" size={18} /><span><strong>Documents may be required later</strong><small>Keep your ID, address, income and category certificates ready. Upload requirements will be confirmed by the scheme.</small></span></div>
          <label className="consent-check"><input type="checkbox" name="declaration" required /><span>I confirm that the information provided is correct and agree to the scheme terms. <b>*</b></span></label>
          {applicationStatus && <p className={applicationStatus.startsWith('Demo only') ? 'form-message demo-message' : 'form-message'} role="status">{applicationStatus}</p>}
          <div className="modal-actions">
            <p><Icon name="shield" size={16} /> Your information is used only for this application.</p>
            <button className="button button-primary" type="submit" disabled={isSubmitting}>{isSubmitting ? 'Submitting…' : 'Submit application'} <Icon name="arrow" size={18} /></button>
          </div>
          <p className="required-note">* Required fields. The final document checklist and eligibility are governed by the official scheme brochure.</p>
        </form></section></div>}
    </div>
  )
}

export default App
