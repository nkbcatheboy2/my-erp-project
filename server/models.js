import mongoose from 'mongoose'

const { Schema, model } = mongoose

const planSchema = new Schema({
  planType: { type: String, enum: ['lottery', 'auction'], required: true },
  title: { type: String, required: true, trim: true, maxlength: 160 },
  scheme: { type: String, required: true, trim: true, maxlength: 160 },
  location: { type: String, required: true, trim: true, maxlength: 200 },
  category: { type: String, required: true, trim: true, maxlength: 100 },
  price: { type: String, required: true, maxlength: 100 },
  area: { type: String, required: true, maxlength: 100 },
  availableUnits: { type: Number, required: true, min: 1 },
  applicationStart: { type: String, required: true },
  applicationEnd: { type: String, required: true },
  status: { type: String, enum: ['draft', 'upcoming', 'open', 'closed'], default: 'draft' },
  description: { type: String, default: '', maxlength: 2000 },
  highlights: { type: [String], default: [] },
  featured: { type: Boolean, default: false },
  isPublished: { type: Boolean, default: false },
  reservePrice: { type: Number, min: 0 },
  earnestMoney: { type: Number, min: 0 },
  bidStart: String,
  bidEnd: String,
  createdBy: { type: Schema.Types.ObjectId, ref: 'StaffUser', required: true },
}, { timestamps: true })

const applicationSchema = new Schema({
  reference: { type: String, required: true, unique: true, index: true },
  planId: { type: Schema.Types.ObjectId, ref: 'Plan', required: true, index: true },
  planType: { type: String, enum: ['lottery', 'auction'], required: true },
  planTitle: { type: String, required: true },
  scheme: { type: String, required: true },
  fullName: { type: String, required: true, trim: true, maxlength: 100 },
  guardianName: { type: String, required: true, trim: true, maxlength: 100 },
  dateOfBirth: { type: String, required: true },
  gender: { type: String, required: true },
  mobile: { type: String, required: true, match: /^\d{10}$/ },
  email: { type: String, trim: true, lowercase: true, maxlength: 254 },
  identityNumber: { type: String, required: true, trim: true, maxlength: 32 },
  annualIncome: { type: Number, required: true, min: 0 },
  category: { type: String, required: true },
  occupation: { type: String, default: '' },
  address: { type: String, required: true, maxlength: 500 },
  city: { type: String, required: true, maxlength: 100 },
  state: { type: String, required: true, maxlength: 100 },
  pinCode: { type: String, required: true, match: /^\d{6}$/ },
  unitPreference: { type: String, default: '' },
  bidAmount: { type: Number, min: 0 },
  declaration: { type: Boolean, required: true, validate: (value) => value === true },
  status: { type: String, enum: ['submitted', 'under_review', 'approved', 'rejected'], default: 'submitted' },
  reviewedBy: { type: Schema.Types.ObjectId, ref: 'StaffUser' },
}, { timestamps: true })

const resultSchema = new Schema({
  type: { type: String, enum: ['lottery', 'auction'], required: true },
  title: { type: String, required: true, trim: true, maxlength: 160 },
  scheme: { type: String, required: true, maxlength: 160 },
  publishedAt: { type: String, required: true },
  location: { type: String, required: true, maxlength: 200 },
  winners: { type: Number, required: true, min: 0 },
  applications: { type: Number, required: true, min: 0 },
  status: { type: String, default: 'Published' },
  isPublished: { type: Boolean, default: true },
  publishedBy: { type: Schema.Types.ObjectId, ref: 'StaffUser', required: true },
}, { timestamps: true })

const staffUserSchema = new Schema({
  email: { type: String, required: true, unique: true, lowercase: true, trim: true, maxlength: 254 },
  passwordHash: { type: String, required: true, select: false },
  displayName: { type: String, required: true, trim: true, maxlength: 120 },
  employeeCode: { type: String, default: '' },
  department: { type: String, default: '' },
  role: { type: String, enum: ['admin', 'employee'], default: 'employee' },
  accessProfile: { type: String, default: 'employee_lottery' },
  permissions: { type: [String], default: [] },
  active: { type: Boolean, default: true },
  salary: {
    basic: { type: Number, default: 0, min: 0 },
    hra: { type: Number, default: 0, min: 0 },
    allowances: { type: Number, default: 0, min: 0 },
    deductions: { type: Number, default: 0, min: 0 },
  },
}, { timestamps: true })

const propertySchema = new Schema({
  propertyId: { type: String, required: true, unique: true, match: /^\d{6}$/ },
  propertyName: { type: String, required: true, trim: true, maxlength: 160 },
  scheme: { type: String, default: '' },
  location: { type: String, default: '' },
  propertyType: { type: String, default: '' },
  area: { type: String, default: '' },
  cost: { type: Number, default: 0, min: 0 },
  allocationMode: { type: String, enum: ['lottery', 'auction', 'fcfs', 'direct'], default: 'direct' },
  auctionStart: String,
  auctionEnd: String,
  allotmentMethod: String,
  ownerName: { type: String, default: '' },
  allotteeApplicationId: { type: Schema.Types.ObjectId, ref: 'PropertyApplication' },
  status: { type: String, enum: ['available', 'reserved', 'allotted'], default: 'available' },
  notes: { type: String, default: '' },
  createdBy: { type: Schema.Types.ObjectId, ref: 'StaffUser', required: true },
}, { timestamps: true })

const propertyApplicationSchema = new Schema({
  propertyId: { type: String, required: true, index: true },
  fullName: { type: String, required: true, trim: true, maxlength: 100 },
  guardianName: { type: String, default: '' },
  mobile: { type: String, required: true, match: /^\d{10}$/ },
  identityNumber: { type: String, default: '' },
  notes: { type: String, default: '' },
  allotmentMethod: { type: String, enum: ['lottery', 'auction', 'fcfs', 'direct'], required: true },
  bidAmount: { type: Number, min: 0, default: null },
  basePrice: { type: Number, min: 0, default: 0 },
  status: { type: String, enum: ['submitted', 'bid_submitted', 'booked', 'allotted', 'waitlisted', 'unsuccessful'], default: 'submitted' },
  allottedBy: { type: Schema.Types.ObjectId, ref: 'StaffUser' },
  allottedAt: Date,
  createdBy: { type: Schema.Types.ObjectId, ref: 'StaffUser' },
}, { timestamps: true })

const auditLogSchema = new Schema({
  actorUid: { type: Schema.Types.ObjectId, ref: 'StaffUser', required: true },
  action: { type: String, required: true },
  recordId: { type: String, default: '' },
  propertyId: { type: String, default: '' },
  details: { type: Schema.Types.Mixed, default: {} },
}, { timestamps: true })

export const Plan = model('Plan', planSchema)
export const CitizenApplication = model('CitizenApplication', applicationSchema)
export const Result = model('Result', resultSchema)
export const StaffUser = model('StaffUser', staffUserSchema)
export const Property = model('Property', propertySchema)
export const PropertyApplication = model('PropertyApplication', propertyApplicationSchema)
export const AuditLog = model('AuditLog', auditLogSchema)
