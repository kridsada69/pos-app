import { NextResponse } from 'next/server'
import { recordActivity } from '@/lib/activity-log'
import { prisma } from '@/lib/prisma'
import { requireWriteAccess } from '@/lib/authz'

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { user, response } = await requireWriteAccess('masterData')
    if (response) return response

    const { id } = await params
    const { name, icon } = await request.json()
    if (!id || !name) return NextResponse.json({ error: 'ID and Name are required' }, { status: 400 })

    const updatedCategory = await prisma.category.update({
      where: { id: Number(id) },
      data: { name, icon: icon || 'fa-box' }
    })
    await recordActivity(request, {
      user,
      action: 'edit',
      entity: 'category',
      entityId: updatedCategory.id,
      summary: `แก้ไขหมวดหมู่ ${updatedCategory.name}`,
      metadata: { categoryId: updatedCategory.id, name: updatedCategory.name, icon: updatedCategory.icon },
    })

    return NextResponse.json(updatedCategory)
  } catch (error) {
    console.error('Error updating category:', error)
    if (typeof error === 'object' && error && 'code' in error && error.code === 'P2002') {
      return NextResponse.json({ error: 'มีหมวดหมู่ที่ใช้ชื่อและประเภทนี้อยู่แล้ว' }, { status: 409 })
    }
    return NextResponse.json({ error: 'Failed to update category' }, { status: 500 })
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { user, response } = await requireWriteAccess('masterData')
    if (response) return response

    const { id } = await params
    if (!id) return NextResponse.json({ error: 'ID is required' }, { status: 400 })

    const category = await prisma.category.delete({
      where: { id: Number(id) }
    })
    await recordActivity(request, {
      user,
      action: 'delete',
      entity: 'category',
      entityId: category.id,
      summary: `ลบหมวดหมู่ ${category.name}`,
      metadata: { categoryId: category.id, name: category.name, icon: category.icon },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting category:', error)
    return NextResponse.json({ error: 'Failed to delete category' }, { status: 500 })
  }
}
