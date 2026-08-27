import React from 'react';
import { supabaseAdmin } from '@/lib/supabase';
import { MoodboardClientView } from '@/components/moodboard/MoodboardClientView';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ token: string }>;
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
    name: 'StudioCore Photography',
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

      // 3. Fetch Studio Profile Branding
      if (moodboard.workspace_id) {
        const { data: profile } = await supabaseAdmin
          .from('profiles')
          .select('workspace_name, business_name, company, logo_url')
          .eq('id', moodboard.workspace_id)
          .maybeSingle();

        if (profile) {
          studioInfo = {
            name: profile.business_name || profile.workspace_name || profile.company || 'StudioCore Photography',
            logo: profile.logo_url || null,
          };
        }
      }
    }
  } catch (e) {
    console.error('[Moodboard SSR Fetch Error]:', e);
  }

  // Fallback if moodboard not in DB yet (e.g. preview token)
  if (!moodboard) {
    moodboard = {
      token,
      status: 'DRAFT',
      couple_photos: [],
      close_family_photos: [],
      photo_references: [],
      video_references: [],
      itinerary_schedule: [],
      venue_locations: [],
      outfit_references: [],
      completion_percentage: 0,
    };
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
