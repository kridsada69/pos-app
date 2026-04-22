import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/authz'
import { recordActivity } from '@/lib/activity-log'
import { prisma } from '@/lib/prisma'

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await params
    const body = await request.json()
    const { name, category, stock, cost, price, company, imageUrl, status } = body

    if (!id) return NextResponse.json({ error: 'Product ID is required' }, { status: 400 })

    const updateData: any = {
      name,
      category,
      stock: Number(stock),
      cost: Number(cost),
      price: Number(price),
      company: company || null,
      status: status || 'active'
    }

    if (updateData.status === 'active') {
      updateData.deletedAt = null;
    }

    if (imageUrl) {
      updateData.imageUrl = imageUrl
    }

    const updatedProduct = await prisma.product.update({
      where: { id: Number(id) },
      data: updateData
    })
    await recordActivity(request, {
      user,
      action: 'edit',
      entity: 'stock',
      entityId: updatedProduct.id,
      summary: `แก้ไขสินค้า ${updatedProduct.name} ใน stock`,
      metadata: {
        productId: updatedProduct.id,
        name: updatedProduct.name,
        stock: updatedProduct.stock,
        price: updatedProduct.price,
        status: updatedProduct.status,
      },
    })

    return NextResponse.json(updatedProduct)
  } catch (error) {
    console.error('Error updating product:', error)
    return NextResponse.json({ error: 'Failed to update product' }, { status: 500 })
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await params
    if (!id) return NextResponse.json({ error: 'Product ID is required' }, { status: 400 })

    const product = await prisma.product.update({
      where: { id: Number(id) },
      data: { 
        deletedAt: new Date(), 
        status: 'inactive' 
      }
    })
    await recordActivity(request, {
      user,
      action: 'delete',
      entity: 'stock',
      entityId: product.id,
      summary: `ลบสินค้า ${product.name} จาก stock`,
      metadata: {
        productId: product.id,
        name: product.name,
        status: product.status,
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting product:', error)
    return NextResponse.json({ error: 'Failed to delete product' }, { status: 500 })
  }
}
