import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  const passwordHash = await bcrypt.hash('123456', 10)

  await prisma.user.upsert({
    where: { username: 'somchai' },
    update: {},
    create: {
      name: 'สมชาย สายดื่ม',
      username: 'somchai',
      email: 'somchai@example.com',
      mobile: '0812345678',
      password: passwordHash,
    },
  })

  // Products from HTML Mockup: Singha Large, Leo Bottle, Heineken Bottle
  await prisma.product.createMany({
    data: [
      {
        name: 'Singha Large',
        category: 'Beer',
        stock: 156,
        cost: 65.0,
        price: 85.0,
        imageIcon: 'fa-beer',
      },
      {
        name: 'Leo Bottle',
        category: 'Beer',
        stock: 210,
        cost: 55.0,
        price: 75.0,
        imageIcon: 'fa-wine-bottle',
      },
      {
        name: 'Heineken Bottle (330ml)',
        category: 'Import',
        stock: 128,
        cost: 850.0, // Assuming this is per crate, but HTML says "850". Let's put 85.
        price: 120.0,
        imageIcon: 'fa-wine-bottle',
      },
    ],
    skipDuplicates: true,
  })

  console.log('Seed executed successfully')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
