"use client"
import { useState, useEffect } from 'react'

export default function MasterDataPage() {
  const [categories, setCategories] = useState<{id: number, name: string, icon?: string}[]>([])
  const [companies, setCompanies] = useState<{id: number, name: string}[]>([])
  
  const [newCat, setNewCat] = useState('')
  const [newCatIcon, setNewCatIcon] = useState('fa-wine-bottle')
  const [newComp, setNewComp] = useState('')

  const [editingCatId, setEditingCatId] = useState<number | null>(null)
  const [editingCatName, setEditingCatName] = useState('')
  const [editingCatIcon, setEditingCatIcon] = useState('fa-wine-bottle')

  const fetchCategories = () => fetch('/api/categories').then(res => res.json()).then(setCategories)
  const fetchCompanies = () => fetch('/api/companies').then(res => res.json()).then(setCompanies)

  useEffect(() => {
    fetchCategories()
    fetchCompanies()
  }, [])

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newCat.trim()) return
    await fetch('/api/categories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newCat, icon: newCatIcon })
    })
    setNewCat('')
    setNewCatIcon('fa-wine-bottle')
    fetchCategories()
  }

  const startEditCategory = (cat: any) => {
    setEditingCatId(cat.id)
    setEditingCatName(cat.name)
    setEditingCatIcon(cat.icon || 'fa-wine-bottle')
  }

  const handleUpdateCategory = async (id: number) => {
    if (!editingCatName.trim()) return
    await fetch(`/api/categories/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: editingCatName, icon: editingCatIcon })
    })
    setEditingCatId(null)
    fetchCategories()
  }

  const handleDeleteCategory = async (id: number) => {
    if (!window.confirm('คุณแน่ใจหรือไม่ว่าต้องการลบหมวดหมู่นี้?')) return
    await fetch(`/api/categories/${id}`, { method: 'DELETE' })
    fetchCategories()
  }

  const handleAddCompany = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newComp.trim()) return
    await fetch('/api/companies', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newComp })
    })
    setNewComp('')
    fetchCompanies()
  }

  const handleDeleteCompany = async (id: number) => {
    if (!window.confirm('คุณแน่ใจหรือไม่ว่าต้องการลบบริษัทนี้?')) return
    await fetch(`/api/companies/${id}`, { method: 'DELETE' })
    fetchCompanies()
  }

  return (
    <>
      <div className="mb-8">
        <h2 className="text-3xl font-black text-slate-800 tracking-tight">ข้อมูลพื้นฐาน</h2>
        <p className="text-slate-500 text-sm mt-1">จัดการหมวดหมู่สินค้าและบริษัทคู่ค้า (Master Data)</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Categories Section */}
        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6 flex flex-col">
          <h3 className="text-xl font-black text-slate-800 mb-4 flex items-center">
            <i className="fas fa-tags text-blue-500 mr-2"></i> หมวดหมู่สินค้า
          </h3>
          
          <form className="mb-6 flex gap-2 items-center" onSubmit={handleAddCategory}>
            <div className="w-10 h-10 flex-shrink-0 flex items-center justify-center bg-slate-50 border border-slate-200 rounded-xl text-slate-500">
               <i className={`fas ${newCatIcon} text-lg`}></i>
            </div>
            <select 
              value={newCatIcon}
              onChange={e => setNewCatIcon(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-xl px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 min-w-max"
            >
              <option value="fa-wine-bottle">ขวด</option>
              <option value="fa-prescription-bottle">กระป๋อง</option>
              <option value="fa-beer">แก้ว</option>
            </select>
            <input 
              type="text" 
              value={newCat} 
              onChange={e => setNewCat(e.target.value)} 
              placeholder="เพิ่มหมวดหมู่ใหม่..." 
              className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
            <button type="submit" disabled={!newCat.trim()} className="bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-bold shadow-md hover:bg-blue-700 transition disabled:opacity-50">
              เพิ่ม
            </button>
          </form>

          <div className="flex-1 overflow-y-auto max-h-[500px]">
            <table className="w-full text-left">
              <thead className="bg-slate-50 text-slate-400 text-xs font-bold uppercase sticky top-0 z-10">
                <tr><th className="px-4 py-3 rounded-xl">ชื่อหมวดหมู่</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {categories.map(cat => (
                  <tr key={cat.id} className="group hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 font-semibold text-slate-700 flex justify-between items-center rounded-xl min-h-[56px]">
                      {editingCatId === cat.id ? (
                        <div className="flex gap-2 w-full animate-fade-in-up items-center">
                          <div className="w-8 h-8 flex-shrink-0 flex items-center justify-center bg-white border border-blue-200 rounded-lg text-slate-500">
                            <i className={`fas ${editingCatIcon}`}></i>
                          </div>
                          <select 
                            value={editingCatIcon}
                            onChange={e => setEditingCatIcon(e.target.value)}
                            className="bg-white border border-blue-200 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 w-max"
                          >
                            <option value="fa-wine-bottle">ขวด</option>
                            <option value="fa-prescription-bottle">กระป๋อง</option>
                            <option value="fa-beer">แก้ว</option>
                          </select>
                          <input 
                            type="text" 
                            value={editingCatName}
                            onChange={e => setEditingCatName(e.target.value)}
                            className="flex-1 bg-white border border-blue-200 rounded-lg px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                            autoFocus
                          />
                          <button onClick={() => handleUpdateCategory(cat.id)} className="bg-green-500 hover:bg-green-600 text-white w-8 h-8 rounded-lg flex items-center justify-center transition-colors">
                            <i className="fas fa-check text-xs"></i>
                          </button>
                          <button onClick={() => setEditingCatId(null)} className="bg-slate-200 hover:bg-slate-300 text-slate-600 w-8 h-8 rounded-lg flex items-center justify-center transition-colors">
                            <i className="fas fa-times text-xs"></i>
                          </button>
                        </div>
                      ) : (
                        <>
                          <span className="flex items-center"><i className={`fas ${cat.icon || 'fa-box'} w-6 text-center text-slate-400 mr-2 text-lg`}></i> {cat.name}</span>
                          <div className="opacity-0 group-hover:opacity-100 transition-opacity flex">
                            <button 
                              onClick={() => startEditCategory(cat)}
                              className="text-blue-400 hover:text-blue-600 p-2"
                              title="แก้ไขหมวดหมู่"
                            >
                              <i className="fas fa-edit"></i>
                            </button>
                            <button 
                              onClick={() => handleDeleteCategory(cat.id)}
                              className="text-red-400 hover:text-red-600 p-2"
                              title="ลบหมวดหมู่"
                            >
                              <i className="fas fa-trash"></i>
                            </button>
                          </div>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
                {categories.length === 0 && (
                  <tr><td className="px-4 py-6 text-center text-slate-400 text-sm">ยังไม่มีข้อมูล</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Companies Section */}
        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6 flex flex-col">
          <h3 className="text-xl font-black text-slate-800 mb-4 flex items-center">
            <i className="fas fa-building text-blue-500 mr-2"></i> บริษัท (Company)
          </h3>
          
          <form className="mb-6 flex gap-2" onSubmit={handleAddCompany}>
            <input 
              type="text" 
              value={newComp} 
              onChange={e => setNewComp(e.target.value)} 
              placeholder="เพิ่มบริษัทใหม่..." 
              className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
            <button type="submit" disabled={!newComp.trim()} className="bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-bold shadow-md hover:bg-blue-700 transition disabled:opacity-50">
              เพิ่ม
            </button>
          </form>

          <div className="flex-1 overflow-y-auto max-h-[500px]">
            <table className="w-full text-left">
              <thead className="bg-slate-50 text-slate-400 text-xs font-bold uppercase sticky top-0 z-10">
                <tr><th className="px-4 py-3 rounded-xl">ชื่อบริษัท</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {companies.map(comp => (
                  <tr key={comp.id} className="group hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 font-semibold text-slate-700 flex justify-between items-center rounded-xl">
                      {comp.name}
                      <button 
                        onClick={() => handleDeleteCompany(comp.id)}
                        className="text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity p-2"
                        title="ลบบริษัท"
                      >
                        <i className="fas fa-trash"></i>
                      </button>
                    </td>
                  </tr>
                ))}
                {companies.length === 0 && (
                  <tr><td className="px-4 py-6 text-center text-slate-400 text-sm">ยังไม่มีข้อมูล</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </>
  )
}
