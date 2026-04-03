import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

export async function POST(req: Request) {
  try {
    const { name, username, email, mobile, password } = await req.json()
    if (!name || !username || !email || !mobile || !password) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

    const existingUser = await prisma.user.findFirst({ where: { OR: [{ username }, { email }, { mobile }] } })
    if (existingUser) return NextResponse.json({ error: 'Username, Email, or Mobile already exists' }, { status: 400 })

    const passwordHash = await bcrypt.hash(password, 10)
    const user = await prisma.user.create({
      data: { name, username, email, mobile, password: passwordHash }
    })

    return NextResponse.json({ success: true, user: { id: user.id, username: user.username, name: user.name } })
  } catch (error) {
    console.error('Register route failed', { error })

    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
