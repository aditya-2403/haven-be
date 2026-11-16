import { Role } from '../enums/role.enum';

export interface CurrentUserPayload {
  userId: string;
  email: string;
  role: Role;
  organizationId?: string;
  employeeId?: string;
}

