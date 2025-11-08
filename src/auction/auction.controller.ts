import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { AuctionService } from './auction.service';
import { CreateAuctionDto } from './dto/create-auction.dto';
import { User } from 'src/shared/decorator/user.decorator';
import { PlaceBidDto } from './dto/place-bid.dto';

@Controller('auction')
@ApiTags('Auction')
@ApiBearerAuth('JWT')
@UseGuards(AuthGuard('jwt'))
export class AuctionController {
  constructor(private readonly auctionService: AuctionService) {}

  @Post('')
  @ApiOperation({
    summary: 'Create a new auction',
    description:
      'Creates a new auction for an item. The user must own the item to create an auction for it.',
  })
  @ApiBody({ type: CreateAuctionDto })
  @ApiResponse({
    status: 201,
    description: 'Auction created successfully',
    schema: {
      type: 'object',
      properties: {
        id: {
          type: 'string',
          description: 'Auction ID',
          example: '550e8400-e29b-41d4-a716-446655440000',
        },
        itemId: {
          type: 'string',
          description: 'Item being auctioned',
        },
        startingPrice: {
          type: 'number',
          description: 'Starting price for the auction',
        },
        currentPrice: {
          type: 'number',
          description: 'Current highest bid',
        },
        sellerId: {
          type: 'string',
          description: 'ID of the user who created the auction',
        },
        status: {
          type: 'string',
          enum: ['ACTIVE', 'SOLD', 'CANCELLED'],
          description: 'Current status of the auction',
        },
        createdAt: {
          type: 'string',
          format: 'date-time',
        },
        endsAt: {
          type: 'string',
          format: 'date-time',
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request - Invalid item or user does not own the item',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({
    status: 404,
    description: 'Item not found',
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error',
  })
  async createAuction(
    @User('id') userId: string,
    @Body() data: CreateAuctionDto,
  ) {
    return this.auctionService.createAuction(userId, data);
  }

  @Post('bid')
  @ApiOperation({
    summary: 'Place a bid on an auction',
    description:
      "Place a bid on an active auction. The bid amount must be higher than the current highest bid. The user's balance must be sufficient to cover the bid.",
  })
  @ApiBody({ type: PlaceBidDto })
  @ApiResponse({
    status: 201,
    description: 'Bid placed successfully',
    schema: {
      type: 'object',
      properties: {
        id: {
          type: 'string',
          description: 'Bid ID',
          example: '550e8400-e29b-41d4-a716-446655440000',
        },
        auctionId: {
          type: 'string',
          description: 'Auction ID',
        },
        bidderId: {
          type: 'string',
          description: 'ID of the user who placed the bid',
        },
        amount: {
          type: 'number',
          description: 'Bid amount',
        },
        createdAt: {
          type: 'string',
          format: 'date-time',
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description:
      'Bad Request - Bid too low, auction not active, or insufficient balance',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({
    status: 404,
    description: 'Auction not found',
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error',
  })
  async placeBid(@User('id') userId: string, @Body() data: PlaceBidDto) {
    return this.auctionService.placeBid(userId, data);
  }
}
