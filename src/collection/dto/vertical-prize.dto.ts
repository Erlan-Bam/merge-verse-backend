import { IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Level } from '@prisma/client';

export class VerticalPrizeDto {
  @ApiProperty({
    description: 'The level for which to claim the vertical prize (all gifts at this level must be collected)',
    example: 'L1',
    enum: ['L0', 'L1', 'L2', 'L3', 'L4', 'L5', 'L6', 'L7', 'L8', 'L9', 'L10'],
  })
  @IsEnum(Level)
  level: Level;
}
