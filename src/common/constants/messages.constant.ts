export const AUTH_MESSAGES = {
  INVALID_CREDENTIALS: 'Invalid credentials',
  ACCOUNT_INACTIVE: 'Account is inactive or suspended',
  ORGANIZATION_SUSPENDED: 'Organization account is suspended',
  REFRESH_TOKEN_REQUIRED: 'Refresh token is required',
  REFRESH_TOKEN_INVALID: 'Invalid or expired refresh token',
  REFRESH_TOKEN_REVOKED: 'Invalid or revoked refresh token',
  USER_INACTIVE: 'User account inactive',
  USER_NOT_FOUND: 'User not found',
  LOGGED_OUT_SUCCESS: 'Logged out successfully',
  USER_CONTEXT_NOT_FOUND: 'User context not found',
  INSUFFICIENT_PERMISSIONS: (role: string) => `Insufficient permissions for role: ${role}`,
  PROFILE_UPDATE_SUCCESS: 'Profile updated successfully',
  PASSWORD_CHANGE_SUCCESS: 'Password changed successfully',
  CURRENT_PASSWORD_INCORRECT: 'Current password is incorrect',
  NEW_PASSWORD_SAME: 'New password cannot be the same as your current password',
  PASSWORD_MIN_LENGTH: 'New password must be at least 6 characters',
} as const;

export const ORGANIZATION_MESSAGES = {
  CONTEXT_REQUIRED: 'Organization context required',
  NOT_FOUND: 'Organization not found',
  ALREADY_EXISTS: (slug: string) => `Organization with slug "${slug}" already exists`,
  CREATED_SUCCESS: 'Organization registered successfully',
  UPDATED_SUCCESS: 'Organization updated successfully',
  STATUS_UPDATED_SUCCESS: 'Organization status updated',
} as const;

export const VISITOR_MESSAGES = {
  NOT_FOUND: 'Visitor not found',
  REGISTER_SUCCESS: 'Visitor registered successfully',
  UPDATE_SUCCESS: 'Visitor updated successfully',
} as const;

export const VISIT_MESSAGES = {
  NOT_FOUND: 'Visit not found',
  REQUEST_NOT_FOUND: 'Visit request not found',
  CREATE_SUCCESS: 'Visit created successfully',
  UPDATE_SUCCESS: 'Visit updated successfully',
  CANCEL_SUCCESS: 'Visit cancelled successfully',
  CANNOT_EDIT_CHECKED_IN: 'Cannot edit a visit that is checked in or completed',
  CANNOT_CANCEL_CHECKED_IN: 'Cannot cancel a visit that is checked in or checked out',
  PASS_UNAVAILABLE: (status: string) => `Pass is unavailable for visit with status: ${status}`,
  HOST_EMPLOYEE_NOT_FOUND: 'Host employee not found',
  VISITOR_PROFILE_NOT_FOUND: 'Visitor profile not found',
} as const;

export const APPROVAL_MESSAGES = {
  CANNOT_APPROVE_STATUS: (status: string) => `Cannot approve visit with status: ${status}`,
  CANNOT_REJECT_STATUS: (status: string) => `Cannot reject visit with status: ${status}`,
  HOST_ONLY_APPROVE: 'You can only approve visits for which you are the designated host',
  HOST_ONLY_REJECT: 'You can only reject visits for which you are the designated host',
  APPROVED_SUCCESS: 'Visit approved successfully. QR pass generated.',
  REJECTED_SUCCESS: 'Visit rejected',
} as const;

export const CHECK_IN_MESSAGES = {
  PASS_VERIFIED_SUCCESS: 'Pass verified successfully',
  CHECK_IN_SUCCESS: 'Visitor checked in successfully',
  CHECK_OUT_SUCCESS: 'Visitor checked out successfully',
  PASS_CODE_NOT_FOUND: 'Pass code not recognized or invalid',
  QR_TOKEN_NOT_FOUND: 'QR token not recognized or pass expired',
  CANNOT_CHECK_IN_STATUS: (status: string) => `Cannot check in visit with status: ${status}. Visit must be APPROVED or SCHEDULED.`,
  ALREADY_CHECKED_OUT: 'Visit has already been checked out',
  NOT_CHECKED_IN: 'Visit is not currently checked in or already completed',
  CONCURRENT_CHECK_IN: 'Concurrent check-in detected or visit status changed',
} as const;

export const EMPLOYEE_MESSAGES = {
  NOT_FOUND: 'Employee not found',
  ALREADY_EXISTS: 'An employee with this Employee ID or Email already exists',
  CREATE_SUCCESS: 'Employee record created successfully',
  UPDATE_SUCCESS: 'Employee record updated successfully',
  LOGIN_PROVISIONED_SUCCESS: 'Login credentials created successfully for employee',
  USER_ALREADY_EXISTS: 'A user account with this email already exists',
} as const;

export const DEPARTMENT_MESSAGES = {
  NOT_FOUND: 'Department not found',
  ALREADY_EXISTS: 'A department with this name or code already exists in this organization',
  CREATE_SUCCESS: 'Department created successfully',
  UPDATE_SUCCESS: 'Department updated successfully',
} as const;

export const BUILDING_MESSAGES = {
  NOT_FOUND: 'Building not found',
  ALREADY_EXISTS: 'A building with this name or location code already exists in this organization',
  CREATE_SUCCESS: 'Building created successfully',
  UPDATE_SUCCESS: 'Building updated successfully',
} as const;

export const USER_MESSAGES = {
  NOT_FOUND: 'User not found',
  ALREADY_EXISTS: 'A user with this email already exists in this organization',
  CREATE_SUCCESS: 'User created successfully',
  UPDATE_SUCCESS: 'User updated successfully',
  PASSWORD_RESET_SUCCESS: 'Password reset successfully',
  CANNOT_ASSIGN_HIGHER_ROLE: 'Cannot assign higher privilege than ORG_ADMIN',
  CANNOT_ELEVATE_SUPER_ADMIN: 'Cannot elevate role to SUPER_ADMIN',
} as const;

export const SETTINGS_MESSAGES = {
  UPDATE_SUCCESS: 'Organization settings updated successfully',
} as const;

export const STORAGE_MESSAGES = {
  NO_FILE_PROVIDED: 'No file provided',
  INVALID_FILE_TYPE: (type: string) => `Invalid file type: ${type}. Allowed: image/jpeg, image/png, image/webp`,
  FILE_SIZE_EXCEEDS_LIMIT: 'File size exceeds the 5MB limit',
  FILE_NOT_FOUND: (fileId: string) => `File not found: ${fileId}`,
} as const;

export const COMMON_MESSAGES = {
  OPERATION_SUCCESS: 'Operation completed successfully',
  INTERNAL_SERVER_ERROR: 'Internal server error',
  BAD_REQUEST: 'Bad request',
} as const;

export const MESSAGES = {
  AUTH: AUTH_MESSAGES,
  ORGANIZATION: ORGANIZATION_MESSAGES,
  VISITOR: VISITOR_MESSAGES,
  VISIT: VISIT_MESSAGES,
  APPROVAL: APPROVAL_MESSAGES,
  CHECK_IN: CHECK_IN_MESSAGES,
  EMPLOYEE: EMPLOYEE_MESSAGES,
  DEPARTMENT: DEPARTMENT_MESSAGES,
  BUILDING: BUILDING_MESSAGES,
  USER: USER_MESSAGES,
  SETTINGS: SETTINGS_MESSAGES,
  STORAGE: STORAGE_MESSAGES,
  COMMON: COMMON_MESSAGES,
} as const;
