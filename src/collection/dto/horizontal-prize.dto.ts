import { IsEnum, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Rarity } from '@prisma/client';

export class HorizontalPrizeDto {
  @ApiProperty({
    description:
      'The name of the gift for which to claim the horizontal prize (all levels of this gift must be collected)',
    example: 'Dragon',
    type: String,
  })
  @IsString()
  name: string;

  @ApiProperty({
    description: 'The rarity of the gift',
    example: 'LEGENDARY',
    enum: ['COMMON', 'RARE', 'EPIC', 'LEGENDARY', 'MYTHIC'],
  })
  @IsEnum(Rarity)
  rarity: Rarity;
}
