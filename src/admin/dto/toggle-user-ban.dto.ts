import { IsNotEmpty, IsString, IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ToggleUserBanDto {
  @ApiProperty({
    description: 'User ID to ban or unban',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsString()
  @IsNotEmpty()
  userId: string;

  @ApiProperty({
    description: 'Whether to ban (true) or unban (false) the user',
    example: true,
  })
  @IsBoolean()
  @IsNotEmpty()
  isBanned: boolean;
}
