import jwt from 'jsonwebtoken'
import { StaffUser } from './models.js'

export function createToken(user) {
  if (!process.env.JWT_SECRET) throw new Error('JWT_SECRET is not configured.')
  return jwt.sign({ sub: user.id }, process.env.JWT_SECRET, { expiresIn: '8h' })
}

export async function requireStaff(request, response, next) {
  const token = request.get('authorization')?.replace(/^Bearer\s+/i, '')
  if (!token) return response.status(401).json({ error: 'Sign in to continue.' })

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET)
    const staff = await StaffUser.findById(payload.sub)
    if (!staff?.active) return response.status(401).json({ error: 'Staff account is inactive.' })
    request.staff = staff
    next()
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError || error instanceof jwt.TokenExpiredError) {
      return response.status(401).json({ error: 'Your session expired. Please sign in again.' })
    }
    next(error)
  }
}

export function requirePermission(...permissions) {
  return (request, response, next) => {
    if (request.staff.role === 'admin' || permissions.some((permission) => request.staff.permissions.includes(permission))) {
      return next()
    }
    return response.status(403).json({ error: 'Your staff role cannot perform this action.' })
  }
}

export function serializeStaff(staff) {
  return {
    id: staff.id,
    uid: staff.id,
    email: staff.email,
    displayName: staff.displayName,
    employeeCode: staff.employeeCode,
    department: staff.department,
    role: staff.role,
    accessProfile: staff.accessProfile,
    permissions: staff.permissions,
    active: staff.active,
    salary: staff.salary,
  }
}
