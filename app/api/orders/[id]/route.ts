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

    const body = (await request.json()) as Record<string, unknown>
    const hasSlipUrl = Object.prototype.hasOwnProperty.call(body, 'slipUrl')
    const hasNote = Object.prototype.hasOwnProperty.call(body, 'note')

    if (!hasSlipUrl && !hasNote) {
      return NextResponse.json({ error: 'No update data provided' }, { status: 400 })
    }

    const data: { slipUrl?: string | null; note?: string | null } = {}

    if (hasSlipUrl) {
      if (typeof body.slipUrl !== 'string' && body.slipUrl !== null) {
        return NextResponse.json({ error: 'Invalid slip URL' }, { status: 400 })
      }
      data.slipUrl = body.slipUrl
    }

    if (hasNote) {
      if (typeof body.note !== 'string' && body.note !== null) {
        return NextResponse.json({ error: 'Invalid note' }, { status: 400 })
      }
      const normalizedNote = typeof body.note === 'string' ? body.note.trim() : ''
      data.note = normalizedNote || null
    }

    const existingOrder = await prisma.order.findUnique({
      where: { id: Number(id) },
      select: { id: true, note: true, total: true },
    })

    if (!existingOrder) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    const updatedOrder = await prisma.order.update({
      where: { id: Number(id) },
      data,
    })
    await recordActivity(request, {
      action: 'edit',
      entity: 'order',
      entityId: updatedOrder.id,
      summary: hasNote ? `แก้ไขหมายเหตุบิล #${updatedOrder.id}` : `แก้ไขบิล #${updatedOrder.id}`,
      metadata: {
        orderId: updatedOrder.id,
        ...(hasSlipUrl ? { slipUrl: updatedOrder.slipUrl } : {}),
        ...(hasNote ? { previousNote: existingOrder.note, note: updatedOrder.note } : {}),
        total: updatedOrder.total,
      },
    })

    return NextResponse.json(updatedOrder)
  } catch (error) {
    console.error('Error updating order:', error)
    return NextResponse.json({ error: 'Failed to update order' }, { status: 500 })
  }
}
