import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const galleryId = searchParams.get('gallery_id');

    if (!galleryId) {
      return NextResponse.json({ success: true, collections: [] }, { status: 200 });
    }

    const { data, error } = await supabaseAdmin
      .from('gallery_collections')
      .select('*')
      .eq('gallery_id', galleryId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching collections:', error);
      return NextResponse.json({ success: true, error: error.message, collections: [] }, { status: 200 });
    }

    return NextResponse.json({ success: true, collections: data || [] });
  } catch (err: any) {
    console.error('Collection GET Exception:', err);
    return NextResponse.json({ success: true, error: err.message, collections: [] }, { status: 200 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { gallery_id, name } = body;

    if (!gallery_id || !name) {
      return NextResponse.json({ success: false, error: 'Missing gallery_id or name' }, { status: 400 });
    }

    const slug = name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-');

    const { data, error } = await supabaseAdmin
      .from('gallery_collections')
      .insert({
        gallery_id,
        name: name.trim(),
        slug,
      })
      .select()
      .single();

    if (error) {
      console.error('Error inserting collection:', error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, collection: data });
  } catch (err: any) {
    console.error('Collection POST Exception:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: 'Collection ID is required' }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from('gallery_collections')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return NextResponse.json({ success: true, deletedId: id });
  } catch (err: any) {
    console.error('Error deleting gallery collection:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
