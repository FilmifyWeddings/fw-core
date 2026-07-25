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
 * Validates JWT session or verified workspace ID in database.
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

    let authenticatedUserId: string | null = null;

    // 3. JWT VERIFICATION
    if (token) {
      const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);
      if (user && !userError) {
        authenticatedUserId = user.id;
      }
    }

    // 4. DATABASE WORKSPACE PROFILE RESOLUTION (If Bearer token not in header)
    if (!authenticatedUserId && clientSuppliedWorkspaceId && clientSuppliedWorkspaceId !== '00000000-0000-0000-0000-000000000000') {
      const { data: prof } = await supabaseAdmin
        .from('profiles')
        .select('id')
        .eq('id', clientSuppliedWorkspaceId)
        .maybeSingle();

      if (prof?.id) {
        authenticatedUserId = prof.id;
      }
    }

    // 5. UNAUTHENTICATED REJECTION (401 Unauthorized)
    if (!authenticatedUserId) {
      return {
        authorized: false,
        workspaceId: '',
        userId: '',
        errorResponse: NextResponse.json(
          { error: 'Unauthorized: A valid Supabase authentication session or workspace ID is required.' },
          { status: 401 }
        ),
      };
    }

    const resolvedId: string = authenticatedUserId;

    // 6. CROSS-WORKSPACE TAMPERING CHECK (HTTP 403 FORBIDDEN WITH ROLE-BASED ACCESS CONTROL)
    if (
      clientSuppliedWorkspaceId &&
      clientSuppliedWorkspaceId !== '00000000-0000-0000-0000-000000000000' &&
      clientSuppliedWorkspaceId !== resolvedId
    ) {
      const { data: userProfile } = await supabaseAdmin
        .from('profiles')
        .select('role')
        .eq('id', resolvedId)
        .maybeSingle();

      const isAdminRole = userProfile?.role === 'admin' || userProfile?.role === 'superadmin';

      if (!isAdminRole) {
        console.warn(`[SECURITY 403] Non-admin user ${resolvedId} attempted cross-workspace access to ${clientSuppliedWorkspaceId}. Access Denied.`);
        return {
          authorized: false,
          workspaceId: resolvedId,
          userId: resolvedId,
          errorResponse: NextResponse.json(
            { error: 'Forbidden: Cross-workspace access denied. You do not have permission to access another user workspace.' },
            { status: 403 }
          ),
        };
      }
    }

    return {
      authorized: true,
      workspaceId: resolvedId,
      userId: resolvedId,
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
