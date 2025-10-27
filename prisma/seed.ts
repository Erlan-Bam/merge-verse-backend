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

const priceData = [
  // L1
  { rarity: Rarity.COMMON, level: Level.L1, value: 0.034 },
  { rarity: Rarity.RARE, level: Level.L1, value: 0.066 },
  { rarity: Rarity.EPIC, level: Level.L1, value: 0.194 },
  { rarity: Rarity.LEGENDARY, level: Level.L1, value: 0.709 },
  { rarity: Rarity.MYTHIC, level: Level.L1, value: 3.127 },

  // L2
  { rarity: Rarity.COMMON, level: Level.L2, value: 0.068 },
  { rarity: Rarity.RARE, level: Level.L2, value: 0.132 },
  { rarity: Rarity.EPIC, level: Level.L2, value: 0.388 },
  { rarity: Rarity.LEGENDARY, level: Level.L2, value: 1.418 },
  { rarity: Rarity.MYTHIC, level: Level.L2, value: 6.254 },

  // L3
  { rarity: Rarity.COMMON, level: Level.L3, value: 0.136 },
  { rarity: Rarity.RARE, level: Level.L3, value: 0.264 },
  { rarity: Rarity.EPIC, level: Level.L3, value: 0.776 },
  { rarity: Rarity.LEGENDARY, level: Level.L3, value: 2.836 },
  { rarity: Rarity.MYTHIC, level: Level.L3, value: 12.508 },

  // L4
  { rarity: Rarity.COMMON, level: Level.L4, value: 0.272 },
  { rarity: Rarity.RARE, level: Level.L4, value: 0.528 },
  { rarity: Rarity.EPIC, level: Level.L4, value: 1.552 },
  { rarity: Rarity.LEGENDARY, level: Level.L4, value: 5.672 },
  { rarity: Rarity.MYTHIC, level: Level.L4, value: 25.016 },

  // L5
  { rarity: Rarity.COMMON, level: Level.L5, value: 0.544 },
  { rarity: Rarity.RARE, level: Level.L5, value: 1.056 },
  { rarity: Rarity.EPIC, level: Level.L5, value: 3.104 },
  { rarity: Rarity.LEGENDARY, level: Level.L5, value: 11.344 },
  { rarity: Rarity.MYTHIC, level: Level.L5, value: 50.032 },

  // L6
  { rarity: Rarity.COMMON, level: Level.L6, value: 1.088 },
  { rarity: Rarity.RARE, level: Level.L6, value: 2.112 },
  { rarity: Rarity.EPIC, level: Level.L6, value: 6.208 },
  { rarity: Rarity.LEGENDARY, level: Level.L6, value: 22.688 },
  { rarity: Rarity.MYTHIC, level: Level.L6, value: 100.064 },

  // L7
  { rarity: Rarity.COMMON, level: Level.L7, value: 2.176 },
  { rarity: Rarity.RARE, level: Level.L7, value: 4.224 },
  { rarity: Rarity.EPIC, level: Level.L7, value: 12.416 },
  { rarity: Rarity.LEGENDARY, level: Level.L7, value: 45.376 },
  { rarity: Rarity.MYTHIC, level: Level.L7, value: 200.128 },

  // L8
  { rarity: Rarity.COMMON, level: Level.L8, value: 4.352 },
  { rarity: Rarity.RARE, level: Level.L8, value: 8.448 },
  { rarity: Rarity.EPIC, level: Level.L8, value: 24.832 },
  { rarity: Rarity.LEGENDARY, level: Level.L8, value: 90.752 },
  { rarity: Rarity.MYTHIC, level: Level.L8, value: 400.256 },

  // L9
  { rarity: Rarity.COMMON, level: Level.L9, value: 8.704 },
  { rarity: Rarity.RARE, level: Level.L9, value: 16.896 },
  { rarity: Rarity.EPIC, level: Level.L9, value: 49.664 },
  { rarity: Rarity.LEGENDARY, level: Level.L9, value: 181.504 },
  { rarity: Rarity.MYTHIC, level: Level.L9, value: 800.512 },

  // L10
  { rarity: Rarity.COMMON, level: Level.L10, value: 17.408 },
  { rarity: Rarity.RARE, level: Level.L10, value: 33.792 },
  { rarity: Rarity.EPIC, level: Level.L10, value: 99.328 },
  { rarity: Rarity.LEGENDARY, level: Level.L10, value: 363.008 },
  { rarity: Rarity.MYTHIC, level: Level.L10, value: 1601.024 },
];

async function main() {
  // console.log('🌱 Seeding database...');

  // // Clear existing data
  // console.log('🗑️  Clearing existing data...');
  // await prisma.price.deleteMany();
  // await prisma.item.deleteMany();
  // await prisma.gift.deleteMany();
  // await prisma.user.deleteMany();

  // // Create gifts
  // console.log('🎁 Creating gifts...');
  // const createdGifts = await Promise.all(
  //   gifts.map((gift) =>
  //     prisma.gift.create({
  //       data: gift,
  //     }),
  //   ),
  // );
  // console.log(`✅ Created ${createdGifts.length} gifts`);

  // // Create prices
  // console.log('💰 Creating prices...');

  // const createdPrices = await Promise.all(
  //   priceData.map((price) =>
  //     prisma.price.create({
  //       data: {
  //         rarity: price.rarity,
  //         level: price.level,
  //         value: price.value,
  //       },
  //     }),
  //   ),
  // );
  // console.log(`✅ Created ${createdPrices.length} prices`);

  // console.log('✨ Seeding completed successfully!');

  await prisma.user.updateMany({ data: { activeAt: null } });
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
