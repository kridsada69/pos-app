import { Prisma } from '@prisma/client'
import { getCurrentUser } from '@/lib/authz'
import { prisma } from '@/lib/prisma'
import { normalizeRole, type UserRole } from '@/lib/roles'

type ActivityActor = {
  id: number
  username: string
  name: string
  role: UserRole
}

type ActivityInput = {
  user?: ActivityActor | null
  action: 'create' | 'edit' | 'delete' | 'checkout' | 'login' | 'logout'
  entity: string
  entityId?: string | number | null
  summary: string
  metadata?: Prisma.InputJsonValue
}

export async function recordActivity(request: Request, input: ActivityInput) {
  try {
    const actor = input.user ?? (await getCurrentUser())
    const url = new URL(request.url)

    await prisma.activityLog.create({
      data: {
        userId: actor?.id ?? null,
        username: actor?.username ?? null,
        userName: actor?.name ?? null,
        userRole: actor ? normalizeRole(actor.role) : null,
        action: input.action,
        entity: input.entity,
        entityId: input.entityId == null ? null : String(input.entityId),
        summary: input.summary,
        route: url.pathname,
        httpMethod: request.method,
        metadata: input.metadata ?? Prisma.JsonNull,
      },
    })
  } catch (error) {
    console.error('Failed to record activity log', error)
  }
}
