import { Controller, Get } from '@nestjs/common';
import { GiftService } from './gift.service';
import { User } from 'src/shared/decorator/user.decorator';

@Controller('gift')
export class GiftController {
  constructor(private giftService: GiftService) {}
}
