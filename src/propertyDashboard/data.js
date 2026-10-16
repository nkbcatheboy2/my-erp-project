export const menuItems = [
  { label: 'Property Pendency', icon: 'clock', badge: '18', children: ['Lease Pendency', 'Costing Pendency', 'Registry Pendency', 'Agreement Pendency', 'Possession Pendency'] },
  { label: 'Property Search', icon: 'search', children: ['Search by Property', 'Search by Allottee', 'Search by Scheme'] },
  { label: 'Configuration', icon: 'settings', children: ['Master Configuration', 'Scheme Configuration', 'Rate Configuration'] },
  { label: 'Property Configuration', icon: 'building', children: ['Property Register', 'Bulk Property Upload', 'Property Mapping'] },
  { label: 'Permission Application', icon: 'file', badge: '06', children: ['NOC Application', 'Registry Permission', 'Lease Permission', 'Transfer Permission'] },
  { label: 'Estate Management', icon: 'landmark', children: ['Estate Register', 'Inspections', 'Encroachment Cases'] },
  { label: 'Financial Activities', icon: 'wallet', children: ['Payment Collection', 'Demand Generation', 'Refund Management'] },
  { label: 'Sales', icon: 'tag', children: ['Active Schemes', 'Allotment Register', 'Sales Ledger'] },
  { label: 'Nazul Management', icon: 'map', children: ['Nazul Register', 'Lease Register', 'Nazul Survey'] },
  { label: 'Utility & Settings', icon: 'sliders', children: ['User Management', 'Role & Permissions', 'System Settings'] },
  { label: 'MIS Reports', icon: 'chart', children: ['All MIS Reports', 'Pendency Reports', 'Financial Reports'] },
]

export const reportGroups = [
  {
    name: 'Allotment & Schemes',
    icon: 'building',
    tone: 'sage',
    reports: [
      { name: 'Allotted Summary', description: 'Allotment overview by scheme and property type', tag: 'ALLOTMENT' },
      { name: 'Scheme Summary', description: 'Scheme inventory, status and allotment progress', tag: 'SCHEMES' },
      { name: 'Employee Scheme Relation', description: 'Employee eligibility and scheme mapping', tag: 'EMPLOYEE' },
    ],
  },
  {
    name: 'Payment & Recovery',
    icon: 'wallet',
    tone: 'blue',
    reports: [
      { name: 'Payment Detail (FCFS)', description: 'First-come-first-served payment transactions', tag: 'PAYMENT' },
      { name: 'Payment Detail (Lottery)', description: 'Lottery scheme payment transactions', tag: 'PAYMENT' },
      { name: 'Payment Detail (Auction)', description: 'Auction payment and bid settlement details', tag: 'PAYMENT' },
      { name: 'Payment Detail (Direct)', description: 'Direct allotment payment transactions', tag: 'PAYMENT' },
      { name: 'Over 90% Payment Received', description: 'Allottees with more than 90% payment received', tag: 'RECOVERY' },
      { name: 'Due Detail', description: 'Outstanding dues by allottee and scheme', tag: 'DUES' },
      { name: 'Scheme Wise Recovery Report', description: 'Recovery performance across active schemes', tag: 'RECOVERY' },
      { name: 'Receipt Recovery Report', description: 'Receipts reconciled against recoveries', tag: 'RECEIPTS' },
      { name: 'Old Receipt MIS', description: 'Legacy receipt and payment records', tag: 'LEGACY' },
    ],
  },
  {
    name: 'Pendency & SLAs',
    icon: 'clock',
    tone: 'amber',
    reports: [
      { name: 'Lease Pending (> 30 Days)', description: 'Lease applications pending beyond 30 days', tag: 'SLA · 30 DAYS' },
      { name: 'Costing Pending (> 21 Days)', description: 'Costing cases pending beyond 21 days', tag: 'SLA · 21 DAYS' },
      { name: 'Registry Pending (30 Days)', description: 'Registry applications approaching or past SLA', tag: 'SLA · 30 DAYS' },
      { name: 'Agreement Pending (> 30 Days)', description: 'Agreements awaiting action beyond 30 days', tag: 'SLA · 30 DAYS' },
      { name: 'Possession Pending (> 2 Weeks)', description: 'Possession cases open for more than two weeks', tag: 'SLA · 2 WEEKS' },
      { name: 'Bank NOC Pending (> 3 Weeks)', description: 'Bank NOC requests open beyond three weeks', tag: 'SLA · 3 WEEKS' },
      { name: 'Employee Wise Pendency Report', description: 'Open applications grouped by responsible employee', tag: 'TEAM' },
    ],
  },
  {
    name: 'Registry & Legal / Nazul',
    icon: 'file',
    tone: 'violet',
    reports: [
      { name: 'Registry Camp', description: 'Registry camp schedule and application progress', tag: 'REGISTRY' },
      { name: 'Nazool Register', description: 'Nazool property register and status', tag: 'NAZOOL' },
      { name: 'Nazul Register 1862', description: 'Historical Nazul record register', tag: 'ARCHIVE' },
      { name: 'Legacy Property Update', description: 'Property records awaiting legacy data updates', tag: 'LEGACY' },
      { name: 'OTS Applicant', description: 'One-time settlement applicant status', tag: 'OTS' },
      { name: 'KYC Survey', description: 'KYC completion and verification status', tag: 'KYC' },
    ],
  },
]

export const dashboardMetrics = [
  { label: 'TOTAL PROPERTIES', value: '24,680', change: '+4.8%', icon: 'building', tone: 'sage' },
  { label: 'ACTIVE APPLICATIONS', value: '1,284', change: '86 need attention', icon: 'file', tone: 'blue' },
  { label: 'PENDING CASES', value: '346', change: '32 beyond SLA', icon: 'clock', tone: 'amber' },
  { label: 'RECOVERY THIS MONTH', value: '₹ 8.42 Cr', change: '+12.6% vs last month', icon: 'wallet', tone: 'violet' },
]
