"use client"

import { useEffect, useMemo, useState } from 'react'

type ActivityLog = {
  id: number
  username: string | null
  userName: string | null
  userRole: string | null
  action: string
  entity: string
  entityId: string | null
  summary: string
  route: string
  httpMethod: string
  metadata: unknown
  createdAt: string
}

const actionLabels: Record<string, string> = {
  create: 'Create',
  edit: 'Edit',
  delete: 'Delete',
  checkout: 'คิดเงิน',
  login: 'Login',
  logout: 'Logout',
}

const actionStyles: Record<string, string> = {
  create: 'bg-emerald-50 text-emerald-700',
  edit: 'bg-blue-50 text-blue-700',
  delete: 'bg-red-50 text-red-700',
  checkout: 'bg-violet-50 text-violet-700',
  login: 'bg-cyan-50 text-cyan-700',
  logout: 'bg-slate-100 text-slate-700',
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString('th-TH', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function LogHistoryPage() {
  const [logs, setLogs] = useState<ActivityLog[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [action, setAction] = useState('all')
  const [userQuery, setUserQuery] = useState('')

  const queryString = useMemo(() => {
    const params = new URLSearchParams({ limit: '200' })
    if (action !== 'all') params.set('action', action)
    if (userQuery.trim()) params.set('user', userQuery.trim())
    return params.toString()
  }, [action, userQuery])

  useEffect(() => {
    const loadLogs = async () => {
      setIsLoading(true)
      setError('')

      try {
        const res = await fetch(`/api/log-history?${queryString}`, { cache: 'no-store' })
        const data = await res.json()

        if (!res.ok) {
          throw new Error(data.error || 'โหลด log history ไม่สำเร็จ')
        }

        setLogs(Array.isArray(data) ? data : [])
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : 'โหลด log history ไม่สำเร็จ')
      } finally {
        setIsLoading(false)
      }
    }

    void loadLogs()
  }, [queryString])

  return (
    <>
      <div className="mb-8 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 className="text-3xl font-black tracking-tight text-slate-800">Log History</h2>
          <p className="mt-1 text-sm text-slate-500">
            ตรวจสอบกิจกรรมของผู้ใช้ เช่น เพิ่ม แก้ไข ลบ ยิง API และคิดเงิน
          </p>
        </div>
        <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-500">
          แสดงล่าสุด <span className="font-bold text-slate-700">{logs.length}</span> รายการ
        </div>
      </div>

      <div className="mb-6 grid gap-3 rounded-3xl border border-slate-100 bg-white p-4 shadow-sm lg:grid-cols-[220px_minmax(0,1fr)]">
        <select
          value={action}
          onChange={(event) => setAction(event.target.value)}
          className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
        >
          <option value="all">ทุกกิจกรรม</option>
          <option value="create">Create</option>
          <option value="edit">Edit</option>
          <option value="delete">Delete</option>
          <option value="checkout">คิดเงิน</option>
          <option value="login">Login</option>
          <option value="logout">Logout</option>
        </select>
        <div className="relative">
          <i className="fas fa-search absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"></i>
          <input
            type="text"
            value={userQuery}
            onChange={(event) => setUserQuery(event.target.value)}
            placeholder="ค้นหาจากชื่อหรือ username"
            className="w-full rounded-2xl border border-slate-200 py-3 pl-11 pr-4 text-sm text-slate-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
          />
        </div>
      </div>

      {error && (
        <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
          {error}
        </div>
      )}

      <div className="overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-[1180px] w-full text-left">
            <thead className="bg-slate-50 text-xs font-bold uppercase tracking-wider text-slate-400">
              <tr>
                <th className="px-6 py-4">เวลา</th>
                <th className="px-6 py-4">User</th>
                <th className="px-6 py-4">กิจกรรม</th>
                <th className="px-6 py-4">รายละเอียด</th>
                <th className="px-6 py-4">Route</th>
                <th className="px-6 py-4">Entity</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {logs.map((log) => (
                <tr key={log.id} className="transition hover:bg-slate-50">
                  <td className="whitespace-nowrap px-6 py-5 text-sm font-semibold text-slate-600">
                    {formatDateTime(log.createdAt)}
                  </td>
                  <td className="px-6 py-5">
                    <p className="font-bold text-slate-800">{log.userName || '-'}</p>
                    <p className="text-xs font-medium text-slate-400">
                      {log.username ? `@${log.username}` : 'unknown'} {log.userRole ? `• ${log.userRole}` : ''}
                    </p>
                  </td>
                  <td className="px-6 py-5">
                    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${actionStyles[log.action] || 'bg-slate-100 text-slate-600'}`}>
                      {actionLabels[log.action] || log.action}
                    </span>
                  </td>
                  <td className="px-6 py-5">
                    <p className="font-semibold text-slate-700">{log.summary}</p>
                    {log.entityId && <p className="mt-1 text-xs text-slate-400">ID: {log.entityId}</p>}
                  </td>
                  <td className="px-6 py-5">
                    <p className="font-mono text-xs font-bold text-slate-600">{log.httpMethod}</p>
                    <p className="mt-1 font-mono text-xs text-slate-400">{log.route}</p>
                  </td>
                  <td className="px-6 py-5">
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
                      {log.entity}
                    </span>
                  </td>
                </tr>
              ))}
              {!isLoading && logs.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-14 text-center text-slate-400">
                    <i className="fas fa-clipboard-list mb-3 block text-3xl text-slate-300"></i>
                    ยังไม่มี log history
                  </td>
                </tr>
              )}
              {isLoading && (
                <tr>
                  <td colSpan={6} className="px-6 py-14 text-center text-slate-400">
                    <i className="fas fa-circle-notch fa-spin mb-3 block text-3xl text-blue-400"></i>
                    กำลังโหลด log history...
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  )
}
