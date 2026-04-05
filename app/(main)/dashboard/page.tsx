"use client"
import React, { useEffect, useState, useCallback } from 'react'

interface DashboardData {
  totalSales: number
  todaySales: number
  orderCount: number
  lowStockCount: number
  outOfStockCount: number
  lowStockProducts: { id: number; name: string; stock: number; category: string }[]
  outOfStockProducts: { id: number; name: string; stock: number; category: string }[]
  dailySales: { date: string; count: number; total: number }[]
  topProducts: { id: number; name: string; quantity: number; revenue: number }[]
  cashierStats: { id: number; name: string; count: number; total: number }[]
  recentOrders: any[]
}

const cashierColors = [
  'bg-blue-100 text-blue-700',
  'bg-violet-100 text-violet-700',
  'bg-emerald-100 text-emerald-700',
  'bg-amber-100 text-amber-700',
  'bg-rose-100 text-rose-700',
]

const todayStr = () => new Date().toISOString().split('T')[0]

function StockAlertList({
  title,
  iconClass,
  iconWrapClass,
  items,
  emptyMessage,
  stockTone,
}: {
  title: string
  iconClass: string
  iconWrapClass: string
  items: { id: number; name: string; stock: number; category: string }[]
  emptyMessage: string
  stockTone: string
}) {
  return (
    <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
      <div className="p-6 border-b border-slate-50 flex items-center gap-3">
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${iconWrapClass}`}>
          <i className={iconClass}></i>
        </div>
        <h3 className="font-bold text-slate-800">{title}</h3>
      </div>
      {items.length === 0 ? (
        <div className="py-12 text-center text-slate-400 text-sm">
          <i className="fas fa-box-open text-3xl block mb-2 text-slate-200"></i>
          {emptyMessage}
        </div>
      ) : (
        <div className="divide-y divide-slate-50">
          {items.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between gap-4 px-6 py-4 hover:bg-slate-50/50 transition"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-slate-800">{item.name}</p>
                <p className="mt-1 text-xs text-slate-400">{item.category}</p>
              </div>
              <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold ${stockTone}`}>
                เหลือ {item.stock} ชิ้น
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [startDate, setStartDate] = useState(todayStr())
  const [endDate, setEndDate] = useState(todayStr())

  const fetchData = useCallback(() => {
    setData(null)
    setError(null)
    const params = new URLSearchParams()
    if (startDate) params.set('startDate', startDate)
    if (endDate) params.set('endDate', endDate)
    fetch(`/api/dashboard?${params}`)
      .then(async res => {
        if (!res.ok) {
          const e = await res.json().catch(() => ({}))
          throw new Error(e.error || `HTTP ${res.status}`)
        }
        return res.json()
      })
      .then(setData)
      .catch(err => {
        console.error(err)
        setError('ไม่สามารถโหลดข้อมูลได้ กรุณาลองใหม่')
      })
  }, [startDate, endDate])

  useEffect(() => { fetchData() }, [fetchData])

  const isMultiDay = startDate !== endDate && !!startDate && !!endDate

  if (error) return (
    <div className="flex flex-col items-center mt-20 text-red-500">
      <i className="fas fa-exclamation-circle text-5xl mb-4"></i>
      <p className="font-medium text-lg">{error}</p>
      <button onClick={fetchData} className="mt-4 px-6 py-2 bg-red-50 text-red-600 rounded-xl text-sm font-bold hover:bg-red-100 transition">
        <i className="fas fa-redo mr-2"></i>ลองใหม่
      </button>
    </div>
  )

  return (
    <>
      {/* Header + Date Filter */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-3xl font-black text-slate-800 tracking-tight">แดชบอร์ด</h2>
            <p className="text-slate-500 text-sm mt-1">สรุปข้อมูลการขาย</p>
          </div>
          <button
            onClick={() => { setStartDate(todayStr()); setEndDate(todayStr()) }}
            className="text-xs font-bold text-slate-400 hover:text-blue-600 transition flex items-center gap-1.5 bg-slate-100 hover:bg-blue-50 px-3 py-2 rounded-xl"
          >
            <i className="fas fa-calendar-day"></i> วันนี้
          </button>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider pl-1">
              <i className="fas fa-calendar-day mr-1 text-blue-400"></i> ตั้งแต่วันที่
            </label>
            <div className="relative">
              <input
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-2xl px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-blue-400 transition"
              />
              {!startDate && (
                <span className="md:hidden pointer-events-none absolute inset-0 flex items-center px-4 text-sm text-slate-400 font-medium">
                  <i className="fas fa-calendar mr-2 text-slate-300"></i> วว/ดด/ปปปป
                </span>
              )}
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider pl-1">
              <i className="fas fa-calendar-check mr-1 text-blue-400"></i> ถึงวันที่
            </label>
            <div className="relative">
              <input
                type="date"
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-2xl px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-blue-400 transition"
              />
              {!endDate && (
                <span className="md:hidden pointer-events-none absolute inset-0 flex items-center px-4 text-sm text-slate-400 font-medium">
                  <i className="fas fa-calendar mr-2 text-slate-300"></i> วว/ดด/ปปปป
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Loading skeleton */}
      {!data ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {[1,2].map(i => (
              <div key={i} className="bg-white rounded-3xl border border-slate-100 p-6 animate-pulse">
                <div className="h-3 w-24 bg-slate-100 rounded mb-4"></div>
                <div className="h-8 w-32 bg-slate-100 rounded"></div>
              </div>
            ))}
          </div>
          <div className="bg-white rounded-3xl border border-slate-100 p-6 h-48 animate-pulse"></div>
        </div>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-6">
            <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-6 rounded-3xl shadow-sm relative overflow-hidden group">
              <div className="absolute -right-4 -top-4 w-24 h-24 bg-white/10 rounded-full transition-transform group-hover:scale-150"></div>
              <p className="text-blue-100 text-sm font-semibold relative">ยอดขายรวม</p>
              <p className="text-3xl font-black text-white mt-2 relative">฿ {data.totalSales.toFixed(2)}</p>
              <p className="text-blue-200 text-xs mt-1 relative">{data.orderCount} บิล</p>
            </div>
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 relative overflow-hidden group">
              <div className="absolute -right-4 -top-4 w-24 h-24 bg-emerald-50 rounded-full transition-transform group-hover:scale-150"></div>
              <p className="text-slate-500 text-sm font-semibold relative">จำนวนบิล</p>
              <p className="text-3xl font-black text-slate-800 mt-2 relative">{data.orderCount} <span className="text-lg font-bold text-slate-400">บิล</span></p>
              <p className="text-slate-400 text-xs mt-1 relative">
                เฉลี่ย ฿ {data.orderCount > 0 ? (data.totalSales / data.orderCount).toFixed(2) : '0.00'} / บิล
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <StockAlertList
              title="สินค้าใกล้หมด"
              iconClass="fas fa-exclamation-triangle text-amber-500"
              iconWrapClass="bg-amber-50"
              items={data.lowStockProducts}
              emptyMessage="ยังไม่มีสินค้าที่ใกล้หมด"
              stockTone="bg-amber-50 text-amber-700"
            />
            <StockAlertList
              title="สินค้าหมดแล้ว"
              iconClass="fas fa-box text-slate-500"
              iconWrapClass="bg-slate-100"
              items={data.outOfStockProducts}
              emptyMessage="ยังไม่มีสินค้าที่หมดสต็อก"
              stockTone="bg-slate-100 text-slate-700"
            />
          </div>

          {/* Daily Sales — only show if multi-day range */}
          {isMultiDay && data.dailySales.length > 0 && (
            <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden mb-6">
              <div className="p-6 border-b border-slate-50 flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center">
                  <i className="fas fa-chart-bar text-blue-500"></i>
                </div>
                <h3 className="font-bold text-slate-800">ยอดรวมต่อวัน</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left min-w-[400px]">
                  <thead className="bg-slate-50/70 text-slate-400 text-[11px] font-bold uppercase tracking-wider">
                    <tr>
                      <th className="px-6 py-4">วันที่</th>
                      <th className="px-6 py-4 text-center">จำนวนบิล</th>
                      <th className="px-6 py-4 text-right">ยอดรวม</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {data.dailySales.map((row) => (
                      <tr key={row.date} className="hover:bg-slate-50/50 transition">
                        <td className="px-6 py-4 font-semibold text-slate-700 text-sm">
                          <i className="far fa-calendar-alt mr-2 text-blue-300"></i>{row.date}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded-full">{row.count} บิล</span>
                        </td>
                        <td className="px-6 py-4 text-right font-black text-blue-600">฿ {row.total.toFixed(2)}</td>
                      </tr>
                    ))}
                    <tr className="bg-blue-50/50 border-t-2 border-blue-100">
                      <td className="px-6 py-4 font-black text-slate-700 text-sm">รวมทั้งหมด</td>
                      <td className="px-6 py-4 text-center">
                        <span className="text-xs font-bold text-blue-600 bg-blue-100 px-2 py-1 rounded-full">{data.orderCount} บิล</span>
                      </td>
                      <td className="px-6 py-4 text-right font-black text-blue-700 text-lg">฿ {data.totalSales.toFixed(2)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Top Products + Cashier — side by side on lg */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* Top Products */}
            <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
              <div className="p-6 border-b border-slate-50 flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center">
                  <i className="fas fa-fire text-amber-500"></i>
                </div>
                <h3 className="font-bold text-slate-800">สินค้าขายดี Top 5</h3>
              </div>
              {data.topProducts.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-sm">
                  <i className="fas fa-box-open text-3xl block mb-2 text-slate-200"></i>ไม่มีข้อมูล
                </div>
              ) : (
                <div className="p-6 space-y-4">
                  {data.topProducts.map((p, idx) => {
                    const maxQty = data.topProducts[0].quantity
                    const pct = Math.round((p.quantity / maxQty) * 100)
                    return (
                      <div key={p.id}>
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="flex items-center gap-2.5">
                            <span className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-black
                              ${idx === 0 ? 'bg-amber-400 text-white' : idx === 1 ? 'bg-slate-300 text-white' : idx === 2 ? 'bg-orange-300 text-white' : 'bg-slate-100 text-slate-500'}`}>
                              {idx + 1}
                            </span>
                            <span className="font-semibold text-slate-700 text-sm">{p.name}</span>
                          </div>
                          <div className="text-right">
                            <span className="font-black text-slate-800 text-sm">{p.quantity} ชิ้น</span>
                            <span className="text-xs text-slate-400 ml-2">฿ {p.revenue.toFixed(0)}</span>
                          </div>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full transition-all duration-500
                              ${idx === 0 ? 'bg-amber-400' : idx === 1 ? 'bg-slate-400' : idx === 2 ? 'bg-orange-300' : 'bg-blue-300'}`}
                            style={{ width: `${pct}%` }}
                          ></div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Cashier Stats */}
            <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
              <div className="p-6 border-b border-slate-50 flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-violet-50 flex items-center justify-center">
                  <i className="fas fa-users text-violet-500"></i>
                </div>
                <h3 className="font-bold text-slate-800">ยอดพนักงานขาย</h3>
              </div>
              {data.cashierStats.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-sm">
                  <i className="fas fa-user-slash text-3xl block mb-2 text-slate-200"></i>ไม่มีข้อมูล
                </div>
              ) : (
                <div className="divide-y divide-slate-50">
                  {data.cashierStats.map((c, idx) => (
                    <div key={c.id} className="flex items-center justify-between px-6 py-4 hover:bg-slate-50/50 transition">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap ${cashierColors[idx % cashierColors.length]}`}>
                        <i className="fas fa-user-circle"></i> {c.name}
                      </span>
                      <div className="flex items-center gap-3 shrink-0 ml-3">
                        <span className="text-xs font-bold text-slate-400 bg-slate-100 px-2 py-1 rounded-full">{c.count} บิล</span>
                        <span className="font-black text-slate-800 text-sm whitespace-nowrap">฿ {c.total.toFixed(2)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Recent Orders — cards on mobile, table on sm+ */}
          <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="p-6 border-b border-slate-50 flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center">
                <i className="fas fa-receipt text-slate-500"></i>
              </div>
              <h3 className="font-bold text-slate-800">รายการขายล่าสุด</h3>
            </div>

            {data.recentOrders.length === 0 ? (
              <div className="text-center py-10 text-slate-400 text-sm">
                <i className="fas fa-folder-open text-3xl block mb-2 text-slate-200"></i>
                ยังไม่มีรายการขายในช่วงนี้
              </div>
            ) : (
              <>
                {/* Mobile cards */}
                <div className="sm:hidden divide-y divide-slate-50">
                  {data.recentOrders.map((order: any) => (
                    <div key={order.id} className="px-5 py-4">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <span className="text-xs font-bold text-slate-600">
                            <i className="far fa-calendar-alt mr-1 text-blue-300"></i>
                            {new Date(order.createdAt).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </span>
                          <span className="text-xs text-slate-400 ml-2">
                            <i className="far fa-clock mr-1"></i>
                            {new Date(order.createdAt).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          <span className="ml-2 text-slate-300 text-xs">#INV-{order.id.toString().padStart(4, '0')}</span>
                        </div>
                        <span className="font-black text-blue-600">฿ {order.total.toFixed(2)}</span>
                      </div>
                      <p className="text-sm font-semibold text-slate-700 mb-2 leading-relaxed">
                        {(order.items || []).map((i: any) => `${i.product.name} x${i.quantity}`).join(', ') || '-'}
                      </p>
                      <span className="inline-flex items-center px-2 py-1 bg-slate-100 rounded-md text-xs font-bold text-slate-600">
                        <i className="fas fa-user-circle mr-1 text-slate-400"></i>{order.cashier?.name}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Desktop table */}
                <div className="hidden sm:block overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50/70 text-slate-400 text-[11px] font-bold uppercase tracking-wider">
                      <tr>
                        <th className="px-6 py-4">วันที่ / เวลา</th>
                        <th className="px-6 py-4">รายการ</th>
                        <th className="px-6 py-4">พนักงาน</th>
                        <th className="px-6 py-4 text-right">ยอดรวม</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {data.recentOrders.map((order: any) => (
                        <tr key={order.id} className="hover:bg-slate-50/50 transition">
                          <td className="px-6 py-5 whitespace-nowrap">
                            <div className="text-sm font-semibold text-slate-700">{new Date(order.createdAt).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
                            <div className="text-xs text-slate-400 mt-0.5"><i className="far fa-clock mr-1"></i>{new Date(order.createdAt).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}</div>
                          </td>
                          <td className="px-6 py-5">
                            <div className="font-semibold text-slate-800 text-sm">
                              {(order.items || []).map((i: any) => `${i.product.name} x${i.quantity}`).join(', ') || '-'}
                            </div>
                            <div className="text-xs text-slate-400">#INV-{order.id.toString().padStart(4, '0')}</div>
                          </td>
                          <td className="px-6 py-5 whitespace-nowrap">
                            <span className="inline-flex items-center px-2 py-1 bg-slate-100 rounded-md text-xs font-bold text-slate-600">
                              {order.cashier?.name}
                            </span>
                          </td>
                          <td className="px-6 py-5 text-right font-black text-blue-600 whitespace-nowrap">฿ {order.total.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        </>
      )}
    </>
  )
}
