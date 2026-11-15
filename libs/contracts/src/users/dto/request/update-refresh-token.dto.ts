import { IsInt, IsOptional, IsPositive, IsString } from 'class-validator';

export class UpdateRefreshTokenDto {
  @IsInt()
  @IsPositive()
  id: number;

  @IsOptional()
  @IsString()
  refreshTokenHash: string | null;
}
