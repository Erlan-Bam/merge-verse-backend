import { IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CraftCardDto {
  @ApiProperty({
    description:
      'UUID of the first item to craft. Can be the same as item2Id if the item has quantity ≥ 2.',
    example: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    type: String,
  })
  @IsUUID()
  item1Id: string;

  @ApiProperty({
    description:
      'UUID of the second item to craft. Can be the same as item1Id if the item has quantity ≥ 2.',
    example: 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a22',
    type: String,
  })
  @IsUUID()
  item2Id: string;
}
