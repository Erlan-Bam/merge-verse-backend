import { IsEnum, IsNotEmpty, IsNumber, IsPositive } from 'class-validator';
import { ReferralSettingsName, ValueType } from '@prisma/client';

export class UpdateReferralSettingsDto {
  @IsEnum(ReferralSettingsName)
  @IsNotEmpty()
  name: ReferralSettingsName;

  @IsEnum(ValueType)
  @IsNotEmpty()
  type: ValueType;

  @IsNumber()
  @IsPositive()
  value: number;
}
