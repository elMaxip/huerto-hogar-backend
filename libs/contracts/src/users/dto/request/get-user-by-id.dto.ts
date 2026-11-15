import { IsInt, IsPositive } from 'class-validator';

export class GetUserByIdDto {
  @IsInt()
  @IsPositive()
  id: number;
}
