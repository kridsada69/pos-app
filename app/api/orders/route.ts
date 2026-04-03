import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/session'

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    const where: any = { status: 'active' }

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
        items: {
          include: { product: { select: { name: true } } }
        }
      },
      orderBy: { createdAt: 'desc' }
    })
    return NextResponse.json(orders)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch orders' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    
    const { items, total, slipUrl } = await req.json()
    
    if (!items || !items.length || total === undefined) {
      return NextResponse.json({ error: 'Invalid order data' }, { status: 400 })
    }

    const result = await prisma.$transaction(async (prisma) => {
      const order = await prisma.order.create({
        data: {
          total,
          cashierId: session.userId,
          slipUrl: slipUrl || null,
          items: {
            create: items.map((item: any) => ({
              productId: item.productId,
              quantity: item.quantity,
              price: item.price
            }))
          }
        }
      })
      
      for (const item of items) {
        await prisma.product.update({
          where: { id: item.productId },
          data: { stock: { decrement: item.quantity } }
        })
      }
      
      return order
    })

    return NextResponse.json({ success: true, order: result })
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
