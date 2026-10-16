import { useEffect, useMemo, useState } from 'react'
import * as XLSX from 'xlsx'
import {
  addStaffDirectoryEntry,
  allotPropertyToApplicant,
  closePropertyAuction,
  createPlan,
  createPropertyApplicant,
  createUniqueProperty,
  getStaffProfile,
  importProperties,
  loadAllStaffReportData,
  loadMoreStaffApplications,
  loadProperties,
  loadPropertyApplicants,
  loadAuditLogs,
  loadStaffData,
  loadStaffDirectory,
  publishResult,
  runPropertyLottery,
  signInStaff,
  signOutStaff,
  updateApplicationStatus,
  updateStaffDirectoryEntry,
  watchAuth,
} from './services/lotteryApi.js'
import { firebaseReady } from './lib/firebase.js'
import './staff.css'

const dateToday = () => {
  const parts = new Intl.DateTimeFormat('en', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date())
  const date = Object.fromEntries(parts.map(({ type, value }) => [type, value]))
  return `${date.year}-${date.month}-${date.day}`
}

function dateLabel(value) {
  if (!value) return '—'
  const date = value?.toDate ? value.toDate() : new Date(value)
  return Number.isNaN(date.getTime())
    ? '—'
    : new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium' }).format(date)
}

function parsePropertyRow(row) {
  const values = Object.fromEntries(Object.entries(row).map(([key, value]) => [
    String(key).toLowerCase().replace(/[^a-z0-9]/g, ''),
    String(value ?? '').trim(),
  ]))
  const pick = (...keys) => keys.map((key) => values[key]).find(Boolean) || ''
  return {
    propertyId: pick('propertyid', 'propertycode', 'id'),
    propertyName: pick('propertyname', 'name', 'property'),
    scheme: pick('scheme', 'schemename'),
    location: pick('location', 'address', 'area', 'locality'),
    propertyType: pick('propertytype', 'type', 'category'),
    area: pick('area', 'size', 'plotsize'),
    cost: Number(pick('cost', 'price', 'amount')) || 0,
    allocationMode: pick('allocationmode', 'allocationmethod') || 'direct',
    auctionStart: pick('auctionstart', 'biddingopens'),
    auctionEnd: pick('auctionend', 'biddingcloses'),
    allotmentMethod: pick('allotmentmethod', 'allotmentmode', 'mode'),
    ownerName: pick('ownername', 'allottee', 'owner'),
    status: pick('status', 'allotmentstatus') || 'available',
    notes: pick('notes', 'remarks', 'description'),
  }
}

function staffCapabilities(profile) {
  const isAdmin = profile?.role === 'admin'
  const isLegacyEmployee = profile?.role === 'employee' && !Array.isArray(profile.permissions)
  const has = (permission) => isAdmin || isLegacyEmployee || profile?.permissions?.includes(permission)
  return {
    applications: has('applications'),
    propertyApplicants: has('propertyApplicants'),
    lottery: has('lottery'),
    auction: has('auction'),
    fcfs: has('fcfs'),
    properties: has('properties'),
    payroll: has('payroll'),
    superAdmin: staffIsSuperAdmin(profile),
    admin: isAdmin,
  }
}

function staffIsSuperAdmin(profile) {
  return profile?.role === 'admin' && (!profile.accessProfile || profile.accessProfile === 'super_admin')
}

function StaffPortal({ onBack }) {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [authLoading, setAuthLoading] = useState(firebaseReady)
  const [dataLoading, setDataLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [activeView, setActiveView] = useState('applications')
  const [activeModule, setActiveModule] = useState('lottery')
  const [hrmsSection, setHrmsSection] = useState('properties')
  const [planType, setPlanType] = useState('lottery')
  const [plans, setPlans] = useState([])
  const [applications, setApplications] = useState([])
  const [results, setResults] = useState([])
  const [applicationCursor, setApplicationCursor] = useState(null)
  const [selectedApplication, setSelectedApplication] = useState(null)
  const [selectedPropertyApplicant, setSelectedPropertyApplicant] = useState(null)
  const [hasMoreApplications, setHasMoreApplications] = useState(false)
  const [queryText, setQueryText] = useState('')
  const [applicationFilter, setApplicationFilter] = useState('all')
  const [propertySearch, setPropertySearch] = useState('')
  const [propertyStatusFilter, setPropertyStatusFilter] = useState('all')
  const [propertyApplicantSearch, setPropertyApplicantSearch] = useState('')
  const [propertyApplicantModeFilter, setPropertyApplicantModeFilter] = useState('all')
  const [propertyApplicantStatusFilter, setPropertyApplicantStatusFilter] = useState('all')
  const [properties, setProperties] = useState([])
  const [propertyApplicants, setPropertyApplicants] = useState([])
  const [auditLogs, setAuditLogs] = useState([])
  const [staffDirectory, setStaffDirectory] = useState([])
  const [editingStaff, setEditingStaff] = useState(null)
  const [staffAccessProfile, setStaffAccessProfile] = useState('employee_lottery')
  const [salarySlipStaff, setSalarySlipStaff] = useState(null)
  const [salarySlipMonth, setSalarySlipMonth] = useState(() => new Date().toISOString().slice(0, 7))
  const [reportExporting, setReportExporting] = useState(false)
  const [propertyAllocationMode, setPropertyAllocationMode] = useState('lottery')
  const [selectedApplicationPropertyId, setSelectedApplicationPropertyId] = useState('')
  const [propertyMessage, setPropertyMessage] = useState('')
  const [propertyErrors, setPropertyErrors] = useState([])

  const applyStaffData = (data) => {
    setPlans(data.plans)
    setApplications(data.applications)
    setApplicationCursor(data.applicationCursor)
    setHasMoreApplications(data.hasMoreApplications)
    setResults(data.results)
  }

  useEffect(() => {
    if (!firebaseReady) return undefined

    let active = true
    let unsubscribe = () => {}
    watchAuth(async (authUser) => {
      if (!active) return
      setUser(authUser)
      setProfile(null)
      setError('')
      setStaffDirectory([])
      setAuditLogs([])
      setProperties([])
      setPropertyApplicants([])
      setApplications([])
      setPlans([])
      setResults([])
      if (!authUser) {
        setAuthLoading(false)
        return
      }

      setAuthLoading(true)
      try {
        const staffProfile = await getStaffProfile(authUser.uid)
        if (!active) return
        setProfile(staffProfile)
        const capabilities = staffCapabilities(staffProfile)
        const hasLotteryPermission = capabilities.lottery || capabilities.auction
        setActiveModule(hasLotteryPermission ? 'lottery' : 'hrms')
        setActiveView(capabilities.applications ? 'applications' : 'plans')
        setHrmsSection(capabilities.payroll && !hasLotteryPermission ? 'payroll' : 'properties')
        if (!staffProfile?.active || !['admin', 'employee'].includes(staffProfile.role)) {
          setError('This account does not have an active LDA staff role. Ask an administrator to grant access.')
        } else {
          const [data, propertyRecords, applicantRecords, staffRecords, auditRecords] = await Promise.all([
            loadStaffData({ ...capabilities, lottery: capabilities.lottery || capabilities.auction }),
            capabilities.properties || capabilities.propertyApplicants ? loadProperties() : Promise.resolve([]),
            capabilities.propertyApplicants ? loadPropertyApplicants() : Promise.resolve([]),
            staffIsSuperAdmin(staffProfile) ? loadStaffDirectory() : Promise.resolve([]),
            staffProfile.role === 'admin' ? loadAuditLogs() : Promise.resolve([]),
          ])
          if (active) {
            applyStaffData(data)
            setProperties(propertyRecords)
            setPropertyApplicants(applicantRecords)
            setStaffDirectory(staffRecords)
            setAuditLogs(auditRecords)
          }
        }
      } catch (loadError) {
        if (active) setError(loadError instanceof Error ? loadError.message : 'Could not load staff access or records. Check Firestore rules and indexes.')
      } finally {
        if (active) setAuthLoading(false)
      }
    }).then((stopListening) => {
      if (active) unsubscribe = stopListening
      else stopListening()
    }).catch(() => {
      if (active) {
        setError('Could not start Firebase Authentication. Check the Firebase configuration.')
        setAuthLoading(false)
      }
    })

    return () => {
      active = false
      unsubscribe()
    }
  }, [])

  const refreshData = async () => {
    setDataLoading(true)
    setError('')
    try {
      const capabilities = staffCapabilities(profile)
      const data = await loadStaffData({ ...capabilities, lottery: capabilities.lottery || capabilities.auction })
      applyStaffData(data)
      const [propertyRecords, applicantRecords] = await Promise.all([
        capabilities.properties || capabilities.propertyApplicants ? loadProperties() : Promise.resolve([]),
        capabilities.propertyApplicants ? loadPropertyApplicants() : Promise.resolve([]),
      ])
      setProperties(propertyRecords)
      setPropertyApplicants(applicantRecords)
      if (staffIsSuperAdmin(profile)) setStaffDirectory(await loadStaffDirectory())
      if (profile?.role === 'admin') setAuditLogs(await loadAuditLogs())
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Could not load staff data.')
    } finally {
      setDataLoading(false)
    }
  }

  const visibleApplications = useMemo(() => applications.filter((application) => {
    const matchesStatus = applicationFilter === 'all' || application.status === applicationFilter
    const term = queryText.trim().toLowerCase()
    const matchesSearch = !term || [application.fullName, application.reference, application.mobile, application.planTitle, application.scheme]
      .some((value) => String(value || '').toLowerCase().includes(term))
    return matchesStatus && matchesSearch
  }), [applicationFilter, applications, queryText])

  const visibleProperties = useMemo(() => properties.filter((property) => {
    const term = propertySearch.trim().toLowerCase()
    const matchesSearch = !term || [property.propertyId, property.propertyName, property.scheme, property.location, property.propertyType, property.ownerName]
      .some((value) => String(value || '').toLowerCase().includes(term))
    const matchesStatus = propertyStatusFilter === 'all' || (property.status || 'available') === propertyStatusFilter
    return matchesSearch && matchesStatus
  }), [properties, propertySearch, propertyStatusFilter])

  const visiblePropertyApplicants = useMemo(() => propertyApplicants.filter((application) => {
    const property = properties.find((item) => (item.propertyId || item.id) === application.propertyId)
    const term = propertyApplicantSearch.trim().toLowerCase()
    const matchesSearch = !term || [application.fullName, application.mobile, application.propertyId, property?.propertyName, property?.scheme]
      .some((value) => String(value || '').toLowerCase().includes(term))
    const matchesMode = propertyApplicantModeFilter === 'all' || application.allotmentMethod === propertyApplicantModeFilter
    const matchesStatus = propertyApplicantStatusFilter === 'all' || application.status === propertyApplicantStatusFilter
    return matchesSearch && matchesMode && matchesStatus
  }), [properties, propertyApplicantModeFilter, propertyApplicantSearch, propertyApplicantStatusFilter, propertyApplicants])

  const handleSignIn = async (event) => {
    event.preventDefault()
    setSaving(true)
    setError('')
    try {
      await signInStaff(email.trim(), password)
      setPassword('')
    } catch (signInError) {
      const code = signInError?.code
      setError(code === 'auth/invalid-credential' || code === 'auth/wrong-password'
        ? 'Email or password is incorrect.'
        : 'Could not sign in. Check Email/Password authentication and your staff account.')
    } finally {
      setSaving(false)
    }
  }

  const handlePlanCreate = async (event) => {
    event.preventDefault()
    const formElement = event.currentTarget
    const form = new FormData(formElement)
    const start = String(form.get('applicationStart'))
    const end = String(form.get('applicationEnd'))
    if (end < start) {
      setError('Application closing date must be on or after the opening date.')
      return
    }

    if (planType === 'auction') {
      const bidStart = String(form.get('bidStart'))
      const bidEnd = String(form.get('bidEnd'))
      if (!form.get('reservePrice') || !form.get('earnestMoney') || !bidStart || !bidEnd || bidEnd < bidStart) {
        setError('Enter the reserve price, earnest money, and valid e-auction bidding dates.')
        return
      }
    }

    const plan = {
      planType,
      title: String(form.get('title')).trim(),
      scheme: String(form.get('scheme')).trim(),
      location: String(form.get('location')).trim(),
      category: String(form.get('category')).trim(),
      price: planType === 'auction' ? `₹${Number(form.get('reservePrice')).toLocaleString('en-IN')} reserve price` : `₹${Number(form.get('price')).toLocaleString('en-IN')}`,
      area: String(form.get('area')).trim(),
      availableUnits: Number(form.get('availableUnits')),
      applicationStart: start,
      applicationEnd: end,
      status: start > dateToday() ? 'upcoming' : end >= dateToday() ? 'open' : 'closed',
      description: String(form.get('description')).trim(),
      highlights: String(form.get('highlights')).split(',').map((item) => item.trim()).filter(Boolean),
      featured: form.get('featured') === 'on',
      isPublished: form.get('isPublished') === 'on',
    }

    if (planType === 'auction') {
      plan.reservePrice = Number(form.get('reservePrice'))
      plan.earnestMoney = Number(form.get('earnestMoney'))
      plan.bidStart = String(form.get('bidStart'))
      plan.bidEnd = String(form.get('bidEnd'))
    }

    setSaving(true)
    setError('')
    setNotice('')
    try {
      await createPlan(plan, user.uid)
      setNotice(`${planType === 'auction' ? 'E-auction' : 'Lottery'} plan created${plan.isPublished ? ' and published' : ' as a draft'}.`)
      formElement.reset()
      setPlanType('lottery')
      await refreshData()
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Could not create the plan.')
    } finally {
      setSaving(false)
    }
  }

  const handleResultCreate = async (event) => {
    event.preventDefault()
    const formElement = event.currentTarget
    const form = new FormData(formElement)
    const plan = plans.find((item) => item.id === form.get('planId'))
    if (!plan) {
      setError('Choose a plan before publishing its result.')
      return
    }

    const result = {
      planId: plan.id,
      type: plan.planType,
      title: String(form.get('title')).trim(),
      scheme: plan.scheme,
      location: plan.location,
      publishedAt: String(form.get('publishedAt')),
      winners: Number(form.get('winners')),
      applications: Number(form.get('applications')),
      status: 'Published',
      isPublished: true,
    }
    setSaving(true)
    setError('')
    setNotice('')
    try {
      await publishResult(result, user.uid)
      setNotice('Verified draw / auction result published to the citizen portal.')
      formElement.reset()
      await refreshData()
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Could not publish the result.')
    } finally {
      setSaving(false)
    }
  }

  const handleStatusChange = async (application, status) => {
    setError('')
    try {
      await updateApplicationStatus(application.id, status, user.uid)
      setApplications((current) => current.map((item) => item.id === application.id ? { ...item, status } : item))
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : 'Could not update application status.')
    }
  }

  const handleLoadMore = async () => {
    setDataLoading(true)
    setError('')
    try {
      const page = await loadMoreStaffApplications(applicationCursor)
      setApplications((current) => [...current, ...page.applications])
      setApplicationCursor(page.cursor)
      setHasMoreApplications(page.hasMore)
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Could not load more applications.')
    } finally {
      setDataLoading(false)
    }
  }

  const handleCreateProperty = async (event) => {
    event.preventDefault()
    const formElement = event.currentTarget
    const values = Object.fromEntries(new FormData(formElement).entries())
    if (propertyAllocationMode === 'auction'
      && (!values.auctionStart || !values.auctionEnd || new Date(values.auctionEnd) <= new Date(values.auctionStart))) {
      setPropertyErrors(['Auction closing time must be after its opening time.'])
      return
    }
    const property = {
      propertyId: String(values.propertyId || '').trim(),
      propertyName: String(values.propertyName || '').trim(),
      scheme: String(values.scheme || '').trim(),
      location: String(values.location || '').trim(),
      propertyType: String(values.propertyType || '').trim(),
      area: String(values.area || '').trim(),
      cost: Number(values.cost || 0),
      allotmentMethod: '',
      allocationMode: String(values.allocationMode || propertyAllocationMode),
      ownerName: String(values.ownerName || '').trim(),
      status: String(values.status || 'available'),
      ...(values.auctionStart ? { auctionStart: String(values.auctionStart) } : {}),
      ...(values.auctionEnd ? { auctionEnd: String(values.auctionEnd) } : {}),
      notes: String(values.notes || '').trim(),
    }
    setSaving(true)
    setPropertyMessage('')
    setPropertyErrors([])
    try {
      const propertyId = await createUniqueProperty(property, user.uid)
      setPropertyMessage(`Property saved with unique ID ${propertyId}.`)
      formElement.reset()
      setProperties(await loadProperties())
    } catch (saveError) {
      setPropertyErrors([saveError instanceof Error ? saveError.message : 'Could not save property.'])
    } finally {
      setSaving(false)
    }
  }

  const handlePropertyApplication = async (event) => {
    event.preventDefault()
    const formElement = event.currentTarget
    const values = Object.fromEntries(new FormData(formElement).entries())
    const application = Object.fromEntries(Object.entries(values).map(([key, value]) => [key, String(value).trim()]))
    const property = properties.find((item) => (item.propertyId || item.id) === application.propertyId)
    application.allotmentMethod = property?.allocationMode || application.allotmentMethod || 'direct'
    application.basePrice = Number(property?.cost || 0)
    setSaving(true)
    setError('')
    setNotice('')
    try {
      const reference = await createPropertyApplicant(application, user.uid)
      setNotice(application.allotmentMethod === 'fcfs'
        ? `FCFS booking confirmed. Property ${application.propertyId} is now reserved. Reference: ${reference.slice(0, 8).toUpperCase()}.`
        : `Property application registered. Reference: ${reference.slice(0, 8).toUpperCase()}.`)
      formElement.reset()
      setSelectedApplicationPropertyId('')
      const [propertyRecords, applicantRecords] = await Promise.all([loadProperties(), loadPropertyApplicants()])
      setProperties(propertyRecords)
      setPropertyApplicants(applicantRecords)
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Could not register the property applicant.')
    } finally {
      setSaving(false)
    }
  }

  const handleRunLottery = async (propertyId) => {
    setSaving(true)
    setError('')
    setNotice('')
    try {
      const winner = await runPropertyLottery(propertyId, user.uid)
      setNotice(`Lottery draw complete. ${winner.fullName} won property ${propertyId}.`)
      const [propertyRecords, applicantRecords, auditRecords] = await Promise.all([loadProperties(), loadPropertyApplicants(), isAdmin ? loadAuditLogs() : Promise.resolve(auditLogs)])
      setProperties(propertyRecords)
      setPropertyApplicants(applicantRecords)
      setAuditLogs(auditRecords)
    } catch (drawError) {
      setError(drawError instanceof Error ? drawError.message : 'Could not complete the lottery draw.')
    } finally {
      setSaving(false)
    }
  }

  const handleCloseAuction = async (propertyId) => {
    setSaving(true)
    setError('')
    setNotice('')
    try {
      const winner = await closePropertyAuction(propertyId, user.uid)
      setNotice(`Auction closed. Highest bidder ${winner.fullName} won property ${propertyId} for ₹${Number(winner.bidAmount).toLocaleString('en-IN')}.`)
      const [propertyRecords, applicantRecords, auditRecords] = await Promise.all([loadProperties(), loadPropertyApplicants(), isAdmin ? loadAuditLogs() : Promise.resolve(auditLogs)])
      setProperties(propertyRecords)
      setPropertyApplicants(applicantRecords)
      setAuditLogs(auditRecords)
    } catch (closeError) {
      setError(closeError instanceof Error ? closeError.message : 'Could not close the auction.')
    } finally {
      setSaving(false)
    }
  }

  const handlePropertyAllotment = async (application) => {
    setSaving(true)
    setError('')
    setNotice('')
    try {
      await allotPropertyToApplicant(application, user.uid)
      setNotice(`${application.propertyId} allotted to ${application.fullName}.`)
      const [propertyRecords, applicantRecords] = await Promise.all([loadProperties(), loadPropertyApplicants()])
      setProperties(propertyRecords)
      setPropertyApplicants(applicantRecords)
    } catch (allotmentError) {
      setError(allotmentError instanceof Error ? allotmentError.message : 'Could not complete this allotment.')
    } finally {
      setSaving(false)
    }
  }

  const handlePropertyWorkbook = async (event) => {
    const fileInput = event.currentTarget
    const file = fileInput.files?.[0]
    if (!file) return
    setSaving(true)
    setPropertyMessage('')
    setPropertyErrors([])
    try {
      const workbook = XLSX.read(await file.arrayBuffer(), { type: 'array', cellDates: false })
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]]
      const rows = XLSX.utils.sheet_to_json(firstSheet, { defval: '', raw: false })
      const parsed = rows.map(parsePropertyRow).filter((property) => Object.values(property).some(Boolean))
      const invalid = parsed.flatMap((property, index) => property.propertyName
        ? []
        : [`Row ${index + 2}: Property Name is required.`])
      const valid = parsed.filter((property) => property.propertyName)
      const outcome = await importProperties(valid, user.uid)
      setPropertyMessage(`${outcome.imported.length} of ${parsed.length} property rows imported.`)
      setPropertyErrors([...invalid, ...outcome.errors.map((item) => `Row ${item.row}: ${item.message}`)])
      setProperties(await loadProperties())
    } catch (importError) {
      setPropertyErrors([importError instanceof Error ? importError.message : 'Could not read this spreadsheet. Save it as .xlsx or .csv and retry.'])
    } finally {
      fileInput.value = ''
      setSaving(false)
    }
  }

  const handleStaffSave = async (event) => {
    event.preventDefault()
    const formElement = event.currentTarget
    const values = Object.fromEntries(new FormData(formElement).entries())
    const permissionPresets = {
      employee_lottery: ['lottery', 'applications', 'propertyApplicants', 'properties'],
      employee_auction: ['auction', 'propertyApplicants', 'properties'],
      employee_fcfs: ['fcfs', 'propertyApplicants', 'properties'],
    }
    const accessProfile = String(values.accessProfile)
    const permissions = accessProfile === 'custom'
      ? new FormData(formElement).getAll('permissions').map(String)
      : permissionPresets[accessProfile] || []
    const staffRecord = {
      email: String(values.email).trim(),
      displayName: String(values.displayName).trim(),
      employeeCode: String(values.employeeCode).trim(),
      department: String(values.department).trim(),
      role: ['super_admin', 'admin'].includes(accessProfile) ? 'admin' : 'employee',
      accessProfile,
      active: values.active !== 'false',
      permissions,
      salary: {
        basic: Number(values.basic || 0),
        hra: Number(values.hra || 0),
        allowances: Number(values.allowances || 0),
        deductions: Number(values.deductions || 0),
      },
    }
    setSaving(true)
    setError('')
    setNotice('')
    try {
      if (editingStaff) {
        await updateStaffDirectoryEntry(editingStaff.id, staffRecord, user.uid)
        setNotice(`Employee record updated for ${staffRecord.displayName}.`)
      } else {
        await addStaffDirectoryEntry({ ...staffRecord, uid: String(values.uid).trim() }, user.uid)
        setNotice('Employee record added. Their Firebase Authentication account must already exist.')
      }
      formElement.reset()
      setEditingStaff(null)
      setStaffAccessProfile('employee_lottery')
      setStaffDirectory(await loadStaffDirectory())
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Could not add the HRMS staff record.')
    } finally {
      setSaving(false)
    }
  }

  const handleExportReports = async () => {
    setReportExporting(true)
    setError('')
    setNotice('')
    try {
      const capabilities = { ...staffCapabilities(profile), admin: isAdmin }
      const report = await loadAllStaffReportData(capabilities)
      const workbook = XLSX.utils.book_new()
      const addSheet = (name, rows) => {
        if (rows.length) XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(rows), name)
      }

      const propertyNames = new Map(report.properties.map((property) => [property.propertyId || property.id, property.propertyName || '']))
      addSheet('Properties', report.properties.map((property) => ({
        'Property ID': property.propertyId || property.id,
        'Property Name': property.propertyName || '',
        Scheme: property.scheme || '',
        Type: property.propertyType || '',
        'Area / Size': property.area || '',
        'Cost (INR)': Number(property.cost || 0),
        'Allocation Mode': property.allocationMode || 'direct',
        'Auction Start': property.auctionStart || '',
        'Auction End': property.auctionEnd || '',
        Location: property.location || '',
        'Allotment Channel': property.allotmentMethod || '',
        Allottee: property.ownerName || '',
        Status: property.status || 'available',
        Notes: property.notes || '',
      })))
      addSheet('Property Applicants', report.propertyApplicants.map((application) => ({
        'Application ID': application.id,
        'Applicant Name': application.fullName || '',
        Guardian: application.guardianName || '',
        'Property ID': application.propertyId || '',
        'Property Name': propertyNames.get(application.propertyId) || '',
        'Allotment Channel': application.allotmentMethod || '',
        'Bid Amount (INR)': Number(application.bidAmount || 0),
        Mobile: application.mobile || '',
        'Identity Number': application.identityNumber || '',
        'Address / Notes': application.notes || '',
        Status: application.status || '',
        'Submitted At': dateLabel(application.createdAt),
      })))
      addSheet('Citizen Applications', report.applications.map((application) => ({
        Reference: application.reference || application.id,
        Applicant: application.fullName || '',
        Guardian: application.guardianName || '',
        Scheme: application.scheme || '',
        Plan: application.planTitle || '',
        Type: application.planType || '',
        Mobile: application.mobile || '',
        Email: application.email || '',
        'Identity Number': application.identityNumber || '',
        Category: application.category || '',
        'Annual Income (INR)': Number(application.annualIncome || 0),
        Address: [application.address, application.city, application.state, application.pinCode].filter(Boolean).join(', '),
        Status: application.status || '',
        'Submitted At': dateLabel(application.submittedAt),
      })))
      addSheet('Schemes', report.plans.map((plan) => ({
        'Plan ID': plan.id,
        Title: plan.title || '',
        Scheme: plan.scheme || '',
        Type: plan.planType || '',
        Location: plan.location || '',
        'Area / Size': plan.area || '',
        Price: plan.price || '',
        'Available Units': Number(plan.availableUnits || 0),
        Status: plan.status || '',
        Published: plan.isPublished ? 'Yes' : 'No',
        'Applications Open': plan.applicationStart || '',
        'Applications Close': plan.applicationEnd || '',
      })))
      addSheet('Results', report.results.map((result) => ({
        Title: result.title || '',
        Scheme: result.scheme || '',
        Type: result.type || '',
        Applications: Number(result.applications || 0),
        Allottees: Number(result.winners || 0),
        'Published At': dateLabel(result.publishedAt),
      })))
      addSheet('Audit Trail', report.auditLogs.map((event) => ({
        Action: event.action || '',
        'Record ID': event.recordId || '',
        'Property ID': event.propertyId || '',
        'Actor UID': event.actorUid || '',
        Details: JSON.stringify(event.details || {}),
        'Created At': dateLabel(event.createdAt),
      })))
      const employeeRows = report.staff.length ? report.staff : hasPermission('payroll') ? [{ ...profile, id: user.uid, email: user.email }] : []
      addSheet('Employees', employeeRows.map((member) => {
        const salary = member.salary || {}
        const gross = Number(salary.basic || 0) + Number(salary.hra || 0) + Number(salary.allowances || 0)
        return {
          'Employee Code': member.employeeCode || '',
          Name: member.displayName || '',
          Email: member.email || '',
          Department: member.department || '',
          Role: member.role || 'employee',
          Active: member.active ? 'Yes' : 'No',
          Permissions: (member.permissions || []).join(', '),
          'Basic Salary (INR)': Number(salary.basic || 0),
          'HRA (INR)': Number(salary.hra || 0),
          'Other Allowances (INR)': Number(salary.allowances || 0),
          'Deductions (INR)': Number(salary.deductions || 0),
          'Net Salary (INR)': gross - Number(salary.deductions || 0),
        }
      }))

      if (!workbook.SheetNames.length) {
        XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet([{ Message: 'No report records are available for this account.' }]), 'Report')
      }
      XLSX.writeFile(workbook, `lda-erp-report-${dateToday()}.xlsx`)
      setNotice(`Excel report downloaded with ${workbook.SheetNames.length} data sheets.`)
    } catch (exportError) {
      setError(exportError instanceof Error ? exportError.message : 'Could not export the Excel report.')
    } finally {
      setReportExporting(false)
    }
  }

  const isAdmin = profile?.role === 'admin'
  const isSuperAdmin = staffIsSuperAdmin(profile)
  const capabilities = staffCapabilities(profile)
  const hasPermission = (permission) => isAdmin || capabilities[permission]
  const canManageProperties = hasPermission('properties')
  const canManageApplicants = hasPermission('propertyApplicants')
  const canAllotProperties = canManageProperties && canManageApplicants
  const canUseLottery = isAdmin || hasPermission('lottery') || hasPermission('auction')
  const selectedApplicationProperty = properties.find((property) => (property.propertyId || property.id) === selectedApplicationPropertyId)

  if (!firebaseReady) {
    return <main className="staff-shell">
      <header className="staff-topbar"><button className="staff-back" onClick={onBack}>← Citizen portal</button><span>LDA · STAFF CONSOLE</span></header>
      <section className="staff-setup-card">
        <span className="staff-eyebrow">ONE-TIME SETUP</span>
        <h1>Connect your Firebase project</h1>
        <p>The staff console and citizen applications are ready to use Firestore. Add your Firebase web app settings to <strong>.env.local</strong>, enable Firestore and Authentication, then restart Vite.</p>
        <div className="setup-steps"><span>01 <b>Create a Firebase project</b></span><span>02 <b>Enable Email/Password and Anonymous sign-in</b></span><span>03 <b>Paste web config into .env.local</b></span><span>04 <b>Publish the included Firestore rules</b></span></div>
        <div className="staff-warning">Firebase project settings were not included in the request. The staff sign-in will activate once the environment variables are filled in.</div>
      </section>
    </main>
  }

  if (authLoading) return <main className="staff-shell"><div className="staff-loading">Checking staff access…</div></main>

  if (!user || !profile?.active || !['admin', 'employee'].includes(profile.role)) {
    return <main className="staff-shell">
      <header className="staff-topbar"><button className="staff-back" onClick={onBack}>← Citizen portal</button><span>LDA · STAFF CONSOLE</span></header>
      <section className="staff-login-layout">
        <div className="staff-login-art"><span className="staff-eyebrow">INTERNAL ACCESS</span><h1>One clear view<br />of every <em>application.</em></h1><p>Manage lottery and e-auction plans, review citizen applications and publish draw outcomes.</p><div className="staff-login-seal">LDA<br /><small>STAFF ONLY</small></div></div>
        <form className="staff-login-card" onSubmit={handleSignIn}>
          <span className="staff-eyebrow">ADMIN & ERP EMPLOYEE</span><h2>Sign in to continue</h2><p>Use the staff account assigned to you by your Firebase administrator.</p>
          {error && <div className="staff-alert staff-alert-error">{error}</div>}
          <label>Work email<input type="email" autoComplete="username" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="ldaerp123@gmail.com" /></label>
          <label>Password<input type="password" autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Your password" /></label>
          <button className="staff-primary-button" type="submit" disabled={saving}>{saving ? 'Signing in…' : 'Sign in securely'} <span>→</span></button>
          <small className="staff-login-note">Access is controlled by Firebase Authentication and staff role records.</small>
        </form>
      </section>
    </main>
  }

  return <main className="staff-shell">
    <header className="staff-topbar">
      <button className="staff-back" onClick={onBack}>← Citizen portal</button>
      <div className="staff-top-brand"><span className="staff-mark">L</span><span><strong>LDA OPERATIONS</strong><small>Lottery & e-auction administration</small></span></div>
      <div className="staff-user"><span className="staff-avatar">{(user.email || 'S').slice(0, 1).toUpperCase()}</span><span><strong>{user.email}</strong><small>{isAdmin ? 'Administrator' : 'ERP employee'}</small></span><button onClick={signOutStaff}>Sign out</button></div>
    </header>
    <div className="staff-dashboard">
      <aside className="staff-sidebar">
        <span className="staff-eyebrow">WORKSPACE</span>
        {canUseLottery && <button className={activeModule === 'lottery' ? 'staff-side-link current module-link' : 'staff-side-link module-link'} onClick={() => { setActiveModule('lottery'); setActiveView(hasPermission('applications') ? 'applications' : 'plans') }}><span>◉</span> Lottery module</button>}
        {activeModule === 'lottery' && canUseLottery && <>
          {hasPermission('applications') && <button className={activeView === 'applications' ? 'staff-side-link current' : 'staff-side-link'} onClick={() => setActiveView('applications')}><span>▦</span> Applications <b>{applications.length}</b></button>}
          {(isAdmin || hasPermission('lottery') || hasPermission('auction')) && <button className={activeView === 'plans' ? 'staff-side-link current' : 'staff-side-link'} onClick={() => setActiveView('plans')}><span>⌂</span> Lottery & auction plans <b>{plans.length}</b></button>}
          {isAdmin && <button className={activeView === 'create' ? 'staff-side-link current' : 'staff-side-link'} onClick={() => setActiveView('create')}><span>＋</span> Create a plan</button>}
          {isAdmin && <button className={activeView === 'results' ? 'staff-side-link current' : 'staff-side-link'} onClick={() => setActiveView('results')}><span>✳</span> Draw / auction results</button>}
        </>}
        {(isAdmin || canManageProperties || canManageApplicants || hasPermission('payroll') || canUseLottery) && <button className={activeModule === 'hrms' ? 'staff-side-link current module-link' : 'staff-side-link module-link'} onClick={() => { setActiveModule('hrms'); setActiveView('hrms'); setHrmsSection('reports') }}><span>▤</span> HRMS & reports</button>}
        <div className="staff-side-footer"><span className="secure-dot" /> Secure Firebase workspace<br /><small>Private staff access only</small></div>
      </aside>
      <section className="staff-main">
        <div className="staff-page-heading"><div><span className="staff-eyebrow">{isAdmin ? 'ADMINISTRATOR' : 'ERP EMPLOYEE'} · {activeModule.toUpperCase()} WORKSPACE</span><h1>{activeModule === 'hrms' ? 'HRMS & property registry' : activeView === 'applications' ? 'Citizen applications' : activeView === 'plans' ? 'Lottery & e-auction plans' : activeView === 'create' ? 'Create a scheme plan' : 'Draw / auction results'}</h1><p>{activeModule === 'hrms' ? 'Manage staff directory and maintain the property master register.' : activeView === 'applications' ? 'Review citizen submissions and keep each application moving.' : activeView === 'plans' ? 'See draft and published lottery and auction plans.' : activeView === 'create' ? 'Create a lottery or e-auction plan for the citizen portal.' : 'Publish verified lottery draw or e-auction outcomes.'}</p></div><button className="staff-refresh" onClick={refreshData} disabled={dataLoading}>{dataLoading ? 'Refreshing…' : '↻ Refresh'}</button></div>
        {error && <div className="staff-alert staff-alert-error">{error}</div>}
        {notice && <div className="staff-alert staff-alert-success">{notice}</div>}

        {activeModule === 'hrms' && <>
          <div className="hrms-tabs" role="tablist" aria-label="HRMS sections">
            {(isAdmin || canManageProperties || canManageApplicants) && <button role="tab" aria-selected={hrmsSection === 'properties'} className={hrmsSection === 'properties' ? 'selected' : ''} onClick={() => setHrmsSection('properties')}>Property inventory <span>{properties.length}</span></button>}
            {(isAdmin || canManageApplicants) && <button role="tab" aria-selected={hrmsSection === 'applicants'} className={hrmsSection === 'applicants' ? 'selected' : ''} onClick={() => setHrmsSection('applicants')}>Applicants / allottees <span>{propertyApplicants.length}</span></button>}
            {isSuperAdmin && <button role="tab" aria-selected={hrmsSection === 'staff'} className={hrmsSection === 'staff' ? 'selected' : ''} onClick={() => setHrmsSection('staff')}>Staff & salary <span>{staffDirectory.length}</span></button>}
            {!isAdmin && hasPermission('payroll') && <button role="tab" aria-selected={hrmsSection === 'payroll'} className={hrmsSection === 'payroll' ? 'selected' : ''} onClick={() => setHrmsSection('payroll')}>My salary</button>}
            <button role="tab" aria-selected={hrmsSection === 'reports'} className={hrmsSection === 'reports' ? 'selected' : ''} onClick={() => setHrmsSection('reports')}>Reports</button>
          </div>

          {hrmsSection === 'properties' && <>
            <div className="property-summary"><div><span className="staff-eyebrow">PROPERTY MASTER</span><strong>{properties.length.toLocaleString('en-IN')}</strong><small>{properties.filter((item) => (item.status || 'available') === 'available').length} vacant · {properties.filter((item) => item.status === 'allotted').length} allotted</small></div><div className="property-id-badge"><b>123456</b><span>Unique 6-digit property ID</span></div></div>
            {canManageProperties && <div className="property-work-grid">
              <form className="staff-editor property-editor" onSubmit={handleCreateProperty}>
                <div className="staff-editor-section"><span>01</span><div><h2>Add one property</h2><p>Leave ID blank to reserve a unique six-digit ID automatically.</p></div></div>
                <div className="staff-form-grid">
                  <label>Property ID (optional)<input name="propertyId" inputMode="numeric" pattern="[0-9]{6}" maxLength="6" placeholder="Auto-generate or enter 6 digits" /></label>
                  <label>Property name <b>*</b><input name="propertyName" required placeholder="e.g. Gomti Nagar Plot 14" /></label>
                  <label>Scheme<input name="scheme" placeholder="Scheme / project name" /></label>
                  <label>Property type<input name="propertyType" placeholder="Plot, flat, shop, land…" /></label>
                  <label>Location / address<input name="location" placeholder="Sector, road, city" /></label>
                  <label>Area / size<input name="area" placeholder="e.g. 112.5 sq. m." /></label>
                  <label>Property cost (₹)<input name="cost" type="number" min="0" required placeholder="Total property cost" /></label>
                  <label>Allocation mode<select name="allocationMode" value={propertyAllocationMode} onChange={(event) => setPropertyAllocationMode(event.target.value)}><option value="lottery">Lottery</option><option value="auction">Auction</option><option value="fcfs">FCFS</option><option value="direct">Direct allotment</option></select></label>
                  {propertyAllocationMode === 'auction' && <><label>Bidding opens<input name="auctionStart" type="datetime-local" required /></label><label>Bidding closes<input name="auctionEnd" type="datetime-local" required /></label></>}
                  <label>Status<select name="status" defaultValue="available"><option value="available">Vacant</option><option value="reserved">Reserved</option><option value="under_review">Under review</option></select></label>
                  <label className="staff-field-wide">Notes<input name="notes" placeholder="Optional remarks" /></label>
                </div>
                <button className="staff-primary-button" type="submit" disabled={saving}>{saving ? 'Reserving ID…' : 'Create property ID'} <span>→</span></button>
              </form>
              <section className="property-import-card">
                <div className="staff-editor-section"><span>⇧</span><div><h2>Import from Excel</h2><p>Upload .xlsx, .xls or .csv; missing property IDs are generated automatically.</p></div></div>
                <div className="import-columns"><strong>Recommended columns</strong><span>Property Name · Property ID (optional) · Scheme · Location · Type · Area · Cost · Allocation Mode · Auction Start / End · Status · Notes</span></div>
                <button className="template-button" type="button" onClick={() => {
                  const sheet = XLSX.utils.json_to_sheet([{ 'Property Name': 'Gomti Nagar Plot 14', 'Property ID': '', Scheme: 'Housing Scheme 2026', Location: 'Gomti Nagar, Lucknow', Type: 'Residential plot', Area: '112.5 sq. m.', Cost: 1850000, 'Allocation Mode': 'lottery', 'Auction Start': '', 'Auction End': '', Status: 'available', Notes: '' }])
                  const workbook = XLSX.utils.book_new()
                  XLSX.utils.book_append_sheet(workbook, sheet, 'Properties')
                  XLSX.writeFile(workbook, 'lda-property-import-template.xlsx')
                }}>Download Excel template</button>
                <label className="file-drop"><span className="file-drop-icon">↑</span><strong>Choose a workbook to import</strong><small>Excel or CSV · One property per row</small><input type="file" accept=".xlsx,.xls,.csv" onChange={handlePropertyWorkbook} disabled={saving} /></label>
              </section>
            </div>}
            {propertyMessage && <div className="staff-alert staff-alert-success">{propertyMessage}</div>}
            {propertyErrors.length > 0 && <div className="staff-alert staff-alert-error"><strong>Some properties need attention</strong><ul>{propertyErrors.slice(0, 20).map((message, index) => <li key={`${index}-${message}`}>{message}</li>)}</ul></div>}
            <div className="property-list-header"><div><span className="staff-eyebrow">FIRESTORE · PROPERTIES</span><h2>Registered properties</h2></div><span>{visibleProperties.length} of {properties.length}</span></div>
            <div className="staff-table-toolbar"><label className="staff-search">⌕<input aria-label="Search properties" value={propertySearch} onChange={(event) => setPropertySearch(event.target.value)} placeholder="Search ID, name, scheme, allottee" /></label><select aria-label="Filter property status" value={propertyStatusFilter} onChange={(event) => setPropertyStatusFilter(event.target.value)}><option value="all">All property statuses</option><option value="available">Vacant</option><option value="reserved">Reserved</option><option value="allotted">Allotted</option><option value="under_review">Under review</option></select></div>
            <div className="staff-table-wrap"><table className="staff-table property-table"><thead><tr><th>PROPERTY ID</th><th>PROPERTY / SCHEME</th><th>LOCATION</th><th>TYPE / SIZE</th><th>COST</th><th>ALLOCATION MODE</th><th>CHANNEL</th><th>ALLOTTEE</th><th>STATUS</th></tr></thead><tbody>{visibleProperties.map((property) => <tr key={property.id}><td><span className="staff-reference property-code">{property.propertyId || property.id}</span></td><td><strong>{property.propertyName || '—'}</strong><small>{property.scheme || '—'}</small></td><td>{property.location || '—'}</td><td>{[property.propertyType, property.area].filter(Boolean).join(' · ') || '—'}</td><td>{property.cost ? `₹${Number(property.cost).toLocaleString('en-IN')}` : '—'}</td><td>{property.allocationMode || 'direct'}</td><td>{property.allotmentMethod || '—'}</td><td>{property.ownerName || '—'}</td><td><span className={`staff-publish-state property-status-${property.status || 'available'}`}>{property.status === 'available' ? 'Vacant' : property.status || 'Vacant'}</span></td></tr>)}</tbody></table>{properties.length === 0 ? <div className="staff-empty">No properties registered yet. Add one manually or import an Excel sheet.</div> : visibleProperties.length === 0 && <div className="staff-empty">No properties match these filters.</div>}</div>
          </>}

          {hrmsSection === 'applicants' && <>
            {canManageApplicants && <form className="staff-editor applicant-editor" onSubmit={handlePropertyApplication}>
              <div className="staff-editor-section"><span>01</span><div><h2>Register a property applicant</h2><p>Link the application to one vacant six-digit property record.</p></div></div>
              <div className="staff-form-grid">
                <label>Property ID <b>*</b><select name="propertyId" required value={selectedApplicationPropertyId} onChange={(event) => setSelectedApplicationPropertyId(event.target.value)}><option value="" disabled>Select vacant property</option>{properties.filter((property) => (property.status || 'available') === 'available').map((property) => <option key={property.id} value={property.propertyId || property.id}>{property.propertyId || property.id} · {property.propertyName} · {property.scheme}</option>)}</select></label>
                <label>Applicant full name <b>*</b><input name="fullName" required placeholder="Applicant name" /></label>
                <label>Father / spouse name<input name="guardianName" placeholder="Guardian name" /></label>
                <label>Mobile number <b>*</b><input name="mobile" type="tel" pattern="[0-9]{10}" maxLength="10" required placeholder="10-digit mobile" /></label>
                <label>Identity number<input name="identityNumber" placeholder="Aadhaar / ID reference" /></label>
                <label>Allocation mode<input value={selectedApplicationProperty?.allocationMode || 'direct'} readOnly /></label>
                {selectedApplicationProperty?.allocationMode === 'auction' && <label>Bid amount (₹) <b>*</b><input name="bidAmount" type="number" min={Number(selectedApplicationProperty.cost || 1)} required placeholder={`Minimum ₹${Number(selectedApplicationProperty.cost || 0).toLocaleString('en-IN')}`} /></label>}
                <label className="staff-field-wide">Address / notes<input name="notes" placeholder="Applicant address or case notes" /></label>
              </div>
              <button className="staff-primary-button" type="submit" disabled={saving || properties.every((property) => (property.status || 'available') !== 'available')}>{saving ? 'Registering…' : 'Save property application'} <span>→</span></button>
            </form>}
            <div className="property-list-header"><div><span className="staff-eyebrow">PROPERTY APPLICATION REGISTER</span><h2>Applicants and allottees</h2></div><span>{visiblePropertyApplicants.length} of {propertyApplicants.length}</span></div>
            <div className="staff-table-toolbar"><label className="staff-search">⌕<input aria-label="Search property applicants" value={propertyApplicantSearch} onChange={(event) => setPropertyApplicantSearch(event.target.value)} placeholder="Search applicant, mobile, property or scheme" /></label><select aria-label="Filter allocation mode" value={propertyApplicantModeFilter} onChange={(event) => setPropertyApplicantModeFilter(event.target.value)}><option value="all">All allocation modes</option><option value="lottery">Lottery</option><option value="auction">Auction</option><option value="fcfs">FCFS</option><option value="direct">Direct</option></select><select aria-label="Filter property application status" value={propertyApplicantStatusFilter} onChange={(event) => setPropertyApplicantStatusFilter(event.target.value)}><option value="all">All applicant statuses</option><option value="submitted">Submitted</option><option value="bid_submitted">Bid submitted</option><option value="booked">Booked</option><option value="allotted">Allotted</option><option value="waitlisted">Waitlisted</option><option value="unsuccessful">Unsuccessful</option></select></div>
            <div className="staff-table-wrap"><table className="staff-table property-table"><thead><tr><th>APPLICANT</th><th>PROPERTY ID / NAME</th><th>SCHEME</th><th>CHANNEL</th><th>BID</th><th>CONTACT</th><th>STATUS</th>{canAllotProperties && <th>ACTION</th>}</tr></thead><tbody>{visiblePropertyApplicants.map((application, index) => {
              const property = properties.find((item) => (item.propertyId || item.id) === application.propertyId)
              const isFirstPendingForProperty = propertyApplicants.findIndex((candidate) => candidate.propertyId === application.propertyId && candidate.allotmentMethod === application.allotmentMethod && ['submitted', 'bid_submitted'].includes(candidate.status)) === index
              const action = isFirstPendingForProperty && property?.status === 'available' && application.allotmentMethod === 'lottery' && hasPermission('lottery')
                ? <button className="staff-row-action" type="button" disabled={saving} onClick={() => handleRunLottery(application.propertyId)}>Run draw</button>
                : isFirstPendingForProperty && property?.status === 'available' && application.allotmentMethod === 'auction' && hasPermission('auction')
                  ? <button className="staff-row-action" type="button" disabled={saving} onClick={() => handleCloseAuction(application.propertyId)}>Close auction</button>
                  : application.status === 'submitted' && property?.status === 'available' && application.allotmentMethod === 'direct'
                    ? <button className="staff-row-action" type="button" disabled={saving} onClick={() => handlePropertyAllotment(application)}>Allot property</button>
                    : '—'
              return <tr key={application.id}><td><button type="button" className="staff-applicant-name" onClick={() => setSelectedPropertyApplicant(application)}>{application.fullName || '—'}</button><small>{application.guardianName || '—'}</small></td><td><span className="staff-reference property-code">{application.propertyId}</span><small>{property?.propertyName || 'Property record'}</small></td><td>{property?.scheme || '—'}</td><td>{application.allotmentMethod || '—'}</td><td>{application.bidAmount ? `₹${Number(application.bidAmount).toLocaleString('en-IN')}` : '—'}</td><td>{application.mobile || '—'}</td><td><span className={`staff-publish-state property-status-${application.status || 'submitted'}`}>{application.status || 'submitted'}</span></td>{canAllotProperties && <td>{action}</td>}</tr>
            })}</tbody></table>{propertyApplicants.length === 0 ? <div className="staff-empty">No property applications recorded yet.</div> : visiblePropertyApplicants.length === 0 && <div className="staff-empty">No applicants match these filters.</div>}</div>
          </>}

          {hrmsSection === 'staff' && isSuperAdmin && <>
            <form key={editingStaff?.id || 'new-staff'} className="staff-editor directory-editor" onSubmit={handleStaffSave}>
              <div className="staff-editor-section"><span>01</span><div><h2>{editingStaff ? 'Edit employee & salary' : 'Add an employee'}</h2><p>Create the employee in Firebase Authentication first; this record controls HRMS access and salary structure.</p></div></div>
              <div className="staff-form-grid">{!editingStaff && <label>Firebase Auth UID <b>*</b><input name="uid" required placeholder="Copy user UID from Firebase Authentication" /></label>}<label>Work email <b>*</b><input name="email" type="email" required defaultValue={editingStaff?.email || ''} placeholder="employee@lda.gov.in" /></label><label>Employee name <b>*</b><input name="displayName" required defaultValue={editingStaff?.displayName || ''} placeholder="Full name" /></label><label>Employee code<input name="employeeCode" defaultValue={editingStaff?.employeeCode || ''} placeholder="HRMS employee number" /></label><label>Department<input name="department" defaultValue={editingStaff?.department || ''} placeholder="e.g. Estates, Engineering" /></label><label>Access role<select name="role" defaultValue={editingStaff?.role || 'employee'}><option value="employee">ERP employee</option><option value="admin">Administrator</option></select></label>{editingStaff && <label>ERP access<select name="active" defaultValue={String(editingStaff.active)}><option value="true">Active</option><option value="false">Disabled / removed</option></select></label>}</div>
                            <div className="staff-form-grid">{!editingStaff && <label>Firebase Auth UID <b>*</b><input name="uid" required placeholder="Copy user UID from Firebase Authentication" /></label>}<label>Work email <b>*</b><input name="email" type="email" required defaultValue={editingStaff?.email || ''} placeholder="employee@lda.gov.in" /></label><label>Employee name <b>*</b><input name="displayName" required defaultValue={editingStaff?.displayName || ''} placeholder="Full name" /></label><label>Employee code<input name="employeeCode" defaultValue={editingStaff?.employeeCode || ''} placeholder="HRMS employee number" /></label><label>Department<input name="department" defaultValue={editingStaff?.department || ''} placeholder="e.g. Estates, Engineering" /></label><label>Access profile<select name="accessProfile" value={staffAccessProfile} onChange={(event) => setStaffAccessProfile(event.target.value)}><option value="super_admin">Super Admin</option><option value="admin">Admin</option><option value="employee_lottery">Employee (Lottery)</option><option value="employee_auction">Employee (Auction)</option><option value="employee_fcfs">Employee (FCFS)</option><option value="custom">Custom permissions</option></select></label>{editingStaff && <label>ERP access<select name="active" defaultValue={String(editingStaff.active)}><option value="true">Active</option><option value="false">Disabled / removed</option></select></label>}</div>
              <div className="salary-fields"><h3>Monthly salary structure (₹)</h3><div className="staff-form-grid"><label>Basic salary<input name="basic" type="number" min="0" defaultValue={editingStaff?.salary?.basic || ''} /></label><label>House rent allowance<input name="hra" type="number" min="0" defaultValue={editingStaff?.salary?.hra || ''} /></label><label>Other allowances<input name="allowances" type="number" min="0" defaultValue={editingStaff?.salary?.allowances || ''} /></label><label>Deductions<input name="deductions" type="number" min="0" defaultValue={editingStaff?.salary?.deductions || ''} /></label></div></div>
              <fieldset className="permission-fields" disabled={staffAccessProfile !== 'custom'}><legend>Employee authority</legend>{[['properties', 'Property registry'], ['propertyApplicants', 'Property applicants'], ['applications', 'Citizen applications'], ['payroll', 'Salary slips'], ['lottery', 'Lottery operations'], ['auction', 'Auction bidding'], ['fcfs', 'FCFS booking']].map(([value, label]) => <label key={value}><input type="checkbox" name="permissions" value={value} defaultChecked={editingStaff?.permissions?.includes(value)} />{label}</label>)}</fieldset>
              <div className="staff-editor-actions"><button className="staff-primary-button" type="submit" disabled={saving}>{saving ? 'Saving employee…' : editingStaff ? 'Save employee changes' : 'Add employee record'} <span>→</span></button>{editingStaff && <button className="staff-secondary-button" type="button" onClick={() => { setEditingStaff(null); setStaffAccessProfile('employee_lottery') }}>Cancel edit</button>}</div>
            </form>
            <div className="property-list-header"><div><span className="staff-eyebrow">STAFF ROLES · FIRESTORE</span><h2>Employee directory</h2></div><span>{staffDirectory.length} users</span></div>
            <div className="staff-table-wrap"><table className="staff-table"><thead><tr><th>EMPLOYEE</th><th>CODE / DEPARTMENT</th><th>MONTHLY NET</th><th>ROLE / ACCESS</th><th>AUTH UID</th><th>ACTIONS</th></tr></thead><tbody>{staffDirectory.map((member) => {
              const salary = member.salary || {}
              const net = Number(salary.basic || 0) + Number(salary.hra || 0) + Number(salary.allowances || 0) - Number(salary.deductions || 0)
              return <tr key={member.id}><td><strong>{member.displayName || member.email || '—'}</strong><small>{member.email || '—'} · {member.active ? 'Active' : 'Disabled'}</small></td><td>{member.employeeCode || '—'}<small>{member.department || '—'}</small></td><td>₹{net.toLocaleString('en-IN')}</td><td>{member.accessProfile || member.role || '—'}<small>{(member.permissions || []).join(', ') || 'No module permissions'}</small></td><td><span className="staff-reference">{member.id}</span></td><td><div className="staff-row-actions"><button className="staff-row-action" type="button" onClick={() => { setEditingStaff(member); setStaffAccessProfile(member.accessProfile || (member.role === 'admin' ? 'super_admin' : 'custom')) }}>Edit</button><button className="staff-row-action" type="button" onClick={() => setSalarySlipStaff(member)}>Print slip</button></div></td></tr>
            })}</tbody></table>{staffDirectory.length === 0 && <div className="staff-empty">No HRMS staff roles found.</div>}</div>
          </>}

          {hrmsSection === 'payroll' && !isAdmin && hasPermission('payroll') && <section className="employee-payroll-summary"><span className="staff-eyebrow">MY MONTHLY SALARY</span><h2>{profile.displayName || user.email}</h2><p>{profile.employeeCode || 'Employee'} · {profile.department || 'Department not set'}</p><button className="staff-primary-button" type="button" onClick={() => setSalarySlipStaff({ ...profile, id: user.uid, email: user.email })}>View / print salary slip <span>→</span></button></section>}
          {hrmsSection === 'reports' && <>
            <section className="report-export-panel"><div><span className="staff-eyebrow">EXCEL WORKBOOK</span><h2>ERP data export</h2><p>Downloads every available record from the modules assigned to your account. Each data type is placed on its own worksheet.</p></div><button className="staff-primary-button" type="button" onClick={handleExportReports} disabled={reportExporting}>{reportExporting ? 'Preparing workbook…' : 'Download Excel report'} <span>↓</span></button></section>
            {isAdmin && <section className="audit-panel"><div className="property-list-header"><div><span className="staff-eyebrow">ADMINISTRATOR · AUDIT TRAIL</span><h2>Recent allocation activity</h2></div><span>{auditLogs.length} events</span></div><div className="staff-table-wrap"><table className="staff-table"><thead><tr><th>EVENT</th><th>PROPERTY ID</th><th>RECORD</th><th>STAFF UID</th><th>WHEN</th></tr></thead><tbody>{auditLogs.map((event) => <tr key={event.id}><td><strong>{event.action}</strong><small>{JSON.stringify(event.details || {})}</small></td><td>{event.propertyId || '—'}</td><td><span className="staff-reference">{event.recordId || '—'}</span></td><td>{event.actorUid || '—'}</td><td>{dateLabel(event.createdAt)}</td></tr>)}</tbody></table>{auditLogs.length === 0 && <div className="staff-empty">No allocation events have been recorded.</div>}</div></section>}
          </>}
        </>}

          {salarySlipStaff && <div className="staff-detail-backdrop salary-slip-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setSalarySlipStaff(null) }}>
            <section className="salary-slip-dialog" role="dialog" aria-modal="true" aria-labelledby="salary-slip-title">
              <div className="salary-slip-toolbar"><label>Salary month<input type="month" value={salarySlipMonth} onChange={(event) => setSalarySlipMonth(event.target.value)} /></label><button className="staff-primary-button" type="button" onClick={() => window.print()}>Print salary slip</button><button className="staff-secondary-button" type="button" onClick={() => setSalarySlipStaff(null)}>Close</button></div>
              <article className="salary-slip-paper"><header><span className="staff-mark">L</span><div><strong>LUCKNOW DEVELOPMENT AUTHORITY</strong><small>Employee salary statement</small></div><span className="salary-slip-period">{salarySlipMonth && new Intl.DateTimeFormat('en-IN', { month: 'long', year: 'numeric' }).format(new Date(`${salarySlipMonth}-01T00:00:00`))}</span></header><h2 id="salary-slip-title">Salary slip</h2><dl><div><dt>Employee</dt><dd>{salarySlipStaff.displayName}</dd></div><div><dt>Employee code</dt><dd>{salarySlipStaff.employeeCode || '—'}</dd></div><div><dt>Department</dt><dd>{salarySlipStaff.department || '—'}</dd></div><div><dt>Work email</dt><dd>{salarySlipStaff.email}</dd></div></dl><table><thead><tr><th>Earnings</th><th>Amount</th><th>Deductions</th><th>Amount</th></tr></thead><tbody><tr><td>Basic salary</td><td>₹{Number(salarySlipStaff.salary?.basic || 0).toLocaleString('en-IN')}</td><td>Other deductions</td><td>₹{Number(salarySlipStaff.salary?.deductions || 0).toLocaleString('en-IN')}</td></tr><tr><td>House rent allowance</td><td>₹{Number(salarySlipStaff.salary?.hra || 0).toLocaleString('en-IN')}</td><td></td><td></td></tr><tr><td>Other allowances</td><td>₹{Number(salarySlipStaff.salary?.allowances || 0).toLocaleString('en-IN')}</td><td></td><td></td></tr></tbody><tfoot><tr><th>Gross earnings</th><th>₹{(Number(salarySlipStaff.salary?.basic || 0) + Number(salarySlipStaff.salary?.hra || 0) + Number(salarySlipStaff.salary?.allowances || 0)).toLocaleString('en-IN')}</th><th>Net pay</th><th>₹{(Number(salarySlipStaff.salary?.basic || 0) + Number(salarySlipStaff.salary?.hra || 0) + Number(salarySlipStaff.salary?.allowances || 0) - Number(salarySlipStaff.salary?.deductions || 0)).toLocaleString('en-IN')}</th></tr></tfoot></table><p className="salary-slip-note">This statement is generated from the current HRMS salary structure.</p></article>
            </section>
          </div>}

        {activeModule === 'lottery' && activeView === 'applications' && <>
          <div className="staff-metrics">
            <article><span>LOADED SUBMISSIONS</span><strong>{applications.length}</strong><small>{hasMoreApplications ? 'More are available below' : 'All loaded applications'}</small></article>
            <article><span>AWAITING REVIEW</span><strong>{applications.filter((item) => ['submitted', 'under_review'].includes(item.status)).length}</strong><small>Needs staff attention</small></article>
            <article><span>LOTTERY PLANS</span><strong>{plans.filter((item) => item.planType !== 'auction').length}</strong><small>All statuses</small></article>
            <article><span>E-AUCTION PLANS</span><strong>{plans.filter((item) => item.planType === 'auction').length}</strong><small>All statuses</small></article>
          </div>
          <div className="staff-table-toolbar"><label className="staff-search">⌕<input aria-label="Search applications" value={queryText} onChange={(event) => setQueryText(event.target.value)} placeholder="Search name, reference, mobile or plan" /></label><select aria-label="Filter application status" value={applicationFilter} onChange={(event) => setApplicationFilter(event.target.value)}><option value="all">All statuses</option><option value="submitted">Submitted</option><option value="under_review">Under review</option><option value="approved">Approved</option><option value="rejected">Rejected</option></select></div>
          <div className="staff-table-wrap"><table className="staff-table"><thead><tr><th>APPLICANT</th><th>PLAN / TYPE</th><th>REFERENCE</th><th>SUBMITTED</th><th>STATUS</th></tr></thead><tbody>{visibleApplications.map((application) => <tr key={application.id}><td><button type="button" className="staff-applicant-name" onClick={() => setSelectedApplication(application)}>{application.fullName || '—'}</button><small>{application.mobile || application.email || 'No contact details'}</small></td><td><strong>{application.planTitle || application.scheme || '—'}</strong><small>{application.planType === 'auction' ? 'E-auction participant' : 'Lottery application'}</small></td><td><span className="staff-reference">{application.reference || application.id}</span></td><td>{dateLabel(application.submittedAt)}</td><td><select className={`application-status status-${application.status || 'submitted'}`} aria-label={`Status for ${application.fullName}`} value={application.status || 'submitted'} disabled={!hasPermission('applications')} onChange={(event) => handleStatusChange(application, event.target.value)}><option value="submitted">Submitted</option><option value="under_review">Under review</option><option value="approved">Approved</option><option value="rejected">Rejected</option></select></td></tr>)}</tbody></table>{visibleApplications.length === 0 && <div className="staff-empty">{dataLoading ? 'Loading applications…' : applications.length === 0 ? 'No applications have been saved to Firebase yet. Once a citizen sees the submission reference, their record will appear here.' : 'No applications match this search or status filter.'}</div>}{hasMoreApplications && <button className="staff-load-more" onClick={handleLoadMore} disabled={dataLoading}>{dataLoading ? 'Loading…' : 'Load older applications'}</button>}</div>
        </>}

        {activeModule === 'hrms' && selectedPropertyApplicant && <div className="staff-detail-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setSelectedPropertyApplicant(null) }}>
          <section className="staff-detail-dialog" role="dialog" aria-modal="true" aria-labelledby="property-applicant-detail-title">
            <header><div><span className="staff-eyebrow">PROPERTY APPLICATION · {selectedPropertyApplicant.status || 'SUBMITTED'}</span><h2 id="property-applicant-detail-title">{selectedPropertyApplicant.fullName}</h2><p>Property ID {selectedPropertyApplicant.propertyId} · {selectedPropertyApplicant.allotmentMethod || 'Channel not set'}</p></div><button type="button" aria-label="Close applicant details" onClick={() => setSelectedPropertyApplicant(null)}>×</button></header>
            <dl>{[['Guardian', selectedPropertyApplicant.guardianName], ['Mobile', selectedPropertyApplicant.mobile], ['Identity number', selectedPropertyApplicant.identityNumber], ['Address / notes', selectedPropertyApplicant.notes], ['Application channel', selectedPropertyApplicant.allotmentMethod], ['Status', selectedPropertyApplicant.status], ['Submitted', dateLabel(selectedPropertyApplicant.createdAt)]].filter(([, value]) => value).map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
          </section>
        </div>}

        {activeModule === 'lottery' && selectedApplication && <div className="staff-detail-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setSelectedApplication(null) }}>
          <section className="staff-detail-dialog" role="dialog" aria-modal="true" aria-labelledby="application-detail-title">
            <header><div><span className="staff-eyebrow">PRIVATE STAFF RECORD</span><h2 id="application-detail-title">{selectedApplication.fullName || 'Citizen application'}</h2><p>{selectedApplication.reference} · {selectedApplication.planTitle}</p></div><button type="button" aria-label="Close application details" onClick={() => setSelectedApplication(null)}>×</button></header>
            <dl>{[
              ['Guardian', selectedApplication.guardianName], ['Date of birth', selectedApplication.dateOfBirth],
              ['Gender', selectedApplication.gender], ['Mobile', selectedApplication.mobile], ['Email', selectedApplication.email],
              ['Identity number', selectedApplication.identityNumber], ['Annual family income', selectedApplication.annualIncome ? `₹${Number(selectedApplication.annualIncome).toLocaleString('en-IN')}` : ''],
              ['Category', selectedApplication.category], ['Occupation', selectedApplication.occupation],
              ['Address', [selectedApplication.address, selectedApplication.city, selectedApplication.state, selectedApplication.pinCode].filter(Boolean).join(', ')],
              ['Preferred unit size', selectedApplication.unitPreference], ['Bid amount', selectedApplication.bidAmount ? `₹${Number(selectedApplication.bidAmount).toLocaleString('en-IN')}` : ''],
              ['Plan type', selectedApplication.planType === 'auction' ? 'E-auction' : 'Lottery'],
              ['Submitted', dateLabel(selectedApplication.submittedAt)], ['Current status', selectedApplication.status],
            ].filter(([, value]) => value).map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
          </section>
        </div>}

        {activeModule === 'lottery' && activeView === 'plans' && <div className="staff-plans-grid">{plans.map((plan) => <article className="staff-plan-card" key={plan.id}><div><span className={plan.planType === 'auction' ? 'staff-type auction-type' : 'staff-type lottery-type'}>{plan.planType === 'auction' ? 'E-AUCTION' : 'LOTTERY'}</span><span className={plan.isPublished ? 'staff-publish-state published' : 'staff-publish-state'}>{plan.isPublished ? 'Published' : 'Draft'}</span></div><h2>{plan.title}</h2><p>{plan.scheme}</p><small>{plan.location} · {plan.area}</small><div className="staff-plan-dates">Applications: {dateLabel(plan.applicationStart)} — {dateLabel(plan.applicationEnd)}</div>{plan.planType === 'auction' && <div className="staff-plan-dates">Reserve: ₹{plan.reservePrice || plan.price} · EMD: ₹{plan.earnestMoney || '—'}</div>}</article>)}{plans.length === 0 && <div className="staff-empty">No plans created yet.</div>}</div>}

        {activeModule === 'lottery' && activeView === 'create' && isAdmin && <form className="staff-editor" data-plan-type={planType} onSubmit={handlePlanCreate}>
          <div className="staff-editor-section"><span>01</span><div><h2>Scheme basics</h2><p>Details shown to citizens on the public portal.</p></div></div>
          <div className="staff-form-grid">
            <label>Plan type<select name="planType" value={planType} onChange={(event) => setPlanType(event.target.value)}><option value="lottery">Lottery scheme</option><option value="auction">Online e-auction</option></select></label>
            <label>Plan title<input name="title" required placeholder="e.g. Gomti Nagar Residential Plots" /></label>
            <label>Scheme name<input name="scheme" required placeholder="Official scheme / notification name" /></label>
            <label>Location<input name="location" required placeholder="Area, city" /></label>
            <label>Category<input name="category" required placeholder="Residential, EWS, commercial land…" /></label>
            <label>Area / unit size<input name="area" required placeholder="e.g. 90–180 sq. m." /></label>
            {planType === 'lottery' && <label>Starting price (₹)<input name="price" type="number" min="1" required placeholder="Starting scheme price" /></label>}
            {planType === 'auction' && <>
              <label>Reserve price (₹)<input name="reservePrice" type="number" min="1" required placeholder="Auction reserve price" /></label>
              <label>Earnest money deposit (₹)<input name="earnestMoney" type="number" min="1" required placeholder="EMD amount" /></label>
              <label>Bidding opens<input name="bidStart" type="datetime-local" required /></label>
              <label>Bidding closes<input name="bidEnd" type="datetime-local" required /></label>
            </>}
            <label>Available units / plots<input name="availableUnits" type="number" min="1" required placeholder="Number of units" /></label>
          </div>
          <div className="staff-editor-section"><span>02</span><div><h2>Dates & publication</h2><p>Set when citizen applications are accepted.</p></div></div>
          <div className="staff-form-grid"><label>Applications open<input name="applicationStart" type="date" required /></label><label>Applications close<input name="applicationEnd" type="date" required /></label><label className="staff-field-wide">Public description<textarea name="description" rows="3" required placeholder="Describe the scheme and citizen benefits." /></label><label className="staff-field-wide">Highlights, comma separated<input name="highlights" placeholder="Online application, Easy instalments, Park-facing plots" /></label></div>
          <div className="staff-publish-options"><label><input type="checkbox" name="featured" /> Feature this plan on the citizen homepage</label><label><input type="checkbox" name="isPublished" defaultChecked /> Publish plan immediately</label></div>
          <button className="staff-primary-button" type="submit" disabled={saving}>{saving ? 'Saving plan…' : 'Create plan'} <span>→</span></button>
        </form>}

        {activeModule === 'lottery' && activeView === 'results' && isAdmin && <>
          <form className="staff-editor result-editor" onSubmit={handleResultCreate}><div className="staff-editor-section"><span>✳</span><div><h2>Publish an execution outcome</h2><p>Only publish officially verified lottery / auction results.</p></div></div><div className="staff-form-grid"><label>Plan<select name="planId" required defaultValue=""><option value="" disabled>Select a plan</option>{plans.map((plan) => <option key={plan.id} value={plan.id}>{plan.planType === 'auction' ? 'E-auction' : 'Lottery'} · {plan.title}</option>)}</select></label><label>Result title<input name="title" required placeholder="Official draw / auction title" /></label><label>Publish date<input name="publishedAt" type="date" defaultValue={dateToday()} required /></label><label>Applications / bidders<input name="applications" type="number" min="0" required placeholder="Total verified applications" /></label><label>Allottees / successful bidders<input name="winners" type="number" min="0" required placeholder="Successful participants" /></label></div><button className="staff-primary-button" type="submit" disabled={saving}>{saving ? 'Publishing…' : 'Publish verified result'} <span>→</span></button></form>
          <div className="staff-published-list"><h2>Previously published results</h2>{results.map((result) => <article key={result.id}><span>{result.type === 'auction' ? 'E-AUCTION' : 'LOTTERY'}</span><strong>{result.title}</strong><small>{dateLabel(result.publishedAt)} · {result.winners} successful</small></article>)}</div>
        </>}
      </section>
    </div>
  </main>
}

export default StaffPortal
