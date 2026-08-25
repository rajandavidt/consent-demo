// packages/shared/src/auth/auth.ts — mock authentication, shared by both applications.
//
// In shared rather than in each app because the session and the user list are the SAME two stores.
// Duplicating this would mean two ideas of who is signed in, and requirement 12 (insurance reuses
// banking's KYC) needs them to agree on the user id that keys the KYC record.
//
// Passwords are compared in plain text against seeded demo accounts, and the "session" is a
// localStorage object. That is correct for this demo and catastrophic anywhere else, which is why it
// is confined to this one file with the warning attached rather than spread across the app.
import { KEYS, nextId, nowIso, read, write } from '../storage/index.js';
import { audit } from '../kyc/store.js';

export type Role = 'customer' | 'admin';

export interface User {
  id: string;
  name: string;
  email: string;
  /** Demo only. A real system stores a hash it cannot reverse, computed server-side. */
  password: string;
  role: Role;
  mobile?: string;
  createdAt: string;
}

export interface Session {
  userId: string;
  email: string;
  role: Role;
  loginAt: string;
}

/** The credentials printed on the sign-in screen. Marked as demo data everywhere they appear. */
export const DEMO_USERS: User[] = [
  {
    id: 'u-customer-001',
    name: 'Rajan Kumar',
    email: 'customer@finsecure.com',
    password: 'Customer@123',
    role: 'customer',
    mobile: '9876543210',
    createdAt: '2026-01-04T09:00:00.000Z',
  },
  {
    id: 'u-customer-002',
    name: 'Meera Krishnan',
    email: 'meera@finsecure.com',
    password: 'Customer@123',
    role: 'customer',
    mobile: '9840012345',
    createdAt: '2026-02-11T09:00:00.000Z',
  },
  {
    id: 'u-customer-003',
    name: 'Arun Selvaraj',
    email: 'arun@finsecure.com',
    password: 'Customer@123',
    role: 'customer',
    mobile: '9789054321',
    createdAt: '2026-03-02T09:00:00.000Z',
  },
  {
    id: 'u-customer-004',
    name: 'Fathima Noor',
    email: 'fathima@finsecure.com',
    password: 'Customer@123',
    role: 'customer',
    mobile: '9600078901',
    createdAt: '2026-04-19T09:00:00.000Z',
  },
  {
    id: 'u-admin-001',
    name: 'Priya Menon',
    email: 'admin@finsecure.com',
    password: 'Admin@123',
    role: 'admin',
    createdAt: '2026-01-04T09:00:00.000Z',
  },
];

/**
 * Ensures every demo account exists, without disturbing the ones already there.
 *
 * MERGES BY EMAIL rather than bailing out on the first existing row, and that is the whole fix. The
 * old version returned early whenever the store held ANY user — so a browser that had opened the app
 * before a demo account was added never received it, while the sign-in screen kept listing it: the
 * screen renders DEMO_USERS (this constant) but `login()` checks the STORE. Three of the five
 * accounts were offered as click-to-fill rows and then rejected with "Email address or password is
 * incorrect", which reads as a broken login rather than a stale store.
 *
 * Existing rows are never touched — a registration survives, and so does a password somebody changed
 * on a demo account. Only genuinely absent emails are appended.
 */
export function seedUsers(): void {
  const existing = read<User[]>(KEYS.users, []);
  const present = new Set(existing.map((user) => user.email.toLowerCase()));
  const missing = DEMO_USERS.filter((user) => !present.has(user.email.toLowerCase()));
  if (missing.length === 0) return;
  write(KEYS.users, [...existing, ...missing]);
}

export function listUsers(): User[] {
  return read<User[]>(KEYS.users, []);
}

export function getUser(userId: string): User | undefined {
  return listUsers().find((user) => user.id === userId);
}

export type LoginResult = { ok: true; session: Session } | { ok: false; message: string };

export function login(email: string, password: string): LoginResult {
  const user = listUsers().find((u) => u.email.toLowerCase() === email.trim().toLowerCase());
  // One message for both "no such account" and "wrong password", deliberately: distinguishing them
  // tells an attacker which emails are registered. A demo that models the sloppy version teaches
  // the sloppy version.
  if (!user || user.password !== password) {
    return { ok: false, message: 'Email address or password is incorrect' };
  }
  const session: Session = {
    userId: user.id,
    email: user.email,
    role: user.role,
    loginAt: nowIso(),
  };
  write(KEYS.session, session);
  audit(user.id, 'auth.login', `Signed in as ${user.role}`);
  return { ok: true, session };
}

export type RegisterResult = { ok: true; user: User } | { ok: false; message: string };

export function register(input: {
  name: string;
  email: string;
  password: string;
}): RegisterResult {
  const users = listUsers();
  if (users.some((u) => u.email.toLowerCase() === input.email.trim().toLowerCase())) {
    return { ok: false, message: 'An account already exists with that email address' };
  }
  const user: User = {
    id: nextId('u'),
    name: input.name.trim(),
    email: input.email.trim().toLowerCase(),
    password: input.password,
    role: 'customer',
    createdAt: nowIso(),
  };
  write(KEYS.users, [...users, user]);
  write(KEYS.session, {
    userId: user.id,
    email: user.email,
    role: user.role,
    loginAt: nowIso(),
  } satisfies Session);
  audit(user.id, 'auth.register', 'Account created');
  return { ok: true, user };
}

export function getSession(): Session | null {
  return read<Session | null>(KEYS.session, null);
}

export function logout(): void {
  const session = getSession();
  if (session) audit(session.userId, 'auth.logout', 'Signed out');
  write(KEYS.session, null);
}
