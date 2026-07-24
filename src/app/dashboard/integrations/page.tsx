import { redirect } from 'next/navigation';

export default function DashboardIntegrationsRedirectPage() {
  redirect('/workspace/integrations');
}
