import { PrismaClient } from '@prisma/client';
import { Address } from '@ton/core';

function toRawAddress(friendly: string) {
  // parseFriendly returns { address, isBounceable, isTestOnly }
  const parsed = Address.parseFriendly(friendly);
  const addr: Address = parsed.address;
  // toRawString() -> "workchain:hex"
  return addr.toRawString(); // e.g. "0:8f2d84..."
}

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Syncing history for all existing user items...');

  // Get all items with their gift details
  const items = await prisma.item.findMany({
    select: {
      userId: true,
      giftId: true,
      level: true,
      gift: {
        select: {
          name: true,
          rarity: true,
        },
      },
    },
  });

  console.log(`Found ${items.length} items to sync to history`);

  if (items.length === 0) {
    console.log('✅ No items to sync');
    return;
  }

  // Group items by unique combination of userId, giftId, and level
  const uniqueItems = items.reduce((acc, item) => {
    const key = `${item.userId}-${item.giftId}-${item.level}`;
    if (!acc.has(key)) {
      acc.set(key, item);
    }
    return acc;
  }, new Map());

  console.log(`Processing ${uniqueItems.size} unique item combinations`);

  // Create history records in batches
  const historyUpserts = Array.from(uniqueItems.values()).map((item) =>
    prisma.history.upsert({
      where: {
        userId_giftId_level: {
          userId: item.userId,
          giftId: item.giftId,
          level: item.level,
        },
      },
      update: {},
      create: {
        userId: item.userId,
        giftId: item.giftId,
        level: item.level,
        name: item.gift.name,
        rarity: item.gift.rarity,
      },
    }),
  );

  await prisma.$transaction(historyUpserts);

  console.log('✅ History sync completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
