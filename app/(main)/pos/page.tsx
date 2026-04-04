"use client"

import { useEffect, useMemo, useState } from 'react'
import Image from 'next/image'

type Product = {
  id: number
  name: string
  category: string
  price: number
  stock: number
  imageUrl?: string | null
  imageIcon?: string | null
}

type CartItem = {
  product: Product
  quantity: number
  price: number
}

type PromotionKey = 'twoCans' | 'sixCans'

const promotionDetails: Record<PromotionKey, { label: string; description: string }> = {
  twoCans: {
    label: 'โปรแมวสลิด 2 กระป๋อง 200 บาท',
    description: 'เมื่อซื้อกระป๋องตั้งแต่ 2 ชิ้นขึ้นไป จะคิดราคากระป๋องละ 100 บาท',
  },
  sixCans: {
    label: 'โปร 5 แถม 1 ลด 150 บาท',
    description: 'เมื่อซื้อกระป๋องครบ 6 ชิ้น จะลดเพิ่ม 150 บาท',
  },
}

export default function POSPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<{ id: number; name: string; icon?: string }[]>([])
  const [cart, setCart] = useState<CartItem[]>([])
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false)
  const [slipFile, setSlipFile] = useState<File | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isTaxEnabled, setIsTaxEnabled] = useState(false)
  const [activePromotion, setActivePromotion] = useState<PromotionKey | null>(null)
  const [manualDiscountInput, setManualDiscountInput] = useState('')
  const [note, setNote] = useState('')

  const fetchActiveProducts = () => {
    fetch('/api/products?status=active&limit=1000')
      .then((res) => res.json())
      .then((json) => setProducts(json.data || []))
  }

  useEffect(() => {
    fetchActiveProducts()
    fetch('/api/categories').then((res) => res.json()).then(setCategories)
  }, [])

  const addToCart = (product: Product) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === product.id)
      if (existing) {
        return prev.map((item) =>
          item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        )
      }
      return [...prev, { product, quantity: 1, price: product.price }]
    })
  }

  const updateQuantity = (id: number, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.product.id === id) {
            const newQ = item.quantity + delta
            return { ...item, quantity: newQ }
          }
          return item
        })
        .filter((item) => item.quantity > 0)
    )
  }

  const handleSlipChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setSlipFile(e.target.files[0])
    }
  }

  const clearSlipFile = () => {
    setSlipFile(null)

    const cameraInput = document.getElementById('cameraInput') as HTMLInputElement | null
    const galleryInput = document.getElementById('galleryInput') as HTMLInputElement | null

    if (cameraInput) cameraInput.value = ''
    if (galleryInput) galleryInput.value = ''
  }

  const isCanProduct = (product: Product) => {
    const category = categories.find((item) => item.name === product.category)
    const normalizedCategoryName = product.category.trim().toLowerCase()
    const normalizedProductName = product.name.trim().toLowerCase()

    return (
      category?.icon === 'fa-prescription-bottle' ||
      product.imageIcon === 'fa-prescription-bottle' ||
      normalizedCategoryName.includes('กระป๋อง') ||
      normalizedCategoryName.includes('can') ||
      normalizedProductName.includes('กระป๋อง') ||
      normalizedProductName.includes('can')
    )
  }

  const canQuantity = cart.reduce((sum, item) => {
    return sum + (isCanProduct(item.product) ? item.quantity : 0)
  }, 0)

  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0)

  const promotionDiscounts = useMemo(
    () => ({
      twoCans:
        canQuantity >= 2
          ? cart.reduce((sum, item) => {
              if (!isCanProduct(item.product)) return sum
              return sum + Math.max(item.price - 100, 0) * item.quantity
            }, 0)
          : 0,
      sixCans: canQuantity >= 6 ? 150 : 0,
    }),
    [canQuantity, cart, categories]
  )

  const promotionDiscount = activePromotion ? promotionDiscounts[activePromotion] : 0
  const promotionLabel = activePromotion ? promotionDetails[activePromotion].label : ''
  const subtotalAfterPromotion = Math.max(subtotal - promotionDiscount, 0)
  const parsedManualDiscount = Number(manualDiscountInput)
  const safeManualDiscount = Number.isFinite(parsedManualDiscount) && parsedManualDiscount > 0 ? parsedManualDiscount : 0
  const manualDiscount = Math.min(safeManualDiscount, subtotalAfterPromotion)
  const discountedSubtotal = Math.max(subtotalAfterPromotion - manualDiscount, 0)
  const tax = isTaxEnabled ? discountedSubtotal * 0.07 : 0
  const total = discountedSubtotal + tax

  useEffect(() => {
    if (activePromotion === 'twoCans' && canQuantity < 2) {
      setActivePromotion(null)
    }
    if (activePromotion === 'sixCans' && canQuantity < 6) {
      setActivePromotion(null)
    }
  }, [activePromotion, canQuantity])

  const confirmCheckout = async () => {
    if (cart.length === 0) return alert('No items in cart')
    setIsSubmitting(true)

    try {
      let slipUrl = ''
      if (slipFile) {
        const uploadData = new FormData()
        uploadData.append('file', slipFile)

        const uploadRes = await fetch('/api/upload', {
          method: 'POST',
          body: uploadData,
        })
        if (uploadRes.ok) {
          const { imageUrl } = await uploadRes.json()
          slipUrl = imageUrl
        }
      }

      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subtotal,
          promotionLabel,
          promotionDiscount,
          manualDiscount,
          tax,
          total,
          note: note.trim(),
          items: cart.map((item) => ({
            productId: item.product.id,
            quantity: item.quantity,
            price: item.price,
          })),
          slipUrl,
        }),
      })

      if (res.ok) {
        alert('ชำระเงินเรียบร้อย! ตัดสต็อกอัตโนมัติ')
        setCart([])
        setSlipFile(null)
        setActivePromotion(null)
        setManualDiscountInput('')
        setNote('')
        setIsTaxEnabled(false)
        setIsConfirmModalOpen(false)
        fetchActiveProducts()
      } else {
        alert('Checkout failed')
      }
    } catch (error) {
      console.error(error)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <>
      <h2 className="text-3xl font-black text-slate-800 tracking-tight">เครื่องคิดเงิน</h2>
      <p className="text-slate-500 text-sm mt-1 mb-8">เลือกสินค้าและสแกนจ่าย</p>

      <div className="flex flex-col gap-8 lg:flex-row">
        <div className="flex-1">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4">
            {products.map((product) => {
              const cartItem = cart.find((item) => item.product.id === product.id)
              const qty = cartItem ? cartItem.quantity : 0

              const catInfo = categories.find((category) => category.name === product.category)
              const catIcon = catInfo?.icon || 'fa-box'
              let typeLabel = '-'
              if (catIcon === 'fa-wine-bottle') typeLabel = 'ขวด'
              else if (catIcon === 'fa-prescription-bottle') typeLabel = 'กระป๋อง'
              else if (catIcon === 'fa-beer') typeLabel = 'แก้ว'

              return (
                <div
                  key={product.id}
                  className={`group flex flex-col items-center rounded-3xl border bg-white p-4 shadow-sm transition-all ${
                    qty > 0 ? 'border-blue-400' : 'border-slate-100'
                  } ${product.stock <= 0 ? 'opacity-50' : 'hover:border-blue-400'}`}
                >
                  <div
                    className={`relative mb-4 flex aspect-square w-full items-center justify-center overflow-hidden rounded-2xl border border-slate-100/50 text-4xl shadow-inner transition-transform group-hover:scale-105 ${
                      qty > 0 ? 'bg-blue-50 text-blue-400' : 'bg-slate-50 text-slate-400'
                    }`}
                  >
                    {product.imageUrl ? (
                      <Image src={product.imageUrl} alt={product.name} fill className="object-cover" />
                    ) : (
                      <i className={`fas ${catIcon}`}></i>
                    )}
                  </div>
                  <h4 className="text-center font-bold text-slate-800">{product.name}</h4>
                  {typeLabel !== '-' && (
                    <p className="mb-1 text-xs font-bold text-slate-400">
                      <i className={`fas ${catIcon} mr-1`}></i> {typeLabel}
                    </p>
                  )}
                  <p className={`text-lg font-black ${qty > 0 ? 'text-blue-600' : 'text-slate-400'}`}>
                    ฿ {product.price.toFixed(2)}
                  </p>

                  {product.stock > 0 ? (
                    qty > 0 ? (
                      <div className="mt-4 flex w-full items-center justify-between rounded-xl bg-slate-50 p-1">
                        <button
                          onClick={() => updateQuantity(product.id, -1)}
                          className="flex h-8 w-8 items-center justify-center rounded-lg bg-white shadow-sm hover:text-red-500"
                        >
                          -
                        </button>
                        <span className="px-2 font-bold">{qty}</span>
                        <button
                          onClick={() => updateQuantity(product.id, 1)}
                          className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white shadow-sm"
                        >
                          +
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => addToCart(product)}
                        className="mt-4 w-full rounded-xl border-2 border-dashed border-slate-200 py-2 font-bold text-slate-400 hover:border-blue-300 hover:text-blue-500"
                      >
                        เพิ่มลงบิล
                      </button>
                    )
                  ) : (
                    <span className="mt-4 text-sm font-bold text-red-500">สินค้าหมด</span>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        <div className="lg:w-96">
          <div className="sticky top-24 flex flex-col rounded-3xl border border-slate-100 bg-white shadow-xl">
            <div className="border-b border-dashed border-slate-100 p-6">
              <h3 className="flex items-center text-xl font-black">
                <i className="fas fa-file-invoice-dollar mr-2 text-blue-500"></i> บิลปัจจุบัน
              </h3>
            </div>
            <div className="min-h-[150px] max-h-[400px] space-y-4 overflow-y-auto p-6">
              {cart.map((item, idx) => (
                <div key={idx} className="flex items-start justify-between">
                  <div>
                    <p className="font-bold text-slate-800">{item.product.name}</p>
                    <div className="mt-2 inline-flex items-center gap-2 rounded-xl bg-slate-100 p-1">
                      <button
                        type="button"
                        onClick={() => updateQuantity(item.product.id, -1)}
                        className="flex h-7 w-7 items-center justify-center rounded-lg bg-white text-slate-500 shadow-sm transition hover:text-red-500"
                        aria-label={`ลดจำนวน ${item.product.name}`}
                      >
                        -
                      </button>
                      <span className="min-w-6 text-center text-sm font-bold text-slate-700">{item.quantity}</span>
                      <button
                        type="button"
                        onClick={() => updateQuantity(item.product.id, 1)}
                        className="flex h-7 w-7 items-center justify-center rounded-lg bg-white text-slate-500 shadow-sm transition hover:text-blue-600"
                        aria-label={`เพิ่มจำนวน ${item.product.name}`}
                      >
                        +
                      </button>
                    </div>
                    <p className="mt-1 text-xs tracking-wider text-slate-400">฿ {item.price.toFixed(2)} ต่อชิ้น</p>
                  </div>
                  <p className="font-black">฿ {(item.price * item.quantity).toFixed(2)}</p>
                </div>
              ))}
              {cart.length === 0 && <p className="py-4 text-center text-sm text-slate-400">ยังไม่มีสินค้าในบิล</p>}
            </div>
            <div className="rounded-b-3xl bg-slate-50 p-6">
              <div className="mb-2 flex justify-between text-sm text-slate-500">
                <span>ยอดก่อนส่วนลด</span>
                <span>฿ {subtotal.toFixed(2)}</span>
              </div>
              {promotionDiscount > 0 && (
                <div className="mb-2 flex justify-between text-sm text-emerald-600">
                  <span>{promotionLabel}</span>
                  <span>-฿ {promotionDiscount.toFixed(2)}</span>
                </div>
              )}
              {manualDiscount > 0 && (
                <div className="mb-2 flex justify-between text-sm text-orange-500">
                  <span>ส่วนลดกำหนดเอง</span>
                  <span>-฿ {manualDiscount.toFixed(2)}</span>
                </div>
              )}
              <div className="mb-2 flex justify-between text-sm text-slate-500">
                <span>ยอดก่อนภาษี</span>
                <span>฿ {discountedSubtotal.toFixed(2)}</span>
              </div>
              <div className="mb-4 flex items-center justify-between text-sm text-slate-500">
                <label className="group flex cursor-pointer select-none items-center">
                  <input
                    type="checkbox"
                    checked={isTaxEnabled}
                    onChange={(e) => setIsTaxEnabled(e.target.checked)}
                    className="mr-2 h-4 w-4 rounded border-slate-300 text-blue-600 transition focus:ring-blue-500"
                  />
                  <span className="transition group-hover:text-slate-700">ภาษีมูลค่าเพิ่ม (7%)</span>
                </label>
                <span>฿ {tax.toFixed(2)}</span>
              </div>
              <div className="mb-6 flex items-center justify-between border-t border-slate-200 pt-3 text-2xl font-black text-slate-800">
                <span>ยอดรวม</span>
                <span className="text-blue-600">฿ {total.toFixed(2)}</span>
              </div>
              <button
                onClick={() => setIsConfirmModalOpen(true)}
                disabled={cart.length === 0}
                className={`flex w-full items-center justify-center rounded-2xl py-5 font-black text-white shadow-xl transition-all ${
                  cart.length > 0 ? 'bg-blue-600 hover:bg-blue-700' : 'bg-slate-300'
                }`}
              >
                ยืนยันชำระเงิน <i className="fas fa-chevron-right ml-2"></i>
              </button>
            </div>
          </div>
        </div>
      </div>

      {isConfirmModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-3xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 p-6">
              <h3 className="text-xl font-black text-slate-800">ยืนยันชำระเงิน</h3>
              <button
                disabled={isSubmitting}
                onClick={() => setIsConfirmModalOpen(false)}
                className="text-slate-400 transition hover:text-slate-600"
              >
                <i className="fas fa-times text-xl"></i>
              </button>
            </div>

            <div className="overflow-y-auto p-6">
              <div className="mb-6 text-center">
                <p className="mb-1 text-sm text-slate-500">ยอดรวมที่ต้องชำระ</p>
                <p className="text-4xl font-black text-blue-600">฿ {total.toFixed(2)}</p>
              </div>

              <div className="mb-6 space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm font-black text-slate-800">ตัวเลือกโปรโมชัน</p>
                {(Object.keys(promotionDetails) as PromotionKey[]).map((promotionKey) => {
                  const isAvailable =
                    (promotionKey === 'twoCans' && canQuantity >= 2) ||
                    (promotionKey === 'sixCans' && canQuantity >= 6)
                  const isActive = activePromotion === promotionKey

                  return (
                    <label
                      key={promotionKey}
                      className={`flex items-start gap-3 rounded-xl border px-3 py-3 transition ${
                        isAvailable ? 'cursor-pointer border-slate-200 bg-white' : 'cursor-not-allowed border-slate-100 bg-slate-100 opacity-70'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isActive}
                        onChange={() => setActivePromotion(isActive ? null : promotionKey)}
                        disabled={!isAvailable}
                        className="mt-1 h-4 w-4 border-slate-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="flex-1">
                        <span className="block text-sm font-bold text-slate-800">{promotionDetails[promotionKey].label}</span>
                        <span className="block text-xs text-slate-500">{promotionDetails[promotionKey].description}</span>
                      </span>
                    </label>
                  )
                })}
                <button
                  type="button"
                  onClick={() => setActivePromotion(null)}
                  className="text-xs font-bold text-slate-400 transition hover:text-red-500"
                >
                  ไม่ใช้โปรโมชัน
                </button>
                <p className="text-xs text-slate-400">จำนวนกระป๋องในบิลตอนนี้: {canQuantity} ชิ้น</p>
              </div>

              <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-4">
                <label className="mb-2 block text-sm font-bold text-slate-700">ส่วนลดเพิ่มเติม</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  inputMode="decimal"
                  value={manualDiscountInput}
                  onChange={(e) => setManualDiscountInput(e.target.value)}
                  placeholder="ใส่จำนวนเงินที่ต้องการหักเพิ่ม"
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-200"
                />
                <p className="mt-2 text-xs text-slate-400">
                  ระบบจะหักไม่เกินยอดก่อนภาษี และตอนนี้ใช้ส่วนลดได้สูงสุด ฿ {subtotalAfterPromotion.toFixed(2)}
                </p>
              </div>

              <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-4">
                <label className="mb-2 block text-sm font-bold text-slate-700">หมายเหตุ</label>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={3}
                  placeholder="เช่น โปรลูกค้าประจำ, ฝากของไว้ก่อน, จ่ายเงินสดบางส่วน"
                  className="w-full resize-none rounded-xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-200"
                />
              </div>

              <div className="mb-6 rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm">
                <div className="mb-2 flex justify-between text-slate-500">
                  <span>ยอดก่อนส่วนลด</span>
                  <span>฿ {subtotal.toFixed(2)}</span>
                </div>
                <div className="mb-2 flex justify-between text-emerald-600">
                  <span>โปรโมชัน</span>
                  <span>{promotionDiscount > 0 ? `-฿ ${promotionDiscount.toFixed(2)}` : '-'}</span>
                </div>
                <div className="mb-2 flex justify-between text-orange-500">
                  <span>ส่วนลดกำหนดเอง</span>
                  <span>{manualDiscount > 0 ? `-฿ ${manualDiscount.toFixed(2)}` : '-'}</span>
                </div>
                <div className="mb-2 flex justify-between text-slate-500">
                  <span>ภาษีมูลค่าเพิ่ม</span>
                  <span>฿ {tax.toFixed(2)}</span>
                </div>
                <div className="flex justify-between border-t border-slate-200 pt-2 text-base font-black text-slate-800">
                  <span>ยอดสุทธิ</span>
                  <span>฿ {total.toFixed(2)}</span>
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-bold text-slate-700">อัปโหลดสลิปโอนเงิน (ถ้ามี)</label>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => document.getElementById('cameraInput')?.click()}
                    className="flex-1 rounded-xl border border-slate-200 bg-white py-3 text-sm font-bold text-slate-600 shadow-sm transition hover:bg-slate-50"
                  >
                    <i className="fas fa-camera mr-2 text-blue-500"></i> ถ่ายรูป
                  </button>
                  <button
                    type="button"
                    onClick={() => document.getElementById('galleryInput')?.click()}
                    className="flex-1 rounded-xl border border-slate-200 bg-white py-3 text-sm font-bold text-slate-600 shadow-sm transition hover:bg-slate-50"
                  >
                    <i className="fas fa-images mr-2 text-blue-500"></i> คลังรูปภาพ
                  </button>
                </div>
                <input
                  id="cameraInput"
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={handleSlipChange}
                />
                <input
                  id="galleryInput"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleSlipChange}
                />
                {slipFile && (
                  <div className="mt-3 flex items-center justify-between gap-3 rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3">
                    <p className="text-sm font-bold text-green-600">
                      <i className="fas fa-check-circle mr-2"></i> {slipFile.name}
                    </p>
                    <button
                      type="button"
                      onClick={clearSlipFile}
                      className="shrink-0 rounded-lg bg-white px-3 py-2 text-xs font-bold text-red-500 transition hover:bg-red-50"
                    >
                      ยกเลิกอัปโหลด
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-3 border-t border-slate-100 bg-slate-50 p-6">
              <button
                type="button"
                onClick={() => setIsConfirmModalOpen(false)}
                disabled={isSubmitting}
                className="flex-1 rounded-xl border border-slate-200 bg-white py-4 text-sm font-bold text-slate-600 transition hover:bg-slate-50"
              >
                ยกเลิก
              </button>
              <button
                onClick={confirmCheckout}
                disabled={isSubmitting}
                className="flex-1 rounded-xl bg-blue-600 py-4 text-sm font-bold text-white transition hover:bg-blue-700 disabled:opacity-50"
              >
                {isSubmitting ? 'กำลังบันทึก...' : 'ตกลง'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
