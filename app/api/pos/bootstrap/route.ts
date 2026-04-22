import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const [products, promotions, gifts, categories] = await Promise.all([
      prisma.product.findMany({
        where: {
          deletedAt: null,
          status: 'active',
        },
        orderBy: { id: 'desc' },
      }),
      prisma.promotion.findMany({
        where: { isActive: true },
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
      }),
      prisma.giftCampaign.findMany({
        where: { isActive: true },
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
      }),
      prisma.category.findMany({
        orderBy: { name: 'asc' },
      }),
    ])

    return NextResponse.json({
      products,
      promotions,
      gifts,
      categories,
    })
  } catch (error) {
    console.error('Failed to fetch POS bootstrap data:', error)
    return NextResponse.json({ error: 'Failed to fetch POS bootstrap data' }, { status: 500 })
  }
}
