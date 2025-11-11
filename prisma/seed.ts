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
  console.log('🌱 Migrating craft table positions from 16x16 to 4x4...');

  // Get all craft items with positions that are outside the 4x4 grid (0-3)
  const craftItems = await prisma.craftItem.findMany({
    where: {
      OR: [{ positionX: { gt: 3 } }, { positionY: { gt: 3 } }],
    },
  });

  console.log(`Found ${craftItems.length} craft items to migrate`);

  if (craftItems.length === 0) {
    console.log('✅ No items to migrate');
    return;
  }

  // Convert 16x16 positions to 4x4 positions
  // Formula: new_position = Math.floor(old_position * 4 / 16) = Math.floor(old_position / 4)
  const updates = craftItems.map(async (item) => {
    const newPositionX = Math.floor(item.positionX / 4);
    const newPositionY = Math.floor(item.positionY / 4);

    // Ensure positions are within 0-3 range
    const clampedX = Math.min(Math.max(newPositionX, 0), 3);
    const clampedY = Math.min(Math.max(newPositionY, 0), 3);

    console.log(
      `Updating item ${item.id}: (${item.positionX}, ${item.positionY}) -> (${clampedX}, ${clampedY})`,
    );

    try {
      // Check if the new position is already occupied by another item for this user
      const existingItem = await prisma.craftItem.findFirst({
        where: {
          userId: item.userId,
          positionX: clampedX,
          positionY: clampedY,
          id: { not: item.id },
        },
      });

      if (existingItem) {
        // If position is occupied, try to find a free spot
        let foundFreeSpot = false;
        for (let y = 0; y < 4 && !foundFreeSpot; y++) {
          for (let x = 0; x < 4 && !foundFreeSpot; x++) {
            const spotTaken = await prisma.craftItem.findFirst({
              where: {
                userId: item.userId,
                positionX: x,
                positionY: y,
              },
            });

            if (!spotTaken) {
              console.log(
                `  Position conflict! Moving to free spot (${x}, ${y})`,
              );
              await prisma.craftItem.update({
                where: { id: item.id },
                data: {
                  positionX: x,
                  positionY: y,
                },
              });
              foundFreeSpot = true;
            }
          }
        }

        if (!foundFreeSpot) {
          console.warn(
            `  Warning: Could not find free spot for item ${item.id}. Deleting item.`,
          );
          await prisma.craftItem.delete({
            where: { id: item.id },
          });
        }
      } else {
        // Update to new position
        await prisma.craftItem.update({
          where: { id: item.id },
          data: {
            positionX: clampedX,
            positionY: clampedY,
          },
        });
      }
    } catch (error) {
      console.error(`Error updating item ${item.id}:`, error);
      throw error;
    }
  });

  await Promise.all(updates);

  console.log('✅ Migration completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
