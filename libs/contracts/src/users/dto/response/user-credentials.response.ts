import { UserResponse } from './user.response.js';

export interface UserCredentialsResponse extends UserResponse {
  password: string;
}
