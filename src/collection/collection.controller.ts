import { Controller, Get, Logger, UseGuards } from '@nestjs/common';
import { CollectionService } from './collection.service';
import { User } from 'src/shared/decorator/user.decorator';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';

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
  async check(@User('id') userId: string) {
    return this.collectionService.checkCollection(userId);
  }
}
