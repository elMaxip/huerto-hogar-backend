import { Type } from 'class-transformer';
import { IsInt, IsPositive, ValidateNested } from 'class-validator';
import { AdminUpdateUserDto } from './admin-update-user.dto.js';

export class UpdateUserMessage {
  @IsInt()
  @IsPositive()
  id: number;

  @IsInt()
  @IsPositive()
  actorId: number;

  @ValidateNested()
  @Type(() => AdminUpdateUserDto)
  data: AdminUpdateUserDto;
}
