import { NextResponse } from 'next/server'
import { recordActivity } from '@/lib/activity-log'
import { clearSession } from '@/lib/session'

export async function POST(request: Request) {
  await recordActivity(request, {
    action: 'logout',
    entity: 'auth',
    summary: 'logout ออกจากระบบ',
  })

  await clearSession()
  return NextResponse.json({ success: true })
}
