import { IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ToggleCollectionVisibleDto {
  @ApiProperty({
    description: 'Whether the collection should be visible to users',
    example: true,
    type: Boolean,
  })
  @IsBoolean()
  isVisible: boolean;
}
