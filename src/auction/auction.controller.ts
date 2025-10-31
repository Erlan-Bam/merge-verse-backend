import { Body, Controller, Post } from '@nestjs/common';
import { AuctionService } from './auction.service';
import { CreateAuctionDto } from './dto/create-auction.dto';
import { User } from 'src/shared/decorator/user.decorator';

@Controller('auction')
export class AuctionController {
  constructor(private readonly auctionService: AuctionService) {}

  @Post('')
  async createAuction(
    @User('id') userId: string,
    @Body() data: CreateAuctionDto,
  ) {
    return this.auctionService.createAuction(userId, data);
  }
}
