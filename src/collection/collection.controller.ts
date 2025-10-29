import { Body, Controller, Get, Logger, Post, UseGuards } from '@nestjs/common';
import { CollectionService } from './collection.service';
import { User } from 'src/shared/decorator/user.decorator';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { CraftCardDto } from './dto/craft-card.dto';

@Controller('collection')
@ApiTags('Collection')
@ApiBearerAuth('JWT')
@UseGuards(AuthGuard('jwt'))
export class CollectionController {
  constructor(private collectionService: CollectionService) {}

  @Get('')
  async getCollection(@User('id') userId: string) {
    return this.collectionService.getCollection(userId);
  }

  @Get('check')
  async checkCollection(@User('id') userId: string) {
    return this.collectionService.checkCollection(userId);
  }

  @Post('craft')
  async craftCard(@User('id') userId: string, @Body() data: CraftCardDto) {
    return this.collectionService.craftCard(userId, data);
  }
}
