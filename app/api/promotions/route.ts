import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

const parseProductIds = (value: unknown) =>
  Array.isArray(value)
    ? value
        .map((item) => Number(item))
        .filter((item) => Number.isInteger(item) && item > 0)
    : []

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') || 'all'

    const where =
      status === 'active'
        ? { isActive: true }
        : status === 'inactive'
          ? { isActive: false }
          : {}

    const promotions = await prisma.promotion.findMany({
      where,
      include: {
        products: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                price: true,
                status: true,
              },
            },
          },
        },
      },
      orderBy: [{ isActive: 'desc' }, { updatedAt: 'desc' }],
    })

    return NextResponse.json(promotions)
  } catch (error) {
    console.error('Failed to fetch promotions:', error)
    return NextResponse.json({ error: 'Failed to fetch promotions' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const name = typeof body.name === 'string' ? body.name.trim() : ''
    const requiredQuantity = Number(body.requiredQuantity)
    const bundlePrice = Number(body.bundlePrice)
    const appliesToAllProducts = Boolean(body.appliesToAllProducts)
    const isActive = body.isActive !== false
    const productIds = parseProductIds(body.productIds)

    if (!name) {
      return NextResponse.json({ error: 'กรุณาระบุชื่อแคมเปญ' }, { status: 400 })
    }

    if (!Number.isInteger(requiredQuantity) || requiredQuantity <= 0) {
      return NextResponse.json({ error: 'จำนวนสินค้าต่อโปรต้องมากกว่า 0' }, { status: 400 })
    }

    if (!Number.isFinite(bundlePrice) || bundlePrice < 0) {
      return NextResponse.json({ error: 'ราคาโปรโมชั่นไม่ถูกต้อง' }, { status: 400 })
    }

    if (!appliesToAllProducts && productIds.length === 0) {
      return NextResponse.json({ error: 'กรุณาเลือกสินค้าอย่างน้อย 1 รายการ' }, { status: 400 })
    }

    const promotion = await prisma.promotion.create({
      data: {
        name,
        requiredQuantity,
        bundlePrice,
        appliesToAllProducts,
        isActive,
        products: appliesToAllProducts
          ? undefined
          : {
              create: productIds.map((productId) => ({
                productId,
              })),
            },
      },
      include: {
        products: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                price: true,
                status: true,
              },
            },
          },
        },
      },
    })

    return NextResponse.json(promotion)
  } catch (error) {
    console.error('Failed to create promotion:', error)
    return NextResponse.json({ error: 'Failed to create promotion' }, { status: 500 })
  }
}
