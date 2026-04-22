import { NextResponse } from 'next/server'
import { recordActivity } from '@/lib/activity-log'
import { prisma } from '@/lib/prisma'
import { requireWriteAccess } from '@/lib/authz'

const parseProductIds = (value: unknown) =>
  Array.isArray(value)
    ? value
        .map((item) => Number(item))
        .filter((item) => Number.isInteger(item) && item > 0)
    : []

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user, response } = await requireWriteAccess('promotions')
    if (response) return response

    const { id } = await params
    const promotionId = Number(id)

    if (!Number.isInteger(promotionId) || promotionId <= 0) {
      return NextResponse.json({ error: 'Promotion ID is invalid' }, { status: 400 })
    }

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

    const promotion = await prisma.promotion.update({
      where: { id: promotionId },
      data: {
        name,
        requiredQuantity,
        bundlePrice,
        appliesToAllProducts,
        isActive,
        products: {
          deleteMany: {},
          ...(appliesToAllProducts
            ? {}
            : {
                create: productIds.map((productId) => ({
                  productId,
                })),
              }),
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
    await recordActivity(request, {
      user,
      action: 'edit',
      entity: 'promotion',
      entityId: promotion.id,
      summary: `แก้ไขโปรโมชั่น ${promotion.name}`,
      metadata: {
        promotionId: promotion.id,
        name: promotion.name,
        requiredQuantity: promotion.requiredQuantity,
        bundlePrice: promotion.bundlePrice,
        isActive: promotion.isActive,
      },
    })

    return NextResponse.json(promotion)
  } catch (error) {
    console.error('Failed to update promotion:', error)
    return NextResponse.json({ error: 'Failed to update promotion' }, { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user, response } = await requireWriteAccess('promotions')
    if (response) return response

    const { id } = await params
    const promotionId = Number(id)

    if (!Number.isInteger(promotionId) || promotionId <= 0) {
      return NextResponse.json({ error: 'Promotion ID is invalid' }, { status: 400 })
    }

    const promotion = await prisma.promotion.delete({
      where: { id: promotionId },
    })
    await recordActivity(request, {
      user,
      action: 'delete',
      entity: 'promotion',
      entityId: promotion.id,
      summary: `ลบโปรโมชั่น ${promotion.name}`,
      metadata: {
        promotionId: promotion.id,
        name: promotion.name,
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to delete promotion:', error)
    return NextResponse.json({ error: 'Failed to delete promotion' }, { status: 500 })
  }
}
