import { Body, Controller, Get, Patch, Query, UseGuards } from '@nestjs/common';
import { AdminGuard } from 'src/shared/guards/admin.guard';
import { GiveawayService } from 'src/giveaway/giveaway.service';
import { AdminService } from './admin.service';
import { UpdateReferralSettingsDto } from './dto/update-referral-settings.dto';

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
}
