import { cookies } from 'next/headers';
import { ADMIN_COOKIE_NAME, verifyAdminSessionToken } from '@/lib/auth/super-admin-auth';
import TripleLockGatekeeperClient from './components/TripleLockGatekeeperClient';
import SuperAdminDashboardClient from './components/SuperAdminDashboardClient';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface PageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

/**
 * Super Admin Page (Server Component):
 * Validates session cookie directly on the server before sending HTML.
 * Completely eliminates client-server hydration mismatches and authentication flashes.
 */
export default async function SuperAdminFwPage({ searchParams }: PageProps) {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_COOKIE_NAME)?.value;
  const auth = verifyAdminSessionToken(token);

  const resolvedSearchParams = await searchParams;
  const initialError = typeof resolvedSearchParams?.error === 'string' ? resolvedSearchParams.error : undefined;

  if (auth.valid && auth.email) {
    return <SuperAdminDashboardClient adminEmail={auth.email} token={token || ''} />;
  }

  return <TripleLockGatekeeperClient initialError={initialError} />;
}
