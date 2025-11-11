import { IsUUID, IsInt, Min, Max } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class MoveToCraftTableDto {
  @ApiProperty({
    description: 'UUID of the item in inventory to move to the craft table',
    example: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    type: String,
  })
  @IsUUID()
  itemId: string;

  @ApiProperty({
    description: 'X position on the craft table (0-3 for 4x4 grid)',
    example: 2,
    type: Number,
    minimum: 0,
    maximum: 3,
  })
  @IsInt()
  @Min(0)
  @Max(3)
  positionX: number;

  @ApiProperty({
    description: 'Y position on the craft table (0-3 for 4x4 grid)',
    example: 3,
    type: Number,
    minimum: 0,
    maximum: 3,
  })
  @IsInt()
  @Min(0)
  @Max(3)
  positionY: number;
}
