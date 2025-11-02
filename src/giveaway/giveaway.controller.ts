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
import { GiveawayService } from './giveaway.service';
import { UserGuard } from 'src/shared/guards/user.guard';
import { AdminGuard } from 'src/shared/guards/admin.guard';
import { User } from 'src/shared/decorator/user.decorator';
import { EnterGiveawayDto } from './dto/enter-giveaway.dto';
import { GetGiveawaysDto } from './dto/get-giveaways.dto';
import { CreateGiveawayDto } from './dto/create-giveaway.dto';

@Controller('giveaway')
@UseGuards(UserGuard)
export class GiveawayController {
  constructor(private readonly giveawayService: GiveawayService) {}

  @Get()
  async getGiveaways(@Query() query: GetGiveawaysDto) {
    return this.giveawayService.getGiveaways(query);
  }

  @Get('entries')
  async getEntries(@User('id') userId: string) {
    return this.giveawayService.getUserEntries(userId);
  }

  @Get(':id')
  async getGiveawayById(@Param('id') id: string) {
    return this.giveawayService.getGiveawayById(id);
  }

  @Post('enter')
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
