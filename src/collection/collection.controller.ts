import { Body, Controller, Get, Logger, Post, UseGuards } from '@nestjs/common';
import { CollectionService } from './collection.service';
import { User } from 'src/shared/decorator/user.decorator';
import {
  ApiBearerAuth,
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
} from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { CraftCardDto } from './dto/craft-card.dto';
import { VerticalPrizeDto } from './dto/vertical-prize.dto';
import { HorizontalPrizeDto } from './dto/horizontal-prize.dto';

@Controller('collection')
@ApiTags('Collection')
@ApiBearerAuth('JWT')
@UseGuards(AuthGuard('jwt'))
export class CollectionController {
  constructor(private collectionService: CollectionService) {}

  @Get('')
  @ApiOperation({
    summary: 'Get user collection',
    description:
      "Retrieves the authenticated user's complete collection of gifts with their levels and quantities.",
  })
  @ApiResponse({
    status: 200,
    description: 'Collection retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        collection: {
          type: 'array',
          description: 'Array of items in the user collection',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string', description: 'Item ID' },
              level: {
                type: 'string',
                enum: [
                  'L0',
                  'L1',
                  'L2',
                  'L3',
                  'L4',
                  'L5',
                  'L6',
                  'L7',
                  'L8',
                  'L9',
                  'L10',
                ],
                description: 'Item level',
              },
              quantity: {
                type: 'number',
                description: 'Number of items at this level',
              },
              isTradeable: {
                type: 'boolean',
                description: 'Whether the item is tradeable',
              },
              gift: {
                type: 'object',
                properties: {
                  id: { type: 'string', description: 'Gift ID' },
                  name: { type: 'string', description: 'Gift name' },
                  rarity: {
                    type: 'string',
                    enum: ['COMMON', 'RARE', 'EPIC', 'LEGENDARY', 'MYTHIC'],
                    description: 'Gift rarity',
                  },
                  url: { type: 'string', description: 'Gift image URL' },
                },
              },
            },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error',
  })
  async getCollection(@User('id') userId: string) {
    return this.collectionService.getCollection(userId);
  }

  @Get('check')
  @ApiOperation({
    summary: 'Check collection completion status',
    description:
      'Checks the completion status of collections both vertically (all gifts at a specific level) and horizontally (all levels of a specific gift). Returns information about which collections are complete and their associated rewards.',
  })
  @ApiResponse({
    status: 200,
    description: 'Collection completion status retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        isComplete: {
          type: 'boolean',
          description: 'Whether the entire collection is complete',
        },
        vertical: {
          type: 'array',
          description: 'Vertical collection status (all gifts at each level)',
          items: {
            type: 'object',
            properties: {
              isComplete: {
                type: 'boolean',
                description: 'Whether this level is complete',
              },
              level: {
                type: 'string',
                enum: [
                  'L0',
                  'L1',
                  'L2',
                  'L3',
                  'L4',
                  'L5',
                  'L6',
                  'L7',
                  'L8',
                  'L9',
                  'L10',
                ],
                description: 'The level',
              },
              price: {
                type: 'number',
                description: 'Reward price for completing this level',
              },
            },
          },
        },
        horizontal: {
          type: 'array',
          description: 'Horizontal collection status (all levels of each gift)',
          items: {
            type: 'object',
            properties: {
              isComplete: {
                type: 'boolean',
                description: 'Whether this gift collection is complete',
              },
              name: { type: 'string', description: 'Gift name' },
              rarity: {
                type: 'string',
                enum: ['COMMON', 'RARE', 'EPIC', 'LEGENDARY', 'MYTHIC'],
                description: 'Gift rarity',
              },
              price: {
                type: 'number',
                description: 'Reward price for completing this gift',
              },
            },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error',
  })
  async checkCollection(@User('id') userId: string) {
    return this.collectionService.checkCollection(userId);
  }

  @Post('craft')
  @ApiOperation({
    summary: 'Craft two cards into a higher level card',
    description:
      'Combines two identical cards (same gift and level) to create one card of the next level. Rules: L0 is only available for Common/Rare/Epic rarities. If either card is non-tradeable, the result will be non-tradeable. Can use the same item ID twice if quantity ≥ 2.',
  })
  @ApiBody({ type: CraftCardDto })
  @ApiResponse({
    status: 201,
    description: 'Cards crafted successfully',
    schema: {
      type: 'object',
      properties: {
        success: {
          type: 'boolean',
          description: 'Whether the craft was successful',
        },
        message: {
          type: 'string',
          description: 'Success message',
          example: 'Card crafted successfully',
        },
        resultLevel: {
          type: 'string',
          enum: ['L1', 'L2', 'L3', 'L4', 'L5', 'L6', 'L7', 'L8', 'L9', 'L10'],
          description: 'The level of the resulting crafted card',
        },
        isTradeable: {
          type: 'boolean',
          description: 'Whether the resulting card is tradeable',
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description:
      'Bad Request - Items not of same type/level, insufficient quantity, invalid craft (e.g., L0 for Legendary), or cannot craft beyond L10',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({
    status: 404,
    description: 'Not Found - One or both items not found',
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error',
  })
  async craftCard(@User('id') userId: string, @Body() data: CraftCardDto) {
    return this.collectionService.craftCard(userId, data);
  }

  @Post('vertical-prize')
  @ApiOperation({
    summary: 'Claim vertical collection prize',
    description:
      'Claim a reward for completing a vertical collection (collecting all gifts at a specific level). The user must have all gifts at the specified level to claim the prize. The reward amount is added to the user\'s balance and all items at this level will be deleted.',
  })
  @ApiBody({ type: VerticalPrizeDto })
  @ApiResponse({
    status: 201,
    description: 'Prize claimed successfully',
    schema: {
      type: 'object',
      properties: {
        success: {
          type: 'boolean',
          description: 'Whether the prize was claimed successfully',
          example: true,
        },
        message: {
          type: 'string',
          description: 'Success message',
          example: 'Vertical prize claimed for level L5',
        },
        prizeAmount: {
          type: 'number',
          description: 'The amount of the prize awarded',
          example: 1000,
        },
        newBalance: {
          type: 'number',
          description: 'The user\'s new balance after claiming the prize',
          example: 5000,
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description:
      'Bad Request - Collection is not complete or invalid level',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error',
  })
  async verticalPrize(
    @User('id') userId: string,
    @Body() data: VerticalPrizeDto,
  ) {
    return this.collectionService.getVerticalPrize(userId, data.level);
  }

  @Post('horizontal-prize')
  @ApiOperation({
    summary: 'Claim horizontal collection prize',
    description:
      'Claim a reward for completing a horizontal collection (collecting all levels of a specific gift, excluding L0). The user must have all levels (L1-L10 based on available vertical prices) of the specified gift to claim the prize. The reward amount is added to the user\'s balance and all levels of this gift (excluding L0) will be deleted.',
  })
  @ApiBody({ type: HorizontalPrizeDto })
  @ApiResponse({
    status: 201,
    description: 'Prize claimed successfully',
    schema: {
      type: 'object',
      properties: {
        success: {
          type: 'boolean',
          description: 'Whether the prize was claimed successfully',
          example: true,
        },
        message: {
          type: 'string',
          description: 'Success message',
          example: 'Horizontal prize claimed for Dragon (LEGENDARY)',
        },
        prizeAmount: {
          type: 'number',
          description: 'The amount of the prize awarded',
          example: 5000,
        },
        newBalance: {
          type: 'number',
          description: 'The user\'s new balance after claiming the prize',
          example: 10000,
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description:
      'Bad Request - Collection is not complete or invalid gift name/rarity',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error',
  })
  async horizontalPrize(
    @User('id') userId: string,
    @Body() data: HorizontalPrizeDto,
  ) {
    return this.collectionService.getHorizontalPrize(
      userId,
      data.name,
      data.rarity,
    );
  }
}
