import { UserResponse } from '../../../users/dto/response/user.response.js';
import { AuthTokensResponse } from './auth-tokens.response.js';

export interface LoginResponse extends AuthTokensResponse {
  user: UserResponse;
}
