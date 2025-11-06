import { IsInt, Min } from 'class-validator';

export class UpdateGiveawayStepsDto {
  @IsInt()
  @Min(1)
  steps: number;
}
