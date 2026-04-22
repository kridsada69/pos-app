import { NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { prisma } from '@/lib/prisma'
import { canWriteFeature, normalizeRole, type UserRole } from '@/lib/roles'

export async function getCurrentUser() {
  const session = await getSession()
  if (!session?.userId) return null

  const user = await prisma.user.findUnique({
    where: { id: Number(session.userId) },
    select: {
      id: true,
      name: true,
      username: true,
      role: true,
      isActive: true,
      deletedAt: true,
    },
  })

  if (!user || !user.isActive || user.deletedAt) return null

  return {
    ...user,
    role: normalizeRole(user.role),
  }
}

export async function requireWriteAccess(feature: Parameters<typeof canWriteFeature>[1]) {
  const user = await getCurrentUser()

  if (!user) {
    return {
      user: null,
      response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    }
  }

  if (!canWriteFeature(user.role, feature)) {
    return {
      user,
      response: NextResponse.json({ error: 'Forbidden' }, { status: 403 }),
    }
  }

  return { user, response: null }
}

export function canManageRole(actorRole: UserRole, nextRole: UserRole) {
  return actorRole === 'super_admin' && Boolean(nextRole)
}
