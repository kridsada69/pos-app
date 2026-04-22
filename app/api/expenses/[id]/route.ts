import { NextResponse } from 'next/server'
import { recordActivity } from '@/lib/activity-log'
import { prisma } from '@/lib/prisma'
import { requireWriteAccess } from '@/lib/authz'

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { user, response } = await requireWriteAccess('expenses')
    if (response) return response

    const { id } = await params
    const expenseId = Number(id)

    if (!expenseId) {
      return NextResponse.json({ error: 'Expense ID is required' }, { status: 400 })
    }

    const expense = await prisma.expenseEntry.delete({
      where: { id: expenseId },
    })
    await recordActivity(request, {
      user,
      action: 'delete',
      entity: 'expense',
      entityId: expense.id,
      summary: `ลบค่าใช้จ่าย ${expense.name} ฿${Number(expense.amount).toFixed(2)}`,
      metadata: {
        expenseId: expense.id,
        name: expense.name,
        amount: expense.amount,
        company: expense.company,
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to delete expense:', error)
    return NextResponse.json({ error: 'Failed to delete expense' }, { status: 500 })
  }
}
