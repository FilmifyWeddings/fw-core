import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export interface VerifiedAuthResult {
  authorized: boolean;
  workspaceId: string;
  userId: string;
  errorResponse?: NextResponse;
}

/**
 * Backend Security Guard: Verifies Supabase Auth Session & Enforces Zero Cross-Workspace Access.
 * Rejects unauthenticated requests with HTTP 401 Unauthorized (No default workspace fallbacks).
 * Enforces Role-Based Access Control (RBAC) and returns HTTP 403 Forbidden for cross-workspace tampering.
 */
export async function verifyMetaAuth(
  req: NextRequest,
  clientSuppliedWorkspaceId?: string | null
): Promise<VerifiedAuthResult> {
  try {
    let token = '';

    // 1. Extract Bearer Token from Authorization Header
    const authHeader = req.headers.get('authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    }

    // 2. Extract Cookie fallback if Bearer Token is not present
    if (!token) {
      const cookieHeader = req.headers.get('cookie') || '';
      const match = cookieHeader.match(/sb-[a-z0-9]+-auth-token=([^;]+)/i);
      if (match) {
        try {
          const parsed = JSON.parse(decodeURIComponent(match[1]));
          token = Array.isArray(parsed) ? parsed[0] : parsed?.access_token || '';
        } catch (_) {}
      }
    }

    // 3. STRICT AUTHENTICATION: Return 401 Unauthorized if no token exists (NO DEFAULT WORKSPACE FALLBACKS)
    if (!token) {
      return {
        authorized: false,
        workspaceId: '',
        userId: '',
        errorResponse: NextResponse.json(
          { error: 'Unauthorized: A valid Supabase authentication session is required.' },
          { status: 401 }
        ),
      };
    }

    // 4. VERIFY SUPABASE JWT WITH DB AUTH ENGINE
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);
    if (userError || !user) {
      return {
        authorized: false,
        workspaceId: '',
        userId: '',
        errorResponse: NextResponse.json(
          { error: 'Unauthorized: Invalid or expired authentication session token.' },
          { status: 401 }
        ),
      };
    }

    const authenticatedUserId = user.id;

    // 5. CROSS-WORKSPACE TAMPERING CHECK (HTTP 403 FORBIDDEN WITH ROLE-BASED ACCESS CONTROL)
    if (
      clientSuppliedWorkspaceId &&
      clientSuppliedWorkspaceId !== '00000000-0000-0000-0000-000000000000' &&
      clientSuppliedWorkspaceId !== authenticatedUserId
    ) {
      // Role-Based Authorization Only (NO hardcoded email strings)
      const { data: userProfile } = await supabaseAdmin
        .from('profiles')
        .select('role')
        .eq('id', authenticatedUserId)
        .maybeSingle();

      const isAdminRole = userProfile?.role === 'admin' || userProfile?.role === 'superadmin';

      if (!isAdminRole) {
        console.warn(`[SECURITY 403] Non-admin user ${authenticatedUserId} attempted cross-workspace access to ${clientSuppliedWorkspaceId}. Access Denied.`);
        return {
          authorized: false,
          workspaceId: authenticatedUserId,
          userId: authenticatedUserId,
          errorResponse: NextResponse.json(
            { error: 'Forbidden: Cross-workspace access denied. You do not have permission to access another user workspace.' },
            { status: 403 }
          ),
        };
      }
    }

    return {
      authorized: true,
      workspaceId: authenticatedUserId,
      userId: authenticatedUserId,
    };
  } catch (err: any) {
    console.error('[Meta Security Guard Error]:', err.message);
    return {
      authorized: false,
      workspaceId: '',
      userId: '',
      errorResponse: NextResponse.json({ error: 'Unauthorized: Authentication processing failed.' }, { status: 401 }),
    };
  }
}
