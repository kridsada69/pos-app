export type GiftTargetProduct = {
  productId: number
  product?: {
    id: number
    name: string
  } | null
}

export type GiftCampaignDefinition = {
  id: number
  name: string
  giftName: string
  cost: number
  requiredQuantity: number
  appliesToAllProducts: boolean
  isActive: boolean
  products: GiftTargetProduct[]
}

export type GiftCartItem = {
  productId: number
  quantity: number
  name?: string
}

export type ApplicableGiftCampaign = {
  giftCampaignId: number
  giftCampaignName: string
  giftName: string
  cost: number
  requiredQuantity: number
  giftQuantity: number
  totalCost: number
  appliesToAllProducts: boolean
  matchedQuantity: number
  productNames: string[]
}

export function getApplicableGiftCampaigns(
  campaigns: GiftCampaignDefinition[],
  cartItems: GiftCartItem[]
): ApplicableGiftCampaign[] {
  const remainingQuantities = new Map(
    cartItems
      .filter((item) => item.quantity > 0)
      .map((item) => [item.productId, item.quantity])
  )

  return campaigns
    .filter((campaign) => campaign.isActive)
    .sort((a, b) => {
      const requiredA = Math.max(1, Number(a.requiredQuantity) || 1)
      const requiredB = Math.max(1, Number(b.requiredQuantity) || 1)
      if (requiredA !== requiredB) return requiredB - requiredA
      return b.cost - a.cost
    })
    .map((campaign) => {
      const targetProductIds = new Set(campaign.products.map((item) => item.productId))
      const eligibleItems = cartItems.filter((item) =>
        campaign.appliesToAllProducts
          ? (remainingQuantities.get(item.productId) || 0) > 0
          : targetProductIds.has(item.productId) && (remainingQuantities.get(item.productId) || 0) > 0
      )
      const matchedQuantity = eligibleItems.reduce(
        (sum, item) => sum + (remainingQuantities.get(item.productId) || 0),
        0
      )
      const requiredQuantity = Math.max(1, Number(campaign.requiredQuantity) || 1)
      const giftQuantity = Math.floor(matchedQuantity / requiredQuantity)

      if (giftQuantity <= 0) {
        return null
      }

      let quantityToConsume = giftQuantity * requiredQuantity
      for (const item of eligibleItems) {
        if (quantityToConsume <= 0) break

        const remaining = remainingQuantities.get(item.productId) || 0
        const consumed = Math.min(remaining, quantityToConsume)
        remainingQuantities.set(item.productId, remaining - consumed)
        quantityToConsume -= consumed
      }

      return {
        giftCampaignId: campaign.id,
        giftCampaignName: campaign.name,
        giftName: campaign.giftName,
        cost: campaign.cost,
        requiredQuantity,
        giftQuantity,
        totalCost: campaign.cost * giftQuantity,
        appliesToAllProducts: campaign.appliesToAllProducts,
        matchedQuantity,
        productNames: campaign.appliesToAllProducts
          ? []
          : campaign.products
              .map((item) => item.product?.name)
              .filter((name): name is string => Boolean(name)),
      } satisfies ApplicableGiftCampaign
    })
    .filter((campaign): campaign is ApplicableGiftCampaign => Boolean(campaign))
}
