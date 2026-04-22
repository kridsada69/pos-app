import { NextResponse } from 'next/server'
import { recordActivity } from '@/lib/activity-log'
import { prisma } from '@/lib/prisma'
import { requireWriteAccess } from '@/lib/authz'

export async function GET() {
  try {
    const companies = await prisma.company.findMany({
      orderBy: { name: 'asc' }
    })
    return NextResponse.json(companies)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch companies' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const { user, response } = await requireWriteAccess('masterData')
    if (response) return response

    const { name } = await request.json()
    if (!name) return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    
    const company = await prisma.company.create({
      data: { name }
    })
    await recordActivity(request, {
      user,
      action: 'create',
      entity: 'company',
      entityId: company.id,
      summary: `เพิ่มบริษัท ${company.name}`,
      metadata: { companyId: company.id, name: company.name },
    })

    return NextResponse.json(company, { status: 201 })
  } catch (error) {
    console.error('Error creating company:', error)
    return NextResponse.json({ error: 'Failed to create company' }, { status: 500 })
  }
}
