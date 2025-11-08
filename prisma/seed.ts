import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Gift URL mapping based on frontend GIFTS array
const giftUrlMapping = [
  {
    name: 'Sharp Tongue',
    url: 'https://nft.fragment.com/gift/SharpTongue-1.lottie.json',
  },
  {
    name: 'Westside Sign',
    url: 'https://nft.fragment.com/gift/WestsideSign-505XXX.lottie.json',
  },
  {
    name: 'Scared Cat',
    url: 'https://nft.fragment.com/gift/ScaredCat-505XXX.lottie.json',
  },
  {
    name: 'Genie Lamp',
    url: 'https://nft.fragment.com/gift/GenieLamp-505XXX.lottie.json',
  },
  {
    name: 'Bonded Ring',
    url: 'https://nft.fragment.com/gift/BondedRing-505XXX.lottie.json',
  },
  {
    name: 'Gem Signet',
    url: 'https://nft.fragment.com/gift/GemSignet-505XXX.lottie.json',
  },
  {
    name: 'Magic Potion',
    url: 'https://nft.fragment.com/gift/MagicPotion-505XXX.lottie.json',
  },
  {
    name: 'Ion Gem',
    url: 'https://nft.fragment.com/gift/IonGem-505XXX.lottie.json',
  },
  {
    name: 'Mini Oscar',
    url: 'https://nft.fragment.com/gift/MiniOscar-505XXX.lottie.json',
  },
  {
    name: 'Perfume Bottle',
    url: 'https://nft.fragment.com/gift/PerfumeBottle-505XXX.lottie.json',
  },
  {
    name: 'Loot Bag',
    url: 'https://nft.fragment.com/gift/LootBag-505XXX.lottie.json',
  },
  {
    name: 'Astral Shard',
    url: 'https://nft.fragment.com/gift/AstralShard-505XXX.lottie.json',
  },
  {
    name: 'Nail Bracelet',
    url: 'https://nft.fragment.com/gift/NailBracelet-505XXX.lottie.json',
  },
  {
    name: 'Artisan Brick',
    url: 'https://nft.fragment.com/gift/ArtisanBrick-505XXX.lottie.json',
  },
  {
    name: 'Heroic Helmet',
    url: 'https://nft.fragment.com/gift/HeroicHelmet-505.lottie.json',
  },
  {
    name: 'Mighty Arm',
    url: 'https://nft.fragment.com/gift/MightyArm-505XXX.lottie.json',
  },
  {
    name: 'Precious Peach',
    url: 'https://nft.fragment.com/gift/PreciousPeach-505XXX.lottie.json',
  },
  {
    name: "Durov's Cap",
    url: 'https://nft.fragment.com/gift/DurovsCap-1.lottie.json',
  },
  {
    name: 'Heart Locket',
    url: 'https://nft.fragment.com/gift/HeartLocket-505XXX.lottie.json',
  },
  {
    name: 'Plush Pepe',
    url: 'https://nft.fragment.com/gift/PlushPepe-1.lottie.json',
  },
];

async function main() {
  console.log('🌱 Updating gift URLs...');

  let updatedCount = 0;

  for (const mapping of giftUrlMapping) {
    const gift = await prisma.gift.findFirst({
      where: { name: mapping.name },
    });

    if (gift) {
      await prisma.gift.update({
        where: { id: gift.id },
        data: { url: mapping.url },
      });
      updatedCount++;
      console.log(`✅ Updated: ${mapping.name}`);
    } else {
      console.log(`⚠️  Gift not found: ${mapping.name}`);
    }
  }

  console.log(`\n✨ Updated ${updatedCount} gift URLs successfully!`);
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
