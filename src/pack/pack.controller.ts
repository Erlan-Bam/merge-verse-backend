import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { PackService } from './pack.service';
import { User } from 'src/shared/decorator/user.decorator';
import { Api } from 'grammy';
import { ApiBearerAuth, ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { BuyPackDto } from './dto/buy-pack.dto';

@Controller('pack')
@ApiTags('Pack')
@ApiBearerAuth('JWT')
@UseGuards(AuthGuard('jwt'))
export class PackController {
  constructor(private packService: PackService) {}

  @Get('free')
  @ApiOperation({
    summary: 'Get free daily pack',
    description: 'Claims a free daily pack for the authenticated user. Users get a daily pack, and every 7th day (streak) they receive a special streak pack. Can only be claimed once per day.',
  })
  @ApiResponse({
    status: 200,
    description: 'Free pack successfully claimed',
    schema: {
      type: 'object',
      properties: {
        pack: {
          type: 'array',
          description: 'Array of gifts received in the pack',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string', description: 'Gift ID' },
              name: { type: 'string', description: 'Gift name' },
              rarity: { type: 'string', enum: ['COMMON', 'RARE', 'EPIC', 'LEGENDARY', 'MYTHIC'], description: 'Gift rarity' },
              url: { type: 'string', description: 'Gift image URL' },
              createdAt: { type: 'string', format: 'date-time' },
              updatedAt: { type: 'string', format: 'date-time' },
            },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Daily pack already claimed today',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error',
  })
  async getFreePack(@User('id') userId: string) {
    return await this.packService.getFreePack(userId);
  }

  @Get('paid')
  @ApiOperation({
    summary: 'Get available paid packs',
    description: 'Retrieves a list of all purchasable packs with their prices, configurations, and composition details.',
  })
  @ApiResponse({
    status: 200,
    description: 'List of paid packs retrieved successfully',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          type: { type: 'string', enum: ['COMMON_PACK', 'RARE_PACK', 'EPIC_PACK', 'LEGENDARY_PACK'], description: 'Pack type' },
          price: { type: 'number', description: 'Pack price in game currency' },
          level: { type: 'string', enum: ['L0', 'L1', 'L2', 'L3', 'L4', 'L5', 'L6', 'L7', 'L8', 'L9', 'L10'], description: 'Item level' },
          total: { type: 'number', description: 'Total number of items in pack' },
          tradeable: { type: 'boolean', description: 'Whether items are tradeable' },
          composition: {
            type: 'object',
            description: 'Pack composition by rarity',
            additionalProperties: { type: 'number' },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  async getPaidPacks() {
    return await this.packService.getPaidPacks();
  }

  @Post('buy')
  @ApiOperation({
    summary: 'Buy a pack',
    description: 'Purchase a pack using the user\'s balance. Deducts the pack price from balance and adds the items to the user\'s inventory.',
  })
  @ApiBody({ type: BuyPackDto })
  @ApiResponse({
    status: 201,
    description: 'Pack purchased successfully',
    schema: {
      type: 'object',
      properties: {
        pack: {
          type: 'array',
          description: 'Array of gifts received in the pack',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string', description: 'Gift ID' },
              name: { type: 'string', description: 'Gift name' },
              rarity: { type: 'string', enum: ['COMMON', 'RARE', 'EPIC', 'LEGENDARY', 'MYTHIC'], description: 'Gift rarity' },
              url: { type: 'string', description: 'Gift image URL' },
              createdAt: { type: 'string', format: 'date-time' },
              updatedAt: { type: 'string', format: 'date-time' },
            },
          },
        },
        spent: { type: 'number', description: 'Amount spent on the pack' },
        balance: { type: 'number', description: 'Remaining user balance after purchase' },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Insufficient balance or invalid pack type',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error',
  })
  async buyPack(@User('id') userId: string, @Body() data: BuyPackDto) {
    return await this.packService.buyPack(userId, data);
  }
}
