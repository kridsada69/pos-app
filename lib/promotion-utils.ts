export type PromotionTargetProduct = {
  productId: number
  product?: {
    id: number
    name: string
  } | null
}

export type PromotionDefinition = {
  id: number
  name: string
  requiredQuantity: number
  bundlePrice: number
  appliesToAllProducts: boolean
  isActive: boolean
  products: PromotionTargetProduct[]
}

export type PromotionCartItem = {
  productId: number
  quantity: number
  price: number
  name?: string
}

export type AppliedPromotion = {
  promotionId: number
  promotionLabel: string
  promotionDiscount: number
  matchedQuantity: number
  bundleCount: number
  bundlePrice: number
  requiredQuantity: number
  appliesToAllProducts: boolean
  productNames: string[]
  consumedProductQuantities: Record<number, number>
}

export type PromotionStackResult = {
  appliedPromotions: AppliedPromotion[]
  totalPromotionDiscount: number
  promotionLabel: string
}

type EligibleUnit = {
  productId: number
  price: number
}

const toMoney = (value: number) => Math.round(value * 100) / 100

function getEligibleUnits(promotion: PromotionDefinition, cartItems: PromotionCartItem[]) {
  const targetProductIds = new Set(promotion.products.map((item) => item.productId))

  return cartItems
    .filter((item) => (promotion.appliesToAllProducts ? true : targetProductIds.has(item.productId)))
    .flatMap((item) => Array.from({ length: item.quantity }, () => ({
      productId: item.productId,
      price: item.price,
    } satisfies EligibleUnit)))
    .sort((a, b) => b.price - a.price)
}

export function calculatePromotionOutcome(
  promotion: PromotionDefinition,
  cartItems: PromotionCartItem[]
): AppliedPromotion | null {
  if (!promotion.isActive || promotion.requiredQuantity <= 0 || promotion.bundlePrice < 0) {
    return null
  }

  const eligibleUnits = getEligibleUnits(promotion, cartItems)
  const matchedQuantity = eligibleUnits.length

  if (matchedQuantity < promotion.requiredQuantity) {
    return null
  }

  const bundleCount = Math.floor(matchedQuantity / promotion.requiredQuantity)
  const bundleUnitCount = bundleCount * promotion.requiredQuantity
  const consumedUnits = eligibleUnits.slice(0, bundleUnitCount)
  const regularBundleTotal = consumedUnits.reduce((sum, unit) => sum + unit.price, 0)

  const promotionDiscount = toMoney(
    Math.max(regularBundleTotal - bundleCount * promotion.bundlePrice, 0)
  )

  if (promotionDiscount <= 0) {
    return null
  }

  const consumedProductQuantities = consumedUnits.reduce<Record<number, number>>((acc, unit) => {
    acc[unit.productId] = (acc[unit.productId] || 0) + 1
    return acc
  }, {})

  const productNames = promotion.appliesToAllProducts
    ? []
    : promotion.products
        .map((item) => item.product?.name)
        .filter((name): name is string => Boolean(name))

  return {
    promotionId: promotion.id,
    promotionLabel: promotion.name,
    promotionDiscount,
    matchedQuantity,
    bundleCount,
    bundlePrice: promotion.bundlePrice,
    requiredQuantity: promotion.requiredQuantity,
    appliesToAllProducts: promotion.appliesToAllProducts,
    productNames,
    consumedProductQuantities,
  }
}

function removeConsumedQuantities(
  cartItems: PromotionCartItem[],
  consumedProductQuantities: Record<number, number>
) {
  return cartItems
    .map((item) => ({
      ...item,
      quantity: Math.max(item.quantity - (consumedProductQuantities[item.productId] || 0), 0),
    }))
    .filter((item) => item.quantity > 0)
}

export function getBestApplicablePromotion(
  promotions: PromotionDefinition[],
  cartItems: PromotionCartItem[]
) {
  return promotions.reduce<AppliedPromotion | null>((best, promotion) => {
    const current = calculatePromotionOutcome(promotion, cartItems)

    if (!current) return best
    if (!best) return current
    if (current.promotionDiscount > best.promotionDiscount) return current
    if (current.promotionDiscount === best.promotionDiscount && current.bundlePrice < best.bundlePrice) {
      return current
    }

    return best
  }, null)
}

export function getBestPromotionStack(
  promotions: PromotionDefinition[],
  cartItems: PromotionCartItem[]
): PromotionStackResult {
  const appliedPromotions: AppliedPromotion[] = []
  let remainingCartItems = cartItems.map((item) => ({ ...item }))

  while (remainingCartItems.length > 0) {
    const bestPromotion = getBestApplicablePromotion(promotions, remainingCartItems)
    if (!bestPromotion) break

    appliedPromotions.push(bestPromotion)
    remainingCartItems = removeConsumedQuantities(
      remainingCartItems,
      bestPromotion.consumedProductQuantities
    )
  }

  return {
    appliedPromotions,
    totalPromotionDiscount: toMoney(
      appliedPromotions.reduce((sum, promotion) => sum + promotion.promotionDiscount, 0)
    ),
    promotionLabel: appliedPromotions.map((promotion) => promotion.promotionLabel).join(', '),
  }
}
