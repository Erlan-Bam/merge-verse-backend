import { Controller, Get } from '@nestjs/common';
import { PackService } from './pack.service';
import { User } from 'src/shared/decorator/user.decorator';

@Controller('pack')
export class PackController {
  constructor(private packService: PackService) {}

  @Get('free')
  async getFreePack(@User('id') userId: string) {
    return await this.packService.getFreePack(userId);
  }
}
