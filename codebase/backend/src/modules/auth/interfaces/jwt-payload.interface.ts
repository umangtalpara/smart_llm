import { UserRole } from '../../../../../shared/types';

export interface JwtPayload {
  sub: string;
  email: string;
  role: UserRole;
}
