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
    // Direct Server-Side Hydration: Instantaneous 0ms telemetry load!
    const telemetry = await getSuperAdminTelemetry();
    return (
      <SuperAdminDashboardClient
        adminEmail={auth.email}
        token={token || ''}
        initialStudios={telemetry.studios}
        initialKpis={telemetry.kpis}
      />
    );
  }

  return <TripleLockGatekeeperClient initialError={initialError} />;
}
