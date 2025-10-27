import { ApiProperty } from '@nestjs/swagger';
import { IsIn } from 'class-validator';
import { PackType } from '../types/pack.types';

export class BuyPackDto {
  @ApiProperty({
    description: 'Type of pack to purchase',
    enum: ['COMMON_PACK', 'RARE_PACK', 'EPIC_PACK', 'LEGENDARY_PACK'],
    example: 'COMMON_PACK',
  })
  @IsIn(['COMMON_PACK', 'RARE_PACK', 'EPIC_PACK', 'LEGENDARY_PACK'])
  type: Omit<PackType, 'FREE_DAILY' | 'FREE_STREAK'>;
}
