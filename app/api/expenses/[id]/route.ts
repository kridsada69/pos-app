import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireWriteAccess } from '@/lib/authz'

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { response } = await requireWriteAccess('expenses')
    if (response) return response

    const { id } = await params
    const expenseId = Number(id)

    if (!expenseId) {
      return NextResponse.json({ error: 'Expense ID is required' }, { status: 400 })
    }

    await prisma.expenseEntry.delete({
      where: { id: expenseId },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to delete expense:', error)
    return NextResponse.json({ error: 'Failed to delete expense' }, { status: 500 })
  }
}
