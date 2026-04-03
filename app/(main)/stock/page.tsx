"use client"
import { useState, useEffect, useCallback } from 'react'
import Image from 'next/image'

export default function StockPage() {
  const [products, setProducts] = useState<any[]>([])
  const [categories, setCategories] = useState<{id: number, name: string, icon?: string}[]>([])
  const [companies, setCompanies] = useState<{id: number, name: string}[]>([])
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [editingProductId, setEditingProductId] = useState<number | null>(null)
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false)
  
  const [search, setSearch] = useState('')
  const [filterCategory, setFilterCategory] = useState('all')
  const [filterCompany, setFilterCompany] = useState('all')
  const [filterStatus, setFilterStatus] = useState('all')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  const [formData, setFormData] = useState({
    name: '',
    category: '',
    stock: '',
    cost: '',
    price: '',
    company: '',
    status: 'active'
  })
  const [file, setFile] = useState<File | null>(null)

  const fetchProducts = useCallback(async () => {
    try {
      const params = new URLSearchParams({
        search,
        category: filterCategory,
        company: filterCompany,
        status: filterStatus,
        page: page.toString(),
        limit: '10'
      })
      const res = await fetch(`/api/products?${params.toString()}`)
      const json = await res.json()
      if (json.data) {
        setProducts(json.data)
        setTotalPages(json.metadata?.totalPages || 1)
      }
    } catch (e) {
      console.error(e)
    }
  }, [search, filterCategory, filterCompany, filterStatus, page])

  useEffect(() => {
    fetchProducts()
  }, [fetchProducts])

  useEffect(() => {
    fetch('/api/categories').then(res => res.json()).then(setCategories)
    fetch('/api/companies').then(res => res.json()).then(setCompanies)
  }, [])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0])
    }
  }

  const handleAddProduct = () => {
    setEditingProductId(null)
    setFormData({ name: '', category: '', stock: '', cost: '', price: '', company: '', status: 'active' })
    setFile(null)
    setIsModalOpen(true)
  }

  const handleEditProduct = (product: any) => {
    setEditingProductId(product.id)
    setFormData({
      name: product.name,
      category: product.category,
      stock: product.stock.toString(),
      cost: product.cost.toString(),
      price: product.price.toString(),
      company: product.company || '',
      status: product.status || 'active'
    })
    setFile(null)
    setIsModalOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    
    try {
      let imageUrl = ''
      if (file) {
        const uploadData = new FormData()
        uploadData.append('file', file)
        
        const uploadRes = await fetch('/api/upload', {
          method: 'POST',
          body: uploadData,
        })
        if (uploadRes.ok) {
          const { imageUrl: url } = await uploadRes.json()
          imageUrl = url
        }
      }
      
      const payload = { ...formData, imageUrl }
      const url = editingProductId ? `/api/products/${editingProductId}` : '/api/products'
      const method = editingProductId ? 'PUT' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      
      if (res.ok) {
        setIsModalOpen(false)
        setFormData({ name: '', category: '', stock: '', cost: '', price: '', company: '', status: 'active' })
        setFile(null)
        setEditingProductId(null)
        fetchProducts()
      }
    } catch (error) {
      console.error('Error saving product:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteProduct = async () => {
    if (!editingProductId) return
    setIsSubmitting(true)
    try {
      const res = await fetch(`/api/products/${editingProductId}`, {
        method: 'DELETE'
      })
      if (res.ok) {
        setIsDeleteConfirmOpen(false)
        setIsModalOpen(false)
        setEditingProductId(null)
        fetchProducts()
      }
    } catch (err) {
      console.error('Error deleting product', err)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
        <div>
          <h2 className="text-3xl font-black text-slate-800 tracking-tight">สต็อกสินค้า</h2>
          <p className="text-slate-500 text-sm mt-1">จัดการจำนวนและราคาต้นทุน</p>
        </div>
        <button 
          onClick={handleAddProduct}
          className="bg-slate-800 text-white px-6 py-3 rounded-2xl font-bold text-sm shadow-lg hover:bg-slate-900 transition flex items-center shrink-0"
        >
          <i className="fas fa-plus mr-2"></i> นำเข้าสินค้า
        </button>
      </div>

      <div className="bg-white p-4 rounded-3xl shadow-sm border border-slate-100 mb-6 flex flex-col md:flex-row gap-4 items-center">
        <div className="flex-1 relative w-full">
          <i className="fas fa-search absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"></i>
          <input 
            type="text" 
            placeholder="ค้นหาสินค้า..." 
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition focus:outline-none"
          />
        </div>
        <select 
          value={filterCategory} 
          onChange={(e) => { setFilterCategory(e.target.value); setPage(1); }}
          className="w-full md:w-48 py-3 px-4 border border-slate-200 rounded-xl text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500/20 appearance-none"
        >
          <option value="all">ทุกหมวดหมู่</option>
          {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
        </select>
        <select 
          value={filterCompany} 
          onChange={(e) => { setFilterCompany(e.target.value); setPage(1); }}
          className="w-full md:w-48 py-3 px-4 border border-slate-200 rounded-xl text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500/20 appearance-none"
        >
          <option value="all">ทุกบริษัท</option>
          {companies.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
        </select>
        <select 
          value={filterStatus} 
          onChange={(e) => { setFilterStatus(e.target.value); setPage(1); }}
          className="w-full md:w-40 py-3 px-4 border border-slate-200 rounded-xl text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500/20 appearance-none"
        >
          <option value="all">ทุกสถานะ</option>
          <option value="active">ใช้งาน</option>
          <option value="inactive">ปิดใช้งาน</option>
        </select>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[700px]">
            <thead className="bg-slate-50 text-slate-400 text-xs font-bold uppercase">
              <tr>
                <th className="px-6 py-4">รูปภาพ</th>
                <th className="px-6 py-4">ชื่อสินค้า</th>
                <th className="px-6 py-4">บริษัท</th>
                <th className="px-6 py-4">สถานะ</th>
                <th className="px-6 py-4">หมวดหมู่</th>
                <th className="px-6 py-4">ประเภท</th>
                <th className="px-6 py-4">คงเหลือ</th>
                <th className="px-6 py-4">ต้นทุน</th>
                <th className="px-6 py-4">ราคาขาย</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {products.map(product => (
                <tr key={product.id} onClick={() => handleEditProduct(product)} className="cursor-pointer hover:bg-slate-50 transition">
                  <td className="px-6 py-4">
                    {product.imageUrl ? (
                      <div className="relative w-12 h-12 rounded-xl border border-slate-100 overflow-hidden">
                        <Image src={product.imageUrl} alt={product.name} fill className="object-cover" />
                      </div>
                    ) : (() => {
                      const catIcon = categories.find(c => c.name === product.category)?.icon || 'fa-box';
                      return (
                        <div className="w-12 h-12 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 text-xl shadow-inner border border-slate-100/50">
                          <i className={`fas ${catIcon}`}></i>
                        </div>
                      );
                    })()}
                  </td>
                  <td className="px-6 py-6 font-bold text-slate-800">{product.name}</td>
                  <td className="px-6 py-6 text-slate-500">{product.company || '-'}</td>
                  <td className="px-6 py-6">
                    {product.status === 'active' ? (
                      <span className="px-2 py-1 bg-green-50 text-green-600 text-xs font-bold rounded">ใช้งาน</span>
                    ) : (
                      <span className="px-2 py-1 bg-slate-50 text-slate-500 text-xs font-bold rounded">ปิดใช้งาน</span>
                    )}
                  </td>
                  <td className="px-6 py-6">
                    <span className="px-2 py-1 bg-blue-50 text-blue-600 text-xs font-medium rounded uppercase">
                      {product.category}
                    </span>
                  </td>
                  <td className="px-6 py-6">
                    {(() => {
                      const catInfo = categories.find(c => c.name === product.category)
                      let typeLabel = '-'
                      let iconClass = 'fa-box'
                      if (catInfo?.icon === 'fa-wine-bottle') { typeLabel = 'ขวด'; iconClass = 'fa-wine-bottle' }
                      else if (catInfo?.icon === 'fa-prescription-bottle') { typeLabel = 'กระป๋อง'; iconClass = 'fa-prescription-bottle' }
                      else if (catInfo?.icon === 'fa-beer') { typeLabel = 'แก้ว'; iconClass = 'fa-beer' }
                      
                      return typeLabel !== '-' ? (
                        <div className="flex items-center text-slate-500 font-bold text-sm">
                          <i className={`fas ${iconClass} w-4 text-center mr-2 text-slate-400`}></i> {typeLabel}
                        </div>
                      ) : (
                         <span className="text-slate-400">-</span>
                      )
                    })()}
                  </td>
                  <td className={`px-6 py-6 font-bold ${product.stock <= 10 ? 'text-red-500' : 'text-slate-700'}`}>
                    {product.stock} รายการ
                  </td>
                  <td className="px-6 py-6 text-slate-500">฿ {Number(product.cost).toFixed(2)}</td>
                  <td className="px-6 py-6 font-bold text-blue-600">฿ {Number(product.price).toFixed(2)}</td>
                </tr>
              ))}
              {products.length === 0 && (
                <tr>
                  <td colSpan={9} className="text-center py-10 text-slate-400 bg-slate-50/50">
                    <i className="fas fa-inbox text-3xl mb-3 block"></i>
                    ไม่พบข้อมูลสินค้าที่ตรงกับเงื่อนไข
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {products.length > 0 && (
        <div className="flex justify-between items-center mt-6 px-2 text-sm text-slate-500 font-semibold">
          <div>หน้า {page} จาก {totalPages}</div>
          <div className="flex gap-2">
            <button 
              onClick={() => setPage(prev => Math.max(1, prev - 1))}
              disabled={page === 1}
              className="px-4 py-2 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 disabled:opacity-50 transition"
            >
              ก่อนหน้า
            </button>
            <button 
              onClick={() => setPage(prev => Math.min(totalPages, prev + 1))}
              disabled={page >= totalPages}
              className="px-4 py-2 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 disabled:opacity-50 transition"
            >
              ถัดไป
            </button>
          </div>
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="text-xl font-black text-slate-800">{editingProductId ? 'แก้ไขสินค้า' : 'เพิ่มสินค้าใหม่'}</h3>
              <button 
                onClick={() => setIsModalOpen(false)} 
                disabled={isSubmitting}
                className="text-slate-400 hover:text-slate-600 transition"
              >
                <i className="fas fa-times text-xl"></i>
              </button>
            </div>
            <div className="p-6 overflow-y-auto">
              <form id="productForm" onSubmit={handleSubmit} className="space-y-4">
                
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">รูปภาพสินค้า</label>
                  <div className="flex flex-wrap gap-3">
                    <label className="cursor-pointer flex items-center px-4 py-2.5 bg-blue-50 text-blue-700 rounded-xl font-bold text-sm hover:bg-blue-100 transition border border-blue-100">
                      <i className="fas fa-camera text-lg mr-2"></i> ถ่ายรูป
                      <input 
                        type="file" 
                        accept="image/*" 
                        capture="environment"
                        onChange={handleFileChange}
                        className="hidden"
                      />
                    </label>
                    <label className="cursor-pointer flex items-center px-4 py-2.5 bg-slate-50 text-slate-700 rounded-xl font-bold text-sm border border-slate-200 hover:bg-slate-100 transition">
                      <i className="fas fa-image text-lg mr-2"></i> เลือกจากแกลอรี่
                      <input 
                        type="file" 
                        accept="image/*" 
                        onChange={handleFileChange}
                        className="hidden"
                      />
                    </label>
                  </div>
                  {file && (
                    <div className="mt-3 text-sm font-bold text-green-600 flex items-center">
                      <i className="fas fa-check-circle mr-1.5"></i> เลือกไฟล์แล้ว: {file.name}
                    </div>
                  )}
                  {editingProductId && !file && (
                    <p className="text-xs text-slate-400 mt-2">*หากไม่ต้องการเปลี่ยนรูป ให้เว้นว่างไว้</p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-sm font-bold text-slate-700 mb-2">ชื่อสินค้า</label>
                    <input required type="text" name="name" value={formData.name} onChange={handleChange} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition" placeholder="เช่น สิงห์ขวดใหญ่" />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">หมวดหมู่</label>
                    <select required name="category" value={formData.category} onChange={handleChange} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition appearance-none">
                      <option value="">- เลือกหมวดหมู่ -</option>
                      {categories.map(c => (
                        <option key={c.id} value={c.name}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">บริษัท (Company)</label>
                    <select required name="company" value={formData.company} onChange={handleChange} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition appearance-none">
                      <option value="">- เลือกบริษัท -</option>
                      {companies.map(c => (
                        <option key={c.id} value={c.name}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-bold text-slate-700 mb-2">จำนวนตั้งต้น</label>
                    <input required type="number" name="stock" value={formData.stock} onChange={handleChange} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition" placeholder="0" />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">ต้นทุน (บาท)</label>
                    <input required type="number" step="0.01" name="cost" value={formData.cost} onChange={handleChange} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition" placeholder="0.00" />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">ราคาขาย (บาท)</label>
                    <input required type="number" step="0.01" name="price" value={formData.price} onChange={handleChange} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition" placeholder="0.00" />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-bold text-slate-700 mb-2">สถานะ</label>
                    <select required name="status" value={formData.status} onChange={handleChange} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition appearance-none">
                      <option value="active">ใช้งาน (Active)</option>
                      <option value="inactive">ปิดใช้งาน (Inactive)</option>
                    </select>
                  </div>
                </div>
              </form>
            </div>
            <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-between gap-3">
              <div>
                {editingProductId && (
                  <button 
                    type="button" 
                    onClick={() => setIsDeleteConfirmOpen(true)}
                    disabled={isSubmitting}
                    className="px-6 py-3 rounded-xl font-bold text-sm text-red-500 bg-red-50 hover:bg-red-100 transition"
                  >
                    ลบสินค้า
                  </button>
                )}
              </div>
              <div className="flex gap-3">
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)}
                  className="px-6 py-3 rounded-xl font-bold text-sm text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 transition"
                >
                  ยกเลิก
                </button>
                <button 
                  type="submit" 
                  form="productForm"
                  disabled={isSubmitting}
                  className="px-6 py-3 rounded-xl font-bold text-sm text-white bg-blue-600 hover:bg-blue-700 transition disabled:opacity-50 flex items-center"
                >
                  {isSubmitting ? 'กำลังบันทึก...' : 'บันทึกสินค้า'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {isDeleteConfirmOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white rounded-3xl w-full max-w-sm shadow-2xl p-6 text-center">
            <div className="w-16 h-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center mb-4 mx-auto">
              <i className="fas fa-exclamation-triangle text-2xl"></i>
            </div>
            <h3 className="text-xl font-black text-slate-800 mb-2">ยืนยันการลบสินค้า</h3>
            <p className="text-sm text-slate-500 mb-8">คุณแน่ใจหรือไม่ว่าต้องการลบสินค้านี้? ไม่สามารถกู้ข้อมูลคืนได้หลังจากทำรายการ</p>
            <div className="flex gap-3">
              <button 
                onClick={() => setIsDeleteConfirmOpen(false)}
                disabled={isSubmitting}
                className="flex-1 py-3 rounded-xl font-bold text-sm text-slate-600 bg-slate-50 hover:bg-slate-100 transition"
              >
                ยกเลิก
              </button>
              <button 
                onClick={handleDeleteProduct}
                disabled={isSubmitting}
                className="flex-1 py-3 rounded-xl font-bold text-sm text-white bg-red-500 hover:bg-red-600 transition"
              >
                {isSubmitting ? 'กำลังลบ...' : 'ลบสินค้าเลย'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

