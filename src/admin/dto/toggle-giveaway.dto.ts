import { IsBoolean } from 'class-validator';

export class ToggleGiveawayDto {
  @IsBoolean()
  active: boolean;
}
