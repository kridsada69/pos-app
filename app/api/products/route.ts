import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/authz'
import { recordActivity } from '@/lib/activity-log'
import { prisma } from '@/lib/prisma'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search') || ''
    const category = searchParams.get('category') || ''
    const status = searchParams.get('status') || ''
    const company = searchParams.get('company') || ''
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')

    const where: any = {
      deletedAt: null
    }

    if (search) {
      where.name = { contains: search }
    }
    if (category && category !== 'all') {
      where.category = category
    }
    if (company && company !== 'all') {
      where.company = company
    }
    if (status && status !== 'all') {
      where.status = status
    }

    const total = await prisma.product.count({ where })
    
    const products = await prisma.product.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { id: 'desc' }
    })
    
    return NextResponse.json({
      data: products,
      metadata: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch products' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const { name, category, stock, cost, price, company, imageUrl, status } = body
    
    const product = await prisma.product.create({
      data: {
        name,
        category,
        company: company || null,
        stock: Number(stock),
        cost: Number(cost),
        price: Number(price),
        imageUrl: imageUrl || null,
        status: status || 'active'
      }
    })
    await recordActivity(req, {
      user,
      action: 'create',
      entity: 'stock',
      entityId: product.id,
      summary: `เพิ่มสินค้า ${product.name} ใน stock`,
      metadata: {
        productId: product.id,
        name: product.name,
        stock: product.stock,
        price: product.price,
        category: product.category,
        company: product.company,
      },
    })

    return NextResponse.json(product)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create product' }, { status: 500 })
  }
}
