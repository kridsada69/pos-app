"use client"

import { useCallback, useEffect, useMemo, useState } from 'react'

type Company = {
  id: number
  name: string
}

type ExpenseEntry = {
  id: number
  name: string
  amount: number
  company?: string | null
  companies?: {
    company: Company
  }[]
  note?: string | null
  expenseDate: string
}

type ExpenseSummaryRow = {
  id: string
  date: string
  type: 'ORDER' | 'OTHER_EXPENSE'
  reference: string
  company: string
  soldQty: number
  canQty: number
  salesAmount: number
  productCost: number
  promotionCost: number
  giftCost: number
  otherExpense: number
  totalExpense: number
  grossProfit: number
  avgProfitPerCan: number
  note?: string | null
}

type SummaryResponse = {
  data: ExpenseSummaryRow[]
  overview: {
    salesAmount: number
    productCost: number
    promotionCost: number
    giftCost: number
    otherExpense: number
    totalExpense: number
    grossProfit: number
    canQty: number
    avgProfitPerCan: number
  }
  metadata: {
    total: number
    page: number
    limit: number
    totalPages: number
  }
}

const today = new Date().toISOString().split('T')[0]

export default function ExpenseSummaryPage() {
  const [companies, setCompanies] = useState<Company[]>([])
  const [expenses, setExpenses] = useState<ExpenseEntry[]>([])
  const [summary, setSummary] = useState<SummaryResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [company, setCompany] = useState('all')
  const [type, setType] = useState('all')
  const [startDate, setStartDate] = useState(today)
  const [endDate, setEndDate] = useState(today)
  const [page, setPage] = useState(1)
  const [expenseForm, setExpenseForm] = useState({
    name: '',
    amount: '',
    companyIds: [] as number[],
    note: '',
    expenseDate: today,
  })
  const [submittingExpense, setSubmittingExpense] = useState(false)
  const [isExporting, setIsExporting] = useState<'csv' | 'pdf' | null>(null)

  const buildSummaryParams = useCallback(
    (options?: { exportAll?: boolean }) => {
      const params = new URLSearchParams({
        search,
        company,
        type,
        page: String(page),
        limit: '10',
      })
      if (startDate) params.set('startDate', startDate)
      if (endDate) params.set('endDate', endDate)
      if (options?.exportAll) params.set('exportMode', 'all')
      return params
    },
    [search, company, type, page, startDate, endDate]
  )

  const fetchSummary = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/expense-summary?${buildSummaryParams().toString()}`)
      const json = await res.json()
      setSummary(json)
    } finally {
      setLoading(false)
    }
  }, [buildSummaryParams])

  const fetchAllSummaryRows = useCallback(async () => {
    const res = await fetch(`/api/expense-summary?${buildSummaryParams({ exportAll: true }).toString()}`)
    return (await res.json()) as SummaryResponse
  }, [buildSummaryParams])

  const fetchExpenses = useCallback(async () => {
    const params = new URLSearchParams()
    if (startDate) params.set('startDate', startDate)
    if (endDate) params.set('endDate', endDate)
    const res = await fetch(`/api/expenses?${params.toString()}`)
    const json = await res.json()
    setExpenses(Array.isArray(json) ? json : [])
  }, [startDate, endDate])

  useEffect(() => {
    fetch('/api/companies').then((res) => res.json()).then(setCompanies)
  }, [])

  useEffect(() => {
    fetchSummary()
    fetchExpenses()
  }, [fetchExpenses, fetchSummary])

  const formatCurrency = (amount: number) => `฿ ${Number(amount || 0).toFixed(2)}`

  const totalPages = summary?.metadata.totalPages || 1
  const rows = summary?.data || []
  const overview = summary?.overview

  const companyOptions = useMemo(() => ['all', ...companies.map((item) => item.name)], [companies])

  const exportFileBaseName = useMemo(() => {
    const start = startDate || 'all'
    const end = endDate || 'all'
    return `expense-summary-${start}-to-${end}`
  }, [endDate, startDate])

  const escapeCsvCell = (value: string | number | null | undefined) => {
    const normalized = value == null ? '' : String(value)
    return `"${normalized.replaceAll('"', '""')}"`
  }

  const handleExportCsv = async () => {
    setIsExporting('csv')
    try {
      const exportSummary = await fetchAllSummaryRows()
      const csvRows = [
        ['สรุปยอดขาย', formatCurrency(exportSummary.overview.salesAmount)],
        ['ต้นทุนสินค้า', formatCurrency(exportSummary.overview.productCost)],
        ['ต้นทุนโปรโมชั่น', formatCurrency(exportSummary.overview.promotionCost)],
        ['ต้นทุนของแถม', formatCurrency(exportSummary.overview.giftCost)],
        ['ค่าใช้จ่ายอื่น', formatCurrency(exportSummary.overview.otherExpense)],
        ['ค่าใช้จ่ายรวม', formatCurrency(exportSummary.overview.totalExpense)],
        ['กำไรรวม', formatCurrency(exportSummary.overview.grossProfit)],
        ['กำไรเฉลี่ยต่อกระป๋อง', formatCurrency(exportSummary.overview.avgProfitPerCan)],
        [],
        [
          'วันที่',
          'ประเภท',
          'รายการอ้างอิง',
          'บริษัท',
          'จำนวนขาย',
          'จำนวนกระป๋อง',
          'ยอดขาย',
          'ต้นทุนสินค้า',
          'ต้นทุนโปรโมชั่น',
          'ต้นทุนของแถม',
          'ค่าใช้จ่ายอื่น',
          'ค่าใช้จ่ายรวม',
          'กำไร',
          'กำไรต่อกระป๋อง',
          'หมายเหตุ',
        ],
        ...exportSummary.data.map((row) => [
          row.date,
          row.type === 'ORDER' ? 'ยอดขาย' : 'ค่าใช้จ่ายอื่น',
          row.reference,
          row.company,
          row.soldQty,
          row.canQty,
          row.salesAmount,
          row.productCost,
          row.promotionCost,
          row.giftCost,
          row.otherExpense,
          row.totalExpense,
          row.grossProfit,
          row.avgProfitPerCan,
          row.note || '',
        ]),
      ]

      const csvContent = `\uFEFF${csvRows
        .map((row) => row.map((cell) => escapeCsvCell(cell)).join(','))
        .join('\n')}`
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `${exportFileBaseName}.csv`
      link.click()
      URL.revokeObjectURL(url)
    } finally {
      setIsExporting(null)
    }
  }

  const handleExportPdf = async () => {
    setIsExporting('pdf')
    try {
      const exportSummary = await fetchAllSummaryRows()
      const popup = window.open('', '_blank', 'width=1280,height=900')
      if (!popup) {
        alert('เบราว์เซอร์บล็อกหน้าพิมพ์ PDF กรุณาอนุญาต pop-up แล้วลองใหม่')
        return
      }

      const summaryCards = [
        ['ยอดขายรวม', formatCurrency(exportSummary.overview.salesAmount)],
        ['ค่าใช้จ่ายรวม', formatCurrency(exportSummary.overview.totalExpense)],
        ['กำไรรวม', formatCurrency(exportSummary.overview.grossProfit)],
        ['กำไรเฉลี่ยต่อกระป๋อง', formatCurrency(exportSummary.overview.avgProfitPerCan)],
      ]

      const tableRows = exportSummary.data
        .map(
          (row) => `
            <tr>
              <td>${row.date}</td>
              <td>${row.type === 'ORDER' ? 'ยอดขาย' : 'ค่าใช้จ่ายอื่น'}</td>
              <td>${row.reference}</td>
              <td>${row.company}</td>
              <td class="num">${row.soldQty}</td>
              <td class="num">${row.canQty}</td>
              <td class="num">${formatCurrency(row.salesAmount)}</td>
              <td class="num">${formatCurrency(row.productCost)}</td>
              <td class="num">${formatCurrency(row.promotionCost)}</td>
              <td class="num">${formatCurrency(row.giftCost)}</td>
              <td class="num">${formatCurrency(row.otherExpense)}</td>
              <td class="num">${formatCurrency(row.totalExpense)}</td>
              <td class="num">${formatCurrency(row.grossProfit)}</td>
              <td class="num">${formatCurrency(row.avgProfitPerCan)}</td>
            </tr>
          `
        )
        .join('')

      popup.document.write(`
        <html>
          <head>
            <title>Expense Summary PDF</title>
            <style>
              body { font-family: Arial, sans-serif; padding: 24px; color: #0f172a; }
              h1 { margin: 0 0 8px; font-size: 28px; }
              p { margin: 0 0 16px; color: #475569; }
              .grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; margin-bottom: 20px; }
              .card { border: 1px solid #cbd5e1; border-radius: 12px; padding: 12px 16px; }
              .label { font-size: 12px; color: #64748b; margin-bottom: 6px; }
              .value { font-size: 22px; font-weight: 700; }
              table { width: 100%; border-collapse: collapse; font-size: 12px; }
              th, td { border: 1px solid #cbd5e1; padding: 8px; vertical-align: top; }
              th { background: #f8fafc; text-align: left; }
              .num { text-align: right; white-space: nowrap; }
              @media print {
                body { padding: 0; }
              }
            </style>
          </head>
          <body>
            <h1>สรุปค่าใช้จ่าย</h1>
            <p>ช่วงวันที่ ${startDate || '-'} ถึง ${endDate || '-'} | บริษัท ${company === 'all' ? 'ทุกบริษัท' : company} | ประเภท ${type === 'all' ? 'ทั้งหมด' : type}</p>
            <div class="grid">
              ${summaryCards
                .map(
                  ([label, value]) => `
                    <div class="card">
                      <div class="label">${label}</div>
                      <div class="value">${value}</div>
                    </div>
                  `
                )
                .join('')}
            </div>
            <table>
              <thead>
                <tr>
                  <th>วันที่</th>
                  <th>ประเภท</th>
                  <th>รายการอ้างอิง</th>
                  <th>บริษัท</th>
                  <th>ขาย</th>
                  <th>กระป๋อง</th>
                  <th>ยอดขาย</th>
                  <th>ต้นทุนสินค้า</th>
                  <th>ต้นทุนโปร</th>
                  <th>ต้นทุนของแถม</th>
                  <th>ค่าใช้จ่ายอื่น</th>
                  <th>ค่าใช้จ่ายรวม</th>
                  <th>กำไร</th>
                  <th>กำไร/กระป๋อง</th>
                </tr>
              </thead>
              <tbody>${tableRows}</tbody>
            </table>
          </body>
        </html>
      `)
      popup.document.close()
      popup.focus()
      popup.print()
    } finally {
      setIsExporting(null)
    }
  }

  const handleExpenseSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setSubmittingExpense(true)

    try {
      const res = await fetch('/api/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(expenseForm),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => null)
        throw new Error(data?.error || 'บันทึกค่าใช้จ่ายไม่สำเร็จ')
      }

      setExpenseForm({
        name: '',
        amount: '',
        companyIds: [],
        note: '',
        expenseDate: today,
      })
      fetchSummary()
      fetchExpenses()
    } catch (error) {
      alert(error instanceof Error ? error.message : 'บันทึกค่าใช้จ่ายไม่สำเร็จ')
    } finally {
      setSubmittingExpense(false)
    }
  }

  const handleDeleteExpense = async (expenseId: number) => {
    if (!window.confirm('คุณแน่ใจหรือไม่ว่าต้องการลบค่าใช้จ่ายนี้?')) return
    await fetch(`/api/expenses/${expenseId}`, { method: 'DELETE' })
    fetchSummary()
    fetchExpenses()
  }

  const toggleExpenseCompany = (companyId: number) => {
    setExpenseForm((prev) => ({
      ...prev,
      companyIds: prev.companyIds.includes(companyId)
        ? prev.companyIds.filter((id) => id !== companyId)
        : [...prev.companyIds, companyId],
    }))
  }

  return (
    <>
      <div className="mb-8">
        <h2 className="text-3xl font-black tracking-tight text-slate-800">สรุปค่าใช้จ่าย</h2>
        <p className="mt-1 text-sm text-slate-500">รวมต้นทุนสินค้า, โปรโมชัน, ของแถม, ค่าใช้จ่ายอื่น และกำไรเฉลี่ยต่อกระป๋องแยกตามบริษัท</p>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-6 xl:grid-cols-[380px_minmax(0,1fr)]">
        <form onSubmit={handleExpenseSubmit} className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
          <div className="mb-5">
            <h3 className="text-xl font-black text-slate-800">เพิ่มค่าใช้จ่ายอื่น</h3>
            <p className="mt-1 text-sm text-slate-400">ถ้าไม่เลือกบริษัท ระบบจะเฉลี่ยตามจำนวนขายจริงในช่วงวันที่ที่กรองอยู่</p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-bold text-slate-700">ชื่อรายการ</label>
              <input
                type="text"
                value={expenseForm.name}
                onChange={(e) => setExpenseForm((prev) => ({ ...prev, name: e.target.value }))}
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-200"
                placeholder="เช่น ค่าขนส่ง"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-2 block text-sm font-bold text-slate-700">จำนวนเงิน</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={expenseForm.amount}
                  onChange={(e) => setExpenseForm((prev) => ({ ...prev, amount: e.target.value }))}
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-200"
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-bold text-slate-700">วันที่</label>
                <input
                  type="date"
                  value={expenseForm.expenseDate}
                  onChange={(e) => setExpenseForm((prev) => ({ ...prev, expenseDate: e.target.value }))}
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-200"
                />
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-bold text-slate-700">บริษัท</label>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                <label className="flex cursor-pointer items-center justify-between rounded-xl bg-white px-4 py-3">
                  <div>
                    <p className="text-sm font-bold text-slate-700">ทั้งหมด</p>
                    <p className="text-xs text-slate-400">ไม่เลือกบริษัทใดเลย = เฉลี่ยทุกบริษัทตามยอดขายจริง</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={expenseForm.companyIds.length === 0}
                    onChange={() => setExpenseForm((prev) => ({ ...prev, companyIds: [] }))}
                    className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                </label>
                <div className="mt-3 max-h-48 space-y-2 overflow-y-auto">
                  {companies.map((item) => {
                    const checked = expenseForm.companyIds.includes(item.id)
                    return (
                      <label
                        key={item.id}
                        className={`flex cursor-pointer items-center justify-between rounded-xl border px-4 py-3 transition ${
                          checked ? 'border-blue-200 bg-blue-50' : 'border-transparent bg-white'
                        }`}
                      >
                        <span className="text-sm font-semibold text-slate-700">{item.name}</span>
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleExpenseCompany(item.id)}
                          className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                        />
                      </label>
                    )
                  })}
                </div>
              </div>
              <p className="mt-2 text-xs text-slate-400">
                ติ๊กเลือกได้หลายบริษัท ถ้าไม่ติ๊กเลย ระบบจะคิดเป็น `ทั้งหมด`
              </p>
            </div>

            <div>
              <label className="mb-2 block text-sm font-bold text-slate-700">หมายเหตุ</label>
              <textarea
                value={expenseForm.note}
                onChange={(e) => setExpenseForm((prev) => ({ ...prev, note: e.target.value }))}
                rows={3}
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-200"
                placeholder="รายละเอียดเพิ่มเติม"
              />
            </div>

            <button
              type="submit"
              disabled={submittingExpense}
              className="w-full rounded-2xl bg-blue-600 px-6 py-4 text-sm font-black text-white shadow-lg shadow-blue-100 transition hover:bg-blue-700 disabled:opacity-50"
            >
              {submittingExpense ? 'กำลังบันทึก...' : 'บันทึกค่าใช้จ่าย'}
            </button>
          </div>
        </form>

        <div className="space-y-6">
          <div className="flex flex-wrap justify-end gap-3">
            <button
              type="button"
              onClick={handleExportCsv}
              disabled={isExporting !== null}
              className="rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-3 text-sm font-black text-emerald-700 transition hover:bg-emerald-100 disabled:opacity-50"
            >
              {isExporting === 'csv' ? 'กำลัง export...' : 'Export Excel / Google Sheets'}
            </button>
            <button
              type="button"
              onClick={handleExportPdf}
              disabled={isExporting !== null}
              className="rounded-2xl border border-rose-200 bg-rose-50 px-5 py-3 text-sm font-black text-rose-700 transition hover:bg-rose-100 disabled:opacity-50"
            >
              {isExporting === 'pdf' ? 'กำลัง export...' : 'Export PDF'}
            </button>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
            <div className="rounded-3xl bg-blue-600 p-5 text-white shadow-sm">
              <p className="text-sm font-semibold text-blue-100">ยอดขายรวม</p>
              <p className="mt-2 text-2xl font-black">{formatCurrency(overview?.salesAmount || 0)}</p>
            </div>
            <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
              <p className="text-sm font-semibold text-slate-500">ค่าใช้จ่ายรวม</p>
              <p className="mt-2 text-2xl font-black text-slate-800">{formatCurrency(overview?.totalExpense || 0)}</p>
              <p className="mt-1 text-xs text-slate-400">
                ของแถม {formatCurrency(overview?.giftCost || 0)} • โปร {formatCurrency(overview?.promotionCost || 0)}
              </p>
            </div>
            <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
              <p className="text-sm font-semibold text-slate-500">กำไรรวม</p>
              <p className={`mt-2 text-2xl font-black ${(overview?.grossProfit || 0) >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                {formatCurrency(overview?.grossProfit || 0)}
              </p>
            </div>
            <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
              <p className="text-sm font-semibold text-slate-500">กำไรเฉลี่ยต่อกระป๋อง</p>
              <p className="mt-2 text-2xl font-black text-slate-800">{formatCurrency(overview?.avgProfitPerCan || 0)}</p>
              <p className="mt-1 text-xs text-slate-400">{overview?.canQty || 0} กระป๋อง</p>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-100 bg-white p-4 shadow-sm">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-5">
              <div className="md:col-span-2">
                <label className="mb-2 block text-[11px] font-bold uppercase tracking-wider text-slate-400">ค้นหา</label>
                <input
                  type="text"
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setPage(1) }}
                  placeholder="ค้นหาบิล บริษัท หรือหมายเหตุ"
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-200"
                />
              </div>
              <div>
                <label className="mb-2 block text-[11px] font-bold uppercase tracking-wider text-slate-400">บริษัท</label>
                <select
                  value={company}
                  onChange={(e) => { setCompany(e.target.value); setPage(1) }}
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-200"
                >
                  {companyOptions.map((option) => (
                    <option key={option} value={option}>
                      {option === 'all' ? 'ทุกบริษัท' : option}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-2 block text-[11px] font-bold uppercase tracking-wider text-slate-400">ประเภท</label>
                <select
                  value={type}
                  onChange={(e) => { setType(e.target.value); setPage(1) }}
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-200"
                >
                  <option value="all">ทั้งหมด</option>
                  <option value="ORDER">ยอดขาย</option>
                  <option value="OTHER_EXPENSE">ค่าใช้จ่ายอื่น</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3 md:col-span-5">
                <div>
                  <label className="mb-2 block text-[11px] font-bold uppercase tracking-wider text-slate-400">ตั้งแต่วันที่</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => { setStartDate(e.target.value); setPage(1) }}
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-200"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-[11px] font-bold uppercase tracking-wider text-slate-400">ถึงวันที่</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => { setEndDate(e.target.value); setPage(1) }}
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-200"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mb-6 rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="text-xl font-black text-slate-800">รายการค่าใช้จ่ายอื่นในระบบ</h3>
            <p className="mt-1 text-sm text-slate-400">ใช้เป็นต้นทุนเสริมที่นำไปเฉลี่ยในหน้ารายงานด้านล่าง</p>
          </div>
        </div>

        <div className="space-y-3">
          {expenses.map((expense) => (
            <div key={expense.id} className="flex flex-col gap-3 rounded-2xl border border-slate-100 bg-slate-50 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-bold text-slate-800">{expense.name}</p>
                <p className="mt-1 text-xs text-slate-400">
                  {new Date(expense.expenseDate).toLocaleDateString('th-TH')} • {expense.companies && expense.companies.length > 0
                    ? expense.companies.map((item) => item.company.name).join(', ')
                    : expense.company || 'เฉลี่ยทุกบริษัท'}
                </p>
                {expense.note && <p className="mt-1 text-sm text-slate-500">{expense.note}</p>}
              </div>
              <div className="flex items-center gap-3">
                <span className="text-lg font-black text-red-500">{formatCurrency(expense.amount)}</span>
                <button
                  type="button"
                  onClick={() => handleDeleteExpense(expense.id)}
                  className="rounded-xl bg-white px-4 py-2 text-sm font-bold text-red-500 shadow-sm transition hover:bg-red-50"
                >
                  ลบ
                </button>
              </div>
            </div>
          ))}

          {expenses.length === 0 && (
            <div className="rounded-3xl border border-dashed border-slate-200 px-6 py-12 text-center text-slate-400">
              ยังไม่มีค่าใช้จ่ายอื่นในช่วงวันที่นี้
            </div>
          )}
        </div>
      </div>

      <div className="rounded-3xl border border-slate-100 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-6 py-5">
          <h3 className="text-xl font-black text-slate-800">ตารางสรุปค่าใช้จ่าย</h3>
          <p className="mt-1 text-sm text-slate-400">รองรับ filter ตามข้อมูลใน schema และแบ่งหน้าได้</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1500px] text-left">
            <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-400">
              <tr>
                <th className="px-6 py-4">วันที่</th>
                <th className="px-6 py-4">ประเภท</th>
                <th className="px-6 py-4">รายการอ้างอิง</th>
                <th className="px-6 py-4">บริษัท</th>
                <th className="px-6 py-4 text-right">ขาย</th>
                <th className="px-6 py-4 text-right">กระป๋อง</th>
                <th className="px-6 py-4 text-right">ยอดขาย</th>
                <th className="px-6 py-4 text-right">ต้นทุนสินค้า</th>
                <th className="px-6 py-4 text-right">ต้นทุนโปร</th>
                <th className="px-6 py-4 text-right">ต้นทุนของแถม</th>
                <th className="px-6 py-4 text-right">ค่าใช้จ่ายอื่น</th>
                <th className="px-6 py-4 text-right">ค่าใช้จ่ายรวม</th>
                <th className="px-6 py-4 text-right">กำไร</th>
                <th className="px-6 py-4 text-right">กำไร/กระป๋อง</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {rows.map((row) => (
                <tr key={row.id} className="hover:bg-slate-50/60 transition">
                  <td className="px-6 py-4 text-sm font-semibold text-slate-700">{row.date}</td>
                  <td className="px-6 py-4">
                    <span className={`rounded-full px-3 py-1 text-xs font-bold ${row.type === 'ORDER' ? 'bg-blue-50 text-blue-600' : 'bg-amber-50 text-amber-600'}`}>
                      {row.type === 'ORDER' ? 'ยอดขาย' : 'ค่าใช้จ่ายอื่น'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm font-bold text-slate-800">
                    <div>{row.reference}</div>
                    {row.note && <div className="mt-1 text-xs font-medium text-slate-400">{row.note}</div>}
                  </td>
                  <td className="px-6 py-4 text-sm font-semibold text-slate-600">{row.company}</td>
                  <td className="px-6 py-4 text-right text-sm font-semibold text-slate-600">{row.soldQty}</td>
                  <td className="px-6 py-4 text-right text-sm font-semibold text-slate-600">{row.canQty}</td>
                  <td className="px-6 py-4 text-right text-sm font-black text-blue-600">{formatCurrency(row.salesAmount)}</td>
                  <td className="px-6 py-4 text-right text-sm font-semibold text-slate-600">{formatCurrency(row.productCost)}</td>
                  <td className="px-6 py-4 text-right text-sm font-semibold text-emerald-600">{formatCurrency(row.promotionCost)}</td>
                  <td className="px-6 py-4 text-right text-sm font-semibold text-violet-600">{formatCurrency(row.giftCost)}</td>
                  <td className="px-6 py-4 text-right text-sm font-semibold text-amber-600">{formatCurrency(row.otherExpense)}</td>
                  <td className="px-6 py-4 text-right text-sm font-black text-slate-800">{formatCurrency(row.totalExpense)}</td>
                  <td className={`px-6 py-4 text-right text-sm font-black ${row.grossProfit >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                    {formatCurrency(row.grossProfit)}
                  </td>
                  <td className={`px-6 py-4 text-right text-sm font-black ${row.avgProfitPerCan >= 0 ? 'text-slate-800' : 'text-red-500'}`}>
                    {formatCurrency(row.avgProfitPerCan)}
                  </td>
                </tr>
              ))}

              {!loading && rows.length === 0 && (
                <tr>
                  <td colSpan={14} className="px-6 py-14 text-center text-slate-400">
                    ไม่พบข้อมูลตามเงื่อนไขที่เลือก
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between px-6 py-5 text-sm font-semibold text-slate-500">
          <div>หน้า {page} จาก {totalPages}</div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setPage((prev) => Math.max(1, prev - 1))}
              disabled={page === 1}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 transition hover:bg-slate-50 disabled:opacity-50"
            >
              ก่อนหน้า
            </button>
            <button
              type="button"
              onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
              disabled={page >= totalPages}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 transition hover:bg-slate-50 disabled:opacity-50"
            >
              ถัดไป
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
