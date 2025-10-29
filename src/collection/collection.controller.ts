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
          description:
            'Horizontal collection status (all levels of each gift)',
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
          enum: [
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
}
