import bcrypt from 'bcryptjs'
import { NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { requireWriteAccess } from '@/lib/authz'
import { normalizeRole } from '@/lib/roles'

function parseUserId(value: string) {
  const id = Number(value)

  return Number.isInteger(id) && id > 0 ? id : null
}

function normalizeValue(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}

export async function PATCH(req: Request, ctx: RouteContext<'/api/users/[id]'>) {
  try {
    const { response } = await requireWriteAccess('users')
    if (response) return response

    const { id: rawId } = await ctx.params
    const userId = parseUserId(rawId)

    if (!userId) {
      return NextResponse.json({ error: 'Invalid user id' }, { status: 400 })
    }

    const body = await req.json()
    const name = normalizeValue(body.name)
    const username = normalizeValue(body.username)
    const email = normalizeValue(body.email)
    const mobile = normalizeValue(body.mobile)
    const password = normalizeValue(body.password)
    const status = body.status === 'inactive' ? 'inactive' : 'active'
    const role = normalizeRole(body.role)

    if (!name || !username || !email || !mobile) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const duplicateUser = await prisma.user.findFirst({
      where: {
        id: { not: userId },
        OR: [{ username }, { email }, { mobile }],
      },
      select: { id: true },
    })

    if (duplicateUser) {
      return NextResponse.json(
        { error: 'Username, Email, or Mobile already exists' },
        { status: 400 }
      )
    }

    const data: Prisma.UserUpdateInput = {
      name,
      username,
      email,
      mobile,
      role,
      isActive: status === 'active',
      deletedAt: status === 'active' ? null : new Date(),
    }

    if (password) {
      if (password.length < 6) {
        return NextResponse.json(
          { error: 'Password must be at least 6 characters' },
          { status: 400 }
        )
      }

      data.password = await bcrypt.hash(password, 10)
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data,
      select: {
        id: true,
        name: true,
        username: true,
        email: true,
        mobile: true,
        role: true,
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
    })

    return NextResponse.json({
      ...user,
      status: user.isActive && !user.deletedAt ? 'active' : 'inactive',
    })
  } catch (error) {
    console.error('Failed to update user', error)

    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2025'
    ) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    return NextResponse.json({ error: 'Failed to update user' }, { status: 500 })
  }
}

export async function DELETE(_req: Request, ctx: RouteContext<'/api/users/[id]'>) {
  try {
    const { response } = await requireWriteAccess('users')
    if (response) return response

    const { id: rawId } = await ctx.params
    const userId = parseUserId(rawId)

    if (!userId) {
      return NextResponse.json({ error: 'Invalid user id' }, { status: 400 })
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        isActive: false,
        deletedAt: new Date(),
      },
      select: {
        id: true,
      },
    })

    return NextResponse.json({ success: true, id: user.id })
  } catch (error) {
    console.error('Failed to soft delete user', error)

    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2025'
    ) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    return NextResponse.json({ error: 'Failed to delete user' }, { status: 500 })
  }
}
