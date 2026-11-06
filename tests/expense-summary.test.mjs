import test from 'node:test'
import assert from 'node:assert/strict'
import { buildExpenseSummary, buildProductCompanyReport } from '../lib/expense-summary.ts'

const item = (productId, company, price = 1000, cost = 600) => ({ productId, company, price, cost, quantity: 1, category: 'can', productName: `Product ${productId}` })
const input = (manualDiscount, items = [item(1, 'A')], promotionDiscount = 0) => ({
  orders: [{ id: 1, createdAt: new Date('2026-11-04T05:00:00Z'), subtotal: items.reduce((s, i) => s + i.price, 0), total: 0, manualDiscount, promotionDiscount, items, giftSelections: [] }],
  expenseEntries: [], canCategoryNames: ['can'],
})

test('manual discount reduces profit once, alongside promotions', () => {
  const data = input(100, undefined, 50)
  const summary = buildExpenseSummary(data)
  assert.equal(summary.overview.manualDiscount, 100)
  assert.equal(summary.overview.totalExpense, 750)
  assert.equal(summary.overview.grossProfit, 250)
  assert.equal(buildProductCompanyReport(data)[0].grossProfit, 250)
})

test('zero discount preserves original profit', () => {
  assert.equal(buildExpenseSummary(input(0)).overview.grossProfit, 400)
  assert.equal(buildProductCompanyReport(input(0))[0].grossProfit, 400)
})

test('rounded allocations reconcile across companies and product reports', () => {
  const data = input(100, [item(1, 'A'), item(2, 'A'), item(3, 'B')])
  const summary = buildExpenseSummary(data)
  const products = buildProductCompanyReport(data)
  assert.equal(summary.overview.manualDiscount, 100)
  assert.equal(products.reduce((s, p) => s + p.manualDiscount, 0), 100)
  for (const row of summary.rows) {
    const matching = products.filter(p => p.company === row.company)
    assert.equal(Math.round(matching.reduce((s, p) => s + p.manualDiscount, 0) * 100), Math.round(row.manualDiscount * 100))
  }
  assert.equal(summary.overview.grossProfit, 1100)
  assert.equal(Math.round(products.reduce((s, p) => s + p.grossProfit, 0)), 1100)
})
