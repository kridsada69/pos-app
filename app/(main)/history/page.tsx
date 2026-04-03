"use client"
import React, { useState, useEffect } from 'react'

export default function HistoryPage() {
  const [orders, setOrders] = useState<any[]>([])
  const [expandedId, setExpandedId] = useState<number | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isUploading, setIsUploading] = useState<number | null>(null)
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  const fetchOrders = React.useCallback(() => {
    const params = new URLSearchParams()
    if (startDate) params.append('startDate', startDate)
    if (endDate) params.append('endDate', endDate)
    fetch(`/api/orders?${params.toString()}`).then(res => res.json()).then(setOrders)
  }, [startDate, endDate])

  useEffect(() => {
    fetchOrders()
  }, [fetchOrders])
  
  // Group orders by date
  const groupedOrders = orders.reduce((groups: any, order: any) => {
    const dateStr = new Date(order.createdAt).toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' })
    if (!groups[dateStr]) groups[dateStr] = []
    groups[dateStr].push(order)
    return groups
  }, {})

  const handleDeleteOrder = async (id: number) => {
    if(!confirm('คุณแน่ใจหรือไม่ว่าต้องการลบบิลนี้?')) return;
    setIsDeleting(true)
    try {
      const res = await fetch(`/api/orders/${id}`, { method: 'DELETE' })
      if(res.ok) {
        setExpandedId(null)
        fetchOrders()
      } else {
        alert('Failed to delete order')
      }
    } catch (e) {
      console.error(e)
    } finally {
      setIsDeleting(false)
    }
  }

  const handleUploadSlip = async (e: React.ChangeEvent<HTMLInputElement>, orderId: number) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    setIsUploading(orderId);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const uploadRes = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (uploadRes.ok) {
        const { imageUrl } = await uploadRes.json();
        const patchRes = await fetch(`/api/orders/${orderId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ slipUrl: imageUrl })
        });
        if (patchRes.ok) {
          fetchOrders();
        } else {
          alert('Failed to update order with slip');
        }
      } else {
        alert('Failed to upload slip image');
      }
    } catch (err) {
      console.error(err);
      alert('Failed to upload slip');
    } finally {
      setIsUploading(null);
    }
  }

  return (
    <>
      {/* Header + Date filter */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-3xl font-black text-slate-800 tracking-tight">ประวัติการขาย</h2>
            <p className="text-slate-500 text-sm mt-1">รายการย้อนหลังทั้งหมด</p>
          </div>
          {(startDate || endDate) && (
            <button
              onClick={() => { setStartDate(''); setEndDate(''); }}
              className="text-xs font-bold text-slate-400 hover:text-red-500 transition flex items-center gap-1.5 bg-slate-100 hover:bg-red-50 px-3 py-2 rounded-xl"
            >
              <i className="fas fa-times-circle"></i> ล้างตัวกรอง
            </button>
          )}
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
                onChange={(e) => setStartDate(e.target.value)}
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
                onChange={(e) => setEndDate(e.target.value)}
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

      <div className="space-y-8">
        {Object.keys(groupedOrders).map(dateStr => {
          const dayOrders = groupedOrders[dateStr]
          const dayTotal = dayOrders.reduce((sum: number, o: any) => sum + o.total, 0)
          const dayCount = dayOrders.length
          return (
          <div key={dateStr} className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="bg-slate-50 border-b border-slate-100 px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <h3 className="font-bold text-slate-700"><i className="far fa-calendar-alt mr-2 text-blue-500"></i> {dateStr}</h3>
              <div className="flex items-center gap-4">
                <span className="text-xs font-semibold text-slate-400 bg-white px-3 py-1 rounded-full border border-slate-200">
                  <i className="fas fa-receipt mr-1 text-slate-300"></i> {dayCount} บิล
                </span>
                <span className="text-sm font-black text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100">
                  <i className="fas fa-coins mr-1 text-emerald-400"></i> ฿ {dayTotal.toFixed(2)}
                </span>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left min-w-[600px]">
                <thead className="bg-white text-slate-400 text-[11px] font-bold uppercase tracking-wider border-b border-slate-100">
                  <tr>
                    <th className="px-6 py-4">บิลเลขที่</th>
                    <th className="px-6 py-4">เวลา</th>
                    <th className="px-6 py-4">แคชเชียร์</th>
                    <th className="px-6 py-4 text-right">ยอดสุทธิ</th>
                    <th className="px-6 py-4"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {groupedOrders[dateStr].map((order: any) => (
                    <React.Fragment key={order.id}>
                      <tr 
                        onClick={() => setExpandedId(expandedId === order.id ? null : order.id)}
                        className={`cursor-pointer transition hover:bg-blue-50/30 ${expandedId === order.id ? 'bg-blue-50/30' : ''}`}
                      >
                        <td className="px-6 py-5 font-bold text-blue-600">#INV-{order.id.toString().padStart(4, '0')}</td>
                        <td className="px-6 py-5 text-sm text-slate-600 font-medium">{new Date(order.createdAt).toLocaleTimeString('th-TH', {hour: '2-digit', minute:'2-digit'})} น.</td>
                        <td className="px-6 py-5 text-sm font-bold text-slate-700 flex items-center"><i className="fas fa-user-circle text-slate-300 mr-2 text-lg"></i> {order.cashier?.name}</td>
                        <td className="px-6 py-5 font-black text-slate-800 text-right">฿ {order.total.toFixed(2)}</td>
                        <td className="px-6 py-5 text-right text-slate-300"><i className={`fas fa-chevron-${expandedId === order.id ? 'up' : 'down'}`}></i></td>
                      </tr>
                      
                      {expandedId === order.id && (
                        <tr className="bg-slate-50/50 border-b-2 border-blue-100 shadow-inner">
                          <td colSpan={5} className="px-8 py-6">
                            <div className="flex flex-col lg:flex-row gap-8">
                              <div className="flex-1">
                                <h4 className="font-bold text-sm text-slate-500 mb-4 uppercase tracking-wide">รายการสินค้า</h4>
                                <div className="space-y-3 bg-white p-4 rounded-2xl border border-slate-100">
                                  {order.items.map((item: any) => (
                                    <div key={item.id} className="flex justify-between items-center text-sm">
                                      <div className="font-semibold text-slate-700">
                                        <span className="text-blue-500 bg-blue-50 px-2 py-1 rounded-md text-xs mr-2">{item.quantity}x</span>
                                        {item.product?.name || 'สินค้าถูกลบ'}
                                      </div>
                                      <div className="font-bold text-slate-600">฿ {(item.price * item.quantity).toFixed(2)}</div>
                                    </div>
                                  ))}
                                  <div className="pt-3 mt-3 border-t border-dashed border-slate-200 flex justify-between items-center font-black text-lg text-slate-800">
                                    <span>ยอดรวม</span>
                                    <span>฿ {order.total.toFixed(2)}</span>
                                  </div>
                                </div>
                              </div>
                              <div className="lg:w-64 flex flex-col gap-4">
                                <div>
                                  <h4 className="font-bold text-sm text-slate-500 mb-4 uppercase tracking-wide">หลักฐานชำระเงิน</h4>
                                  {order.slipUrl ? (
                                     <a href={order.slipUrl} target="_blank" rel="noreferrer" className="block w-full h-32 relative rounded-xl border border-slate-200 overflow-hidden group">
                                       {/* eslint-disable-next-line @next/next/no-img-element */}
                                       <img src={order.slipUrl} alt="slip" className="w-full h-full object-cover group-hover:scale-105 transition duration-300" />
                                       <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition">
                                         <i className="fas fa-external-link-alt text-white"></i>
                                       </div>
                                     </a>
                                  ) : (
                                    <div className="relative w-full py-8 bg-white rounded-xl border border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-400 hover:bg-slate-50 transition cursor-pointer group group-upload">
                                      <input 
                                        type="file" 
                                        accept="image/*" 
                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed" 
                                        onChange={(e) => handleUploadSlip(e, order.id)} 
                                        disabled={isUploading === order.id}
                                      />
                                      {isUploading === order.id ? (
                                        <>
                                          <i className="fas fa-circle-notch fa-spin text-3xl mb-2 text-blue-500"></i>
                                          <p className="text-xs font-semibold text-blue-500">กำลังอัปโหลด...</p>
                                        </>
                                      ) : (
                                        <>
                                          <i className="fas fa-upload text-3xl mb-2 text-slate-300 group-hover:text-blue-400 transition"></i>
                                          <p className="text-xs font-semibold group-hover:text-blue-500 transition">อัปโหลดสลิป</p>
                                        </>
                                      )}
                                    </div>
                                  )}
                                </div>
                                <div className="mt-auto pt-4 border-t border-slate-200">
                                  <button onClick={() => handleDeleteOrder(order.id)} disabled={isDeleting} className="w-full py-3 bg-red-50 hover:bg-red-100 text-red-600 font-bold rounded-xl text-sm transition flex items-center justify-center">
                                    <i className="fas fa-trash-alt mr-2"></i> ลบบิลนี้
                                  </button>
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          )
        })}

        {Object.keys(groupedOrders).length === 0 && (
          <div className="text-center py-20 text-slate-400 bg-white rounded-3xl border border-slate-100">
            <i className="fas fa-folder-open text-5xl mb-4 text-slate-200 block"></i>
            ยังไม่มีประวัติการขายในระบบ
          </div>
        )}
      </div>
    </>
  )
}
