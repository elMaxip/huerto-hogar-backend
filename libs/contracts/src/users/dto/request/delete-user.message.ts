import { IsInt, IsPositive } from 'class-validator';

export class DeleteUserMessage {
  @IsInt()
  @IsPositive()
  id: number;

  @IsInt()
  @IsPositive()
  actorId: number;
}
