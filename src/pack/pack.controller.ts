import { Controller, Get, UseGuards } from '@nestjs/common';
import { PackService } from './pack.service';
import { User } from 'src/shared/decorator/user.decorator';
import { Api } from 'grammy';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';

@Controller('pack')
@ApiTags('Pack')
@ApiBearerAuth('JWT')
@UseGuards(AuthGuard('jwt'))
export class PackController {
  constructor(private packService: PackService) {}

  @Get('free')
  async getFreePack(@User('id') userId: string) {
    return await this.packService.getFreePack(userId);
  }
}
