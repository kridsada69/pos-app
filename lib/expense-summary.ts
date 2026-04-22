type SummaryOrderItem = {
  productId: number
  productName?: string | null
  quantity: number
  price: number
  cost: number
  company: string | null
  category: string | null
}

type SummaryOrder = {
  id: number
  createdAt: Date
  subtotal: number
  total: number
  promotionDiscount: number
  giftSelections: {
    giftCampaignId: number
    cost: number
    quantity?: number | null
    giftCampaignName: string
    giftName: string
    giftCampaign: {
      appliesToAllProducts: boolean
      products: {
        productId: number
      }[]
    } | null
  }[]
  items: SummaryOrderItem[]
}

type SummaryExpenseEntry = {
  id: number
  name: string
  amount: number
  company: string | null
  note: string | null
  expenseDate: Date
  companies: {
    company: {
      id: number
      name: string
    }
  }[]
}

export type ExpenseSummaryRow = {
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
  note: string | null
}

export type ExpenseSummaryOverview = {
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

export type ProductCompanyReportRow = {
  productId: number
  productName: string
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
}

type BuildExpenseSummaryInput = {
  orders: SummaryOrder[]
  expenseEntries: SummaryExpenseEntry[]
  canCategoryNames: string[]
}

const roundMoney = (value: number) => Math.round(value * 100) / 100

const formatDate = (value: Date) =>
  new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Asia/Bangkok',
  }).format(value)

function getItemCanQty(item: SummaryOrderItem, canCategorySet: Set<string>) {
  if (item.category && canCategorySet.has(item.category)) {
    return item.quantity
  }
  return 0
}

function getAllocationBase(group: { soldQty: number; canQty: number }) {
  return group.canQty > 0 ? group.canQty : group.soldQty
}

export function buildExpenseSummary({
  orders,
  expenseEntries,
  canCategoryNames,
}: BuildExpenseSummaryInput) {
  const canCategorySet = new Set(canCategoryNames)
  const rows: ExpenseSummaryRow[] = []
  const companyCanTotals = new Map<string, number>()
  const companySoldTotals = new Map<string, number>()

  for (const order of orders) {
    const grouped = new Map<
      string,
      { soldQty: number; canQty: number; salesAmount: number; productCost: number }
    >()

    for (const item of order.items) {
      const company = item.company || 'ไม่ระบุบริษัท'
      const existing = grouped.get(company) || {
        soldQty: 0,
        canQty: 0,
        salesAmount: 0,
        productCost: 0,
      }

      existing.soldQty += item.quantity
      existing.canQty += getItemCanQty(item, canCategorySet)
      existing.salesAmount += item.price * item.quantity
      existing.productCost += item.cost * item.quantity
      grouped.set(company, existing)
    }

    const groupedEntries = Array.from(grouped.entries())
    const baseTotal = groupedEntries.reduce((sum, [, group]) => sum + getAllocationBase(group), 0)
    const giftCostByCompany = new Map<string, number>()

    for (const gift of order.giftSelections) {
      const totalGiftCost = gift.cost * (gift.quantity || 1)
      const eligibleItems = gift.giftCampaign?.appliesToAllProducts
        ? order.items
        : order.items.filter((item) =>
            gift.giftCampaign?.products.some((product) => product.productId === item.productId)
          )

      const eligibleCompanies = new Map<string, { soldQty: number; canQty: number }>()

      for (const item of eligibleItems) {
        const company = item.company || 'ไม่ระบุบริษัท'
        const current = eligibleCompanies.get(company) || { soldQty: 0, canQty: 0 }
        current.soldQty += item.quantity
        current.canQty += getItemCanQty(item, canCategorySet)
        eligibleCompanies.set(company, current)
      }

      const eligibleEntries = Array.from(eligibleCompanies.entries())
      const eligibleBaseTotal = eligibleEntries.reduce(
        (sum, [, companyGroup]) => sum + getAllocationBase(companyGroup),
        0
      )

      for (const [company, companyGroup] of eligibleEntries) {
        const allocationBase = getAllocationBase(companyGroup)
        const ratio = eligibleBaseTotal > 0 ? allocationBase / eligibleBaseTotal : 0
        const currentCost = giftCostByCompany.get(company) || 0
        giftCostByCompany.set(company, roundMoney(currentCost + totalGiftCost * ratio))
      }
    }

    for (const [company, group] of groupedEntries) {
      const allocationBase = getAllocationBase(group)
      const ratio = baseTotal > 0 ? allocationBase / baseTotal : 0
      const promotionCost = roundMoney(order.promotionDiscount * ratio)
      const giftCost = roundMoney(giftCostByCompany.get(company) || 0)
      const productCost = roundMoney(group.productCost)
      const salesAmount = roundMoney(group.salesAmount)
      const totalExpense = roundMoney(productCost + promotionCost + giftCost)
      const grossProfit = roundMoney(salesAmount - totalExpense)
      const avgProfitPerCan =
        group.canQty > 0 ? roundMoney(grossProfit / group.canQty) : roundMoney(grossProfit)

      rows.push({
        id: `order-${order.id}-${company}`,
        date: formatDate(order.createdAt),
        type: 'ORDER',
        reference: `INV-${String(order.id).padStart(4, '0')}`,
        company,
        soldQty: group.soldQty,
        canQty: group.canQty,
        salesAmount,
        productCost,
        promotionCost,
        giftCost,
        otherExpense: 0,
        totalExpense,
        grossProfit,
        avgProfitPerCan,
        note:
          order.giftSelections.length > 0
            ? order.giftSelections
                .map((gift) => `${gift.giftCampaignName}: ${gift.giftName} x${gift.quantity || 1}`)
                .join(', ')
            : null,
      })

      companyCanTotals.set(company, (companyCanTotals.get(company) || 0) + group.canQty)
      companySoldTotals.set(company, (companySoldTotals.get(company) || 0) + group.soldQty)
    }
  }

  const companies = Array.from(
    new Set([
      ...companyCanTotals.keys(),
      ...companySoldTotals.keys(),
      ...expenseEntries.map((entry) => entry.company || 'ไม่ระบุบริษัท'),
    ])
  )
    .map((company) => company || 'ไม่ระบุบริษัท')
    .filter(Boolean)

  const totalCanQty = Array.from(companyCanTotals.values()).reduce((sum, value) => sum + value, 0)
  const totalSoldQty = Array.from(companySoldTotals.values()).reduce((sum, value) => sum + value, 0)

  for (const entry of expenseEntries) {
    const selectedCompanies = entry.companies
      .map((item) => item.company.name)
      .filter(Boolean)

    const targetCompanies =
      selectedCompanies.length > 0
        ? selectedCompanies
        : entry.company && entry.company.trim()
          ? [entry.company.trim()]
          : companies.length > 0
            ? companies
            : ['ไม่ระบุบริษัท']

    const useFixedTarget = selectedCompanies.length > 0 || Boolean(entry.company)

    const totalBase = useFixedTarget
      ? targetCompanies.reduce((sum, company) => {
          const companyCanQty = companyCanTotals.get(company) || 0
          const companySoldQty = companySoldTotals.get(company) || 0
          const companyBase = totalCanQty > 0 ? companyCanQty : totalSoldQty > 0 ? companySoldQty : 1
          return sum + companyBase
        }, 0) || targetCompanies.length
      : totalCanQty > 0
        ? totalCanQty
        : totalSoldQty > 0
          ? totalSoldQty
          : targetCompanies.length

    for (const [companyIndex, company] of targetCompanies.entries()) {
      const companyCanQty = companyCanTotals.get(company) || 0
      const companySoldQty = companySoldTotals.get(company) || 0
      const companyBase = useFixedTarget
        ? totalCanQty > 0
          ? companyCanQty
          : totalSoldQty > 0
            ? companySoldQty
            : 1
        : totalCanQty > 0
          ? companyCanQty
          : totalSoldQty > 0
            ? companySoldQty
            : 1

      const safeBase = companyBase > 0 ? companyBase : 1
      const safeTotalBase = totalBase > 0 ? totalBase : targetCompanies.length
      const allocatedExpense = roundMoney(entry.amount * (safeBase / safeTotalBase))
      const avgProfitPerCan =
        companyCanQty > 0 ? roundMoney((-allocatedExpense) / companyCanQty) : roundMoney(-allocatedExpense)

      rows.push({
        id: `expense-${entry.id}-${company}-${companyIndex}`,
        date: formatDate(entry.expenseDate),
        type: 'OTHER_EXPENSE',
        reference: entry.name,
        company,
        soldQty: 0,
        canQty: companyCanQty,
        salesAmount: 0,
        productCost: 0,
        promotionCost: 0,
        giftCost: 0,
        otherExpense: allocatedExpense,
        totalExpense: allocatedExpense,
        grossProfit: roundMoney(-allocatedExpense),
        avgProfitPerCan,
        note: entry.note,
      })
    }
  }

  const overviewCanQty = totalCanQty > 0 ? totalCanQty : totalSoldQty

  return {
    rows,
    overview: summarizeExpenseSummaryRows(rows, overviewCanQty),
  }
}

export function summarizeExpenseSummaryRows(
  rows: ExpenseSummaryRow[],
  fallbackCanQty = 0
): ExpenseSummaryOverview {
  const totals = rows.reduce(
    (acc, row) => {
      acc.salesAmount += row.salesAmount
      acc.productCost += row.productCost
      acc.promotionCost += row.promotionCost
      acc.giftCost += row.giftCost
      acc.otherExpense += row.otherExpense
      acc.totalExpense += row.totalExpense
      acc.grossProfit += row.grossProfit
      return acc
    },
    {
      salesAmount: 0,
      productCost: 0,
      promotionCost: 0,
      giftCost: 0,
      otherExpense: 0,
      totalExpense: 0,
      grossProfit: 0,
    }
  )

  const orderCanQty = rows
    .filter((row) => row.type === 'ORDER')
    .reduce((sum, row) => sum + row.canQty, 0)

  const expenseCanQtyByCompany = rows
    .filter((row) => row.type === 'OTHER_EXPENSE')
    .reduce<Map<string, number>>((acc, row) => {
      acc.set(row.company, Math.max(acc.get(row.company) || 0, row.canQty))
      return acc
    }, new Map())

  const expenseCanQty = Array.from(expenseCanQtyByCompany.values()).reduce((sum, value) => sum + value, 0)
  const canQty = orderCanQty > 0 ? orderCanQty : expenseCanQty > 0 ? expenseCanQty : fallbackCanQty

  return {
    salesAmount: roundMoney(totals.salesAmount),
    productCost: roundMoney(totals.productCost),
    promotionCost: roundMoney(totals.promotionCost),
    giftCost: roundMoney(totals.giftCost),
    otherExpense: roundMoney(totals.otherExpense),
    totalExpense: roundMoney(totals.totalExpense),
    grossProfit: roundMoney(totals.grossProfit),
    canQty,
    avgProfitPerCan: canQty > 0 ? roundMoney(totals.grossProfit / canQty) : roundMoney(totals.grossProfit),
  }
}

export function buildProductCompanyReport({
  orders,
  expenseEntries,
  canCategoryNames,
}: BuildExpenseSummaryInput) {
  const canCategorySet = new Set(canCategoryNames)
  const rows = new Map<string, ProductCompanyReportRow>()
  const companyCanTotals = new Map<string, number>()
  const companySoldTotals = new Map<string, number>()

  for (const order of orders) {
    const groupedItems = new Map<
      string,
      {
        productId: number
        productName: string
        company: string
        soldQty: number
        canQty: number
        salesAmount: number
        productCost: number
      }
    >()

    for (const item of order.items) {
      const company = item.company || 'ไม่ระบุบริษัท'
      const productName = item.productName || `สินค้า #${item.productId}`
      const key = `${item.productId}-${company}`
      const existing = groupedItems.get(key) || {
        productId: item.productId,
        productName,
        company,
        soldQty: 0,
        canQty: 0,
        salesAmount: 0,
        productCost: 0,
      }

      existing.soldQty += item.quantity
      existing.canQty += getItemCanQty(item, canCategorySet)
      existing.salesAmount += item.price * item.quantity
      existing.productCost += item.cost * item.quantity
      groupedItems.set(key, existing)

      companyCanTotals.set(company, (companyCanTotals.get(company) || 0) + getItemCanQty(item, canCategorySet))
      companySoldTotals.set(company, (companySoldTotals.get(company) || 0) + item.quantity)
    }

    const productGroups = Array.from(groupedItems.values())
    const companyGroups = productGroups.reduce<Map<string, { soldQty: number; canQty: number }>>((acc, item) => {
      const current = acc.get(item.company) || { soldQty: 0, canQty: 0 }
      current.soldQty += item.soldQty
      current.canQty += item.canQty
      acc.set(item.company, current)
      return acc
    }, new Map())

    const baseTotal = Array.from(companyGroups.values()).reduce(
      (sum, group) => sum + getAllocationBase(group),
      0
    )
    const promotionCostByCompany = new Map<string, number>()
    for (const [company, group] of companyGroups.entries()) {
      const ratio = baseTotal > 0 ? getAllocationBase(group) / baseTotal : 0
      promotionCostByCompany.set(company, roundMoney(order.promotionDiscount * ratio))
    }

    const giftCostByCompany = new Map<string, number>()
    for (const gift of order.giftSelections) {
      const totalGiftCost = gift.cost * (gift.quantity || 1)
      const eligibleItems = gift.giftCampaign?.appliesToAllProducts
        ? order.items
        : order.items.filter((item) =>
            gift.giftCampaign?.products.some((product) => product.productId === item.productId)
          )

      const eligibleCompanies = eligibleItems.reduce<Map<string, { soldQty: number; canQty: number }>>((acc, item) => {
        const company = item.company || 'ไม่ระบุบริษัท'
        const current = acc.get(company) || { soldQty: 0, canQty: 0 }
        current.soldQty += item.quantity
        current.canQty += getItemCanQty(item, canCategorySet)
        acc.set(company, current)
        return acc
      }, new Map())

      const eligibleBaseTotal = Array.from(eligibleCompanies.values()).reduce(
        (sum, group) => sum + getAllocationBase(group),
        0
      )

      for (const [company, group] of eligibleCompanies.entries()) {
        const ratio = eligibleBaseTotal > 0 ? getAllocationBase(group) / eligibleBaseTotal : 0
        giftCostByCompany.set(
          company,
          roundMoney((giftCostByCompany.get(company) || 0) + totalGiftCost * ratio)
        )
      }
    }

    for (const item of productGroups) {
      const key = `${item.productId}-${item.company}`
      const companyGroup = companyGroups.get(item.company) || { soldQty: 0, canQty: 0 }
      const companyBase = getAllocationBase(companyGroup)
      const itemBase = item.canQty > 0 ? item.canQty : item.soldQty
      const shareRatio = companyBase > 0 ? itemBase / companyBase : 0
      const promotionCost = roundMoney((promotionCostByCompany.get(item.company) || 0) * shareRatio)
      const giftCost = roundMoney((giftCostByCompany.get(item.company) || 0) * shareRatio)
      const current = rows.get(key) || {
        productId: item.productId,
        productName: item.productName,
        company: item.company,
        soldQty: 0,
        canQty: 0,
        salesAmount: 0,
        productCost: 0,
        promotionCost: 0,
        giftCost: 0,
        otherExpense: 0,
        totalExpense: 0,
        grossProfit: 0,
        avgProfitPerCan: 0,
      }

      current.soldQty += item.soldQty
      current.canQty += item.canQty
      current.salesAmount = roundMoney(current.salesAmount + item.salesAmount)
      current.productCost = roundMoney(current.productCost + item.productCost)
      current.promotionCost = roundMoney(current.promotionCost + promotionCost)
      current.giftCost = roundMoney(current.giftCost + giftCost)
      rows.set(key, current)
    }
  }

  const productRows = Array.from(rows.values())

  for (const entry of expenseEntries) {
    const selectedCompanies = entry.companies.map((item) => item.company.name).filter(Boolean)
    const targetCompanies =
      selectedCompanies.length > 0
        ? selectedCompanies
        : entry.company && entry.company.trim()
          ? [entry.company.trim()]
          : Array.from(new Set(productRows.map((row) => row.company)))

    for (const company of targetCompanies) {
      const companyRows = productRows.filter((row) => row.company === company)
      const companyCanQty = companyCanTotals.get(company) || 0
      const companySoldQty = companySoldTotals.get(company) || 0
      const companyBaseTotal = companyCanQty > 0 ? companyCanQty : companySoldQty > 0 ? companySoldQty : companyRows.length
      if (companyRows.length === 0) continue

      for (const row of companyRows) {
        const rowBase = row.canQty > 0 ? row.canQty : row.soldQty > 0 ? row.soldQty : 1
        const allocatedExpense = roundMoney(entry.amount * (rowBase / companyBaseTotal))
        row.otherExpense = roundMoney(row.otherExpense + allocatedExpense)
      }
    }
  }

  return productRows
    .map((row) => {
      const totalExpense = roundMoney(
        row.productCost + row.promotionCost + row.giftCost + row.otherExpense
      )
      const grossProfit = roundMoney(row.salesAmount - totalExpense)
      const avgProfitPerCan =
        row.canQty > 0 ? roundMoney(grossProfit / row.canQty) : roundMoney(grossProfit)

      return {
        ...row,
        totalExpense,
        grossProfit,
        avgProfitPerCan,
      }
    })
    .sort((a, b) => {
      if (a.company !== b.company) return a.company.localeCompare(b.company)
      return a.productName.localeCompare(b.productName)
    })
}
