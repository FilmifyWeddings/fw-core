import { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const SUPER_ADMIN_EMAIL = 'sushantnawale700@gmail.com';
export const SUPER_ADMIN_ID = 'f9359a12-3f2e-430c-9cec-2ec9841ec83e';
export const SUPER_ADMIN_EMAILS = [
  'sushantnawale700@gmail.com',
  'filmifyweddings@gmail.com',
];

export function isSuperAdmin(email: string | null | undefined, userId?: string | null | undefined): boolean {
  if (userId && userId === SUPER_ADMIN_ID) return true;
  if (!email) return false;
  const lower = email.toLowerCase().trim();
  return SUPER_ADMIN_EMAILS.includes(lower);
}

export function isUserSuperAdmin(user: { id?: string; email?: string } | null | undefined): boolean {
  if (!user) return false;
  if (user.id === SUPER_ADMIN_ID) return true;
  return isSuperAdmin(user.email, user.id);
}

export interface RequestUserAuth {
  userId: string;
  userEmail: string | null;
  isSuperAdmin: boolean;
}

export async function resolveRequestUser(req: NextRequest): Promise<RequestUserAuth> {
  try {
    const authHeader = req.headers.get('Authorization');
    const customEmailHeader = req.headers.get('x-user-email');
    const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;

    let userEmail: string | null = customEmailHeader ? customEmailHeader.toLowerCase() : null;
    let userId = 'demo_user';

    if (token) {
      const { data: { user } } = await supabaseAdmin.auth.getUser(token);
      if (user) {
        userId = user.id;
        if (user.email) {
          userEmail = user.email.toLowerCase();
        }
      }
    }

    let isSuperAdminUser = isSuperAdmin(userEmail, userId);
    if (!isSuperAdminUser && userId && userId !== 'demo_user') {
      try {
        const { data: prof } = await supabaseAdmin
          .from('profiles')
          .select('platform_role')
          .eq('id', userId)
          .maybeSingle();
        if (prof?.platform_role === 'superadmin') {
          isSuperAdminUser = true;
        }
      } catch (_) {}
    }
    return { userId, userEmail, isSuperAdmin: isSuperAdminUser };
  } catch (err) {
    return { userId: 'demo_user', userEmail: null, isSuperAdmin: false };
  }
}

export async function verifySuperAdminRequest(req: NextRequest): Promise<{ authorized: boolean; email?: string }> {
  const auth = await resolveRequestUser(req);
  return {
    authorized: auth.isSuperAdmin,
    email: auth.userEmail || undefined
  };
}
