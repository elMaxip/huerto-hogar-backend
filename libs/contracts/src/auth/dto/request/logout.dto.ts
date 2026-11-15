import { IsInt, IsPositive } from 'class-validator';

export class LogoutDto {
  @IsInt()
  @IsPositive()
  userId: number;
}
