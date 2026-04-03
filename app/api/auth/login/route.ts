import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { setSession } from '@/lib/session'

export async function POST(req: Request) {
  try {
    const { username, password } = await req.json()
    if (!username || !password) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

    const user = await prisma.user.findUnique({ where: { username } })
    if (!user) return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })

    const valid = await bcrypt.compare(password, user.password)
    if (!valid) return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })

    await setSession(user.id, user.name)

    return NextResponse.json({ success: true, user: { id: user.id, username: user.username, name: user.name } })
  } catch (error) {
    console.error('Login route failed', { error })

    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
