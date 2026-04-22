import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireWriteAccess } from '@/lib/authz'

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { response } = await requireWriteAccess('masterData')
    if (response) return response

    const { id } = await params
    if (!id) return NextResponse.json({ error: 'ID is required' }, { status: 400 })

    await prisma.company.delete({
      where: { id: Number(id) }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting company:', error)
    return NextResponse.json({ error: 'Failed to delete company' }, { status: 500 })
  }
}
