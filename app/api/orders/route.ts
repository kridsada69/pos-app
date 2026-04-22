import { NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/session'
import { recordActivity } from '@/lib/activity-log'
import { getBestPromotionStack } from '@/lib/promotion-utils'
import { getApplicableGiftCampaigns } from '@/lib/gift-utils'

type OrderRequestItem = {
  productId: number
  quantity: number
}

type OrderRequestBody = {
  items?: Array<{ productId?: unknown; quantity?: unknown }>
  slipUrl?: string
  manualDiscount?: number | string | null
  note?: string | null
  isTaxEnabled?: boolean
  selectedGiftCampaignIds?: unknown[]
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    const where: Prisma.OrderWhereInput = { status: 'active' }

    if (startDate || endDate) {
      where.createdAt = {}
      if (startDate) {
        const start = new Date(startDate)
        start.setHours(0, 0, 0, 0)
        where.createdAt.gte = start
      }
      if (endDate) {
        const end = new Date(endDate)
        end.setHours(23, 59, 59, 999)
        where.createdAt.lte = end
      }
    }

    const orders = await prisma.order.findMany({
      where,
      include: {
        cashier: { select: { name: true } },
        giftSelections: true,
        items: {
          select: {
            id: true,
            quantity: true,
            price: true,
            productName: true,
            company: true,
            product: {
              select: {
                name: true,
                company: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' }
    })
    return NextResponse.json(orders)
  } catch {
    return NextResponse.json({ error: 'Failed to fetch orders' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    
    const {
      items,
      slipUrl,
      manualDiscount,
      note,
      isTaxEnabled,
      selectedGiftCampaignIds,
    } = (await req.json()) as OrderRequestBody
    
    if (!items || !items.length) {
      return NextResponse.json({ error: 'Invalid order data' }, { status: 400 })
    }

    const normalizedManualDiscountInput = Number(manualDiscount) || 0
    const normalizedNote = typeof note === 'string' ? note.trim() : ''
    const normalizedGiftCampaignIds = Array.isArray(selectedGiftCampaignIds)
      ? selectedGiftCampaignIds
          .map((item) => Number(item))
          .filter((item) => Number.isInteger(item) && item > 0)
      : []
    const sanitizedItems: OrderRequestItem[] = items
      .map((item) => ({
        productId: Number(item.productId),
        quantity: Number(item.quantity),
      }))
      .filter((item) =>
        Number.isInteger(item.productId) &&
        item.productId > 0 &&
        Number.isInteger(item.quantity) &&
        item.quantity > 0
      )

    if (!sanitizedItems.length) {
      return NextResponse.json({ error: 'Invalid order items' }, { status: 400 })
    }

    const result = await prisma.$transaction(async (prisma) => {
      const productIds = sanitizedItems.map((item) => item.productId)
      const products = await prisma.product.findMany({
        where: {
          id: { in: productIds },
          deletedAt: null,
        },
        select: {
          id: true,
          name: true,
          price: true,
          cost: true,
          stock: true,
          company: true,
          category: true,
        },
      })

      const productMap = new Map(products.map((product) => [product.id, product]))
      const lineItems = sanitizedItems.map((item) => {
        const product = productMap.get(item.productId)
        if (!product) {
          throw new Error(`PRODUCT_NOT_FOUND:${item.productId}`)
        }
        if (product.stock < item.quantity) {
          throw new Error(`INSUFFICIENT_STOCK:${item.productId}`)
        }
        return {
          productId: product.id,
          quantity: item.quantity,
          price: product.price,
          cost: product.cost,
          name: product.name,
          company: product.company,
          category: product.category,
        }
      })

      const subtotal = lineItems.reduce((sum, item) => sum + item.price * item.quantity, 0)

      const promotions = await prisma.promotion.findMany({
        where: {
          isActive: true,
        },
        include: {
          products: {
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
      })

      const promotionStack = getBestPromotionStack(promotions, lineItems)
      const giftCampaigns = await prisma.giftCampaign.findMany({
        where: {
          isActive: true,
          ...(normalizedGiftCampaignIds.length > 0 ? { id: { in: normalizedGiftCampaignIds } } : {}),
        },
        include: {
          products: {
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
      })
      const applicableGiftCampaigns = getApplicableGiftCampaigns(giftCampaigns, lineItems)
      const selectedGiftCampaigns = applicableGiftCampaigns.filter((campaign) =>
        normalizedGiftCampaignIds.includes(campaign.giftCampaignId)
      )
      const promotionDiscount = promotionStack.totalPromotionDiscount
      const subtotalAfterPromotion = Math.max(subtotal - promotionDiscount, 0)
      const normalizedManualDiscount = Math.min(
        Math.max(normalizedManualDiscountInput, 0),
        subtotalAfterPromotion
      )
      const discountedSubtotal = Math.max(subtotalAfterPromotion - normalizedManualDiscount, 0)
      const tax = isTaxEnabled ? discountedSubtotal * 0.07 : 0
      const total = discountedSubtotal + tax

      const order = await prisma.order.create({
        data: {
          subtotal,
          promotionId:
            promotionStack.appliedPromotions.length === 1
              ? promotionStack.appliedPromotions[0].promotionId
              : null,
          promotionLabel: promotionStack.promotionLabel || null,
          promotionDiscount,
          manualDiscount: normalizedManualDiscount,
          note: normalizedNote || null,
          tax,
          total,
          cashierId: session.userId,
          slipUrl: slipUrl || null,
          giftSelections: selectedGiftCampaigns.length
            ? {
                create: selectedGiftCampaigns.map((gift) => ({
                  giftCampaignId: gift.giftCampaignId,
                  giftCampaignName: gift.giftCampaignName,
                  giftName: gift.giftName,
                  cost: gift.cost,
                  quantity: gift.giftQuantity,
                })),
              }
            : undefined,
          items: {
            create: lineItems.map((item) => ({
              productId: item.productId,
              quantity: item.quantity,
              price: item.price,
              cost: item.cost,
              productName: item.name,
              company: item.company,
              category: item.category,
            }))
          }
        }
      })
      
      for (const item of lineItems) {
        await prisma.product.update({
          where: { id: item.productId },
          data: { stock: { decrement: item.quantity } }
        })
      }
      
      return order
    })

    await recordActivity(req, {
      action: 'checkout',
      entity: 'order',
      entityId: result.id,
      summary: `คิดเงินบิล #${result.id} ยอดรวม ฿${Number(result.total).toFixed(2)}`,
      metadata: {
        orderId: result.id,
        subtotal: result.subtotal,
        total: result.total,
        itemCount: sanitizedItems.length,
      },
    })

    return NextResponse.json({ success: true, order: result })
  } catch (error) {
    console.error('Internal Server Error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
