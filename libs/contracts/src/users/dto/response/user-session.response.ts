import { UserResponse } from './user.response.js';

export interface UserSessionResponse extends UserResponse {
  refreshTokenHash: string | null;
}
