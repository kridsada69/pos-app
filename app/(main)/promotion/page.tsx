"use client"

import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '@/context/AuthContext'
import { canWriteFeature } from '@/lib/roles'

type Product = {
  id: number
  name: string
  price: number
  status: string
}

type Promotion = {
  id: number
  name: string
  requiredQuantity: number
  bundlePrice: number
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
  requiredQuantity: '2',
  bundlePrice: '',
  appliesToAllProducts: false,
  isActive: true,
  productIds: [] as number[],
}

export default function PromotionPage() {
  const { user } = useAuth()
  const [products, setProducts] = useState<Product[]>([])
  const [promotions, setPromotions] = useState<Promotion[]>([])
  const [form, setForm] = useState(initialForm)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const canWrite = canWriteFeature(user?.role, 'promotions')

  const fetchProducts = async () => {
    const res = await fetch('/api/products?limit=1000')
    const json = await res.json()
    setProducts(json.data || [])
  }

  const fetchPromotions = async () => {
    const res = await fetch('/api/promotions')
    const json = await res.json()
    setPromotions(json || [])
  }

  useEffect(() => {
    fetchProducts()
    fetchPromotions()
  }, [])

  const selectedProducts = useMemo(
    () => products.filter((product) => form.productIds.includes(product.id)),
    [form.productIds, products]
  )

  const resetForm = () => {
    setForm(initialForm)
    setEditingId(null)
    setError('')
  }

  const handleToggleProduct = (productId: number) => {
    setForm((prev) => ({
      ...prev,
      productIds: prev.productIds.includes(productId)
        ? prev.productIds.filter((id) => id !== productId)
        : [...prev.productIds, productId],
    }))
  }

  const handleEdit = (promotion: Promotion) => {
    if (!canWrite) return

    setEditingId(promotion.id)
    setForm({
      name: promotion.name,
      requiredQuantity: String(promotion.requiredQuantity),
      bundlePrice: String(promotion.bundlePrice),
      appliesToAllProducts: promotion.appliesToAllProducts,
      isActive: promotion.isActive,
      productIds: promotion.products.map((item) => item.productId),
    })
    setError('')
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!canWrite) return

    setIsSubmitting(true)
    setError('')

    try {
      const payload = {
        name: form.name,
        requiredQuantity: Number(form.requiredQuantity),
        bundlePrice: Number(form.bundlePrice),
        appliesToAllProducts: form.appliesToAllProducts,
        isActive: form.isActive,
        productIds: form.appliesToAllProducts ? [] : form.productIds,
      }

      const url = editingId ? `/api/promotions/${editingId}` : '/api/promotions'
      const method = editingId ? 'PUT' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => null)
        throw new Error(data?.error || 'บันทึกโปรโมชั่นไม่สำเร็จ')
      }

      resetForm()
      fetchPromotions()
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'บันทึกโปรโมชั่นไม่สำเร็จ')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async (promotionId: number) => {
    if (!canWrite) return

    if (!window.confirm('คุณแน่ใจหรือไม่ว่าต้องการลบโปรโมชั่นนี้?')) return

    await fetch(`/api/promotions/${promotionId}`, { method: 'DELETE' })
    if (editingId === promotionId) {
      resetForm()
    }
    fetchPromotions()
  }

  const previewText = useMemo(() => {
    const requiredQuantity = Number(form.requiredQuantity) || 0
    const bundlePrice = Number(form.bundlePrice) || 0
    if (!requiredQuantity || bundlePrice < 0) return 'ยังไม่มีตัวอย่างโปรโมชั่น'
    return `ซื้อ ${requiredQuantity} ชิ้น ราคา ${bundlePrice.toFixed(2)} บาท`
  }, [form.bundlePrice, form.requiredQuantity])

  return (
    <>
      <div className="mb-8">
        <h2 className="text-3xl font-black text-slate-800 tracking-tight">โปรโมชั่น-Promotion</h2>
        <p className="mt-1 text-sm text-slate-500">ตั้งค่าแคมเปญโปรโมชั่น, เลือกสินค้าที่เข้าร่วม หรือใช้กับสินค้าทั้งหมด</p>
      </div>

      <div className="grid grid-cols-1 gap-8 xl:grid-cols-[420px_minmax(0,1fr)]">
        {canWrite ? (
        <form onSubmit={handleSubmit} className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h3 className="text-xl font-black text-slate-800">{editingId ? 'แก้ไขโปรโมชั่น' : 'สร้างโปรโมชั่นใหม่'}</h3>
              <p className="mt-1 text-sm text-slate-400">ตัวอย่าง: แมวสลิด 2 กระป๋อง 200 บาท</p>
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
              <label className="mb-2 block text-sm font-bold text-slate-700">ชื่อแคมเปญ</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="เช่น โปรแมวสลิด 2 กระป๋อง 200 บาท"
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-200"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-2 block text-sm font-bold text-slate-700">จำนวนชิ้นที่เข้าเงื่อนไข</label>
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={form.requiredQuantity}
                  onChange={(e) => setForm((prev) => ({ ...prev, requiredQuantity: e.target.value }))}
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-200"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-bold text-slate-700">ราคาโปรโมชั่น</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.bundlePrice}
                  onChange={(e) => setForm((prev) => ({ ...prev, bundlePrice: e.target.value }))}
                  placeholder="200"
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-200"
                />
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-400">ตัวอย่างเงื่อนไข</p>
              <p className="mt-1 text-sm font-bold text-slate-700">{previewText}</p>
            </div>

            <div className="space-y-3 rounded-2xl border border-slate-200 p-4">
              <label className="flex cursor-pointer items-center justify-between rounded-xl bg-slate-50 px-4 py-3">
                <span>
                  <span className="block text-sm font-bold text-slate-700">ใช้กับสินค้าทั้งหมด</span>
                  <span className="block text-xs text-slate-400">เปิดเพื่อให้โปรนี้ใช้ได้กับทุกสินค้าที่ขายอยู่</span>
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
                  <span className="block text-sm font-bold text-slate-700">เปิดใช้งานโปรโมชั่น</span>
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
                  <label className="block text-sm font-bold text-slate-700">สินค้าเข้าร่วมโปรโมชั่น</label>
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
                          <p className="text-xs text-slate-400">฿ {Number(product.price).toFixed(2)}</p>
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
                <p className="mt-2 text-xs text-slate-400">
                  เลือกแล้ว {selectedProducts.length} รายการ
                </p>
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
              {isSubmitting ? 'กำลังบันทึก...' : editingId ? 'บันทึกการแก้ไข' : 'สร้างโปรโมชั่น'}
            </button>
          </div>
        </form>
        ) : (
          <div className="rounded-3xl border border-amber-100 bg-amber-50 p-6 text-amber-800">
            <h3 className="text-lg font-black">โหมดอ่านอย่างเดียว</h3>
            <p className="mt-2 text-sm font-medium">บัญชีนี้สามารถดูรายการโปรโมชั่นได้ แต่ไม่สามารถสร้าง แก้ไข หรือลบโปรโมชั่น</p>
          </div>
        )}

        <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h3 className="text-xl font-black text-slate-800">รายการโปรโมชั่น</h3>
              <p className="mt-1 text-sm text-slate-400">หน้า POS จะเลือกโปรที่เข้าเงื่อนไขและลดได้คุ้มที่สุดให้อัตโนมัติ</p>
            </div>
            <span className="rounded-full bg-slate-100 px-4 py-2 text-xs font-bold text-slate-500">
              ทั้งหมด {promotions.length} แคมเปญ
            </span>
          </div>

          <div className="space-y-4">
            {promotions.map((promotion) => (
              <div key={promotion.id} className="rounded-3xl border border-slate-200 p-5 transition hover:border-blue-200 hover:shadow-sm">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="flex-1">
                    <div className="mb-3 flex flex-wrap items-center gap-2">
                      <h4 className="text-lg font-black text-slate-800">{promotion.name}</h4>
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-bold ${
                          promotion.isActive
                            ? 'bg-emerald-50 text-emerald-600'
                            : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        {promotion.isActive ? 'เปิดใช้งาน' : 'ปิดใช้งาน'}
                      </span>
                      <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-600">
                        ซื้อ {promotion.requiredQuantity} ชิ้น ราคา ฿ {promotion.bundlePrice.toFixed(2)}
                      </span>
                    </div>

                    <p className="mb-3 text-sm text-slate-500">
                      {promotion.appliesToAllProducts
                        ? 'ใช้กับสินค้าทั้งหมดในระบบ'
                        : `สินค้าเข้าร่วม ${promotion.products.length} รายการ`}
                    </p>

                    {!promotion.appliesToAllProducts && (
                      <div className="flex flex-wrap gap-2">
                        {promotion.products.map((item) => (
                          <span
                            key={`${promotion.id}-${item.productId}`}
                            className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-500"
                          >
                            {item.product?.name || `สินค้า #${item.productId}`}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {canWrite && (
                  <div className="flex shrink-0 gap-2">
                    <button
                      type="button"
                      onClick={() => handleEdit(promotion)}
                      className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold text-slate-600 transition hover:border-blue-200 hover:text-blue-600"
                    >
                      แก้ไข
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(promotion.id)}
                      className="rounded-xl border border-red-100 bg-red-50 px-4 py-2 text-sm font-bold text-red-500 transition hover:bg-red-100"
                    >
                      ลบ
                    </button>
                  </div>
                  )}
                </div>
              </div>
            ))}

            {promotions.length === 0 && (
              <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50 px-6 py-16 text-center text-slate-400">
                <i className="fas fa-tags mb-4 block text-4xl text-slate-300"></i>
                ยังไม่มีแคมเปญโปรโมชั่น
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
