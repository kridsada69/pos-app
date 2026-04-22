"use client"

import { useEffect, useMemo, useState } from 'react'
import Image from 'next/image'
import {
  calculatePromotionOutcome,
  getBestPromotionStack,
  type AppliedPromotion,
  type PromotionDefinition,
} from '@/lib/promotion-utils'
import {
  getApplicableGiftCampaigns,
  type GiftCampaignDefinition,
} from '@/lib/gift-utils'

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

type Category = {
  id: number
  name: string
  icon?: string
}

type Promotion = PromotionDefinition
type GiftCampaign = GiftCampaignDefinition

export default function POSPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [promotions, setPromotions] = useState<Promotion[]>([])
  const [giftCampaigns, setGiftCampaigns] = useState<GiftCampaign[]>([])
  const [cart, setCart] = useState<CartItem[]>([])
  const [activeTypeTab, setActiveTypeTab] = useState('all')
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false)
  const [slipFile, setSlipFile] = useState<File | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isTaxEnabled, setIsTaxEnabled] = useState(false)
  const [manualDiscountInput, setManualDiscountInput] = useState('')
  const [note, setNote] = useState('')
  const [selectedGiftCampaignIds, setSelectedGiftCampaignIds] = useState<number[]>([])

  const fetchPosBootstrap = () => {
    fetch('/api/pos/bootstrap')
      .then((res) => res.json())
      .then((json) => {
        setProducts(json.products || [])
        setPromotions(Array.isArray(json.promotions) ? json.promotions : [])
        setGiftCampaigns(Array.isArray(json.gifts) ? json.gifts : [])
        setCategories(Array.isArray(json.categories) ? json.categories : [])
      })
  }

  useEffect(() => {
    fetchPosBootstrap()
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
            const newQuantity = item.quantity + delta
            return { ...item, quantity: newQuantity }
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

  const getProductTypeLabel = (product: Product) => {
    const catInfo = categories.find((category) => category.name === product.category)
    const catIcon = catInfo?.icon || product.imageIcon || 'fa-box'

    if (catIcon === 'fa-wine-bottle') return 'ขวด'
    if (catIcon === 'fa-prescription-bottle') return 'กระป๋อง'
    if (catIcon === 'fa-beer') return 'แก้ว'
    return product.category || 'อื่นๆ'
  }

  const productTypeTabs = Array.from(
    new Set(['all', ...products.map((product) => getProductTypeLabel(product))])
  )

  const filteredProducts =
    activeTypeTab === 'all'
      ? products
      : products.filter((product) => getProductTypeLabel(product) === activeTypeTab)

  const subtotal = useMemo(
    () => cart.reduce((sum, item) => sum + item.price * item.quantity, 0),
    [cart]
  )

  const promotionCartItems = useMemo(
    () =>
      cart.map((item) => ({
        productId: item.product.id,
        quantity: item.quantity,
        price: item.price,
        name: item.product.name,
      })),
    [cart]
  )

  const applicablePromotions = useMemo(
    () =>
      promotions
        .map((promotion) => calculatePromotionOutcome(promotion, promotionCartItems))
        .filter((promotion): promotion is AppliedPromotion => Boolean(promotion))
        .sort((a, b) => b.promotionDiscount - a.promotionDiscount),
    [promotionCartItems, promotions]
  )

  const applicableGiftCampaigns = useMemo(
    () => getApplicableGiftCampaigns(giftCampaigns, promotionCartItems),
    [giftCampaigns, promotionCartItems]
  )

  useEffect(() => {
    setSelectedGiftCampaignIds(applicableGiftCampaigns.map((campaign) => campaign.giftCampaignId))
  }, [applicableGiftCampaigns])

  const selectedGiftCampaigns = useMemo(
    () =>
      applicableGiftCampaigns.filter((campaign) =>
        selectedGiftCampaignIds.includes(campaign.giftCampaignId)
      ),
    [applicableGiftCampaigns, selectedGiftCampaignIds]
  )

  const selectedGiftCost = useMemo(
    () => selectedGiftCampaigns.reduce((sum, campaign) => sum + campaign.totalCost, 0),
    [selectedGiftCampaigns]
  )
  const selectedGiftQuantity = useMemo(
    () => selectedGiftCampaigns.reduce((sum, campaign) => sum + campaign.giftQuantity, 0),
    [selectedGiftCampaigns]
  )

  const promotionStack = useMemo(
    () => getBestPromotionStack(promotions, promotionCartItems),
    [promotionCartItems, promotions]
  )

  const appliedPromotions = promotionStack.appliedPromotions
  const promotionDiscount = promotionStack.totalPromotionDiscount
  const promotionLabel = promotionStack.promotionLabel
  const subtotalAfterPromotion = Math.max(subtotal - promotionDiscount, 0)
  const parsedManualDiscount = Number(manualDiscountInput)
  const safeManualDiscount =
    Number.isFinite(parsedManualDiscount) && parsedManualDiscount > 0 ? parsedManualDiscount : 0
  const manualDiscount = Math.min(safeManualDiscount, subtotalAfterPromotion)
  const discountedSubtotal = Math.max(subtotalAfterPromotion - manualDiscount, 0)
  const tax = isTaxEnabled ? discountedSubtotal * 0.07 : 0
  const total = discountedSubtotal + tax

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
          manualDiscount,
          note: note.trim(),
          isTaxEnabled,
          selectedGiftCampaignIds,
          items: cart.map((item) => ({
            productId: item.product.id,
            quantity: item.quantity,
          })),
          slipUrl,
        }),
      })

      if (res.ok) {
        alert('ชำระเงินเรียบร้อย! ตัดสต็อกอัตโนมัติ')
        setCart([])
        setSlipFile(null)
        setManualDiscountInput('')
        setNote('')
        setIsTaxEnabled(false)
        setSelectedGiftCampaignIds([])
        setIsConfirmModalOpen(false)
        fetchPosBootstrap()
      } else {
        const data = await res.json().catch(() => null)
        alert(data?.error || 'Checkout failed')
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
      <p className="mb-8 mt-1 text-sm text-slate-500">เลือกสินค้าและสแกนจ่าย</p>

      <div className="flex flex-col gap-8 lg:flex-row">
        <div className="flex-1">
          <div className="mb-5 flex gap-3 overflow-x-auto pb-2">
            {productTypeTabs.map((tab) => {
              const isActive = activeTypeTab === tab
              const label = tab === 'all' ? 'ทั้งหมด' : tab
              const count =
                tab === 'all'
                  ? products.length
                  : products.filter((product) => getProductTypeLabel(product) === tab).length

              return (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActiveTypeTab(tab)}
                  className={`shrink-0 rounded-2xl border px-4 py-3 text-sm font-bold transition ${
                    isActive
                      ? 'border-blue-600 bg-blue-600 text-white shadow-lg shadow-blue-200'
                      : 'border-slate-200 bg-white text-slate-500 hover:border-blue-200 hover:text-blue-600'
                  }`}
                >
                  {label}{' '}
                  <span className={`ml-1 ${isActive ? 'text-blue-100' : 'text-slate-300'}`}>
                    ({count})
                  </span>
                </button>
              )
            })}
          </div>

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4">
            {filteredProducts.map((product) => {
              const cartItem = cart.find((item) => item.product.id === product.id)
              const quantity = cartItem ? cartItem.quantity : 0

              const catInfo = categories.find((category) => category.name === product.category)
              const catIcon = catInfo?.icon || 'fa-box'
              const typeLabel = getProductTypeLabel(product)

              return (
                <div
                  key={product.id}
                  className={`group flex flex-col items-center rounded-3xl border bg-white p-4 shadow-sm transition-all ${
                    quantity > 0 ? 'border-blue-400' : 'border-slate-100'
                  } ${product.stock <= 0 ? 'opacity-50' : 'hover:border-blue-400'}`}
                >
                  <div
                    className={`relative mb-4 flex aspect-square w-full items-center justify-center overflow-hidden rounded-2xl border border-slate-100/50 text-4xl shadow-inner transition-transform group-hover:scale-105 ${
                      quantity > 0 ? 'bg-blue-50 text-blue-400' : 'bg-slate-50 text-slate-400'
                    }`}
                  >
                    {product.imageUrl ? (
                      <Image src={product.imageUrl} alt={product.name} fill className="object-cover" />
                    ) : (
                      <i className={`fas ${catIcon}`}></i>
                    )}
                  </div>
                  <h4 className="text-center font-bold text-slate-800">{product.name}</h4>
                  {typeLabel && (
                    <p className="mb-1 text-xs font-bold text-slate-400">
                      <i className={`fas ${catIcon} mr-1`}></i> {typeLabel}
                    </p>
                  )}
                  <p className={`text-lg font-black ${quantity > 0 ? 'text-blue-600' : 'text-slate-400'}`}>
                    ฿ {product.price.toFixed(2)}
                  </p>

                  {product.stock > 0 ? (
                    quantity > 0 ? (
                      <div className="mt-4 flex w-full items-center justify-between rounded-xl bg-slate-50 p-1">
                        <button
                          onClick={() => updateQuantity(product.id, -1)}
                          className="flex h-8 w-8 items-center justify-center rounded-lg bg-white shadow-sm hover:text-red-500"
                        >
                          -
                        </button>
                        <span className="px-2 font-bold">{quantity}</span>
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
          {filteredProducts.length === 0 && (
            <div className="mt-6 rounded-3xl border border-dashed border-slate-200 bg-white px-6 py-12 text-center text-slate-400">
              <i className="fas fa-layer-group mb-3 block text-3xl text-slate-300"></i>
              ไม่พบสินค้าในแท็บนี้
            </div>
          )}
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
                      <span className="min-w-6 text-center text-sm font-bold text-slate-700">
                        {item.quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() => updateQuantity(item.product.id, 1)}
                        className="flex h-7 w-7 items-center justify-center rounded-lg bg-white text-slate-500 shadow-sm transition hover:text-blue-600"
                        aria-label={`เพิ่มจำนวน ${item.product.name}`}
                      >
                        +
                      </button>
                    </div>
                    <p className="mt-1 text-xs tracking-wider text-slate-400">
                      ฿ {item.price.toFixed(2)} ต่อชิ้น
                    </p>
                  </div>
                  <p className="font-black">฿ {(item.price * item.quantity).toFixed(2)}</p>
                </div>
              ))}
              {cart.length === 0 && <p className="py-4 text-center text-sm text-slate-400">ยังไม่มีสินค้าในบิล</p>}
            </div>
            <div className="rounded-b-3xl bg-slate-50 p-6">
              {applicablePromotions.length > 0 ? (
                <div className="mb-4 rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
                  <div className="mb-2 flex items-center justify-between">
                    <p className="text-sm font-black text-emerald-700">โปรโมชั่นที่ระบบเลือกอัตโนมัติ</p>
                    <span className="text-sm font-bold text-emerald-700">
                      ใช้ {appliedPromotions.length} โปร
                    </span>
                  </div>
                  <p className="text-sm font-semibold text-emerald-700">
                    ลดทันที ฿ {promotionDiscount.toFixed(2)}
                  </p>
                  <p className="mt-1 text-xs text-emerald-600">
                    {promotionLabel}
                  </p>
                </div>
              ) : (
                <div className="mb-4 rounded-2xl border border-slate-200 bg-white p-4">
                  <p className="text-sm font-black text-slate-700">โปรโมชั่นอัตโนมัติ</p>
                  <p className="mt-1 text-sm text-slate-400">
                    ยังไม่มีโปรที่เข้าเงื่อนไขจากสินค้าในบิลนี้
                  </p>
                </div>
              )}

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
              {selectedGiftCampaigns.length > 0 && (
                <div className="mb-2 flex justify-between text-sm text-violet-600">
                  <span>ของแถมที่ลูกค้ารับ</span>
                  <span>{selectedGiftQuantity} ชิ้น • ต้นทุน ฿ {selectedGiftCost.toFixed(2)}</span>
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

              <div className="mb-6 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-sm font-black text-slate-800">โปรโมชั่นอัตโนมัติ</p>
                  <span className="text-xs font-bold text-slate-400">
                    แสดงเฉพาะโปรที่เข้าเงื่อนไขแล้ว
                  </span>
                </div>

                {applicablePromotions.length > 0 ? (
                  <div className="space-y-3">
                    {applicablePromotions.map((promotion, index) => {
                      const appliedPromotion = appliedPromotions.find(
                        (item) => item.promotionId === promotion.promotionId
                      )
                      const isApplied = Boolean(appliedPromotion)
                      return (
                        <div
                          key={promotion.promotionId}
                          className={`rounded-xl border px-4 py-3 ${
                            isApplied
                              ? 'border-emerald-200 bg-emerald-50'
                              : 'border-slate-200 bg-white'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-sm font-bold text-slate-800">
                                {promotion.promotionLabel}
                              </p>
                              <p className="mt-1 text-xs text-slate-500">
                                ซื้อ {promotion.requiredQuantity} ชิ้น ราคา ฿ {promotion.bundlePrice.toFixed(2)}{' '}
                                ต่อชุด, เข้าเงื่อนไข {promotion.matchedQuantity} ชิ้น
                              </p>
                              {!promotion.appliesToAllProducts && promotion.productNames.length > 0 && (
                                <p className="mt-1 text-xs text-slate-400">
                                  สินค้าที่ร่วมรายการ: {promotion.productNames.join(', ')}
                                </p>
                              )}
                              {isApplied && (
                                <p className="mt-1 text-xs font-semibold text-emerald-600">
                                  ถูกใช้งาน {appliedPromotion?.bundleCount ?? 0} ชุด
                                </p>
                              )}
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-black text-emerald-600">
                                -฿ {(isApplied ? appliedPromotion?.promotionDiscount : promotion.promotionDiscount)?.toFixed(2)}
                              </p>
                              {!isApplied && index === 1 && (
                                <p className="mt-1 text-[11px] font-semibold text-slate-400">
                                  ระบบจะไม่ใช้จำนวนสินค้าซ้ำกันข้ามโปร
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-slate-400">ยังไม่มีโปรที่เข้าเงื่อนไขจากบิลนี้</p>
                )}
              </div>

              <div className="mb-6 rounded-2xl border border-violet-100 bg-violet-50 p-4">
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-sm font-black text-violet-700">ของแถม</p>
                  <span className="text-xs font-bold text-violet-500">เลือกไว้ให้อัตโนมัติ</span>
                </div>

                {applicableGiftCampaigns.length > 0 ? (
                  <div className="space-y-3">
                    {applicableGiftCampaigns.map((gift) => {
                      const checked = selectedGiftCampaignIds.includes(gift.giftCampaignId)
                      return (
                        <label
                          key={gift.giftCampaignId}
                          className={`flex cursor-pointer items-start justify-between gap-3 rounded-xl border px-4 py-3 ${
                            checked ? 'border-violet-200 bg-white' : 'border-violet-100 bg-violet-50/80'
                          }`}
                        >
                          <div>
                            <p className="text-sm font-bold text-slate-800">{gift.giftCampaignName}</p>
                            <p className="mt-1 text-xs text-slate-500">
                              ของแถม: {gift.giftName} x{gift.giftQuantity} • ต้นทุนรวม ฿ {gift.totalCost.toFixed(2)}
                            </p>
                            <p className="mt-1 text-xs text-slate-400">
                              ซื้อครบ {gift.requiredQuantity} ชิ้น แถม 1 • เข้าเงื่อนไข {gift.matchedQuantity} ชิ้น
                              {!gift.appliesToAllProducts && gift.productNames.length > 0
                                ? ` • สินค้าร่วมรายการ: ${gift.productNames.join(', ')}`
                                : ''}
                            </p>
                          </div>
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() =>
                              setSelectedGiftCampaignIds((prev) =>
                                prev.includes(gift.giftCampaignId)
                                  ? prev.filter((id) => id !== gift.giftCampaignId)
                                  : [...prev, gift.giftCampaignId]
                              )
                            }
                            className="mt-1 h-5 w-5 rounded border-violet-300 text-violet-600 focus:ring-violet-500"
                          />
                        </label>
                      )
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-violet-500">บิลนี้ยังไม่มีของแถมที่เข้าเงื่อนไข</p>
                )}
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
                <div className="mb-2 flex justify-between text-violet-600">
                  <span>ของแถมที่ลูกค้ารับ</span>
                  <span>
                    {selectedGiftCampaigns.length > 0
                      ? `${selectedGiftQuantity} ชิ้น • ต้นทุน ฿ ${selectedGiftCost.toFixed(2)}`
                      : '-'}
                  </span>
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
                <label className="mb-2 block text-sm font-bold text-slate-700">
                  อัปโหลดสลิปโอนเงิน (ถ้ามี)
                </label>
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
