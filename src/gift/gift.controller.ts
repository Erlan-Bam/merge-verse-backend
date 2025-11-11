import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { GiftService } from './gift.service';
import { User } from 'src/shared/decorator/user.decorator';

@Controller('gift')
@ApiTags('Gift')
export class GiftController {
  constructor(private giftService: GiftService) {}

  @Get()
  @ApiOperation({ summary: 'Get all gifts' })
  @ApiResponse({
    status: 200,
    description: 'Returns all available gifts',
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error',
  })
  async getAllGifts() {
    return this.giftService.getAllGifts();
  }
}
