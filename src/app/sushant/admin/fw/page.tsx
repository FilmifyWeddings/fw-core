import { cookies } from 'next/headers';
import { ADMIN_COOKIE_NAME, verifyAdminSessionToken } from '@/lib/auth/super-admin-auth';
import { getSuperAdminTelemetry } from '@/lib/services/super-admin-telemetry';
import TripleLockGatekeeperClient from './components/TripleLockGatekeeperClient';
import SuperAdminDashboardClient from './components/SuperAdminDashboardClient';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface PageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

/**
 * Super Admin Page (Server Component):
 * Validates session cookie and hydrates platform telemetry directly on the server.
 * Guarantees zero blank screen, zero hydration mismatch, and instant rendering.
 */
export default async function SuperAdminFwPage({ searchParams }: PageProps) {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_COOKIE_NAME)?.value;
  const auth = verifyAdminSessionToken(token);

  const resolvedSearchParams = await searchParams;
  const initialError = typeof resolvedSearchParams?.error === 'string' ? resolvedSearchParams.error : undefined;

  if (auth.valid && auth.email) {
    // Ultra-Fast Resilient Server Hydration: 2.5s maximum timeout
    // Guarantees page opens immediately with zero hang, even if Supabase is restarting or under load
    let telemetry: { studios: any[]; kpis: any } = { studios: [], kpis: null };
    try {
      telemetry = await Promise.race([
        getSuperAdminTelemetry(),
        new Promise<any>((_, reject) =>
          setTimeout(() => reject(new Error('Telemetry SSR timeout')), 2500)
        ),
      ]);
    } catch (err: any) {
      console.warn('[SuperAdmin SSR] Hydration timeout or error, delegating to client-side stream:', err?.message || err);
    }

    return (
      <SuperAdminDashboardClient
        adminEmail={auth.email}
        token={token || ''}
        initialStudios={telemetry.studios || []}
        initialKpis={telemetry.kpis || null}
      />
    );
  }

  return <TripleLockGatekeeperClient initialError={initialError} />;
}
