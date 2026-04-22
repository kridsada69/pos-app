import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { recordActivity } from '@/lib/activity-log'
import { normalizeRole } from '@/lib/roles'
import { setSession } from '@/lib/session'

export async function POST(req: Request) {
  try {
    const { username, password } = await req.json()
    if (!username || !password) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

    const user = await prisma.user.findUnique({ where: { username } })
    if (!user) return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
    if (!user.isActive || user.deletedAt) {
      return NextResponse.json({ error: 'This user account is inactive' }, { status: 403 })
    }

    const valid = await bcrypt.compare(password, user.password)
    if (!valid) return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })

    const role = normalizeRole(user.role)

    await setSession(user.id, user.name, user.username, role)
    await recordActivity(req, {
      user: {
        id: user.id,
        username: user.username,
        name: user.name,
        role,
      },
      action: 'login',
      entity: 'auth',
      entityId: user.id,
      summary: `${user.name} login เข้าระบบ`,
      metadata: {
        userId: user.id,
        username: user.username,
      },
    })

    return NextResponse.json({ success: true, user: { id: user.id, username: user.username, name: user.name, role } })
  } catch (error) {
    console.error('Login route failed', error)

    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
