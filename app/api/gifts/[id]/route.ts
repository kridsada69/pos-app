import { NextResponse } from 'next/server'
import { recordActivity } from '@/lib/activity-log'
import { prisma } from '@/lib/prisma'
import { requireWriteAccess } from '@/lib/authz'

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { user, response } = await requireWriteAccess('gifts')
    if (response) return response

    const { id } = await params
    const giftId = Number(id)
    const body = await request.json()
    const name = String(body.name || '').trim()
    const giftName = String(body.giftName || '').trim()
    const cost = Number(body.cost)
    const requiredQuantity = Number(body.requiredQuantity)
    const appliesToAllProducts = Boolean(body.appliesToAllProducts)
    const isActive = body.isActive !== false
    const productIds = Array.isArray(body.productIds)
      ? (body.productIds as unknown[])
          .map((item: unknown) => Number(item))
          .filter((item) => Number.isInteger(item) && item > 0)
      : []

    if (
      !giftId ||
      !name ||
      !giftName ||
      !Number.isFinite(cost) ||
      cost < 0 ||
      !Number.isInteger(requiredQuantity) ||
      requiredQuantity <= 0
    ) {
      return NextResponse.json({ error: 'ข้อมูลของแถมไม่ถูกต้อง' }, { status: 400 })
    }

    if (!appliesToAllProducts && productIds.length === 0) {
      return NextResponse.json({ error: 'กรุณาเลือกสินค้าเข้าร่วมของแถม' }, { status: 400 })
    }

    const gift = await prisma.giftCampaign.update({
      where: { id: giftId },
      data: {
        name,
        giftName,
        cost,
        requiredQuantity,
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
                company: true,
              },
            },
          },
        },
      },
    })
    await recordActivity(request, {
      user,
      action: 'edit',
      entity: 'gift',
      entityId: gift.id,
      summary: `แก้ไขของแถม ${gift.name}`,
      metadata: {
        giftCampaignId: gift.id,
        name: gift.name,
        giftName: gift.giftName,
        isActive: gift.isActive,
      },
    })

    return NextResponse.json(gift)
  } catch (error) {
    console.error('Failed to update gift:', error)
    return NextResponse.json({ error: 'Failed to update gift' }, { status: 500 })
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { user, response } = await requireWriteAccess('gifts')
    if (response) return response

    const { id } = await params
    const giftId = Number(id)

    if (!giftId) {
      return NextResponse.json({ error: 'Gift ID is required' }, { status: 400 })
    }

    const gift = await prisma.giftCampaign.delete({
      where: { id: giftId },
    })
    await recordActivity(request, {
      user,
      action: 'delete',
      entity: 'gift',
      entityId: gift.id,
      summary: `ลบของแถม ${gift.name}`,
      metadata: {
        giftCampaignId: gift.id,
        name: gift.name,
        giftName: gift.giftName,
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to delete gift:', error)
    return NextResponse.json({ error: 'Failed to delete gift' }, { status: 500 })
  }
}
