import { Body, Controller, Post } from '@nestjs/common';
import { AuctionService } from './auction.service';
import { CreateAuctionDto } from './dto/create-auction.dto';
import { User } from 'src/shared/decorator/user.decorator';
import { PlaceBidDto } from './dto/place-bid.dto';

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

  @Post('bid')
  async placeBid(@User('id') userId: string, @Body() data: PlaceBidDto) {
    return this.auctionService.placeBid(userId, data);
  }
}
