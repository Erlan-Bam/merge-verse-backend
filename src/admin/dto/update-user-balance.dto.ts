import { IsString, IsNotEmpty, IsNumber, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateUserBalanceDto {
  @ApiProperty({
    description: 'The ID of the user whose balance will be updated',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsString()
  @IsNotEmpty()
  userId: string;

  @ApiProperty({
    description: 'The new balance amount for the user',
    example: 1000.5,
    minimum: 0,
  })
  @IsNumber()
  @Min(0)
  balance: number;
}
