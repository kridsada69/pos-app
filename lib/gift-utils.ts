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
  appliesToAllProducts: boolean
  matchedQuantity: number
  productNames: string[]
}

export function getApplicableGiftCampaigns(
  campaigns: GiftCampaignDefinition[],
  cartItems: GiftCartItem[]
): ApplicableGiftCampaign[] {
  return campaigns
    .filter((campaign) => campaign.isActive)
    .map((campaign) => {
      const targetProductIds = new Set(campaign.products.map((item) => item.productId))
      const matchedItems = cartItems.filter((item) =>
        campaign.appliesToAllProducts ? item.quantity > 0 : targetProductIds.has(item.productId)
      )
      const matchedQuantity = matchedItems.reduce((sum, item) => sum + item.quantity, 0)

      if (matchedQuantity <= 0) {
        return null
      }

      return {
        giftCampaignId: campaign.id,
        giftCampaignName: campaign.name,
        giftName: campaign.giftName,
        cost: campaign.cost,
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
    .sort((a, b) => b.cost - a.cost)
}
