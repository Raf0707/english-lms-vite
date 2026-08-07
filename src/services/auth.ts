import type { BackendUser } from './api';
import type { Role, User } from '../types';

function roleCodes(user: BackendUser): string[] {
  return (user.roles ?? []).map((entry) => typeof entry === 'string' ? entry : entry.role.code);
}

export function backendUserToAppUser(source: BackendUser): User {
  const roles = roleCodes(source);
  const role: Exclude<Role, 'guest'> = roles.includes('ADMIN')
    ? 'admin'
    : roles.includes('TEACHER')
      ? 'teacher'
      : 'student';
  const firstName = source.profile?.firstName?.trim() ?? '';
  const lastName = source.profile?.lastName?.trim() ?? '';
  const displayName = source.profile?.displayName?.trim() || '';
  const fullName = displayName || [firstName, lastName].filter(Boolean).join(' ') || source.email;
  const initials = fullName
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return {
    id: source.id,
    name: fullName,
    email: source.email,
    phone: source.phone,
    role,
    avatar: initials || 'U',
    timezone: source.profile?.timezone || 'Europe/Moscow',
    firstName,
    lastName,
    displayName: displayName || undefined,
    emailVerified: Boolean(source.emailVerifiedAt),
    phoneVerified: Boolean(source.phoneVerifiedAt),
    backendRoles: roles,
    level: source.teacherProfile?.level ?? undefined
  };
}

export function splitPersonName(value: string): { firstName: string; lastName: string; displayName: string } {
  const parts = value.trim().split(/\s+/).filter(Boolean);
  const firstName = parts.shift() ?? '';
  const lastName = parts.join(' ');
  return { firstName, lastName, displayName: value.trim() };
}
