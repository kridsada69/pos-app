"use client"

import { useEffect, useMemo, useState } from 'react'

type Product = {
  id: number
  name: string
  price: number
  company?: string | null
}

type GiftCampaign = {
  id: number
  name: string
  giftName: string
  cost: number
  requiredQuantity: number
  appliesToAllProducts: boolean
  isActive: boolean
  createdAt: string
  updatedAt: string
  products: {
    productId: number
    product?: Product | null
  }[]
}

const initialForm = {
  name: '',
  giftName: '',
  cost: '',
  requiredQuantity: '3',
  appliesToAllProducts: false,
  isActive: true,
  productIds: [] as number[],
}

export default function GiftsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [gifts, setGifts] = useState<GiftCampaign[]>([])
  const [form, setForm] = useState(initialForm)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  const fetchProducts = async () => {
    const res = await fetch('/api/products?limit=1000')
    const json = await res.json()
    setProducts(json.data || [])
  }

  const fetchGifts = async () => {
    const res = await fetch('/api/gifts')
    const json = await res.json()
    setGifts(Array.isArray(json) ? json : [])
  }

  useEffect(() => {
    fetchProducts()
    fetchGifts()
  }, [])

  const resetForm = () => {
    setForm(initialForm)
    setEditingId(null)
    setError('')
  }

  const selectedProducts = useMemo(
    () => products.filter((product) => form.productIds.includes(product.id)),
    [form.productIds, products]
  )

  const handleToggleProduct = (productId: number) => {
    setForm((prev) => ({
      ...prev,
      productIds: prev.productIds.includes(productId)
        ? prev.productIds.filter((id) => id !== productId)
        : [...prev.productIds, productId],
    }))
  }

  const handleEdit = (gift: GiftCampaign) => {
    setEditingId(gift.id)
    setForm({
      name: gift.name,
      giftName: gift.giftName,
      cost: String(gift.cost),
      requiredQuantity: String(gift.requiredQuantity || 1),
      appliesToAllProducts: gift.appliesToAllProducts,
      isActive: gift.isActive,
      productIds: gift.products.map((item) => item.productId),
    })
    setError('')
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setIsSubmitting(true)
    setError('')

    try {
      const payload = {
        name: form.name,
        giftName: form.giftName,
        cost: Number(form.cost),
        requiredQuantity: Number(form.requiredQuantity),
        appliesToAllProducts: form.appliesToAllProducts,
        isActive: form.isActive,
        productIds: form.appliesToAllProducts ? [] : form.productIds,
      }

      const url = editingId ? `/api/gifts/${editingId}` : '/api/gifts'
      const method = editingId ? 'PUT' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => null)
        throw new Error(data?.error || 'บันทึกของแถมไม่สำเร็จ')
      }

      resetForm()
      fetchGifts()
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'บันทึกของแถมไม่สำเร็จ')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async (giftId: number) => {
    if (!window.confirm('คุณแน่ใจหรือไม่ว่าต้องการลบของแถมนี้?')) return

    await fetch(`/api/gifts/${giftId}`, { method: 'DELETE' })
    if (editingId === giftId) {
      resetForm()
    }
    fetchGifts()
  }

  return (
    <>
      <div className="mb-8">
        <h2 className="text-3xl font-black tracking-tight text-slate-800">ของแถม</h2>
        <p className="mt-1 text-sm text-slate-500">กำหนดของแถม, ราคาต้นทุน, และเลือกสินค้าที่เข้าร่วม</p>
      </div>

      <div className="grid grid-cols-1 gap-8 xl:grid-cols-[420px_minmax(0,1fr)]">
        <form onSubmit={handleSubmit} className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h3 className="text-xl font-black text-slate-800">{editingId ? 'แก้ไขของแถม' : 'สร้างของแถมใหม่'}</h3>
              <p className="mt-1 text-sm text-slate-400">ตัวอย่าง: ซื้อครบ 3 ชิ้น รับพวงกุญแจ 1 ชิ้น</p>
            </div>
            {editingId && (
              <button
                type="button"
                onClick={resetForm}
                className="rounded-xl bg-slate-100 px-4 py-2 text-sm font-bold text-slate-500 transition hover:bg-slate-200"
              >
                ยกเลิกแก้ไข
              </button>
            )}
          </div>

          <div className="space-y-5">
            <div>
              <label className="mb-2 block text-sm font-bold text-slate-700">ชื่อแคมเปญของแถม</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="เช่น โปรแก้วแถม"
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-200"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-2 block text-sm font-bold text-slate-700">ชื่อของแถม</label>
                <input
                  type="text"
                  value={form.giftName}
                  onChange={(e) => setForm((prev) => ({ ...prev, giftName: e.target.value }))}
                  placeholder="เช่น แก้วเบียร์"
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-200"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-bold text-slate-700">ราคาต้นทุน</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.cost}
                  onChange={(e) => setForm((prev) => ({ ...prev, cost: e.target.value }))}
                  placeholder="20"
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-200"
                />
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-bold text-slate-700">จำนวนสินค้าขั้นต่ำต่อของแถม 1 ชิ้น</label>
              <input
                type="number"
                min="1"
                step="1"
                inputMode="numeric"
                value={form.requiredQuantity}
                onChange={(e) => setForm((prev) => ({ ...prev, requiredQuantity: e.target.value }))}
                placeholder="3"
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-200"
              />
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-400">ตัวอย่างเงื่อนไข</p>
              <p className="mt-1 text-sm font-bold text-slate-700">
                ซื้อครบ {Number(form.requiredQuantity || 1)} ชิ้น แถม {form.giftName || 'ของแถม'} 1 ชิ้น
                {' '}• ถ้าซื้อครบ {Number(form.requiredQuantity || 1) * 2} ชิ้น แถม 2 ชิ้น
              </p>
              <p className="mt-1 text-xs font-semibold text-slate-500">
                ต้นทุนต่อชิ้น ฿ {Number(form.cost || 0).toFixed(2)}
              </p>
            </div>

            <div className="space-y-3 rounded-2xl border border-slate-200 p-4">
              <label className="flex cursor-pointer items-center justify-between rounded-xl bg-slate-50 px-4 py-3">
                <span>
                  <span className="block text-sm font-bold text-slate-700">ใช้กับสินค้าทั้งหมด</span>
                  <span className="block text-xs text-slate-400">เปิดเพื่อให้ของแถมนี้ใช้ได้กับทุกสินค้าที่ขายอยู่</span>
                </span>
                <input
                  type="checkbox"
                  checked={form.appliesToAllProducts}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      appliesToAllProducts: e.target.checked,
                      productIds: e.target.checked ? [] : prev.productIds,
                    }))
                  }
                  className="h-5 w-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
              </label>

              <label className="flex cursor-pointer items-center justify-between rounded-xl bg-slate-50 px-4 py-3">
                <span>
                  <span className="block text-sm font-bold text-slate-700">เปิดใช้งานของแถม</span>
                  <span className="block text-xs text-slate-400">ปิดชั่วคราวได้โดยไม่ต้องลบแคมเปญ</span>
                </span>
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(e) => setForm((prev) => ({ ...prev, isActive: e.target.checked }))}
                  className="h-5 w-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
              </label>
            </div>

            {!form.appliesToAllProducts && (
              <div>
                <div className="mb-3 flex items-center justify-between">
                  <label className="block text-sm font-bold text-slate-700">สินค้าเข้าร่วมของแถม</label>
                  <div className="flex gap-2 text-xs font-bold">
                    <button
                      type="button"
                      onClick={() => setForm((prev) => ({ ...prev, productIds: products.map((product) => product.id) }))}
                      className="text-blue-500 transition hover:text-blue-700"
                    >
                      เลือกทั้งหมด
                    </button>
                    <button
                      type="button"
                      onClick={() => setForm((prev) => ({ ...prev, productIds: [] }))}
                      className="text-slate-400 transition hover:text-red-500"
                    >
                      ล้างรายการ
                    </button>
                  </div>
                </div>
                <div className="max-h-72 space-y-2 overflow-y-auto rounded-2xl border border-slate-200 bg-slate-50 p-3">
                  {products.map((product) => {
                    const checked = form.productIds.includes(product.id)
                    return (
                      <label
                        key={product.id}
                        className={`flex cursor-pointer items-center justify-between rounded-xl border px-4 py-3 transition ${
                          checked ? 'border-blue-200 bg-blue-50' : 'border-transparent bg-white'
                        }`}
                      >
                        <div>
                          <p className="text-sm font-bold text-slate-700">{product.name}</p>
                          <p className="text-xs text-slate-400">
                            ฿ {Number(product.price).toFixed(2)} {product.company ? `• ${product.company}` : ''}
                          </p>
                        </div>
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => handleToggleProduct(product.id)}
                          className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                        />
                      </label>
                    )
                  })}
                </div>
                <p className="mt-2 text-xs text-slate-400">เลือกแล้ว {selectedProducts.length} รายการ</p>
              </div>
            )}

            {error && (
              <div className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-2xl bg-blue-600 px-6 py-4 text-sm font-black text-white shadow-lg shadow-blue-100 transition hover:bg-blue-700 disabled:opacity-50"
            >
              {isSubmitting ? 'กำลังบันทึก...' : editingId ? 'บันทึกการแก้ไข' : 'สร้างของแถม'}
            </button>
          </div>
        </form>

        <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
          <div className="mb-6">
            <h3 className="text-xl font-black text-slate-800">รายการของแถมทั้งหมด</h3>
            <p className="mt-1 text-sm text-slate-400">คลิกแถวเพื่อแก้ไขข้อมูลหรือปิดใช้งาน</p>
          </div>

          <div className="space-y-4">
            {gifts.map((gift) => (
              <div
                key={gift.id}
                className="rounded-3xl border border-slate-100 bg-slate-50/60 p-5 transition hover:border-blue-200"
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="text-lg font-black text-slate-800">{gift.name}</h4>
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-bold ${
                          gift.isActive ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-200 text-slate-500'
                        }`}
                      >
                        {gift.isActive ? 'เปิดใช้งาน' : 'ปิดใช้งาน'}
                      </span>
                    </div>
                    <p className="mt-2 text-sm font-semibold text-slate-600">
                      ของแถม: {gift.giftName} • ต้นทุน ฿ {Number(gift.cost).toFixed(2)}
                    </p>
                    <p className="mt-2 text-sm font-bold text-violet-600">
                      ซื้อครบ {gift.requiredQuantity || 1} ชิ้น แถม 1 ชิ้น
                    </p>
                    <p className="mt-2 text-xs text-slate-400">
                      {gift.appliesToAllProducts
                        ? 'ใช้ได้กับสินค้าทั้งหมด'
                        : `ร่วมรายการ ${gift.products.length} สินค้า`}
                    </p>
                    {!gift.appliesToAllProducts && gift.products.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {gift.products.map((item) => (
                          <span key={`${gift.id}-${item.productId}`} className="rounded-full bg-white px-3 py-1 text-xs font-bold text-slate-500">
                            {item.product?.name || `สินค้า #${item.productId}`}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => handleEdit(gift)}
                      className="rounded-xl bg-white px-4 py-2 text-sm font-bold text-blue-600 shadow-sm transition hover:bg-blue-50"
                    >
                      แก้ไข
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(gift.id)}
                      className="rounded-xl bg-white px-4 py-2 text-sm font-bold text-red-500 shadow-sm transition hover:bg-red-50"
                    >
                      ลบ
                    </button>
                  </div>
                </div>
              </div>
            ))}

            {gifts.length === 0 && (
              <div className="rounded-3xl border border-dashed border-slate-200 px-6 py-16 text-center text-slate-400">
                <i className="fas fa-gift mb-3 block text-3xl text-slate-300"></i>
                ยังไม่มีการตั้งค่าของแถม
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
