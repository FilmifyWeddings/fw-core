import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(req: NextRequest) {
  const startTime = Date.now();
  try {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get('q') || '';
    const workspaceId = searchParams.get('workspace_id');
    const clientId = searchParams.get('client_id');
    const sourceType = searchParams.get('source_type');
    const category = searchParams.get('category');
    const limit = parseInt(searchParams.get('limit') || '100', 10);

    let dbQuery = supabase
      .from('storage_indexed_items')
      .select(`
        *,
        storage_drive_accounts (
          id, account_email, account_label
        ),
        storage_physical_disks (
          id, disk_name, disk_label, drive_letter, disk_type, physical_location, assigned_to_user_name, is_currently_mounted,
          storage_agent_machines (
            id, machine_name, is_online
          )
        )
      `)
      .order('updated_at', { ascending: false })
      .limit(limit);

    if (workspaceId) {
      dbQuery = dbQuery.eq('workspace_id', workspaceId);
    }

    if (clientId) {
      dbQuery = dbQuery.eq('client_id', clientId);
    }

    if (sourceType && sourceType !== 'ALL') {
      dbQuery = dbQuery.eq('storage_source_type', sourceType);
    }

    if (category && category !== 'ALL') {
      dbQuery = dbQuery.eq('event_category', category);
    }

    if (query && query.trim()) {
      const qClean = query.trim().replace(/['"]/g, '');
      dbQuery = dbQuery.or(`folder_name.ilike.%${qClean}%,folder_path.ilike.%${qClean}%,client_name.ilike.%${qClean}%`);
    }

    const { data, error } = await dbQuery;

    if (error) {
      console.warn('[UniversalSearch API] Search warning:', error.message);
      return NextResponse.json({
        success: true,
        items: [],
        count: 0,
        took_ms: Date.now() - startTime,
      });
    }

    const durationMs = Date.now() - startTime;

    return NextResponse.json({
      success: true,
      items: data || [],
      count: (data || []).length,
      took_ms: durationMs,
    });
  } catch (err: any) {
    return NextResponse.json({
      success: false,
      error: err?.message || 'Search failed',
      took_ms: Date.now() - startTime,
    }, { status: 500 });
  }
}
