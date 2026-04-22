"use client"
import React, { useState, useEffect } from 'react'

type OrderItem = {
  id: number
  quantity: number
  price: number
  productName?: string | null
  company?: string | null
  product?: {
    name?: string | null
    company?: string | null
  } | null
}

type Order = {
  id: number
  total: number
  createdAt: string
  subtotal?: number | null
  promotionDiscount?: number | null
  promotionLabel?: string | null
  manualDiscount?: number | null
  tax?: number | null
  note?: string | null
  slipUrl?: string | null
  cashier?: {
    name?: string | null
  } | null
  giftSelections?: {
    id: number
    giftCampaignName: string
    giftName: string
    cost: number
    quantity?: number | null
  }[]
  items: OrderItem[]
}

export default function HistoryPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [expandedId, setExpandedId] = useState<number | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isUploading, setIsUploading] = useState<number | null>(null)
  const [isExporting, setIsExporting] = useState(false)
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
  const groupedOrders = orders.reduce<Record<string, Order[]>>((groups, order) => {
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

  const formatCurrency = (amount: number) => `฿ ${amount.toFixed(2)}`
  const getGiftBadgeText = (order: Order) => {
    if (!order.giftSelections || order.giftSelections.length === 0) return ''
    return order.giftSelections
      .map((gift) => `${gift.giftCampaignName}: ${gift.giftName} x${gift.quantity || 1}`)
      .join(' | ')
  }

  const escapeCsvCell = (value: string | number | null | undefined) => {
    const normalized = value == null ? '' : String(value)
    return `"${normalized.replaceAll('"', '""')}"`
  }

  const handleExportHistory = () => {
    setIsExporting(true)

    try {
      const detailRows = orders
        .flatMap((order) => {
          const createdAt = new Date(order.createdAt)
          const giftSummary =
            order.giftSelections && order.giftSelections.length > 0
              ? order.giftSelections.map((gift) => `${gift.giftCampaignName}: ${gift.giftName} x${gift.quantity || 1}`).join(' | ')
              : ''

          return order.items.map((item) => ({
            date: createdAt.toLocaleDateString('th-TH'),
            time: createdAt.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }),
            invoiceNo: `INV-${order.id.toString().padStart(4, '0')}`,
            cashierName: order.cashier?.name || '',
            company: item.company || item.product?.company || 'ไม่ระบุบริษัท',
            productName: item.productName || item.product?.name || 'สินค้าถูกลบ',
            quantity: item.quantity,
            unitPrice: item.price,
            lineTotal: item.quantity * item.price,
            orderTotal: order.total,
            promotionLabel: order.promotionLabel || '',
            promotionDiscount: order.promotionDiscount || 0,
            manualDiscount: order.manualDiscount || 0,
            tax: order.tax || 0,
            note: order.note || '',
            giftSummary,
          }))
        })
        .sort((a, b) => {
          if (a.invoiceNo !== b.invoiceNo) return a.invoiceNo.localeCompare(b.invoiceNo)
          if (a.company !== b.company) return a.company.localeCompare(b.company)
          return a.productName.localeCompare(b.productName)
        })

      const csvRows = [
        ['Export ประวัติการขาย แยกตามเลขที่บิล สินค้า และบริษัท'],
        ['ช่วงวันที่', `${startDate || 'ทั้งหมด'} ถึง ${endDate || 'ทั้งหมด'}`],
        ['จำนวนบิล', orders.length],
        ['จำนวนแถวรายการ', detailRows.length],
        [],
        [
          'วันที่',
          'เวลา',
          'เลขที่บิล',
          'แคชเชียร์',
          'บริษัท',
          'สินค้า',
          'จำนวน',
          'ราคาต่อหน่วย',
          'ยอดรวมสินค้า',
          'ยอดรวมบิล',
          'โปรโมชัน',
          'ส่วนลดโปรโมชัน',
          'ส่วนลดกำหนดเอง',
          'ภาษี',
          'หมายเหตุ',
          'ของแถม',
        ],
        ...detailRows.map((row) => [
          row.date,
          row.time,
          row.invoiceNo,
          row.cashierName,
          row.company,
          row.productName,
          row.quantity,
          row.unitPrice,
          row.lineTotal,
          row.orderTotal,
          row.promotionLabel,
          row.promotionDiscount,
          row.manualDiscount,
          row.tax,
          row.note,
          row.giftSummary,
        ]),
      ]

      const csvContent = `\uFEFF${csvRows
        .map((row) => row.map((cell) => escapeCsvCell(cell)).join(','))
        .join('\n')}`
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `sales-history-${startDate || 'all'}-to-${endDate || 'all'}.csv`
      link.click()
      URL.revokeObjectURL(url)
    } finally {
      setIsExporting(false)
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
          <div className="flex items-center gap-2">
            <button
              onClick={handleExportHistory}
              disabled={isExporting || orders.length === 0}
              className="text-xs font-bold text-emerald-700 transition flex items-center gap-1.5 bg-emerald-50 hover:bg-emerald-100 disabled:opacity-50 px-3 py-2 rounded-xl"
            >
              <i className="fas fa-file-csv"></i> {isExporting ? 'กำลัง export...' : 'Export CSV'}
            </button>
            {(startDate || endDate) && (
              <button
                onClick={() => { setStartDate(''); setEndDate(''); }}
                className="text-xs font-bold text-slate-400 hover:text-red-500 transition flex items-center gap-1.5 bg-slate-100 hover:bg-red-50 px-3 py-2 rounded-xl"
              >
                <i className="fas fa-times-circle"></i> ล้างตัวกรอง
              </button>
            )}
          </div>
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
          const dayTotal = dayOrders.reduce((sum, order) => sum + order.total, 0)
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
                  {groupedOrders[dateStr].map((order) => {
                    const giftBadgeText = getGiftBadgeText(order)

                    return (
                    <React.Fragment key={order.id}>
                      <tr 
                        onClick={() => setExpandedId(expandedId === order.id ? null : order.id)}
                        className={`cursor-pointer transition hover:bg-blue-50/30 ${expandedId === order.id ? 'bg-blue-50/30' : ''}`}
                      >
                        <td className="px-6 py-5 font-bold text-blue-600">#INV-{order.id.toString().padStart(4, '0')}</td>
                        <td className="px-6 py-5 text-sm text-slate-600 font-medium">{new Date(order.createdAt).toLocaleTimeString('th-TH', {hour: '2-digit', minute:'2-digit'})} น.</td>
                        <td className="px-6 py-5 text-sm font-bold text-slate-700">
                          <div className="flex items-center">
                            <i className="fas fa-user-circle text-slate-300 mr-2 text-lg"></i> {order.cashier?.name}
                          </div>
                          {order.promotionLabel && (
                            <div className="mt-2 inline-flex rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-bold text-emerald-600">
                              ใช้โปร: {order.promotionLabel}
                            </div>
                          )}
                          {giftBadgeText && (
                            <div className="mt-2 inline-flex max-w-[260px] items-center rounded-full bg-violet-50 px-3 py-1 text-[11px] font-bold text-violet-600">
                              <i className="fas fa-gift mr-1.5 text-violet-400"></i>
                              <span className="truncate">ของแถม: {giftBadgeText}</span>
                            </div>
                          )}
                        </td>
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
                                  {order.items.map((item) => (
                                    <div key={item.id} className="flex justify-between items-center text-sm">
                                      <div className="font-semibold text-slate-700">
                                        <span className="text-blue-500 bg-blue-50 px-2 py-1 rounded-md text-xs mr-2">{item.quantity}x</span>
                                        {item.productName || item.product?.name || 'สินค้าถูกลบ'}
                                        <span className="ml-2 text-xs font-bold text-slate-400">
                                          ({item.company || item.product?.company || 'ไม่ระบุบริษัท'})
                                        </span>
                                      </div>
                                      <div className="font-bold text-slate-600">฿ {(item.price * item.quantity).toFixed(2)}</div>
                                    </div>
                                  ))}
                                  <div className="pt-3 mt-3 border-t border-dashed border-slate-200 space-y-2 text-sm">
                                    <div className="flex justify-between items-center text-slate-500">
                                      <span>ยอดก่อนส่วนลด</span>
                                      <span>{formatCurrency(order.subtotal ?? order.total)}</span>
                                    </div>
                                    {!!order.promotionDiscount && (
                                      <div className="flex justify-between items-center text-emerald-600">
                                        <span>โปรโมชัน{order.promotionLabel ? `: ${order.promotionLabel}` : ''}</span>
                                        <span>-{formatCurrency(order.promotionDiscount)}</span>
                                      </div>
                                    )}
                                    {!!order.manualDiscount && (
                                      <div className="flex justify-between items-center text-orange-500">
                                        <span>ส่วนลดกำหนดเอง</span>
                                        <span>-{formatCurrency(order.manualDiscount)}</span>
                                      </div>
                                    )}
                                    {!!order.tax && (
                                      <div className="flex justify-between items-center text-slate-500">
                                        <span>ภาษีมูลค่าเพิ่ม</span>
                                        <span>{formatCurrency(order.tax)}</span>
                                      </div>
                                    )}
                                    <div className="flex justify-between items-center font-black text-lg text-slate-800 pt-2">
                                      <span>ยอดรวม</span>
                                      <span>{formatCurrency(order.total)}</span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                              <div className="lg:w-64 flex flex-col gap-4">
                                <div className="bg-white rounded-2xl border border-slate-100 p-4">
                                  <h4 className="font-bold text-sm text-slate-500 mb-3 uppercase tracking-wide">โปรโมชันและหมายเหตุ</h4>
                                  <div className="space-y-3 text-sm">
                                    <div>
                                      <p className="text-xs font-bold text-slate-400 mb-1">โปรโมชัน</p>
                                      <p className="font-semibold text-slate-700">{order.promotionLabel || 'ไม่มีโปรโมชั่น'}</p>
                                      {!!order.promotionDiscount && (
                                        <p className="mt-1 text-xs font-bold text-emerald-600">
                                          ลดไป {formatCurrency(order.promotionDiscount)}
                                        </p>
                                      )}
                                    </div>
                                    <div>
                                      <p className="text-xs font-bold text-slate-400 mb-1">หมายเหตุ</p>
                                      <p className="whitespace-pre-wrap text-slate-600">{order.note || 'ไม่มี'}</p>
                                    </div>
                                    <div>
                                      <p className="text-xs font-bold text-slate-400 mb-1">ของแถม</p>
                                      {order.giftSelections && order.giftSelections.length > 0 ? (
                                        <div className="space-y-1">
                                          {order.giftSelections.map((gift) => (
                                            <p key={gift.id} className="text-slate-600">
                                              {gift.giftCampaignName}: {gift.giftName} x{gift.quantity || 1}{' '}
                                              <span className="font-bold text-violet-600">
                                                (ต้นทุน ฿ {(gift.cost * (gift.quantity || 1)).toFixed(2)})
                                              </span>
                                            </p>
                                          ))}
                                        </div>
                                      ) : (
                                        <p className="text-slate-600">ไม่มี</p>
                                      )}
                                    </div>
                                  </div>
                                </div>
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
                  )})}
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
