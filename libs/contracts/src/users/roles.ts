export const ROLES = {
  ADMIN: 'ADMIN',
  CLIENT: 'CLIENT',
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];
