import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🗑️  Clearing transaction data...');

  // Delete OrderItems first (foreign key dependency)
  const deletedItems = await prisma.orderItem.deleteMany();
  console.log(`  ✅ Deleted ${deletedItems.count} order items`);

  // Delete Orders
  const deletedOrders = await prisma.order.deleteMany();
  console.log(`  ✅ Deleted ${deletedOrders.count} orders`);

  console.log('\n📦 Master data preserved:');
  const users = await prisma.user.count();
  const products = await prisma.product.count();
  const categories = await prisma.category.count();
  const companies = await prisma.company.count();
  console.log(`  👤 Users: ${users}`);
  console.log(`  📋 Products: ${products}`);
  console.log(`  🏷️  Categories: ${categories}`);
  console.log(`  🏢 Companies: ${companies}`);

  console.log('\n✨ Done! Transaction data cleared.');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
