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

export async function verifySuperAdminRequest(req: NextRequest): Promise<{ authorized: boolean; email?: string }> {
  try {
    const authHeader = req.headers.get('Authorization');
    const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;

    if (!token) {
      return { authorized: false };
    }

    const { data: { user } } = await supabaseAdmin.auth.getUser(token);
    if (!user || !user.email) {
      return { authorized: false };
    }

    if (isSuperAdmin(user.email)) {
      return { authorized: true, email: user.email };
    }

    return { authorized: false, email: user.email };
  } catch (err) {
    return { authorized: false };
  }
}
