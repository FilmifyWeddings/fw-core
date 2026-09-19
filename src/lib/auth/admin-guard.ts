import { NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
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
    const authHeader = req.headers.get('Authorization') || req.headers.get('authorization');
    const customEmailHeader = req.headers.get('x-user-email');
    const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;

    let userEmail: string | null = customEmailHeader ? customEmailHeader.toLowerCase() : null;
    let userId = '';

    // 1. Direct Bearer token authentication
    if (token) {
      try {
        const { data: { user } } = await supabaseAdmin.auth.getUser(token);
        if (user) {
          userId = user.id;
          if (user.email) {
            userEmail = user.email.toLowerCase();
          }
        }
      } catch (_) {}
    }

    // 2. Cookie authentication via @supabase/ssr createServerClient
    if (!userId) {
      try {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
        const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
        if (supabaseUrl && supabaseAnonKey) {
          const client = createServerClient(supabaseUrl, supabaseAnonKey, {
            cookies: {
              getAll() {
                try {
                  return req.cookies.getAll();
                } catch {
                  return [];
                }
              },
              setAll() {},
            },
          });
          const { data: { user } } = await client.auth.getUser();
          if (user) {
            userId = user.id;
            if (user.email) {
              userEmail = user.email.toLowerCase();
            }
          }
        }
      } catch (_) {}
    }

    // 3. Fallback: Direct inspection of sb-* cookie tokens (reassembling chunks if needed)
    if (!userId) {
      try {
        const allCookies = req.cookies.getAll();
        const chunkMap: { [baseName: string]: { index: number; value: string }[] } = {};
        const standaloneValues: string[] = [];

        allCookies.forEach((c) => {
          if (c.name.includes('-auth-token')) {
            const match = c.name.match(/^(.*?)\.(\d+)$/);
            if (match) {
              const base = match[1];
              const idx = parseInt(match[2], 10);
              if (!chunkMap[base]) chunkMap[base] = [];
              chunkMap[base].push({ index: idx, value: c.value });
            } else {
              standaloneValues.push(c.value);
            }
          }
        });

        Object.values(chunkMap).forEach((chunks) => {
          chunks.sort((a, b) => a.index - b.index);
          standaloneValues.push(chunks.map((c) => c.value).join(''));
        });

        const sbAccessToken = req.cookies.get('sb-access-token')?.value;
        if (sbAccessToken) standaloneValues.push(sbAccessToken);

        for (const rawVal of standaloneValues) {
          if (!rawVal) continue;
          let candidateTok = '';
          try {
            let unescaped = rawVal;
            if (unescaped.startsWith('base64-')) {
              unescaped = Buffer.from(unescaped.substring(7), 'base64url').toString('utf-8');
            }
            const parsed = JSON.parse(unescaped);
            candidateTok = parsed?.access_token || (Array.isArray(parsed) ? parsed[0] : '');
          } catch (_) {
            if (rawVal.startsWith('ey') && rawVal.split('.').length === 3) {
              candidateTok = rawVal;
            }
          }

          if (candidateTok) {
            const { data: { user } } = await supabaseAdmin.auth.getUser(candidateTok);
            if (user) {
              userId = user.id;
              if (user.email) {
                userEmail = user.email.toLowerCase();
              }
              break;
            }
          }
        }
      } catch (_) {}
    }

    let isSuperAdminUser = isSuperAdmin(userEmail, userId);
    if (!isSuperAdminUser && userId) {
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
    return { userId: '', userEmail: null, isSuperAdmin: false };
  }
}

export async function verifySuperAdminRequest(req: NextRequest): Promise<{ authorized: boolean; email?: string }> {
  const auth = await resolveRequestUser(req);
  return {
    authorized: auth.isSuperAdmin,
    email: auth.userEmail || undefined
  };
}
