"use client"
import { useEffect, useState } from "react"
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import { canAccessPath, roleLabel } from '@/lib/roles'

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const pathname = usePathname()
  const router = useRouter()
  const { user, logout, loading } = useAuth()

  useEffect(() => {
    if (!loading && user && !canAccessPath(user.role, pathname)) {
      router.replace('/dashboard')
    }
  }, [loading, pathname, router, user])

  if (loading) return null;

  const navItems = [
    { name: 'Dashboard', path: '/dashboard', icon: 'fa-chart-line', match: ['/dashboard'], visible: true },
    { name: 'คิดเงิน (POS)', path: '/pos', icon: 'fa-cash-register', match: ['/pos'], visible: true },
    { name: 'โปรโมชั่น-Promotion', path: '/promotion', icon: 'fa-tags', match: ['/promotion'], visible: true },
    { name: 'ของแถม', path: '/gifts', icon: 'fa-gift', match: ['/gifts'], visible: true },
    { name: 'สรุปค่าใช้จ่าย', path: '/expense-summary', icon: 'fa-file-invoice-dollar', match: ['/expense-summary'], visible: canAccessPath(user?.role, '/expense-summary') },
    { name: 'ประวัติการขาย', path: '/history', icon: 'fa-history', match: ['/history'], visible: true },
    { name: 'สต็อกสินค้า', path: '/stock', icon: 'fa-boxes', match: ['/stock'], visible: true },
    { name: 'ข้อมูลพื้นฐาน', path: '/master-data', icon: 'fa-database', match: ['/master-data'], visible: canAccessPath(user?.role, '/master-data') },
    { name: 'ผู้ใช้งาน', path: '/users', icon: 'fa-users', match: ['/users'], visible: canAccessPath(user?.role, '/users') },
  ].filter((item) => item.visible)

  if (user && !canAccessPath(user.role, pathname)) return null

  return (
    <div className="min-h-screen flex flex-col md:flex-row relative bg-slate-50 text-slate-800">
      <header className="md:hidden flex items-center justify-between bg-white px-5 py-4 shadow-sm sticky top-0 z-40">
        <div className="flex items-center space-x-3">
          <div className="text-blue-600 text-xl font-black">BEER HUB</div>
        </div>
        <button onClick={() => setIsSidebarOpen(true)} className="p-2 text-slate-600 hover:bg-slate-100 rounded-xl transition">
          <i className="fas fa-bars text-xl"></i>
        </button>
      </header>

      {isSidebarOpen && (
        <div onClick={() => setIsSidebarOpen(false)}
          className="fixed inset-0 bg-slate-900/50 z-40 md:hidden transition-opacity opacity-100"></div>
      )}

      <aside className={`fixed inset-y-0 left-0 w-72 bg-white shadow-2xl z-50 transform ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 md:static md:w-64 md:shadow-none transition-transform duration-300 ease-in-out border-r border-slate-100 flex flex-col`}>
        <div className="p-8 hidden md:block">
          <h1 className="text-2xl font-black text-blue-600 flex items-center">
            <i className="fas fa-beer mr-3 text-3xl"></i> BEER HUB
          </h1>
        </div>

        <div className="md:hidden p-6 flex justify-between items-center border-b border-slate-50 mb-4">
          <span className="font-bold text-slate-400">MENU</span>
          <button onClick={() => setIsSidebarOpen(false)} className="text-slate-400 hover:text-red-500">
            <i className="fas fa-times text-xl"></i>
          </button>
        </div>

        <nav className="px-4 space-y-1 flex-1">
          {navItems.map(item => {
            const isActive = item.match.some(m => pathname.startsWith(m))
            return (
              <Link key={item.path} href={item.path}
                onClick={() => setIsSidebarOpen(false)}
                className={`w-full flex items-center px-4 py-4 rounded-2xl transition-all group ${isActive ? 'bg-blue-50 text-blue-600' : 'text-slate-600 hover:bg-blue-50 hover:text-blue-600'}`}>
                <div className={`w-10 h-10 flex items-center justify-center rounded-xl mr-3 transition-colors ${isActive ? 'bg-white' : 'bg-slate-50 group-hover:bg-white'}`}>
                  <i className={`fas ${item.icon}`}></i>
                </div>
                <span className="font-semibold">{item.name}</span>
              </Link>
            )
          })}

          <div className="pt-8 px-4"><hr className="border-slate-100" /></div>

          <button onClick={logout}
            className="w-full flex items-center px-4 py-4 text-red-500 hover:bg-red-50 rounded-2xl transition-all mt-4">
            <div className="w-10 h-10 flex items-center justify-center mr-3">
              <i className="fas fa-sign-out-alt"></i>
            </div>
            <span className="font-semibold">ออกจากระบบ</span>
          </button>
        </nav>
      </aside>

      <main className="flex-1 p-4 md:p-10 max-h-screen overflow-y-auto">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-10">
          <div id="page-header-container" className="flex-1"></div>

          <div className="bg-white p-3 pr-6 rounded-2xl shadow-sm border border-slate-100 flex items-center space-x-4 self-start sm:self-center">
            <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-100">
              <i className="fas fa-user"></i>
            </div>
            <div>
              <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">{roleLabel(user?.role)}</p>
              <p className="text-slate-800 font-bold leading-tight">{user?.name || 'กำลังโหลด...'}</p>
            </div>
          </div>
        </div>
        {children}
      </main>
    </div>
  )
}
