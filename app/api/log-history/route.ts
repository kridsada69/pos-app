import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/authz'
import { prisma } from '@/lib/prisma'

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (user.role !== 'super_admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action') || ''
    const userQuery = searchParams.get('user') || ''
    const take = Math.min(Math.max(Number(searchParams.get('limit')) || 100, 1), 300)

    const logs = await prisma.activityLog.findMany({
      where: {
        ...(action && action !== 'all' ? { action } : {}),
        ...(userQuery
          ? {
              OR: [
                { username: { contains: userQuery, mode: 'insensitive' } },
                { userName: { contains: userQuery, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      orderBy: { createdAt: 'desc' },
      take,
    })

    return NextResponse.json(logs)
  } catch (error) {
    console.error('Failed to fetch activity logs', error)
    return NextResponse.json({ error: 'Failed to fetch activity logs' }, { status: 500 })
  }
}
