import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ArchiveUserItemsDto {
  @ApiProperty({
    description: 'User ID whose items should be archived',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsString()
  @IsNotEmpty()
  userId: string;
}
