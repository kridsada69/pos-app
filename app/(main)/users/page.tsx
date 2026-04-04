"use client"

import { useEffect, useMemo, useState } from 'react'

type UserRow = {
  id: number
  name: string
  username: string
  email: string
  mobile: string
  createdAt: string
  _count: {
    orders: number
  }
}

export default function UsersPage() {
  const [users, setUsers] = useState<UserRow[]>([])
  const [search, setSearch] = useState('')
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetch('/api/users')
      .then((res) => res.json())
      .then((data) => setUsers(Array.isArray(data) ? data : []))
      .finally(() => setIsLoading(false))
  }, [])

  const filteredUsers = useMemo(() => {
    const keyword = search.trim().toLowerCase()
    if (!keyword) return users

    return users.filter((user) => {
      return [user.name, user.username, user.email, user.mobile].some((value) =>
        value.toLowerCase().includes(keyword)
      )
    })
  }, [search, users])

  return (
    <>
      <div className="mb-8">
        <h2 className="text-3xl font-black tracking-tight text-slate-800">ผู้ใช้งาน</h2>
        <p className="mt-1 text-sm text-slate-500">ดูว่าใครบ้างที่อยู่ในระบบและมีประวัติขายกี่บิล</p>
      </div>

      <div className="mb-6 rounded-3xl border border-slate-100 bg-white p-4 shadow-sm">
        <div className="relative">
          <i className="fas fa-search absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"></i>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ค้นหาจากชื่อ, username, email หรือเบอร์โทร"
            className="w-full rounded-2xl border border-slate-200 py-3 pl-11 pr-4 text-sm text-slate-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
          />
        </div>
      </div>

      <div className="overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-[840px] w-full text-left">
            <thead className="bg-slate-50 text-xs font-bold uppercase tracking-wider text-slate-400">
              <tr>
                <th className="px-6 py-4">ชื่อผู้ใช้</th>
                <th className="px-6 py-4">Username</th>
                <th className="px-6 py-4">Email</th>
                <th className="px-6 py-4">เบอร์โทร</th>
                <th className="px-6 py-4 text-center">จำนวนบิล</th>
                <th className="px-6 py-4">วันที่สมัคร</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredUsers.map((user) => (
                <tr key={user.id} className="transition hover:bg-slate-50">
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                        <i className="fas fa-user"></i>
                      </div>
                      <div>
                        <p className="font-bold text-slate-800">{user.name}</p>
                        <p className="text-xs font-medium text-slate-400">ID #{user.id}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-5 font-semibold text-slate-600">@{user.username}</td>
                  <td className="px-6 py-5 text-slate-600">{user.email}</td>
                  <td className="px-6 py-5 text-slate-600">{user.mobile}</td>
                  <td className="px-6 py-5 text-center">
                    <span className="inline-flex rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-600">
                      {user._count.orders} บิล
                    </span>
                  </td>
                  <td className="px-6 py-5 text-sm font-medium text-slate-500">
                    {new Date(user.createdAt).toLocaleDateString('th-TH', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </td>
                </tr>
              ))}
              {!isLoading && filteredUsers.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-14 text-center text-slate-400">
                    <i className="fas fa-user-slash mb-3 block text-3xl text-slate-300"></i>
                    ไม่พบผู้ใช้งานที่ตรงกับคำค้นหา
                  </td>
                </tr>
              )}
              {isLoading && (
                <tr>
                  <td colSpan={6} className="px-6 py-14 text-center text-slate-400">
                    <i className="fas fa-circle-notch fa-spin mb-3 block text-3xl text-blue-400"></i>
                    กำลังโหลดข้อมูลผู้ใช้งาน...
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
