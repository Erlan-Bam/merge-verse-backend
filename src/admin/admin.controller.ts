import {
  Body,
  Controller,
  Get,
  Patch,
  Query,
  UseGuards,
  Param,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { AdminGuard } from 'src/shared/guards/admin.guard';
import { GiveawayService } from 'src/giveaway/giveaway.service';
import { AdminService } from './admin.service';
import { UpdateReferralSettingsDto } from './dto/update-referral-settings.dto';
import { UpdateGiveawayDto } from './dto/update-giveaway.dto';
import { ToggleGiveawayDto } from './dto/toggle-giveaway.dto';
import { UpdateGiveawayStepsDto } from './dto/update-giveaway-steps.dto';
import { ToggleCollectionVisibleDto } from './dto/toggle-collection-visible.dto';

@Controller('admin')
@ApiTags('Admin')
@UseGuards(AdminGuard)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('giveaway/winners')
  async getWinnersChoices() {
    return this.adminService.getWinnersChoices();
  }

  @Get('referral-settings')
  async getReferralSettings() {
    return this.adminService.getReferralSettings();
  }

  @Patch('referral-settings')
  async updateReferralSettings(@Body() data: UpdateReferralSettingsDto) {
    return this.adminService.updateReferralSettings(data);
  }

  @Get('giveaways')
  async getAllGiveaways() {
    return this.adminService.getAllGiveaways();
  }

  @Patch('giveaway/:id')
  async updateGiveaway(
    @Param('id') id: string,
    @Body() data: UpdateGiveawayDto,
  ) {
    return this.adminService.updateGiveaway(id, data);
  }

  @Patch('giveaway/:id/toggle')
  async toggleGiveaway(
    @Param('id') id: string,
    @Body() data: ToggleGiveawayDto,
  ) {
    return this.adminService.toggleGiveaway(id, data);
  }

  @Get('giveaway-steps')
  async getGiveawaySteps() {
    return this.adminService.getGiveawaySteps();
  }

  @Patch('giveaway-steps')
  async updateGiveawaySteps(@Body() data: UpdateGiveawayStepsDto) {
    return this.adminService.updateGiveawaySteps(data);
  }

  @Get('collection-visible')
  @ApiOperation({
    summary: 'Get collection visibility status',
    description:
      'Retrieves the current visibility status of the collection feature.',
  })
  @ApiResponse({
    status: 200,
    description: 'Collection visibility status retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        isVisible: {
          type: 'boolean',
          description: 'Whether the collection is currently visible to users',
          example: true,
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Admin access required',
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error',
  })
  async getCollectionVisible() {
    return this.adminService.getCollectionVisible();
  }

  @Patch('collection-visible')
  @ApiOperation({
    summary: 'Toggle collection visibility',
    description:
      'Set whether the collection feature is visible/accessible to users. When set to false, users will receive a 403 error when attempting to access collection endpoints.',
  })
  @ApiBody({ type: ToggleCollectionVisibleDto })
  @ApiResponse({
    status: 200,
    description: 'Collection visibility updated successfully',
    schema: {
      type: 'object',
      properties: {
        isVisible: {
          type: 'boolean',
          description: 'The new visibility status',
          example: false,
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Admin access required',
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error',
  })
  async toggleCollectionVisible(@Body() data: ToggleCollectionVisibleDto) {
    return this.adminService.toggleCollectionVisible(data.isVisible);
  }
}
