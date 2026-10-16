import { firebaseReady, getFirebase, getTransactionalFirestore } from '../lib/firebase.js'

export const demoLotteries = [
  {
    id: 'lda-janeshwar-01', planType: 'lottery', title: 'Janeshwar Enclave Residential Plots',
    scheme: 'LDA Residential Plot Scheme 2026', location: 'Gomti Nagar Extension, Lucknow',
    category: 'Residential plot', price: '₹18.5 lakh onwards', area: '112.5–200 sq. m.',
    availableUnits: 84, applicationStart: '2026-10-01', applicationEnd: '2026-11-15',
    status: 'open', featured: true,
    description: 'A thoughtfully planned neighbourhood with parks, wide roads and everyday amenities close by.',
    highlights: ['Park-facing options', 'Easy instalment plan', 'Online application'],
  },
  {
    id: 'lda-kanpur-road-02', planType: 'lottery', title: 'Aishbagh Affordable Homes',
    scheme: 'Awas Vikas Affordable Housing Scheme', location: 'Aishbagh, Lucknow',
    category: 'Affordable housing', price: '₹12.8 lakh onwards', area: '42–68 sq. m.',
    availableUnits: 126, applicationStart: '2026-10-10', applicationEnd: '2026-12-05',
    status: 'open', featured: false,
    description: 'Comfortable, well-connected homes designed for first-time buyers and growing families.',
    highlights: ['EWS and LIG options', 'Near public transport', 'Transparent allotment'],
  },
  {
    id: 'lda-sultanpur-03', planType: 'lottery', title: 'Sultanpur Road Green Plots',
    scheme: 'Green City Extension Lottery 2026', location: 'Sultanpur Road, Lucknow',
    category: 'Residential plot', price: '₹24 lakh onwards', area: '150–300 sq. m.',
    availableUnits: 52, applicationStart: '2026-11-20', applicationEnd: '2027-01-10',
    status: 'upcoming', featured: false,
    description: 'A new green community with planned open spaces and convenient access to the city.',
    highlights: ['Gated neighbourhood', 'Green open spaces', 'Multiple plot sizes'],
  },
]

export const demoAuctions = [
  {
    id: 'lda-auction-commercial-01', planType: 'auction', title: 'Gomti Nagar Commercial Plots',
    scheme: 'LDA E-Auction · Commercial Land 2026', location: 'Vibhuti Khand, Lucknow',
    category: 'Commercial plot', price: '₹42 lakh reserve price', area: '90–180 sq. m.',
    availableUnits: 12, applicationStart: '2026-10-05', applicationEnd: '2026-11-10',
    bidStart: '2026-11-18T10:00:00+05:30', bidEnd: '2026-11-18T15:00:00+05:30', earnestMoney: 420000,
    reservePrice: 4200000,
    status: 'open', featured: true,
    description: 'Commercial sites offered through a transparent online auction with published reserve prices.',
    highlights: ['Online bidding', 'Reserve price published', 'Verified participants'],
  },
]

export const demoResults = [
  {
    id: 'result-2026-04', type: 'lottery', title: 'Gomti Nagar Extension Plot Scheme',
    scheme: 'Residential Plot Lottery 2026 · Phase I', publishedAt: '2026-09-18',
    location: 'Gomti Nagar Extension, Lucknow', winners: 148, applications: 3240, status: 'Published',
  },
  {
    id: 'result-2026-02', type: 'lottery', title: 'Sharda Nagar EWS Housing Scheme',
    scheme: 'Affordable Housing Lottery 2026', publishedAt: '2026-08-06',
    location: 'Sharda Nagar, Lucknow', winners: 96, applications: 1875, status: 'Published',
  },
]

function requireFirebase() {
  if (!firebaseReady) {
    throw new Error('Firebase is not configured. Add the Firebase web app settings to .env.local and restart the app.')
  }
}

function toRecords(snapshot) {
  return snapshot.docs.map((record) => ({ id: record.id, ...record.data() }))
}

function todayInIndia() {
  const parts = new Intl.DateTimeFormat('en', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date())
  const date = Object.fromEntries(parts.map(({ type, value }) => [type, value]))
  return `${date.year}-${date.month}-${date.day}`
}

export async function loadPortalData() {
  if (!firebaseReady) {
    return { lotteries: demoLotteries, auctions: demoAuctions, results: demoResults, demo: true, issue: '' }
  }

  try {
    const { db, firestoreSdk } = await getFirebase()
    const { collection, getDocs, query, where } = firestoreSdk
    const [plansSnapshot, resultsSnapshot] = await Promise.all([
      getDocs(query(
        collection(db, 'plans'),
        where('isPublished', '==', true),
        where('status', 'in', ['open', 'upcoming']),
      )),
      getDocs(query(collection(db, 'results'), where('isPublished', '==', true))),
    ])
    const today = todayInIndia()
    const plans = toRecords(plansSnapshot)
      .map((plan) => ({
        ...plan,
        status: plan.status === 'closed'
          ? 'closed'
          : plan.applicationStart > today
            ? 'upcoming'
            : plan.applicationEnd < today
              ? 'closed'
              : 'open',
      }))
      .filter((plan) => ['open', 'upcoming'].includes(plan.status))
      .sort((a, b) => (a.applicationStart || '').localeCompare(b.applicationStart || ''))
    const results = toRecords(resultsSnapshot).sort((a, b) => (b.publishedAt || '').localeCompare(a.publishedAt || ''))
    return {
      lotteries: plans.filter((plan) => plan.planType !== 'auction'),
      auctions: plans.filter((plan) => plan.planType === 'auction'),
      results,
      demo: false,
      issue: '',
    }
  } catch (error) {
    return {
      lotteries: demoLotteries,
      auctions: demoAuctions,
      results: demoResults,
      demo: true,
      issue: error instanceof Error ? error.message : 'Could not load Firebase data.',
    }
  }
}

export async function submitApplication(formValues, plan) {
  if (!firebaseReady) {
    return { demo: true, reference: `DEMO-${Date.now().toString().slice(-7)}` }
  }

  requireFirebase()
  const { auth, authSdk, db, firestoreSdk } = await getFirebase()
  const currentUser = auth.currentUser || (await authSdk.signInAnonymously(auth)).user
  const { collection, doc, serverTimestamp, setDoc } = firestoreSdk
  const applicationRef = doc(collection(db, 'applications'))
  const reference = `LDA-${new Date().getFullYear()}-${applicationRef.id.slice(0, 8).toUpperCase()}`
  await setDoc(applicationRef, {
    ...formValues,
    annualIncome: Number(formValues.annualIncome),
    declaration: formValues.declaration === 'on',
    ...(formValues.bidAmount ? { bidAmount: Number(formValues.bidAmount) } : {}),
    applicationId: applicationRef.id,
    reference,
    planId: plan.id,
    planType: plan.planType || 'lottery',
    planTitle: plan.title,
    scheme: plan.scheme,
    applicantUid: currentUser.uid,
    status: 'submitted',
    submittedAt: serverTimestamp(),
  })
  return { demo: false, reference }
}

export async function watchAuth(callback) {
  requireFirebase()
  const { auth, authSdk } = await getFirebase()
  return authSdk.onAuthStateChanged(auth, callback)
}

export async function signInStaff(email, password) {
  requireFirebase()
  const { auth, authSdk } = await getFirebase()
  return authSdk.signInWithEmailAndPassword(auth, email, password)
}

export async function signOutStaff() {
  requireFirebase()
  const { auth, authSdk } = await getFirebase()
  return authSdk.signOut(auth)
}

export async function getStaffProfile(uid) {
  requireFirebase()
  const { db, firestoreSdk } = await getFirebase()
  const snapshot = await firestoreSdk.getDoc(firestoreSdk.doc(db, 'staffRoles', uid))
  return snapshot.exists() ? snapshot.data() : null
}

export async function loadStaffData({ applications = true, lottery = true } = {}) {
  requireFirebase()
  const { db, firestoreSdk } = await getFirebase()
  const { collection, getDocs, limit, orderBy, query } = firestoreSdk
  const [plansSnapshot, applicationsSnapshot, resultsSnapshot] = await Promise.all([
    lottery ? getDocs(query(collection(db, 'plans'), orderBy('createdAt', 'desc'), limit(100))) : Promise.resolve(null),
    applications ? getDocs(query(collection(db, 'applications'), orderBy('submittedAt', 'desc'), limit(100))) : Promise.resolve(null),
    lottery ? getDocs(query(collection(db, 'results'), orderBy('publishedAt', 'desc'), limit(100))) : Promise.resolve(null),
  ])
  const applicationRecords = applications ? toRecords(applicationsSnapshot) : []
  return {
    plans: lottery ? toRecords(plansSnapshot) : [],
    applications: applicationRecords,
    applicationCursor: applications ? applicationsSnapshot.docs.at(-1) || null : null,
    hasMoreApplications: applications && applicationsSnapshot.size === 100,
    results: lottery ? toRecords(resultsSnapshot) : [],
  }
}

export async function loadStaffDirectory() {
  requireFirebase()
  const { db, firestoreSdk } = await getFirebase()
  const snapshot = await firestoreSdk.getDocs(firestoreSdk.collection(db, 'staffRoles'))
  return toRecords(snapshot)
}

export async function loadAuditLogs() {
  requireFirebase()
  const { db, firestoreSdk } = await getFirebase()
  const snapshot = await firestoreSdk.getDocs(firestoreSdk.query(
    firestoreSdk.collection(db, 'auditLogs'),
    firestoreSdk.orderBy('createdAt', 'desc'),
    firestoreSdk.limit(100),
  ))
  return toRecords(snapshot)
}

export async function loadAllStaffReportData(capabilities) {
  requireFirebase()
  const { db, firestoreSdk } = await getFirebase()
  const { collection, documentId, getDocs, limit, orderBy, query, startAfter } = firestoreSdk

  const loadAll = async (collectionName, sortField) => {
    const records = []
    let cursor = null
    let hasMore = true
    while (hasMore) {
      const constraints = [orderBy(sortField || documentId(), 'desc'), limit(500)]
      if (cursor) constraints.push(startAfter(cursor))
      const snapshot = await getDocs(query(collection(db, collectionName), ...constraints))
      records.push(...toRecords(snapshot))
      cursor = snapshot.docs.at(-1) || null
      hasMore = snapshot.size === 500
    }
    return records
  }

  const [properties, propertyApplicants, applications, plans, results, staff, auditLogs] = await Promise.all([
    capabilities.properties || capabilities.propertyApplicants ? loadAll('properties', 'createdAt') : Promise.resolve([]),
    capabilities.propertyApplicants ? loadAll('propertyApplications', 'createdAt') : Promise.resolve([]),
    capabilities.applications ? loadAll('applications', 'submittedAt') : Promise.resolve([]),
    capabilities.lottery || capabilities.auction ? loadAll('plans', 'createdAt') : Promise.resolve([]),
    capabilities.lottery || capabilities.auction ? loadAll('results', 'publishedAt') : Promise.resolve([]),
    capabilities.superAdmin ? loadAll('staffRoles') : Promise.resolve([]),
    capabilities.admin ? loadAll('auditLogs', 'createdAt') : Promise.resolve([]),
  ])

  return { properties, propertyApplicants, applications, plans, results, staff, auditLogs }
}

export async function addStaffDirectoryEntry(entry, authorUid) {
  requireFirebase()
  const { db, firestoreSdk } = await getFirebase()
  const { uid, ...staffData } = entry
  const staffRef = firestoreSdk.doc(db, 'staffRoles', uid)
  await firestoreSdk.setDoc(staffRef, {
    ...staffData,
    createdBy: authorUid,
    createdAt: firestoreSdk.serverTimestamp(),
  })
}

export async function updateStaffDirectoryEntry(uid, updates, authorUid) {
  requireFirebase()
  const { db, firestoreSdk } = await getFirebase()
  await firestoreSdk.updateDoc(firestoreSdk.doc(db, 'staffRoles', uid), {
    ...updates,
    updatedBy: authorUid,
    updatedAt: firestoreSdk.serverTimestamp(),
  })
}

function randomPropertyId() {
  return String(100000 + Math.floor(Math.random() * 900000))
}

export async function createUniqueProperty(property, authorUid) {
  requireFirebase()
  const { db, firestoreSdk } = await getTransactionalFirestore()
  const auctionStartAt = property.auctionStart ? firestoreSdk.Timestamp.fromDate(new Date(property.auctionStart)) : null
  const auctionEndAt = property.auctionEnd ? firestoreSdk.Timestamp.fromDate(new Date(property.auctionEnd)) : null
  if (property.allocationMode === 'auction'
    && (!auctionStartAt || !auctionEndAt || auctionEndAt.toMillis() <= auctionStartAt.toMillis())) {
    throw new Error('Auction closing time must be after its opening time.')
  }
  for (let attempt = 0; attempt < 12; attempt += 1) {
    const propertyId = property.propertyId || randomPropertyId()
    if (!/^\d{6}$/.test(propertyId)) throw new Error('Property ID must contain exactly six digits.')
    const propertyRef = firestoreSdk.doc(db, 'properties', propertyId)
    const created = await firestoreSdk.runTransaction(db, async (transaction) => {
      const existing = await transaction.get(propertyRef)
      if (existing.exists()) return false
      transaction.set(propertyRef, {
        ...property,
        ...(auctionStartAt && auctionEndAt ? { auctionStartAt, auctionEndAt } : {}),
        propertyId,
        createdBy: authorUid,
        createdAt: firestoreSdk.serverTimestamp(),
        updatedAt: firestoreSdk.serverTimestamp(),
      })
      return true
    })
    if (created) return propertyId
    if (property.propertyId) throw new Error(`Property ID ${propertyId} is already in use.`)
  }
  throw new Error('Could not reserve a unique property ID. Please try again.')
}

export async function importProperties(properties, authorUid) {
  const imported = []
  const errors = []
  for (const [index, property] of properties.entries()) {
    try {
      const propertyId = await createUniqueProperty(property, authorUid)
      imported.push({ row: index + 2, propertyId, name: property.propertyName })
    } catch (error) {
      errors.push({ row: index + 2, message: error instanceof Error ? error.message : 'Import failed.' })
    }
  }
  return { imported, errors }
}

export async function loadProperties() {
  requireFirebase()
  const { db, firestoreSdk } = await getFirebase()
  const snapshot = await firestoreSdk.getDocs(firestoreSdk.query(
    firestoreSdk.collection(db, 'properties'),
    firestoreSdk.orderBy('createdAt', 'desc'),
    firestoreSdk.limit(500),
  ))
  return toRecords(snapshot)
}

export async function loadPropertyApplicants() {
  requireFirebase()
  const { db, firestoreSdk } = await getFirebase()
  const snapshot = await firestoreSdk.getDocs(firestoreSdk.query(
    firestoreSdk.collection(db, 'propertyApplications'),
    firestoreSdk.orderBy('createdAt', 'desc'),
    firestoreSdk.limit(500),
  ))
  return toRecords(snapshot)
}

export async function createPropertyApplicant(application, authorUid) {
  requireFirebase()
  const { db, firestoreSdk } = await getTransactionalFirestore()
  const propertyRef = firestoreSdk.doc(db, 'properties', application.propertyId)
  const applicationRef = firestoreSdk.doc(firestoreSdk.collection(db, 'propertyApplications'))
  const mode = application.allotmentMethod
  if (!['lottery', 'auction', 'fcfs', 'direct'].includes(mode)) throw new Error('Choose a valid allocation mode.')
  if (mode === 'auction' && (!Number(application.bidAmount) || Number(application.bidAmount) < Number(application.basePrice || 0))) {
    throw new Error('The bid must be at least the property base price.')
  }
  await firestoreSdk.runTransaction(db, async (transaction) => {
    const propertySnapshot = await transaction.get(propertyRef)
    if (!propertySnapshot.exists()) throw new Error('Property ID was not found in the registry.')
    const property = propertySnapshot.data()
    if (property.status !== 'available') throw new Error('Only vacant properties can receive an application.')
    if (property.allocationMode && property.allocationMode !== mode) throw new Error('Choose a property with the matching allocation mode.')
    const now = Date.now()
    if (mode === 'auction') {
      const opensAt = property.auctionStartAt?.toMillis?.() ?? (property.auctionStart ? new Date(property.auctionStart).getTime() : 0)
      const closesAt = property.auctionEndAt?.toMillis?.() ?? (property.auctionEnd ? new Date(property.auctionEnd).getTime() : Number.POSITIVE_INFINITY)
      if (now < opensAt || now > closesAt) throw new Error('Auction bidding is not open at this time.')
      if (Number(application.bidAmount) < Number(property.cost || 0)) throw new Error('Your bid is below the property base price.')
    }
    const fcfs = mode === 'fcfs'
    transaction.set(applicationRef, {
      ...application,
      bidAmount: mode === 'auction' ? Number(application.bidAmount) : null,
      basePrice: Number(property.cost || 0),
      status: fcfs ? 'booked' : mode === 'auction' ? 'bid_submitted' : 'submitted',
      createdBy: authorUid,
      createdAt: firestoreSdk.serverTimestamp(),
      updatedAt: firestoreSdk.serverTimestamp(),
    })
    if (fcfs) {
      transaction.update(propertyRef, {
        status: 'reserved',
        ownerName: application.fullName,
        allotmentMethod: 'fcfs',
        allotteeApplicationId: applicationRef.id,
        updatedBy: authorUid,
        updatedAt: firestoreSdk.serverTimestamp(),
      })
    }
    writeAuditEvent(transaction, firestoreSdk, db, {
      actorUid: authorUid,
      action: fcfs ? 'property.fcfs_booked' : mode === 'auction' ? 'property.auction_bid' : 'property.application_submitted',
      recordId: applicationRef.id,
      propertyId: application.propertyId,
      details: { mode, applicantName: application.fullName },
    })
  })
  return applicationRef.id
}

export async function allotPropertyToApplicant(application, authorUid) {
  requireFirebase()
  const { db, firestoreSdk } = await getTransactionalFirestore()
  const propertyRef = firestoreSdk.doc(db, 'properties', application.propertyId)
  const applicationRef = firestoreSdk.doc(db, 'propertyApplications', application.id)
  await firestoreSdk.runTransaction(db, async (transaction) => {
    const [propertySnapshot, applicationSnapshot] = await Promise.all([
      transaction.get(propertyRef),
      transaction.get(applicationRef),
    ])
    if (!propertySnapshot.exists()) throw new Error('Property ID was not found in the registry.')
    if (!applicationSnapshot.exists()) throw new Error('Applicant record was not found.')
    if (propertySnapshot.data().status !== 'available') throw new Error('This property is no longer vacant.')
    if (applicationSnapshot.data().allotmentMethod !== 'direct' || applicationSnapshot.data().status !== 'submitted') {
      throw new Error('Only a pending direct allotment can be assigned manually.')
    }
    transaction.update(propertyRef, {
      status: 'allotted',
      ownerName: application.fullName,
      allotmentMethod: 'direct',
      allotteeApplicationId: application.id,
      updatedBy: authorUid,
      updatedAt: firestoreSdk.serverTimestamp(),
    })
    transaction.update(applicationRef, {
      status: 'allotted',
      allottedBy: authorUid,
      allottedAt: firestoreSdk.serverTimestamp(),
      updatedAt: firestoreSdk.serverTimestamp(),
    })
    writeAuditEvent(transaction, firestoreSdk, db, {
      actorUid: authorUid,
      action: 'property.direct_allotment',
      recordId: application.id,
      propertyId: application.propertyId,
      details: { applicantName: application.fullName },
    })
  })
}

function writeAuditEvent(transaction, firestoreSdk, db, event) {
  const eventRef = firestoreSdk.doc(firestoreSdk.collection(db, 'auditLogs'))
  transaction.set(eventRef, {
    ...event,
    createdAt: firestoreSdk.serverTimestamp(),
  })
}

async function settlePropertyWinner({ propertyId, winner, losingApplications, authorUid, method }) {
  const { db, firestoreSdk } = await getTransactionalFirestore()
  const propertyRef = firestoreSdk.doc(db, 'properties', propertyId)
  const winnerRef = firestoreSdk.doc(db, 'propertyApplications', winner.id)
  await firestoreSdk.runTransaction(db, async (transaction) => {
    const [propertySnapshot, winnerSnapshot] = await Promise.all([
      transaction.get(propertyRef),
      transaction.get(winnerRef),
    ])
    if (!propertySnapshot.exists() || propertySnapshot.data().status !== 'available') {
      throw new Error('This property has already been reserved or allotted.')
    }
    if (!winnerSnapshot.exists()) throw new Error('The selected application is no longer available.')
    transaction.update(propertyRef, {
      status: 'allotted',
      ownerName: winner.fullName,
      allotmentMethod: method,
      allotteeApplicationId: winner.id,
      updatedBy: authorUid,
      updatedAt: firestoreSdk.serverTimestamp(),
    })
    transaction.update(winnerRef, {
      status: 'allotted',
      allottedBy: authorUid,
      allottedAt: firestoreSdk.serverTimestamp(),
      updatedAt: firestoreSdk.serverTimestamp(),
    })
    writeAuditEvent(transaction, firestoreSdk, db, {
      actorUid: authorUid,
      action: method === 'lottery' ? 'property.lottery_draw' : 'property.auction_closed',
      recordId: winner.id,
      propertyId,
      details: { winnerName: winner.fullName, bidAmount: winner.bidAmount || null },
    })
  })

  const batchSize = 450
  for (let start = 0; start < losingApplications.length; start += batchSize) {
    const batch = firestoreSdk.writeBatch(db)
    losingApplications.slice(start, start + batchSize).forEach((application) => {
      batch.update(firestoreSdk.doc(db, 'propertyApplications', application.id), {
        status: method === 'lottery' ? 'waitlisted' : 'unsuccessful',
        updatedAt: firestoreSdk.serverTimestamp(),
      })
    })
    await batch.commit()
  }
  return winner
}

export async function runPropertyLottery(propertyId, authorUid) {
  requireFirebase()
  const { db, firestoreSdk } = await getTransactionalFirestore()
  const snapshot = await firestoreSdk.getDocs(firestoreSdk.query(
    firestoreSdk.collection(db, 'propertyApplications'),
    firestoreSdk.where('propertyId', '==', propertyId),
    firestoreSdk.where('allotmentMethod', '==', 'lottery'),
    firestoreSdk.where('status', '==', 'submitted'),
  ))
  const candidates = toRecords(snapshot)
  if (candidates.length === 0) throw new Error('No pending lottery applications exist for this property.')
  const winner = candidates[secureRandomIndex(candidates.length)]
  await settlePropertyWinner({
    propertyId,
    winner,
    losingApplications: candidates.filter((application) => application.id !== winner.id),
    authorUid,
    method: 'lottery',
  })
  return winner
}

function secureRandomIndex(length) {
  if (!globalThis.crypto?.getRandomValues) throw new Error('Secure random selection is unavailable in this browser.')
  const range = 0x100000000
  const limit = Math.floor(range / length) * length
  const value = new Uint32Array(1)
  do {
    globalThis.crypto.getRandomValues(value)
  } while (value[0] >= limit)
  return value[0] % length
}

export async function closePropertyAuction(propertyId, authorUid) {
  requireFirebase()
  const { db, firestoreSdk } = await getTransactionalFirestore()
  const propertyRef = firestoreSdk.doc(db, 'properties', propertyId)
  const propertySnapshot = await firestoreSdk.getDoc(propertyRef)
  if (!propertySnapshot.exists()) throw new Error('Property ID was not found in the registry.')
  const property = propertySnapshot.data()
  const auctionEnd = property.auctionEndAt?.toMillis?.() ?? (property.auctionEnd ? new Date(property.auctionEnd).getTime() : 0)
  if (auctionEnd && Date.now() < auctionEnd) {
    throw new Error('Auction cannot close until its published end time.')
  }
  const snapshot = await firestoreSdk.getDocs(firestoreSdk.query(
    firestoreSdk.collection(db, 'propertyApplications'),
    firestoreSdk.where('propertyId', '==', propertyId),
    firestoreSdk.where('allotmentMethod', '==', 'auction'),
    firestoreSdk.where('status', '==', 'bid_submitted'),
  ))
  const bids = toRecords(snapshot).sort((a, b) => Number(b.bidAmount || 0) - Number(a.bidAmount || 0))
  if (bids.length === 0) throw new Error('No valid bids were submitted for this property.')
  return settlePropertyWinner({
    propertyId,
    winner: bids[0],
    losingApplications: bids.slice(1),
    authorUid,
    method: 'auction',
  })
}

export async function loadMoreStaffApplications(cursor) {
  requireFirebase()
  if (!cursor) return { applications: [], cursor: null, hasMore: false }
  const { db, firestoreSdk } = await getFirebase()
  const { collection, getDocs, limit, orderBy, query, startAfter } = firestoreSdk
  const snapshot = await getDocs(query(
    collection(db, 'applications'),
    orderBy('submittedAt', 'desc'),
    startAfter(cursor),
    limit(100),
  ))
  return {
    applications: toRecords(snapshot),
    cursor: snapshot.docs.at(-1) || cursor,
    hasMore: snapshot.size === 100,
  }
}

export async function createPlan(plan, authorUid) {
  requireFirebase()
  const { db, firestoreSdk } = await getFirebase()
  const applicationStartAt = firestoreSdk.Timestamp.fromDate(new Date(`${plan.applicationStart}T00:00:00.000+05:30`))
  const applicationEndAt = firestoreSdk.Timestamp.fromDate(new Date(`${plan.applicationEnd}T23:59:59.999+05:30`))
  const reference = await firestoreSdk.addDoc(firestoreSdk.collection(db, 'plans'), {
    ...plan,
    applicationStartAt,
    applicationEndAt,
    createdBy: authorUid,
    createdAt: firestoreSdk.serverTimestamp(),
    updatedAt: firestoreSdk.serverTimestamp(),
  })
  return reference.id
}

export async function publishResult(result, authorUid) {
  requireFirebase()
  const { db, firestoreSdk } = await getFirebase()
  const reference = await firestoreSdk.addDoc(firestoreSdk.collection(db, 'results'), {
    ...result,
    publishedBy: authorUid,
    publishedAt: result.publishedAt || new Date().toISOString().slice(0, 10),
    isPublished: true,
    createdAt: firestoreSdk.serverTimestamp(),
  })
  return reference.id
}

export async function updateApplicationStatus(applicationId, status, staffUid) {
  requireFirebase()
  const { db, firestoreSdk } = await getFirebase()
  await firestoreSdk.updateDoc(firestoreSdk.doc(db, 'applications', applicationId), {
    status,
    reviewedBy: staffUid,
    updatedAt: firestoreSdk.serverTimestamp(),
  })
}
