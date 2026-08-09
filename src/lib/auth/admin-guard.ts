import { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const SUPER_ADMIN_EMAIL = 'sushantnawale700@gmail.com';

export function isSuperAdmin(email: string | null | undefined): boolean {
  if (!email) return false;
  return email.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase();
}

export function isUserSuperAdmin(user: { email?: string } | null | undefined): boolean {
  return isSuperAdmin(user?.email);
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

    const isSuperAdminUser = isSuperAdmin(userEmail);
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
