import {
  Body,
  Controller,
  Get,
  Patch,
  Query,
  UseGuards,
  Param,
  Post,
  Delete,
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
import { ArchiveUserItemsDto } from './dto/archive-items.dto';
import { ToggleUserBanDto } from './dto/toggle-user-ban.dto';
import { DeleteUserDto } from './dto/delete-user.dto';

@Controller('admin')
@ApiTags('Admin')
@UseGuards(AdminGuard)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('giveaway/winners')
  @ApiOperation({
    summary: 'Get giveaway winners choices',
    description:
      'Retrieves the configuration for how giveaway winners are selected and displayed.',
  })
  @ApiResponse({
    status: 200,
    description: 'Winners choices retrieved successfully',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Admin access required',
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error',
  })
  async getWinnersChoices() {
    return this.adminService.getWinnersChoices();
  }

  @Get('referral-settings')
  @ApiOperation({
    summary: 'Get referral system settings',
    description:
      'Retrieves current referral system configuration including rewards, bonuses, and requirements.',
  })
  @ApiResponse({
    status: 200,
    description: 'Referral settings retrieved successfully',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Admin access required',
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error',
  })
  async getReferralSettings() {
    return this.adminService.getReferralSettings();
  }

  @Patch('referral-settings')
  @ApiOperation({
    summary: 'Update referral system settings',
    description:
      'Updates the referral system configuration including reward amounts, bonus thresholds, and referral requirements.',
  })
  @ApiBody({ type: UpdateReferralSettingsDto })
  @ApiResponse({
    status: 200,
    description: 'Referral settings updated successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request - Invalid settings data',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Admin access required',
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error',
  })
  async updateReferralSettings(@Body() data: UpdateReferralSettingsDto) {
    return this.adminService.updateReferralSettings(data);
  }

  @Get('giveaways')
  @ApiOperation({
    summary: 'Get all giveaways (Admin)',
    description:
      'Retrieves all giveaways with full details including internal statistics. Admin-only endpoint with complete visibility.',
  })
  @ApiResponse({
    status: 200,
    description: 'All giveaways retrieved successfully',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Admin access required',
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error',
  })
  async getAllGiveaways() {
    return this.adminService.getAllGiveaways();
  }

  @Patch('giveaway/:id')
  @ApiOperation({
    summary: 'Update giveaway',
    description:
      'Updates giveaway details such as title, description, dates, prize information, and entry requirements.',
  })
  @ApiBody({ type: UpdateGiveawayDto })
  @ApiResponse({
    status: 200,
    description: 'Giveaway updated successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request - Invalid giveaway data',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Admin access required',
  })
  @ApiResponse({
    status: 404,
    description: 'Giveaway not found',
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error',
  })
  async updateGiveaway(
    @Param('id') id: string,
    @Body() data: UpdateGiveawayDto,
  ) {
    return this.adminService.updateGiveaway(id, data);
  }

  @Patch('giveaway/:id/toggle')
  @ApiOperation({
    summary: 'Toggle giveaway active status',
    description:
      'Activates or deactivates a giveaway. Inactive giveaways are not visible to users and cannot accept new entries.',
  })
  @ApiBody({ type: ToggleGiveawayDto })
  @ApiResponse({
    status: 200,
    description: 'Giveaway status toggled successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request - Invalid status',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Admin access required',
  })
  @ApiResponse({
    status: 404,
    description: 'Giveaway not found',
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error',
  })
  async toggleGiveaway(
    @Param('id') id: string,
    @Body() data: ToggleGiveawayDto,
  ) {
    return this.adminService.toggleGiveaway(id, data);
  }

  @Get('giveaway-steps')
  @ApiOperation({
    summary: 'Get giveaway steps configuration',
    description:
      'Retrieves the available steps/tasks that users can complete to earn giveaway entries (e.g., follow social media, share, invite friends).',
  })
  @ApiResponse({
    status: 200,
    description: 'Giveaway steps retrieved successfully',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Admin access required',
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error',
  })
  async getGiveawaySteps() {
    return this.adminService.getGiveawaySteps();
  }

  @Patch('giveaway-steps')
  @ApiOperation({
    summary: 'Update giveaway steps configuration',
    description:
      'Updates the available steps/tasks and their entry values that users can complete to earn giveaway entries.',
  })
  @ApiBody({ type: UpdateGiveawayStepsDto })
  @ApiResponse({
    status: 200,
    description: 'Giveaway steps updated successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request - Invalid steps configuration',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Admin access required',
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error',
  })
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

  @Post('archive-items/user')
  @ApiOperation({
    summary: 'Archive items for a specific user',
    description:
      'Archives all items for a specific user by copying them to the History table and then deleting them from the Item table. This is useful for monthly resets or user-specific cleanups.',
  })
  @ApiBody({ type: ArchiveUserItemsDto })
  @ApiResponse({
    status: 200,
    description: 'User items archived successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        userId: {
          type: 'string',
          example: '550e8400-e29b-41d4-a716-446655440000',
        },
        telegramId: { type: 'string', example: '123456789' },
        archivedCount: { type: 'number', example: 42 },
        deletedCount: { type: 'number', example: 42 },
        message: {
          type: 'string',
          example: 'Successfully archived 42 items for user 123456789',
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Admin access required',
  })
  @ApiResponse({
    status: 404,
    description: 'User not found',
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error',
  })
  async archiveUserItems(@Body() data: ArchiveUserItemsDto) {
    return this.adminService.archiveUserItems(data.userId);
  }

  @Post('archive-items/all')
  @ApiOperation({
    summary: 'Archive items for all users',
    description:
      'Archives all items for all users by copying them to the History table and then deleting them from the Item table. This is typically used for monthly resets. Use with caution as this affects all users.',
  })
  @ApiResponse({
    status: 200,
    description: 'All items archived successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        archivedCount: { type: 'number', example: 1234 },
        deletedCount: { type: 'number', example: 1234 },
        message: {
          type: 'string',
          example: 'Successfully archived all items from 1234 users',
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
  async archiveAllUsersItems() {
    return this.adminService.archiveAllUsersItems();
  }

  @Patch('user/ban')
  @ApiOperation({
    summary: 'Ban or unban a user',
    description:
      'Toggle the ban status of a user. Banned users will not be able to access the system. Admin users cannot be banned.',
  })
  @ApiBody({ type: ToggleUserBanDto })
  @ApiResponse({
    status: 200,
    description: 'User ban status updated successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        user: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              example: '550e8400-e29b-41d4-a716-446655440000',
            },
            telegramId: { type: 'string', example: '123456789' },
            isBanned: { type: 'boolean', example: true },
            role: { type: 'string', example: 'USER' },
          },
        },
        message: {
          type: 'string',
          example: 'User 123456789 banned successfully',
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Cannot ban admin users',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Admin access required',
  })
  @ApiResponse({
    status: 404,
    description: 'User not found',
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error',
  })
  async toggleUserBan(@Body() data: ToggleUserBanDto) {
    return this.adminService.toggleUserBan(data.userId, data.isBanned);
  }

  @Delete('user')
  @ApiOperation({
    summary: 'Delete a user',
    description:
      'Permanently delete a user and all their related data (items, auctions, bids, payments, etc.). Admin users cannot be deleted. Use with caution as this action is irreversible.',
  })
  @ApiBody({ type: DeleteUserDto })
  @ApiResponse({
    status: 200,
    description: 'User deleted successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        deletedUserId: {
          type: 'string',
          example: '550e8400-e29b-41d4-a716-446655440000',
        },
        telegramId: { type: 'string', example: '123456789' },
        message: {
          type: 'string',
          example: 'User 123456789 deleted successfully',
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Cannot delete admin users',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Admin access required',
  })
  @ApiResponse({
    status: 404,
    description: 'User not found',
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error',
  })
  async deleteUser(@Body() data: DeleteUserDto) {
    return this.adminService.deleteUser(data.userId);
  }
}
