import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        username: true,
        email: true,
        mobile: true,
        isActive: true,
        deletedAt: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            orders: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(
      users.map((user) => ({
        ...user,
        status: user.isActive && !user.deletedAt ? 'active' : 'inactive',
      }))
    )
  } catch (error) {
    console.error('Failed to fetch users', error)
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 })
  }
}
