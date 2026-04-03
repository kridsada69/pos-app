"use client"
import { createContext, useContext, useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'

type User = { id: number, name: string, username: string }

type AuthContextType = {
  user: User | null
  loading: boolean
  setUser: (user: User | null) => void
  logout: () => void
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  setUser: () => {},
  logout: () => {}
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    fetch('/api/auth/me')
      .then(res => res.json())
      .then(data => {
        if (data.user) {
          setUser(data.user)
          if (pathname === '/') router.push('/dashboard')
        } else {
          setUser(null)
          if (pathname !== '/') router.push('/')
        }
      })
      .catch(() => setUser(null))
      .finally(() => setLoading(false))
  }, [pathname, router])

  const logout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    setUser(null)
    router.push('/')
  }

  return (
    <AuthContext.Provider value={{ user, loading, setUser, logout }}>
      {children}
      {/* Global Loading Overlay */}
      {loading && (
        <div className="loading-overlay active">
          <div className="flex flex-col items-center">
            <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-blue-500 border-r-4 border-r-transparent"></div>
            <p className="mt-4 text-blue-600 font-medium animate-pulse">กำลังโหลดข้อมูล...</p>
          </div>
        </div>
      )}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
