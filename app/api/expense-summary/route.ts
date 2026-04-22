import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { buildExpenseSummary, summarizeExpenseSummaryRows } from '@/lib/expense-summary'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const search = (searchParams.get('search') || '').trim().toLowerCase()
    const company = (searchParams.get('company') || 'all').trim()
    const type = (searchParams.get('type') || 'all').trim()
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const page = Math.max(1, Number(searchParams.get('page') || 1))
    const limit = Math.max(1, Math.min(100, Number(searchParams.get('limit') || 10)))
    const exportMode = searchParams.get('exportMode') === 'all'

    const orderWhere: {
      status: 'active'
      createdAt?: {
        gte?: Date
        lte?: Date
      }
    } = {
      status: 'active',
    }

    const expenseWhere: {
      expenseDate?: {
        gte?: Date
        lte?: Date
      }
    } = {}

    if (startDate || endDate) {
      orderWhere.createdAt = {}
      expenseWhere.expenseDate = {}

      if (startDate) {
        const start = new Date(`${startDate}T00:00:00`)
        orderWhere.createdAt.gte = start
        expenseWhere.expenseDate.gte = start
      }

      if (endDate) {
        const end = new Date(`${endDate}T23:59:59`)
        orderWhere.createdAt.lte = end
        expenseWhere.expenseDate.lte = end
      }
    }

    const [orders, expenseEntries, canCategories] = await Promise.all([
      prisma.order.findMany({
        where: orderWhere,
        include: {
          items: {
            select: {
              productId: true,
              productName: true,
              quantity: true,
              price: true,
              cost: true,
              company: true,
              category: true,
            },
          },
          giftSelections: {
            select: {
              giftCampaignId: true,
              cost: true,
              quantity: true,
              giftCampaignName: true,
              giftName: true,
              giftCampaign: {
                select: {
                  appliesToAllProducts: true,
                  products: {
                    select: {
                      productId: true,
                    },
                  },
                },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.expenseEntry.findMany({
        where: expenseWhere,
        include: {
          companies: {
            include: {
              company: true,
            },
          },
        },
        orderBy: [{ expenseDate: 'desc' }, { id: 'desc' }],
      }),
      prisma.category.findMany({
        where: { icon: 'fa-prescription-bottle' },
        select: { name: true },
      }),
    ])

    const summary = buildExpenseSummary({
      orders,
      expenseEntries,
      canCategoryNames: canCategories.map((category) => category.name),
    })

    const filteredRows = summary.rows.filter((row) => {
      const searchTarget = `${row.reference} ${row.company} ${row.note || ''}`.toLowerCase()
      const matchesSearch = !search || searchTarget.includes(search)
      const matchesCompany = company === 'all' || row.company === company
      const matchesType = type === 'all' || row.type === type
      return matchesSearch && matchesCompany && matchesType
    })

    const total = filteredRows.length
    const paginatedRows = exportMode ? filteredRows : filteredRows.slice((page - 1) * limit, page * limit)
    const filteredOverview = summarizeExpenseSummaryRows(filteredRows, summary.overview.canQty)

    return NextResponse.json({
      data: paginatedRows,
      overview: filteredOverview,
      metadata: {
        total,
        page,
        limit,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    })
  } catch (error) {
    console.error('Failed to fetch expense summary:', error)
    return NextResponse.json({ error: 'Failed to fetch expense summary' }, { status: 500 })
  }
}
