"use client"
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [mobile, setMobile] = useState('')
  const { setUser } = useAuth()
  const router = useRouter()
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register'
    const body = isLogin ? { username, password } : { name, username, email, mobile, password }

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    })

    const data = await res.json()
    if (res.ok && data.success) {
      setUser(data.user)
      router.push('/dashboard')
    } else {
      setError(data.error || 'Something went wrong')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50">
      <div className="bg-white p-8 rounded-3xl shadow-2xl w-full max-w-md border-t-8 border-blue-500">
        <form onSubmit={handleSubmit}>
          {isLogin ? (
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl mb-4">
                <i className="fas fa-beer text-3xl"></i>
              </div>
              <h2 className="text-3xl font-bold text-slate-800">BEER HUB</h2>
              <p className="text-slate-500">ยินดีต้อนรับกลับมาครับ</p>
            </div>
          ) : (
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-slate-800 mb-2">สร้างบัญชีใหม่</h2>
              <p className="text-slate-500">สำหรับพนักงานใหม่</p>
            </div>
          )}

          {error && <p className="text-red-500 text-sm text-center font-bold mb-4 bg-red-50 p-2 rounded-xl">{error}</p>}

          <div className="space-y-5 text-slate-700">
            {!isLogin && (
              <>
                <div>
                  <label className="block text-sm font-semibold mb-1">ชื่อ-นามสกุล</label>
                  <input type="text" required value={name} onChange={e => setName(e.target.value)}
                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-400 focus:bg-white outline-none transition"
                    placeholder="ชื่อ-นามสกุล" />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1">อีเมล</label>
                  <input type="email" required value={email} onChange={e => setEmail(e.target.value)}
                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-400 focus:bg-white outline-none transition"
                    placeholder="example@mail.com" />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1">เบอร์มือถือ</label>
                  <input type="tel" required value={mobile} onChange={e => setMobile(e.target.value)}
                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-400 focus:bg-white outline-none transition"
                    placeholder="08X-XXX-XXXX" />
                </div>
              </>
            )}
            <div>
              {isLogin && <label className="block text-sm font-semibold mb-1">ชื่อผู้ใช้งาน</label>}
              {!isLogin && <label className="block text-sm font-semibold mb-1">ชื่อผู้ใช้งาน</label>}
              <input type="text" required value={username} onChange={e => setUsername(e.target.value)}
                className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-400 focus:bg-white outline-none transition"
                placeholder="Username" />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1">รหัสผ่าน</label>
              <input type="password" required value={password} onChange={e => setPassword(e.target.value)}
                className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-400 focus:bg-white outline-none transition"
                placeholder="••••••••" />
            </div>

            <button type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-2xl shadow-lg shadow-blue-200 transition-all transform active:scale-95">
              {isLogin ? 'เข้าสู่ระบบ' : 'ยืนยันการสมัคร'}
            </button>

            <div className="flex items-center justify-center space-x-2 text-sm mt-4">
              <span className="text-slate-500">{isLogin ? 'ยังไม่มีบัญชี?' : 'มีบัญชีอยู่แล้ว?'}</span>
              <button type="button" onClick={() => setIsLogin(!isLogin)}
                className="text-blue-600 font-bold hover:underline">
                {isLogin ? 'สมัครสมาชิก' : 'กลับไปเข้าสู่ระบบ'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
