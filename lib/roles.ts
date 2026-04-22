export const USER_ROLES = ['employee', 'admin', 'super_admin'] as const

export type UserRole = (typeof USER_ROLES)[number]

export type PermissionAction = 'read' | 'write'

export const DEFAULT_ROLE: UserRole = 'employee'

export function normalizeRole(value: unknown): UserRole {
  return USER_ROLES.includes(value as UserRole) ? (value as UserRole) : DEFAULT_ROLE
}

export function canAccessPath(roleValue: unknown, pathname: string) {
  const role = normalizeRole(roleValue)

  if (role === 'super_admin') return true

  if (pathname.startsWith('/users')) return false
  if (pathname.startsWith('/log-history')) return false
  if (pathname.startsWith('/master-data')) return role === 'admin'
  if (pathname.startsWith('/expense-summary')) return role === 'admin'

  return [
    '/dashboard',
    '/pos',
    '/promotion',
    '/gifts',
    '/history',
    '/stock',
  ].some((path) => pathname.startsWith(path))
}

export function canWriteFeature(roleValue: unknown, feature: 'promotions' | 'gifts' | 'masterData' | 'expenses' | 'users' | 'activityLogs') {
  const role = normalizeRole(roleValue)

  if (role === 'super_admin') return true
  if (role === 'admin') return ['promotions', 'gifts', 'expenses'].includes(feature)

  return false
}

export function roleLabel(roleValue: unknown) {
  const role = normalizeRole(roleValue)

  return {
    employee: 'Employee',
    admin: 'Admin',
    super_admin: 'Super Admin',
  }[role]
}
