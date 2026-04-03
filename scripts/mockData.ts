import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Clearing OrderItem, Order, Product...')
  await prisma.orderItem.deleteMany()
  await prisma.order.deleteMany()
  await prisma.product.deleteMany()

  // Get user
  const user = await prisma.user.findFirst()
  if (!user) {
    throw new Error('No user found! Please run regular seed first.')
  }

  const categories = await prisma.category.findMany()
  const companies = await prisma.company.findMany()

  const defaultCategory = categories.length > 0 ? categories[0].name : 'General'
  const defaultCompany = companies.length > 0 ? companies[0].name : 'General Company'

  console.log('Mocking 50 products...')
  const productData = []
  for (let i = 1; i <= 50; i++) {
    productData.push({
      name: `สินค้าจำลอง ${i}`,
      category: categories.length > 0 ? categories[i % categories.length].name : defaultCategory,
      company: companies.length > 0 ? companies[i % companies.length].name : defaultCompany,
      stock: Math.floor(Math.random() * 200) + 10,
      cost: Math.floor(Math.random() * 50) + 10,
      price: Math.floor(Math.random() * 100) + 60,
      status: 'active'
    })
  }

  await prisma.product.createMany({ data: productData })
  const products = await prisma.product.findMany()

  console.log('Mocking 200 orders over the past 90 days...')
  const now = new Date()
  
  for (let i = 0; i < 200; i++) {
    const pastDate = new Date(now.getTime() - Math.random() * 90 * 24 * 60 * 60 * 1000)
    
    const numItems = Math.floor(Math.random() * 5) + 1
    const items = []
    let total = 0

    for (let j = 0; j < numItems; j++) {
      const p = products[Math.floor(Math.random() * products.length)]
      const qty = Math.floor(Math.random() * 3) + 1
      items.push({
        productId: p.id,
        quantity: qty,
        price: p.price
      })
      total += p.price * qty
    }

    await prisma.order.create({
      data: {
        total,
        cashierId: user.id,
        createdAt: pastDate,
        items: {
          create: items
        }
      }
    })
  }

  console.log('Mock data initialized successfully!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
