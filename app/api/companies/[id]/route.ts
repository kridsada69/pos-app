import { NextResponse } from 'next/server'
import { recordActivity } from '@/lib/activity-log'
import { prisma } from '@/lib/prisma'
import { requireWriteAccess } from '@/lib/authz'

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { user, response } = await requireWriteAccess('masterData')
    if (response) return response

    const { id } = await params
    if (!id) return NextResponse.json({ error: 'ID is required' }, { status: 400 })

    const company = await prisma.company.delete({
      where: { id: Number(id) }
    })
    await recordActivity(request, {
      user,
      action: 'delete',
      entity: 'company',
      entityId: company.id,
      summary: `ลบบริษัท ${company.name}`,
      metadata: { companyId: company.id, name: company.name },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting company:', error)
    return NextResponse.json({ error: 'Failed to delete company' }, { status: 500 })
  }
}
