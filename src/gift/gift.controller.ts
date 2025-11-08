import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { GiftService } from './gift.service';
import { User } from 'src/shared/decorator/user.decorator';

@Controller('gift')
@ApiTags('Gift')
export class GiftController {
  constructor(private giftService: GiftService) {}
}
