import React from 'react';
import type { Metadata } from 'next';
import { supabaseAdmin } from '@/lib/supabase';
import { MoodboardClientView } from '@/components/moodboard/MoodboardClientView';
import { getMediaUrl } from '@/lib/r2-storage';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ token: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const resolvedParams = await params;
  const token = resolvedParams?.token;

  if (!token) {
    return {
      title: 'Wedding Mood Board | Studio Core',
      description: 'Interactive client wedding mood board & event preparation portal.',
    };
  }

  try {
    const { data: moodboard } = await supabaseAdmin
      .from('client_moodboards')
      .select('client_id, workspace_id, couple_photos')
      .eq('token', token)
      .maybeSingle();

    let clientName = 'Couple';
    let studioName = 'Studio Core';
    let previewImage = 'https://images.unsplash.com/photo-1519741497674-611481863552?q=80&w=1200&auto=format&fit=crop';

    if (moodboard?.client_id) {
      const { data: client } = await supabaseAdmin
        .from('workspace_clients')
        .select('name')
        .eq('id', moodboard.client_id)
        .maybeSingle();

      if (client?.name) {
        clientName = client.name;
      }
    }

    if (moodboard?.workspace_id) {
      const { data: ws } = await supabaseAdmin
        .from('workspaces')
        .select('name, owner_id')
        .eq('id', moodboard.workspace_id)
        .maybeSingle();

      if (ws?.name) {
        studioName = ws.name;
      }

      const profileId = ws?.owner_id || moodboard.workspace_id;
      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('workspace_name, business_name, company, leads_table_preferences')
        .eq('id', profileId)
        .maybeSingle();

      if (profile) {
        const prefCompany = profile.leads_table_preferences?.invoice_company_name;
        studioName = prefCompany || profile.business_name || profile.company || ws?.name || profile.workspace_name || studioName;
      }
    }

    if (Array.isArray(moodboard?.couple_photos) && moodboard.couple_photos.length > 0) {
      const firstPhotoUrl = moodboard.couple_photos[0]?.url;
      if (firstPhotoUrl) {
        previewImage = firstPhotoUrl.startsWith('http')
          ? firstPhotoUrl
          : `https://studiocore.in${getMediaUrl(firstPhotoUrl)}`;
      }
    }

    const title = `💍 ${clientName} • Wedding Mood Board & Prep Portal`;
    const description = `Interactive mood board, VIP family tagged portraits, ceremony schedule, and outfit styling for ${clientName} by ${studioName}.`;

    return {
      title: `${clientName} • Wedding Mood Board | ${studioName}`,
      description,
      openGraph: {
        title,
        description,
        url: `https://studiocore.in/p/moodboard/${token}`,
        siteName: studioName,
        images: [
          {
            url: previewImage,
            width: 1200,
            height: 630,
            alt: `${clientName} Wedding Mood Board`,
          },
        ],
        type: 'website',
      },
      twitter: {
        card: 'summary_large_image',
        title,
        description,
        images: [previewImage],
      },
    };
  } catch (err) {
    console.error('[generateMetadata error in moodboard]:', err);
    return {
      title: 'Wedding Mood Board & Event Prep Portal',
      description: 'Interactive client wedding mood board & shot list portal.',
    };
  }
}

export default async function MoodboardPage({ params }: PageProps) {
  const resolvedParams = await params;
  const token = resolvedParams?.token;

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAF8F5] text-slate-800 p-4">
        <div className="p-8 text-center max-w-md bg-white border border-[#EAE5DD] rounded-3xl shadow-lg space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center mx-auto text-xl font-bold">
            !
          </div>
          <h2 className="text-xl font-serif font-bold text-slate-900">Invalid Link</h2>
          <p className="text-xs text-slate-500">Missing or invalid mood board token.</p>
        </div>
      </div>
    );
  }

  // 1. Fetch Mood Board by Token
  let moodboard: any = null;
  let clientInfo: any = null;
  let studioInfo: any = {
    name: null,
    logo: null,
  };

  try {
    const { data: mbData, error: mbErr } = await supabaseAdmin
      .from('client_moodboards')
      .select('*')
      .eq('token', token)
      .maybeSingle();

    if (!mbErr && mbData) {
      moodboard = mbData;

      // 2. Fetch Client Info
      if (moodboard.client_id) {
        const { data: clientData } = await supabaseAdmin
          .from('workspace_clients')
          .select('id, name, phone, email, event_type, event_date, notes')
          .eq('id', moodboard.client_id)
          .maybeSingle();

        if (clientData) {
          clientInfo = clientData;
        }
      }

      // 3. Fetch Studio Profile Branding (check workspaces and profiles)
      if (moodboard.workspace_id) {
        let sName: string | null = null;
        let sLogo: string | null = null;

        const { data: ws } = await supabaseAdmin
          .from('workspaces')
          .select('name, logo_url, owner_id')
          .eq('id', moodboard.workspace_id)
          .maybeSingle();

        if (ws?.name) {
          sName = ws.name;
          sLogo = ws.logo_url;
        }

        const profileId = ws?.owner_id || moodboard.workspace_id;
        const { data: profile } = await supabaseAdmin
          .from('profiles')
          .select('workspace_name, business_name, company, logo_url, leads_table_preferences')
          .eq('id', profileId)
          .maybeSingle();

        if (profile) {
          const prefCompany = profile.leads_table_preferences?.invoice_company_name;
          sName = sName || prefCompany || profile.business_name || profile.company || profile.workspace_name || null;
          sLogo = sLogo || profile.logo_url || profile.leads_table_preferences?.invoice_logo_url || null;
        }

        studioInfo = {
          name: sName,
          logo: sLogo,
        };
      }
    }
  } catch (e) {
    console.error('Moodboard server load error:', e);
  }

  if (!moodboard) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAF8F5] text-slate-800 p-4">
        <div className="p-8 text-center max-w-md bg-white border border-[#EAE5DD] rounded-3xl shadow-lg space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto text-xl font-bold">
            ×
          </div>
          <h2 className="text-xl font-serif font-bold text-slate-900">Mood Board Not Found</h2>
          <p className="text-xs text-slate-500">
            This wedding mood board does not exist or has been removed by the studio.
          </p>
        </div>
      </div>
    );
  }

  return (
    <MoodboardClientView
      initialData={moodboard}
      client={clientInfo}
      studio={studioInfo}
      token={token}
    />
  );
}
