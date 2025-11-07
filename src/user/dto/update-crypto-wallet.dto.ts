import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, MinLength, MaxLength } from 'class-validator';

export class UpdateCryptoWalletDto {
  @ApiProperty({
    description: 'Cryptocurrency wallet address',
    example: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
    minLength: 10,
    maxLength: 200,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(10, { message: 'Wallet address must be at least 10 characters' })
  @MaxLength(200, { message: 'Wallet address must not exceed 200 characters' })
  cryptoWallet: string;
}
