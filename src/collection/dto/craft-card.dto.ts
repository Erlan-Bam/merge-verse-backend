import { IsUUID } from 'class-validator';

export class CraftCardDto {
  @IsUUID()
  item1Id: string;
  @IsUUID()
  item2Id: string;
}
