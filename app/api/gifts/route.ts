import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') || 'all'

    const gifts = await prisma.giftCampaign.findMany({
      where: status === 'active' ? { isActive: true } : undefined,
      include: {
        products: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                price: true,
                company: true,
              },
            },
          },
        },
      },
      orderBy: [{ isActive: 'desc' }, { updatedAt: 'desc' }],
    })

    return NextResponse.json(gifts)
  } catch (error) {
    console.error('Failed to fetch gifts:', error)
    return NextResponse.json({ error: 'Failed to fetch gifts' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const name = String(body.name || '').trim()
    const giftName = String(body.giftName || '').trim()
    const cost = Number(body.cost)
    const appliesToAllProducts = Boolean(body.appliesToAllProducts)
    const isActive = body.isActive !== false
    const productIds = Array.isArray(body.productIds)
      ? (body.productIds as unknown[])
          .map((id: unknown) => Number(id))
          .filter((id) => Number.isInteger(id) && id > 0)
      : []

    if (!name || !giftName || !Number.isFinite(cost) || cost < 0) {
      return NextResponse.json({ error: 'ข้อมูลของแถมไม่ถูกต้อง' }, { status: 400 })
    }

    if (!appliesToAllProducts && productIds.length === 0) {
      return NextResponse.json({ error: 'กรุณาเลือกสินค้าเข้าร่วมของแถม' }, { status: 400 })
    }

    const gift = await prisma.giftCampaign.create({
      data: {
        name,
        giftName,
        cost,
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
                company: true,
              },
            },
          },
        },
      },
    })

    return NextResponse.json(gift, { status: 201 })
  } catch (error) {
    console.error('Failed to create gift:', error)
    return NextResponse.json({ error: 'Failed to create gift' }, { status: 500 })
  }
}
