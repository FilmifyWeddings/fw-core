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
      token = req.cookies.get('sb-access-token')?.value || '';
    }

    if (!token) {
      const cookieHeader = req.headers.get('cookie') || '';
      const directMatch = cookieHeader.match(/sb-access-token=([^;]+)/i);
      if (directMatch) {
        token = decodeURIComponent(directMatch[1]);
      } else {
        const match = cookieHeader.match(/sb-[a-z0-9]+-auth-token=([^;]+)/i);
        if (match) {
          try {
            const parsed = JSON.parse(decodeURIComponent(match[1]));
            token = Array.isArray(parsed) ? parsed[0] : parsed?.access_token || '';
          } catch (_) {}
        }
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

    // 4. UNAUTHENTICATED REJECTION (401 Unauthorized)
    // A valid session token is strictly required. Client-supplied workspace_id alone cannot authenticate.
    if (!authenticatedUserId) {
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

    // 5. Resolve active/primary workspace directly from Supabase profile
    let resolvedWorkspaceId = authenticatedUserId;
    try {
      const { data: userProfile } = await supabaseAdmin
        .from('profiles')
        .select('role, workspace_id, studio_id')
        .eq('id', authenticatedUserId)
        .maybeSingle();

      if (userProfile?.workspace_id) {
        resolvedWorkspaceId = userProfile.workspace_id;
      }

      const isAdminRole = userProfile?.role === 'admin' || userProfile?.role === 'superadmin';

      // 6. CROSS-WORKSPACE TAMPERING CHECK
      if (
        clientSuppliedWorkspaceId &&
        clientSuppliedWorkspaceId !== '00000000-0000-0000-0000-000000000000' &&
        clientSuppliedWorkspaceId !== authenticatedUserId &&
        clientSuppliedWorkspaceId !== userProfile?.workspace_id
      ) {
        if (!isAdminRole) {
          console.warn(`[SECURITY 403] Non-admin user ${authenticatedUserId} attempted cross-workspace access to ${clientSuppliedWorkspaceId}. Access Denied.`);
          return {
            authorized: false,
            workspaceId: resolvedWorkspaceId,
            userId: authenticatedUserId,
            errorResponse: NextResponse.json(
              { error: 'Forbidden: Cross-workspace access denied. You do not have permission to access another user workspace.' },
              { status: 403 }
            ),
          };
        }
        resolvedWorkspaceId = clientSuppliedWorkspaceId;
      }
    } catch (profileErr) {
      console.warn('[Profile Workspace Lookup Warning]:', profileErr);
    }

    return {
      authorized: true,
      workspaceId: resolvedWorkspaceId,
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
