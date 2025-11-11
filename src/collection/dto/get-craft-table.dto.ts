import { IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class GetCraftTableDto {
  @ApiProperty({
    description: 'UUID of a gift to filter craft table items by',
    example: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    type: String,
  })
  @IsUUID()
  giftId: string;
}
