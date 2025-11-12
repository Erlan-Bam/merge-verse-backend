import { IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RemoveFromCraftTableDto {
  @ApiProperty({
    description: 'UUID of the craft item to remove from the craft table',
    example: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    type: String,
  })
  @IsUUID()
  craftItemId: string;
}
