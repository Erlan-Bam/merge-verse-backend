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
  console.log('🌱 Updating gift URLs...');
  console.log(toRawAddress('UQDs-c2kB_VNY0qsT-qyMfTSafBOnedSy6d2jIdO-kcWC4MZ')); // -> "0:8f2d84..."
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
