import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { workspace_id, disk_name, total_size_bytes, total_photos, total_videos, folders } = body;

    if (!workspace_id || !disk_name || !Array.isArray(folders)) {
      return NextResponse.json({ success: false, error: 'Invalid payload' }, { status: 400 });
    }

    const totalGb = Math.round(((total_size_bytes || 0) / (1024 * 1024 * 1024)) * 10) / 10;
    const { data: disk, error: diskErr } = await supabase
      .from('storage_physical_disks')
      .upsert([{
        workspace_id,
        disk_name,
        disk_label: disk_name,
        disk_serial: `BROWSER-SCAN-${disk_name.replace(/\s+/g, '-').toUpperCase()}`,
        disk_type: 'EXTERNAL_HDD',
        total_capacity_bytes: total_size_bytes || 0,
        total_capacity_gb: totalGb || 1000,
        last_scanned_at: new Date().toISOString(),
        is_currently_mounted: true,
        updated_at: new Date().toISOString(),
      }], { onConflict: 'workspace_id,disk_name' })
      .select()
      .single();

    const diskId = disk?.id || null;

    const { data: clients } = await supabase
      .from('workspace_clients')
      .select('id, name')
      .eq('workspace_id', workspace_id);

    const clientList = clients || [];

    const itemsToInsert = folders.map((f: any) => {
      const matchedClient = clientList.find(c =>
        f.folderName.toLowerCase().includes(c.name.toLowerCase()) ||
        c.name.toLowerCase().includes(f.folderName.toLowerCase())
      );

      return {
        workspace_id,
        storage_source_type: 'PHYSICAL_DISK',
        physical_disk_id: diskId,
        client_id: matchedClient?.id || null,
        client_name: matchedClient?.name || f.folderName,
        folder_name: f.folderName,
        folder_path: f.folderPath,
        relative_path: f.folderPath,
        total_size_bytes: f.totalSizeBytes || 0,
        photo_count: f.photoCount || 0,
        video_count: f.videoCount || 0,
        other_files_count: f.otherCount || 0,
        event_category: f.eventCategory || 'RAW_PHOTOS',
        tags: f.tags || ['raw photos'],
        last_modified_at: f.lastModified || new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
    });

    if (itemsToInsert.length > 0) {
      try { await supabase.from('storage_indexed_items').insert(itemsToInsert); } catch (_) {}
    }

    return NextResponse.json({
      success: true,
      message: `Indexed ${itemsToInsert.length} folders on disk "${disk_name}"`,
      disk_id: diskId,
      indexed_count: itemsToInsert.length,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err?.message }, { status: 500 });
  }
}
