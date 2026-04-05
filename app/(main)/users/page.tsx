"use client"

import { useEffect, useMemo, useState } from 'react'

type UserStatus = 'active' | 'inactive'

type UserRow = {
  id: number
  name: string
  username: string
  email: string
  mobile: string
  createdAt: string
  updatedAt: string
  deletedAt: string | null
  isActive: boolean
  status: UserStatus
  _count: {
    orders: number
  }
}

type FormState = {
  id: number
  name: string
  username: string
  email: string
  mobile: string
  password: string
  status: UserStatus
}

function createFormState(user: UserRow): FormState {
  return {
    id: user.id,
    name: user.name,
    username: user.username,
    email: user.email,
    mobile: user.mobile,
    password: '',
    status: user.status,
  }
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString('th-TH', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export default function UsersPage() {
  const [users, setUsers] = useState<UserRow[]>([])
  const [search, setSearch] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null)
  const [form, setForm] = useState<FormState | null>(null)
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  const loadUsers = async () => {
    setIsLoading(true)

    try {
      const res = await fetch('/api/users', { cache: 'no-store' })
      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to load users')
      }

      setUsers(Array.isArray(data) ? data : [])
    } catch (error) {
      setNotice({
        type: 'error',
        message: error instanceof Error ? error.message : 'โหลดข้อมูลผู้ใช้งานไม่สำเร็จ',
      })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    void loadUsers()
  }, [])

  const filteredUsers = useMemo(() => {
    const keyword = search.trim().toLowerCase()
    if (!keyword) return users

    return users.filter((user) =>
      [user.name, user.username, user.email, user.mobile, user.status].some((value) =>
        value.toLowerCase().includes(keyword)
      )
    )
  }, [search, users])

  const selectedUser =
    selectedUserId === null ? null : users.find((user) => user.id === selectedUserId) ?? null

  const openEditor = (user: UserRow) => {
    setSelectedUserId(user.id)
    setForm(createFormState(user))
    setNotice(null)
  }

  const closeEditor = () => {
    setSelectedUserId(null)
    setForm(null)
  }

  const handleSave = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!form) return

    setIsSubmitting(true)
    setNotice(null)

    try {
      const res = await fetch(`/api/users/${form.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'ไม่สามารถบันทึกข้อมูลผู้ใช้งานได้')
      }

      setUsers((currentUsers) =>
        currentUsers.map((user) => (user.id === data.id ? data : user))
      )
      setForm(createFormState(data))
      setSelectedUserId(data.id)
      setNotice({ type: 'success', message: 'บันทึกข้อมูลผู้ใช้งานเรียบร้อยแล้ว' })
    } catch (error) {
      setNotice({
        type: 'error',
        message: error instanceof Error ? error.message : 'ไม่สามารถบันทึกข้อมูลผู้ใช้งานได้',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSoftDelete = async (user: UserRow) => {
    const confirmed = window.confirm(`ต้องการปิดใช้งานผู้ใช้ ${user.name} ใช่หรือไม่?`)
    if (!confirmed) return

    setIsSubmitting(true)
    setNotice(null)

    try {
      const res = await fetch(`/api/users/${user.id}`, {
        method: 'DELETE',
      })
      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'ไม่สามารถปิดใช้งานผู้ใช้งานได้')
      }

      setUsers((currentUsers) =>
        currentUsers.map((currentUser) =>
          currentUser.id === user.id
            ? {
                ...currentUser,
                isActive: false,
                status: 'inactive',
                deletedAt: new Date().toISOString(),
              }
            : currentUser
        )
      )

      if (selectedUserId === user.id) {
        setForm((currentForm) =>
          currentForm ? { ...currentForm, status: 'inactive', password: '' } : currentForm
        )
      }

      setNotice({ type: 'success', message: `ปิดใช้งาน ${user.name} เรียบร้อยแล้ว` })
    } catch (error) {
      setNotice({
        type: 'error',
        message: error instanceof Error ? error.message : 'ไม่สามารถปิดใช้งานผู้ใช้งานได้',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <>
      <div className="mb-8 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 className="text-3xl font-black tracking-tight text-slate-800">ผู้ใช้งาน</h2>
          <p className="mt-1 text-sm text-slate-500">
            จัดการข้อมูลผู้ใช้ เปลี่ยนรหัสผ่าน ตรวจสอบสถานะ และปิดใช้งานบัญชี
          </p>
        </div>
        <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-500">
          ทั้งหมด <span className="font-bold text-slate-700">{users.length}</span> บัญชี
        </div>
      </div>

      {notice && (
        <div
          className={`mb-6 rounded-2xl border px-4 py-3 text-sm font-medium ${
            notice.type === 'success'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
              : 'border-red-200 bg-red-50 text-red-700'
          }`}
        >
          {notice.message}
        </div>
      )}

      <div className="mb-6 rounded-3xl border border-slate-100 bg-white p-4 shadow-sm">
        <div className="relative">
          <i className="fas fa-search absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"></i>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ค้นหาจากชื่อ, username, email, เบอร์โทร หรือสถานะ"
            className="w-full rounded-2xl border border-slate-200 py-3 pl-11 pr-4 text-sm text-slate-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
          />
        </div>
      </div>

      {form && selectedUser && (
        <div className="mb-6 rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
          <div className="mb-5 flex flex-col gap-3 border-b border-slate-100 pb-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h3 className="text-xl font-bold text-slate-800">แก้ไขข้อมูลผู้ใช้</h3>
              <p className="mt-1 text-sm text-slate-500">
                แก้ไขข้อมูลพื้นฐาน เปลี่ยนรหัสผ่าน หรือปรับสถานะของ {selectedUser.name}
              </p>
            </div>
            <button
              type="button"
              onClick={closeEditor}
              className="inline-flex items-center justify-center rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-500 transition hover:border-slate-300 hover:text-slate-700"
            >
              ปิดหน้าจอแก้ไข
            </button>
          </div>

          <form onSubmit={handleSave} className="grid gap-4 lg:grid-cols-2">
            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-slate-700">ชื่อ-นามสกุล</span>
              <input
                type="text"
                value={form.name}
                onChange={(event) =>
                  setForm((currentForm) =>
                    currentForm ? { ...currentForm, name: event.target.value } : currentForm
                  )
                }
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                required
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-slate-700">Username</span>
              <input
                type="text"
                value={form.username}
                onChange={(event) =>
                  setForm((currentForm) =>
                    currentForm ? { ...currentForm, username: event.target.value } : currentForm
                  )
                }
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                required
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-slate-700">อีเมล</span>
              <input
                type="email"
                value={form.email}
                onChange={(event) =>
                  setForm((currentForm) =>
                    currentForm ? { ...currentForm, email: event.target.value } : currentForm
                  )
                }
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                required
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-slate-700">เบอร์โทร</span>
              <input
                type="tel"
                value={form.mobile}
                onChange={(event) =>
                  setForm((currentForm) =>
                    currentForm ? { ...currentForm, mobile: event.target.value } : currentForm
                  )
                }
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                required
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-slate-700">
                รหัสผ่านใหม่
              </span>
              <input
                type="password"
                value={form.password}
                onChange={(event) =>
                  setForm((currentForm) =>
                    currentForm ? { ...currentForm, password: event.target.value } : currentForm
                  )
                }
                minLength={6}
                placeholder="เว้นว่างไว้ถ้าไม่ต้องการเปลี่ยน"
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-slate-700">สถานะ</span>
              <select
                value={form.status}
                onChange={(event) =>
                  setForm((currentForm) =>
                    currentForm
                      ? { ...currentForm, status: event.target.value as UserStatus }
                      : currentForm
                  )
                }
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </label>

            <div className="lg:col-span-2 flex flex-col gap-3 rounded-2xl bg-slate-50 p-4 text-sm text-slate-500 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p>
                  สมัครเมื่อ <span className="font-semibold text-slate-700">{formatDate(selectedUser.createdAt)}</span>
                </p>
                <p className="mt-1">
                  อัปเดตล่าสุด{' '}
                  <span className="font-semibold text-slate-700">{formatDate(selectedUser.updatedAt)}</span>
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex items-center justify-center rounded-2xl bg-blue-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSubmitting ? 'กำลังบันทึก...' : 'บันทึกข้อมูล'}
                </button>
                <button
                  type="button"
                  onClick={() => void handleSoftDelete(selectedUser)}
                  disabled={isSubmitting || selectedUser.status === 'inactive'}
                  className="inline-flex items-center justify-center rounded-2xl border border-red-200 px-5 py-3 text-sm font-bold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Soft Delete ผู้ใช้
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      <div className="overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-[1080px] w-full text-left">
            <thead className="bg-slate-50 text-xs font-bold uppercase tracking-wider text-slate-400">
              <tr>
                <th className="px-6 py-4">ชื่อผู้ใช้</th>
                <th className="px-6 py-4">Username</th>
                <th className="px-6 py-4">Email</th>
                <th className="px-6 py-4">เบอร์โทร</th>
                <th className="px-6 py-4">สถานะ</th>
                <th className="px-6 py-4 text-center">จำนวนบิล</th>
                <th className="px-6 py-4">วันที่สมัคร</th>
                <th className="px-6 py-4 text-right">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredUsers.map((user) => (
                <tr key={user.id} className="transition hover:bg-slate-50">
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-3">
                      <div
                        className={`flex h-11 w-11 items-center justify-center rounded-2xl ${
                          user.status === 'active'
                            ? 'bg-blue-50 text-blue-600'
                            : 'bg-slate-100 text-slate-400'
                        }`}
                      >
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
                  <td className="px-6 py-5">
                    <span
                      className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${
                        user.status === 'active'
                          ? 'bg-emerald-50 text-emerald-600'
                          : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {user.status === 'active' ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-5 text-center">
                    <span className="inline-flex rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700">
                      {user._count.orders} บิล
                    </span>
                  </td>
                  <td className="px-6 py-5 text-sm font-medium text-slate-500">
                    {formatDate(user.createdAt)}
                  </td>
                  <td className="px-6 py-5">
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => openEditor(user)}
                        className="inline-flex items-center justify-center rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-600"
                      >
                        แก้ไข
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleSoftDelete(user)}
                        disabled={isSubmitting || user.status === 'inactive'}
                        className="inline-flex items-center justify-center rounded-2xl border border-red-200 px-4 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        Soft Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!isLoading && filteredUsers.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-6 py-14 text-center text-slate-400">
                    <i className="fas fa-user-slash mb-3 block text-3xl text-slate-300"></i>
                    ไม่พบผู้ใช้งานที่ตรงกับคำค้นหา
                  </td>
                </tr>
              )}
              {isLoading && (
                <tr>
                  <td colSpan={8} className="px-6 py-14 text-center text-slate-400">
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
