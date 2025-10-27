import { HttpException, Injectable, Logger } from '@nestjs/common';
import { GiftService } from 'src/gift/gift.service';

@Injectable()
export class CollectionService {
  private readonly logger = new Logger(CollectionService.name);
  constructor(private giftService: GiftService) {}
  async getCollection(userId: string) {
    try {
      const collection = await this.giftService.getUserGifts(userId);

      return { collection: collection };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error('Failed to get collection: ', error);
      throw error;
    }
  }
}
