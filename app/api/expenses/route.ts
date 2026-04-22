import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    const where: {
      expenseDate?: {
        gte?: Date
        lte?: Date
      }
    } = {}

    if (startDate || endDate) {
      where.expenseDate = {}
      if (startDate) {
        where.expenseDate.gte = new Date(`${startDate}T00:00:00`)
      }
      if (endDate) {
        where.expenseDate.lte = new Date(`${endDate}T23:59:59`)
      }
    }

    const expenses = await prisma.expenseEntry.findMany({
      where,
      include: {
        companies: {
          include: {
            company: true,
          },
        },
      },
      orderBy: [{ expenseDate: 'desc' }, { id: 'desc' }],
    })

    return NextResponse.json(expenses)
  } catch (error) {
    console.error('Failed to fetch expenses:', error)
    return NextResponse.json({ error: 'Failed to fetch expenses' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const name = String(body.name || '').trim()
    const amount = Number(body.amount)
    const company = String(body.company || '').trim()
    const companyIds = Array.isArray(body.companyIds)
      ? (body.companyIds as unknown[])
          .map((value: unknown) => Number(value))
          .filter((value) => Number.isInteger(value) && value > 0)
      : []
    const note = String(body.note || '').trim()
    const expenseDateInput = String(body.expenseDate || '').trim()

    if (!name || !Number.isFinite(amount) || amount < 0) {
      return NextResponse.json({ error: 'ข้อมูลค่าใช้จ่ายไม่ถูกต้อง' }, { status: 400 })
    }

    const expense = await prisma.expenseEntry.create({
      data: {
        name,
        amount,
        company: company || null,
        note: note || null,
        expenseDate: expenseDateInput ? new Date(`${expenseDateInput}T12:00:00`) : undefined,
        companies: companyIds.length
          ? {
              create: companyIds.map((companyId) => ({
                companyId,
              })),
            }
          : undefined,
      },
      include: {
        companies: {
          include: {
            company: true,
          },
        },
      },
    })

    return NextResponse.json(expense, { status: 201 })
  } catch (error) {
    console.error('Failed to create expense:', error)
    return NextResponse.json({ error: 'Failed to create expense' }, { status: 500 })
  }
}
