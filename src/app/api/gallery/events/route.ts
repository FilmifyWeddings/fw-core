import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { resolveRequestUser } from '@/lib/auth/admin-guard';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const requestedWorkspaceId = searchParams.get('workspace_id');
    const slug = searchParams.get('slug');
    const id = searchParams.get('id') || searchParams.get('gallery_id');
    const showAll = searchParams.get('all') === 'true';

    const auth = await resolveRequestUser(req);

    // 1. Fetch single gallery by ID
    if (id) {
      const { data: single, error } = await supabaseAdmin
        .from('event_galleries')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (error) {
        console.error('Error fetching event gallery by ID:', error);
        return NextResponse.json({ success: false, error: error.message, gallery: null, events: [] }, { status: 200 });
      }

      if (!single) {
        return NextResponse.json({ success: false, error: 'Gallery not found', gallery: null, events: [] }, { status: 404 });
      }

      // Security check: If authenticated in workspace UI, verify tenant ownership
      if (auth.userId && !auth.isSuperAdmin) {
        const userWsId = requestedWorkspaceId || auth.userId;
        if (single.workspace_id && single.workspace_id !== '00000000-0000-0000-0000-000000000000' && single.workspace_id !== userWsId) {
          // Check membership
          const { data: member } = await supabaseAdmin
            .from('workspace_members')
            .select('workspace_id')
            .eq('workspace_id', single.workspace_id)
            .or(`user_id.eq.${auth.userId},email.ilike.${auth.userEmail || ''}`)
            .maybeSingle();

          if (!member) {
            return NextResponse.json({ success: false, error: 'Access denied: Gallery belongs to another studio', gallery: null, events: [] }, { status: 403 });
          }
        }
      }

      return NextResponse.json({ success: true, gallery: single, events: [single] });
    }

    // 2. Fetch single gallery by Slug (used by public client views and direct links)
    if (slug) {
      const { data: single, error } = await supabaseAdmin
        .from('event_galleries')
        .select('*')
        .eq('slug', slug)
        .maybeSingle();

      if (error) {
        console.error('Error fetching event gallery by Slug:', error);
        return NextResponse.json({ success: false, error: error.message, gallery: null, events: [] }, { status: 200 });
      }

      return NextResponse.json({ success: true, gallery: single, events: single ? [single] : [] });
    }

    // 3. Fetch all galleries scoped STRICTLY to the studio owner's workspace
    const effectiveWorkspaceId = requestedWorkspaceId || auth.userId;

    // Guard: Prevent unauthenticated / un-scoped callers from fetching the entire database
    if (!effectiveWorkspaceId && !auth.isSuperAdmin) {
      return NextResponse.json({ success: true, galleries: [], events: [] });
    }

    let query = supabaseAdmin
      .from('event_galleries')
      .select(`
        *,
        gallery_photos (
          id,
          size_bytes,
          face_count
        )
      `)
      .order('created_at', { ascending: false });

    // SuperAdmin can pass ?all=true to see all galleries across studios
    if (auth.isSuperAdmin && showAll) {
      // no filter
    } else if (effectiveWorkspaceId) {
      // STRICT multi-tenant filtering: Only return galleries belonging to this studio!
      query = query.eq('workspace_id', effectiveWorkspaceId);
    } else {
      return NextResponse.json({ success: true, galleries: [], events: [] });
    }

    const { data: galleries, error } = await query;

    if (error) {
      console.error('Error fetching event galleries:', error);
      return NextResponse.json({ success: false, error: error.message, galleries: [], events: [] }, { status: 200 });
    }

    // Calculate aggregated metrics
    const enriched = (galleries || []).map((g) => {
      const photos = g.gallery_photos || [];
      const totalPhotos = photos.length;
      const totalBytes = photos.reduce((acc: number, p: any) => acc + (Number(p.size_bytes) || 0), 0);
      const totalFaces = photos.reduce((acc: number, p: any) => acc + (Number(p.face_count) || 0), 0);

      return {
        ...g,
        photo_count: totalPhotos,
        total_size_bytes: totalBytes,
        total_size_mb: (totalBytes / (1024 * 1024)).toFixed(1),
        total_faces: totalFaces,
        gallery_photos: undefined,
      };
    });

    return NextResponse.json({ success: true, galleries: enriched, events: enriched });
  } catch (err: any) {
    console.error('Events GET Exception:', err);
    return NextResponse.json({ success: false, error: err.message, galleries: [], events: [] }, { status: 200 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await resolveRequestUser(req);
    const body = await req.json();
    const {
      workspace_id: bodyWorkspaceId,
      title,
      slug,
      event_date,
      pin_code = null,
      cover_url = null,
      allow_downloads = true,
    } = body;

    if (!title) {
      return NextResponse.json({ success: false, error: 'Event Title is required' }, { status: 400 });
    }

    // Resolve studio owner workspace ID strictly
    let effectiveWorkspaceId = bodyWorkspaceId || auth.userId;
    if ((!effectiveWorkspaceId || effectiveWorkspaceId === '00000000-0000-0000-0000-000000000000') && auth.userId) {
      effectiveWorkspaceId = auth.userId;
    }

    if (!effectiveWorkspaceId) {
      return NextResponse.json({ success: false, error: 'Missing studio workspace identification. Please sign in.' }, { status: 401 });
    }

    // Auto-generate clean URL slug
    const finalSlug = (slug || title)
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

    // Scoped storage path in Backblaze B2: galleries/{workspaceId}/{slug}_{timestamp}
    const storage_folder_prefix = `galleries/${effectiveWorkspaceId}/${finalSlug}_${Date.now().toString(36)}`;

    const { data: newGallery, error } = await supabaseAdmin
      .from('event_galleries')
      .insert({
        workspace_id: effectiveWorkspaceId,
        title,
        slug: finalSlug,
        event_date: event_date || new Date().toISOString().split('T')[0],
        pin_code: pin_code ? String(pin_code).trim() : null,
        cover_url,
        r2_folder_prefix: storage_folder_prefix, // Stored in existing prefix column
        allow_downloads,
        is_active: true,
        status: 'DRAFT',
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json(
          { success: false, error: 'A gallery with this URL slug already exists. Please choose a unique name.' },
          { status: 409 }
        );
      }
      throw error;
    }

    // Automatically create default 'Highlights' collection
    try {
      await supabaseAdmin.from('gallery_collections').insert({
        gallery_id: newGallery.id,
        name: 'Highlights',
        slug: 'highlights',
      });
    } catch (_) {}

    return NextResponse.json({ success: true, gallery: newGallery, event: newGallery });
  } catch (err: any) {
    console.error('Error creating event gallery:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const auth = await resolveRequestUser(req);
    const body = await req.json();
    const { id, title, event_date, is_active, pin_code, allow_downloads, cover_url, status, workspace_id } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: 'Gallery ID is required' }, { status: 400 });
    }

    // Tenant check
    if (auth.userId && !auth.isSuperAdmin) {
      const { data: existing } = await supabaseAdmin
        .from('event_galleries')
        .select('workspace_id')
        .eq('id', id)
        .maybeSingle();

      const userWsId = workspace_id || auth.userId;
      if (existing && existing.workspace_id && existing.workspace_id !== userWsId && existing.workspace_id !== '00000000-0000-0000-0000-000000000000') {
        return NextResponse.json({ success: false, error: 'Unauthorized to modify this gallery' }, { status: 403 });
      }
    }

    const updates: Record<string, any> = {};
    if (title !== undefined) updates.title = title.trim();
    if (event_date !== undefined) updates.event_date = event_date;
    if (is_active !== undefined) updates.is_active = is_active;
    if (status !== undefined) updates.status = status;
    if (pin_code !== undefined) updates.pin_code = pin_code ? String(pin_code).trim() : null;
    if (allow_downloads !== undefined) updates.allow_downloads = allow_downloads;
    if (cover_url !== undefined) updates.cover_url = cover_url;

    const { data: updated, error } = await supabaseAdmin
      .from('event_galleries')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, gallery: updated, event: updated });
  } catch (err: any) {
    console.error('Error updating event gallery:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const auth = await resolveRequestUser(req);
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    const requestedWorkspaceId = searchParams.get('workspace_id');

    if (!id) {
      return NextResponse.json({ success: false, error: 'Gallery ID is required' }, { status: 400 });
    }

    // Tenant check
    if (auth.userId && !auth.isSuperAdmin) {
      const { data: existing } = await supabaseAdmin
        .from('event_galleries')
        .select('workspace_id')
        .eq('id', id)
        .maybeSingle();

      const userWsId = requestedWorkspaceId || auth.userId;
      if (existing && existing.workspace_id && existing.workspace_id !== userWsId && existing.workspace_id !== '00000000-0000-0000-0000-000000000000') {
        return NextResponse.json({ success: false, error: 'Unauthorized to delete this gallery' }, { status: 403 });
      }
    }

    // Cascade delete gallery photos, collections, and face records
    try {
      await supabaseAdmin.from('photo_faces').delete().eq('gallery_id', id);
      await supabaseAdmin.from('gallery_photos').delete().eq('gallery_id', id);
      await supabaseAdmin.from('gallery_collections').delete().eq('gallery_id', id);
    } catch (_) {}

    const { error } = await supabaseAdmin.from('event_galleries').delete().eq('id', id);

    if (error) throw error;
    return NextResponse.json({ success: true, deletedId: id });
  } catch (err: any) {
    console.error('Error deleting event gallery:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
