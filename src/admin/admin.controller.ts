import { Body, Controller, Get, Patch, Query, UseGuards, Param } from '@nestjs/common';
import { AdminGuard } from 'src/shared/guards/admin.guard';
import { GiveawayService } from 'src/giveaway/giveaway.service';
import { AdminService } from './admin.service';
import { UpdateReferralSettingsDto } from './dto/update-referral-settings.dto';
import { UpdateGiveawayDto } from './dto/update-giveaway.dto';
import { ToggleGiveawayDto } from './dto/toggle-giveaway.dto';

@Controller('admin')
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
}
