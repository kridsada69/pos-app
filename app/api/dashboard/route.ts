import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const startDateParam = searchParams.get('startDate')
    const endDateParam = searchParams.get('endDate')

    // Build date range — default to today
    const startDate = startDateParam
      ? new Date(startDateParam + 'T00:00:00')
      : (() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; })()

    const endDate = endDateParam
      ? new Date(endDateParam + 'T23:59:59')
      : (() => { const d = new Date(); d.setHours(23, 59, 59, 999); return d; })()

    // All orders in range
    const orders = await prisma.order.findMany({
      where: {
        createdAt: { gte: startDate, lte: endDate },
        status: 'active'
      },
      include: {
        cashier: { select: { id: true, name: true } },
        items: {
          include: { product: { select: { id: true, name: true } } }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    // Summary
    const totalSales = orders.reduce((sum, o) => sum + o.total, 0)
    const orderCount = orders.length

    const inventoryAlertProducts = await prisma.product.findMany({
      where: {
        stock: { lte: 10 },
        status: 'active',
        deletedAt: null,
      },
      select: {
        id: true,
        name: true,
        stock: true,
        category: true,
      },
      orderBy: [{ stock: 'asc' }, { name: 'asc' }],
    })

    const lowStockProducts = inventoryAlertProducts.filter((product) => product.stock > 0)
    const outOfStockProducts = inventoryAlertProducts.filter((product) => product.stock <= 0)
    const lowStockCount = lowStockProducts.length

    // Daily sales breakdown
    const dailyMap: Record<string, { date: string; count: number; total: number }> = {}
    for (const order of orders) {
      const dateKey = new Date(order.createdAt).toLocaleDateString('th-TH', {
        day: 'numeric', month: 'long', year: 'numeric'
      })
      if (!dailyMap[dateKey]) dailyMap[dateKey] = { date: dateKey, count: 0, total: 0 }
      dailyMap[dateKey].count++
      dailyMap[dateKey].total += order.total
    }
    const dailySales = Object.values(dailyMap)

    // Top products
    const productMap: Record<number, { id: number; name: string; quantity: number; revenue: number }> = {}
    for (const order of orders) {
      for (const item of order.items) {
        const pid = item.product.id
        if (!productMap[pid]) productMap[pid] = { id: pid, name: item.product.name, quantity: 0, revenue: 0 }
        productMap[pid].quantity += item.quantity
        productMap[pid].revenue += item.price * item.quantity
      }
    }
    const topProducts = Object.values(productMap)
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 5)

    // Cashier stats
    const cashierMap: Record<number, { id: number; name: string; count: number; total: number }> = {}
    for (const order of orders) {
      const cid = order.cashier.id
      if (!cashierMap[cid]) cashierMap[cid] = { id: cid, name: order.cashier.name, count: 0, total: 0 }
      cashierMap[cid].count++
      cashierMap[cid].total += order.total
    }
    const cashierStats = Object.values(cashierMap).sort((a, b) => b.total - a.total)

    // Recent orders (top 5)
    const recentOrders = orders.slice(0, 5)

    return NextResponse.json({
      totalSales,
      todaySales: totalSales, // backward compat
      orderCount,
      lowStockCount,
      outOfStockCount: outOfStockProducts.length,
      lowStockProducts,
      outOfStockProducts,
      dailySales,
      topProducts,
      cashierStats,
      recentOrders
    })
  } catch (error) {
    console.error('Dashboard error:', error)
    return NextResponse.json({ error: 'Failed to fetch dashboard metrics' }, { status: 500 })
  }
}
