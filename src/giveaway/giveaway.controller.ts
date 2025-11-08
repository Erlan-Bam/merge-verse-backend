import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiParam,
  ApiQuery,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { GiveawayService } from './giveaway.service';
import { UserGuard } from 'src/shared/guards/user.guard';
import { AdminGuard } from 'src/shared/guards/admin.guard';
import { User } from 'src/shared/decorator/user.decorator';
import { EnterGiveawayDto } from './dto/enter-giveaway.dto';
import { GetGiveawaysDto } from './dto/get-giveaways.dto';
import { CreateGiveawayDto } from './dto/create-giveaway.dto';
import { GetGiveawaysWinnerDto } from './dto/get-giveaways-winner.dto';

@Controller('giveaway')
@ApiTags('Giveaway')
@ApiBearerAuth('JWT')
@UseGuards(UserGuard)
export class GiveawayController {
  constructor(private readonly giveawayService: GiveawayService) {}

  @Get()
  @ApiOperation({
    summary: 'Get giveaways',
    description:
      'Retrieves a paginated list of giveaways. Can filter by status (active, upcoming, ended).',
  })
  @ApiResponse({
    status: 200,
    description: 'Giveaways retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        giveaways: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string', description: 'Giveaway ID' },
              title: { type: 'string', description: 'Giveaway title' },
              description: {
                type: 'string',
                description: 'Giveaway description',
              },
              startAt: { type: 'string', format: 'date-time' },
              endsAt: { type: 'string', format: 'date-time' },
              status: {
                type: 'string',
                enum: ['ACTIVE', 'UPCOMING', 'ENDED'],
              },
              prize: { type: 'object', description: 'Prize details' },
              entriesCount: {
                type: 'number',
                description: 'Total number of entries',
              },
            },
          },
        },
        total: { type: 'number', description: 'Total number of giveaways' },
        page: { type: 'number', description: 'Current page' },
        limit: { type: 'number', description: 'Items per page' },
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
  async getGiveaways(@Query() query: GetGiveawaysDto) {
    return this.giveawayService.getGiveaways(query);
  }

  @Get('entries')
  @ApiOperation({
    summary: 'Get user giveaway entries',
    description:
      "Retrieves all giveaway entries for the authenticated user, showing which giveaways they've entered and their entry counts.",
  })
  @ApiResponse({
    status: 200,
    description: 'User entries retrieved successfully',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          giveawayId: { type: 'string', description: 'Giveaway ID' },
          entries: {
            type: 'number',
            description: 'Number of entries for this giveaway',
          },
          giveaway: {
            type: 'object',
            description: 'Giveaway details',
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
  async getEntries(@User('id') userId: string) {
    return this.giveawayService.getUserEntries(userId);
  }

  @Get('winners')
  @ApiOperation({
    summary: 'Get top winners',
    description:
      'Retrieves a leaderboard of top winners, showing users who have won the most giveaways.',
  })
  @ApiResponse({
    status: 200,
    description: 'Top winners retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        winners: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              userId: { type: 'string', description: 'User ID' },
              username: { type: 'string', description: 'Username' },
              wins: {
                type: 'number',
                description: 'Number of giveaways won',
              },
              totalPrizeValue: {
                type: 'number',
                description: 'Total value of prizes won',
              },
            },
          },
        },
        total: { type: 'number', description: 'Total number of winners' },
        page: { type: 'number', description: 'Current page' },
        limit: { type: 'number', description: 'Items per page' },
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
  async getWinners(@Query() query: GetGiveawaysWinnerDto) {
    return this.giveawayService.getTopWinners(query);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get giveaway by ID',
    description:
      'Retrieves detailed information about a specific giveaway, including prize details, entry requirements, and current status.',
  })
  @ApiParam({
    name: 'id',
    description: 'Giveaway ID',
    type: 'string',
  })
  @ApiResponse({
    status: 200,
    description: 'Giveaway retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'Giveaway ID' },
        title: { type: 'string', description: 'Giveaway title' },
        description: { type: 'string', description: 'Giveaway description' },
        startAt: { type: 'string', format: 'date-time' },
        endsAt: { type: 'string', format: 'date-time' },
        status: {
          type: 'string',
          enum: ['ACTIVE', 'UPCOMING', 'ENDED'],
        },
        prize: { type: 'object', description: 'Prize details' },
        entriesCount: {
          type: 'number',
          description: 'Total number of entries',
        },
        steps: {
          type: 'array',
          description: 'Entry requirements/steps',
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({
    status: 404,
    description: 'Giveaway not found',
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error',
  })
  async getGiveawayById(@Param('id') id: string) {
    return this.giveawayService.getGiveawayById(id);
  }

  @Post('enter')
  @ApiOperation({
    summary: 'Enter a giveaway',
    description:
      'Enter the authenticated user into a giveaway. Users can complete various steps to earn additional entries. Each completed step adds to their entry count.',
  })
  @ApiBody({ type: EnterGiveawayDto })
  @ApiResponse({
    status: 201,
    description: 'Successfully entered giveaway',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        giveawayId: {
          type: 'string',
          description: 'Giveaway ID',
        },
        totalEntries: {
          type: 'number',
          description: 'Total entries for this user in this giveaway',
        },
        message: {
          type: 'string',
          example: 'Successfully entered giveaway',
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description:
      'Bad Request - Giveaway not active, already entered, or step requirements not met',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({
    status: 404,
    description: 'Giveaway not found',
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error',
  })
  async enterGiveaway(
    @User('id') userId: string,
    @Body() data: EnterGiveawayDto,
  ) {
    return this.giveawayService.enterGiveaway(userId, data);
  }

  //   // Admin endpoints
  //   @Post('admin/create')
  //   @UseGuards(AdminGuard)
  //   async createGiveaway(@Body() dto: CreateGiveawayDto) {
  //     return this.giveawayService.createGiveaway(
  //       dto.giftId,
  //       dto.startAt ? new Date(dto.startAt) : undefined,
  //       dto.endsAt ? new Date(dto.endsAt) : undefined,
  //     );
  //   }

  //   @Post('admin/create-monthly')
  //   @UseGuards(AdminGuard)
  //   async createMonthlyGiveaways() {
  //     return this.giveawayService.createMonthlyGiveaways();
  //   }

  //   @Post('admin/finish-monthly')
  //   @UseGuards(AdminGuard)
  //   async finishMonthlyGiveaways() {
  //     return this.giveawayService.finishMonthlyGiveaways();
  //   }

  //   @Delete('admin/:id')
  //   @UseGuards(AdminGuard)
  //   async deleteGiveaway(@Param('id') id: string) {
  //     return this.giveawayService.deleteGiveaway(id);
  //   }
}
