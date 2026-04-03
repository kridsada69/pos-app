"use client"
import { useState, useEffect } from 'react'
import Image from 'next/image'

export default function POSPage() {
  const [products, setProducts] = useState<any[]>([])
  const [categories, setCategories] = useState<{id: number, name: string, icon?: string}[]>([])
  const [cart, setCart] = useState<any[]>([])
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false)
  const [slipFile, setSlipFile] = useState<File | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isTaxEnabled, setIsTaxEnabled] = useState(false)
  
  const fetchActiveProducts = () => {
    fetch('/api/products?status=active&limit=1000')
      .then(res => res.json())
      .then(json => setProducts(json.data || []))
  }

  useEffect(() => {
    fetchActiveProducts()
    fetch('/api/categories').then(res => res.json()).then(setCategories)
  }, [])

  const addToCart = (product: any) => {
    setCart(prev => {
      const existing = prev.find(item => item.product.id === product.id)
      if (existing) {
        return prev.map(item => item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item)
      }
      return [...prev, { product, quantity: 1, price: product.price }]
    })
  }

  const updateQuantity = (id: number, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.product.id === id) {
        const newQ = item.quantity + delta
        return newQ > 0 ? { ...item, quantity: newQ } : item
      }
      return item
    }).filter(i => i.quantity > 0))
  }

  const handleSlipChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setSlipFile(e.target.files[0])
    }
  }

  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0)
  const tax = isTaxEnabled ? subtotal * 0.07 : 0;
  const total = subtotal + tax

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
          total,
          items: cart.map(i => ({ productId: i.product.id, quantity: i.quantity, price: i.price })),
          slipUrl
        })
      })

      if (res.ok) {
        alert('ชำระเงินเรียบร้อย! ตัดสต็อกอัตโนมัติ')
        setCart([])
        setSlipFile(null)
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

      <div className="flex flex-col lg:flex-row gap-8">
        <div className="flex-1">
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4">
            {products.map(product => {
               const cartItem = cart.find(i => i.product.id === product.id)
               const qty = cartItem ? cartItem.quantity : 0

               const catInfo = categories.find(c => c.name === product.category)
               const catIcon = catInfo?.icon || 'fa-box'
               let typeLabel = '-'
               if (catIcon === 'fa-wine-bottle') typeLabel = 'ขวด'
               else if (catIcon === 'fa-prescription-bottle') typeLabel = 'กระป๋อง'
               else if (catIcon === 'fa-beer') typeLabel = 'แก้ว'

               return (
                <div key={product.id} className={`bg-white p-4 rounded-3xl shadow-sm border ${qty > 0 ? 'border-blue-400' : 'border-slate-100'} hover:border-blue-400 transition-all group flex flex-col items-center ${product.stock <= 0 ? 'opacity-50' : ''}`}>
                  <div className={`relative w-full aspect-square ${qty > 0 ? 'bg-blue-50 text-blue-400' : 'bg-slate-50 text-slate-400'} rounded-2xl mb-4 flex items-center justify-center text-4xl group-hover:scale-105 transition-transform shadow-inner border border-slate-100/50 overflow-hidden`}>
                    {product.imageUrl ? (
                      <Image src={product.imageUrl} alt={product.name} fill className="object-cover" />
                    ) : (
                      <i className={`fas ${catIcon}`}></i>
                    )}
                  </div>
                  <h4 className="font-bold text-slate-800 text-center">{product.name}</h4>
                  {typeLabel !== '-' && (
                    <p className="text-xs text-slate-400 font-bold mb-1"><i className={`fas ${catIcon} mr-1`}></i> {typeLabel}</p>
                  )}
                  <p className={`${qty > 0 ? 'text-blue-600' : 'text-slate-400'} font-black text-lg`}>฿ {product.price.toFixed(2)}</p>
                  
                  {product.stock > 0 ? (
                    qty > 0 ? (
                      <div className="mt-4 flex items-center justify-between w-full bg-slate-50 rounded-xl p-1">
                        <button onClick={() => updateQuantity(product.id, -1)} className="w-8 h-8 flex items-center justify-center bg-white rounded-lg shadow-sm hover:text-red-500">-</button>
                        <span className="font-bold px-2">{qty}</span>
                        <button onClick={() => updateQuantity(product.id, 1)} className="w-8 h-8 flex items-center justify-center bg-blue-600 text-white rounded-lg shadow-sm">+</button>
                      </div>
                    ) : (
                      <button onClick={() => addToCart(product)} className="mt-4 w-full py-2 border-2 border-dashed border-slate-200 rounded-xl text-slate-400 font-bold hover:border-blue-300 hover:text-blue-500">เพิ่มลงบิล</button>
                    )
                  ) : <span className="mt-4 text-red-500 font-bold text-sm">สินค้าหมด</span>}
                </div>
               )
            })}
          </div>
        </div>

        <div className="lg:w-96">
          <div className="bg-white rounded-3xl shadow-xl border border-slate-100 flex flex-col sticky top-24">
            <div className="p-6 border-b border-dashed border-slate-100">
              <h3 className="font-black text-xl flex items-center">
                <i className="fas fa-file-invoice-dollar mr-2 text-blue-500"></i> บิลปัจจุบัน
              </h3>
            </div>
            <div className="p-6 space-y-4 max-h-[400px] overflow-y-auto min-h-[150px]">
              {cart.map((item, idx) => (
                <div key={idx} className="flex justify-between items-start">
                  <div>
                    <p className="font-bold text-slate-800">{item.product.name}</p>
                    <p className="text-xs text-slate-400 tracking-wider">฿ {item.price.toFixed(2)} x {item.quantity}</p>
                  </div>
                  <p className="font-black">฿ {(item.price * item.quantity).toFixed(2)}</p>
                </div>
              ))}
              {cart.length === 0 && <p className="text-slate-400 text-center text-sm py-4">ยังไม่มีสินค้าในบิล</p>}
            </div>
            <div className="p-6 bg-slate-50 rounded-b-3xl">
              <div className="flex justify-between text-sm mb-2 text-slate-500">
                <span>ยอดก่อนภาษี</span>
                <span>฿ {subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center text-sm mb-4 text-slate-500">
                <label className="flex items-center cursor-pointer select-none group">
                  <input type="checkbox" checked={isTaxEnabled} onChange={e => setIsTaxEnabled(e.target.checked)} className="mr-2 w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300 transition" />
                  <span className="group-hover:text-slate-700 transition">ภาษีมูลค่าเพิ่ม (7%)</span>
                </label>
                <span>฿ {tax.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center text-2xl font-black text-slate-800 mb-6 border-t border-slate-200 pt-3">
                <span>ยอดรวม</span>
                <span className="text-blue-600">฿ {total.toFixed(2)}</span>
              </div>
              <button 
                onClick={() => setIsConfirmModalOpen(true)} 
                disabled={cart.length === 0}
                className={`w-full ${cart.length > 0 ? 'bg-blue-600 hover:bg-blue-700' : 'bg-slate-300'} text-white font-black py-5 rounded-2xl shadow-xl transition-all flex items-center justify-center`}
              >
                ยืนยันชำระเงิน <i className="fas fa-chevron-right ml-2"></i>
              </button>
            </div>
          </div>
        </div>
      </div>

      {isConfirmModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-3xl w-full max-w-sm shadow-2xl overflow-hidden flex flex-col">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="text-xl font-black text-slate-800">ยืนยันชำระเงิน</h3>
              <button disabled={isSubmitting} onClick={() => setIsConfirmModalOpen(false)} className="text-slate-400 hover:text-slate-600 transition">
                <i className="fas fa-times text-xl"></i>
              </button>
            </div>
            
            <div className="p-6">
              <div className="text-center mb-6">
                <p className="text-slate-500 text-sm mb-1">ยอดรวมที่ต้องชำระ</p>
                <p className="text-4xl font-black text-blue-600">฿ {total.toFixed(2)}</p>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">อัปโหลดสลิปโอนเงิน (ถ้ามี)</label>
                <div className="flex gap-3">
                  <button 
                    type="button" 
                    onClick={() => document.getElementById('cameraInput')?.click()} 
                    className="flex-1 py-3 border border-slate-200 bg-white rounded-xl flex items-center justify-center gap-2 hover:bg-slate-50 transition text-sm font-bold text-slate-600 shadow-sm"
                  >
                    <i className="fas fa-camera text-blue-500"></i> ถ่ายรูป
                  </button>
                  <button 
                    type="button" 
                    onClick={() => document.getElementById('galleryInput')?.click()} 
                    className="flex-1 py-3 border border-slate-200 bg-white rounded-xl flex items-center justify-center gap-2 hover:bg-slate-50 transition text-sm font-bold text-slate-600 shadow-sm"
                  >
                    <i className="fas fa-images text-blue-500"></i> คลังรูปภาพ
                  </button>
                </div>
                <input id="cameraInput" type="file" accept="image/*" capture="environment" className="hidden" onChange={handleSlipChange} />
                <input id="galleryInput" type="file" accept="image/*" className="hidden" onChange={handleSlipChange} />
                {slipFile && <p className="text-sm font-bold text-green-600 mt-3 flex items-center"><i className="fas fa-check-circle mr-2"></i> {slipFile.name}</p>}
              </div>
            </div>

            <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
              <button 
                type="button" 
                onClick={() => setIsConfirmModalOpen(false)}
                disabled={isSubmitting}
                className="flex-1 py-4 rounded-xl font-bold text-sm text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 transition"
              >
                ยกเลิก
              </button>
              <button 
                onClick={confirmCheckout}
                disabled={isSubmitting}
                className="flex-1 py-4 rounded-xl font-bold text-sm text-white bg-blue-600 hover:bg-blue-700 transition disabled:opacity-50 flex items-center justify-center"
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
