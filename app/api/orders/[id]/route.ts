import { NextResponse } from 'next/server'
import { recordActivity } from '@/lib/activity-log'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/session'

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await params
    if (!id) return NextResponse.json({ error: 'Order ID is required' }, { status: 400 })

    const order = await prisma.order.update({
      where: { id: Number(id) },
      data: { status: 'inactive' }
    })
    await recordActivity(request, {
      action: 'delete',
      entity: 'order',
      entityId: order.id,
      summary: `ลบบิล #${order.id}`,
      metadata: {
        orderId: order.id,
        total: order.total,
        status: order.status,
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting order:', error)
    return NextResponse.json({ error: 'Failed to delete order' }, { status: 500 })
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await params
    if (!id) return NextResponse.json({ error: 'Order ID is required' }, { status: 400 })

    const body = await request.json()
    const { slipUrl } = body

    const updatedOrder = await prisma.order.update({
      where: { id: Number(id) },
      data: { slipUrl }
    })
    await recordActivity(request, {
      action: 'edit',
      entity: 'order',
      entityId: updatedOrder.id,
      summary: `แก้ไขบิล #${updatedOrder.id}`,
      metadata: {
        orderId: updatedOrder.id,
        slipUrl: updatedOrder.slipUrl,
        total: updatedOrder.total,
      },
    })

    return NextResponse.json(updatedOrder)
  } catch (error) {
    console.error('Error updating order:', error)
    return NextResponse.json({ error: 'Failed to update order' }, { status: 500 })
  }
}
