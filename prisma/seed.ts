import { PrismaClient, Rarity, Level } from '@prisma/client';

const prisma = new PrismaClient();

const gifts = [
  // Common gifts (7)
  {
    name: 'Sharp Tongue',
    rarity: Rarity.COMMON,
    url: 'https://nft.fragment.com/gift/SnoopDogg-20303.lottie.json',
  },
  {
    name: 'Westside Sign',
    rarity: Rarity.COMMON,
    url: 'https://nft.fragment.com/gift/SnoopDogg-121.lottie.json',
  },
  {
    name: 'Scared Cat',
    rarity: Rarity.COMMON,
    url: 'https://nft.fragment.com/gift/SnoopDogg-456.lottie.json',
  },
  {
    name: 'Genie Lamp',
    rarity: Rarity.COMMON,
    url: 'https://nft.fragment.com/gift/SnoopDogg-789.lottie.json',
  },
  {
    name: 'Bonded Ring',
    rarity: Rarity.COMMON,
    url: 'https://nft.fragment.com/gift/SnoopDogg-1012.lottie.json',
  },
  {
    name: 'Gem Signet',
    rarity: Rarity.COMMON,
    url: 'https://nft.fragment.com/gift/SnoopDogg-1345.lottie.json',
  },
  {
    name: 'Magic Potion',
    rarity: Rarity.COMMON,
    url: 'https://nft.fragment.com/gift/SnoopDogg-1678.lottie.json',
  },

  // Rare gifts (7)
  {
    name: 'Ion Gem',
    rarity: Rarity.RARE,
    url: 'https://nft.fragment.com/gift/SnoopDogg-2001.lottie.json',
  },
  {
    name: 'Mini Oscar',
    rarity: Rarity.RARE,
    url: 'https://nft.fragment.com/gift/SnoopDogg-2334.lottie.json',
  },
  {
    name: 'Perfume Bottle',
    rarity: Rarity.RARE,
    url: 'https://nft.fragment.com/gift/SnoopDogg-2667.lottie.json',
  },
  {
    name: 'Loot Bag',
    rarity: Rarity.RARE,
    url: 'https://nft.fragment.com/gift/SnoopDogg-3000.lottie.json',
  },
  {
    name: 'Astral Shard',
    rarity: Rarity.RARE,
    url: 'https://nft.fragment.com/gift/SnoopDogg-3333.lottie.json',
  },
  {
    name: 'Nail Bracelet',
    rarity: Rarity.RARE,
    url: 'https://nft.fragment.com/gift/SnoopDogg-3666.lottie.json',
  },
  {
    name: 'Artisan Brick',
    rarity: Rarity.RARE,
    url: 'https://nft.fragment.com/gift/SnoopDogg-3999.lottie.json',
  },

  // Epic gifts (3)
  {
    name: 'Heroic Helmet',
    rarity: Rarity.EPIC,
    url: 'https://nft.fragment.com/gift/SnoopDogg-4001.lottie.json',
  },
  {
    name: 'Mighty Arm',
    rarity: Rarity.EPIC,
    url: 'https://nft.fragment.com/gift/SnoopDogg-4334.lottie.json',
  },
  {
    name: 'Precious Peach',
    rarity: Rarity.EPIC,
    url: 'https://nft.fragment.com/gift/SnoopDogg-4667.lottie.json',
  },

  // Legendary gifts (2)
  {
    name: "Durov's Cap",
    rarity: Rarity.LEGENDARY,
    url: 'https://nft.fragment.com/gift/SnoopDogg-5001.lottie.json',
  },
  {
    name: 'Heart Locket',
    rarity: Rarity.LEGENDARY,
    url: 'https://nft.fragment.com/gift/SnoopDogg-5334.lottie.json',
  },

  // Mythic gift (1)
  {
    name: 'Plush Pepe',
    rarity: Rarity.MYTHIC,
    url: 'https://nft.fragment.com/gift/SnoopDogg-6001.lottie.json',
  },
];

// Vertical prices - rewards for merging vertically (levels L1-L10)
const verticalPrices = [
  { level: Level.L1, price: 0.6 },
  { level: Level.L2, price: 1.2 },
  { level: Level.L3, price: 2.3 },
  { level: Level.L4, price: 4.6 },
  { level: Level.L5, price: 9.3 },
  { level: Level.L6, price: 18.6 },
  { level: Level.L7, price: 37.3 },
  { level: Level.L8, price: 74.6 },
  { level: Level.L9, price: 149.2 },
  { level: Level.L10, price: 298.3 },
];

// Horizontal prices - rewards for completing full path L1-L10 for each gift
const horizontalPrices = [
  // Common gifts
  { name: 'Sharp Tongue', rarity: Rarity.COMMON, price: 1.7 },
  { name: 'Westside Sign', rarity: Rarity.COMMON, price: 1.7 },
  { name: 'Scared Cat', rarity: Rarity.COMMON, price: 1.7 },
  { name: 'Genie Lamp', rarity: Rarity.COMMON, price: 1.7 },
  { name: 'Bonded Ring', rarity: Rarity.COMMON, price: 1.7 },
  { name: 'Gem Signet', rarity: Rarity.COMMON, price: 1.7 },
  { name: 'Magic Potion', rarity: Rarity.COMMON, price: 1.7 },

  // Rare gifts
  { name: 'Ion Gem', rarity: Rarity.RARE, price: 3.4 },
  { name: 'Mini Oscar', rarity: Rarity.RARE, price: 3.4 },
  { name: 'Perfume Bottle', rarity: Rarity.RARE, price: 3.4 },
  { name: 'Loot Bag', rarity: Rarity.RARE, price: 3.4 },
  { name: 'Astral Shard', rarity: Rarity.RARE, price: 3.4 },
  { name: 'Nail Bracelet', rarity: Rarity.RARE, price: 3.4 },
  { name: 'Artisan Brick', rarity: Rarity.RARE, price: 3.4 },

  // Epic gifts
  { name: 'Heroic Helmet', rarity: Rarity.EPIC, price: 9.9 },
  { name: 'Mighty Arm', rarity: Rarity.EPIC, price: 9.9 },
  { name: 'Precious Peach', rarity: Rarity.EPIC, price: 9.9 },

  // Legendary gifts
  { name: "Durov's Cap", rarity: Rarity.LEGENDARY, price: 36.3 },
  { name: 'Heart Locket', rarity: Rarity.LEGENDARY, price: 36.3 },

  // Mythic gift
  { name: 'Plush Pepe', rarity: Rarity.MYTHIC, price: 160.1 },
];

async function main() {
  console.log('🌱 Seeding database...');

  // Clear existing price data
  console.log('🗑️  Clearing existing price data...');
  await prisma.horizontalPrice.deleteMany();
  await prisma.verticalPrice.deleteMany();

  // Create vertical prices
  console.log('📊 Creating vertical prices...');
  const createdVerticalPrices = await Promise.all(
    verticalPrices.map((price) =>
      prisma.verticalPrice.create({
        data: {
          level: price.level,
          price: price.price,
        },
      }),
    ),
  );
  console.log(`✅ Created ${createdVerticalPrices.length} vertical prices`);

  // Create horizontal prices
  console.log('� Creating horizontal prices...');
  const createdHorizontalPrices = await Promise.all(
    horizontalPrices.map((price) =>
      prisma.horizontalPrice.create({
        data: {
          name: price.name,
          rarity: price.rarity,
          price: price.price,
        },
      }),
    ),
  );
  console.log(`✅ Created ${createdHorizontalPrices.length} horizontal prices`);

  console.log('✨ Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
