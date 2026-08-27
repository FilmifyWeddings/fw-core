import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { agent_token, disk, items } = body;

    if (!agent_token || !disk) {
      return NextResponse.json({ success: false, error: 'agent_token and disk required' }, { status: 400 });
    }

    const { data: machine } = await supabase
      .from('storage_agent_machines')
      .select('id, workspace_id, machine_name')
      .eq('agent_token', agent_token)
      .single();

    const workspaceId = machine?.workspace_id || '00000000-0000-0000-0000-000000000000';
    const machineId = machine?.id || null;

    const diskPayload = {
      workspace_id: workspaceId,
      disk_name: disk.disk_name || disk.disk_label || 'External Drive',
      disk_serial: disk.disk_serial || `SN-${Date.now()}`,
      disk_label: disk.disk_label || disk.disk_name,
      drive_letter: disk.drive_letter || 'E:',
      disk_type: disk.disk_type || 'EXTERNAL_HDD',
      total_capacity_bytes: disk.total_capacity_bytes || 0,
      free_capacity_bytes: disk.free_capacity_bytes || 0,
      total_capacity_gb: disk.total_capacity_gb || 0,
      free_capacity_gb: disk.free_capacity_gb || 0,
      last_connected_machine_id: machineId,
      is_currently_mounted: true,
      last_scanned_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data: diskRow, error: diskErr } = await supabase
      .from('storage_physical_disks')
      .upsert([diskPayload], { onConflict: 'workspace_id,disk_name' })
      .select()
      .single();

    const physicalDiskId = diskRow?.id || null;

    const { data: clients } = await supabase
      .from('workspace_clients')
      .select('id, name')
      .eq('workspace_id', workspaceId);

    const clientList = clients || [];

    if (Array.isArray(items) && items.length > 0) {
      const itemsToInsert = items.map((it: any) => {
        const matched = clientList.find(c =>
          it.folder_name.toLowerCase().includes(c.name.toLowerCase()) ||
          c.name.toLowerCase().includes(it.folder_name.toLowerCase())
        );

        return {
          workspace_id: workspaceId,
          storage_source_type: 'PHYSICAL_DISK',
          physical_disk_id: physicalDiskId,
          client_id: matched?.id || null,
          client_name: matched?.name || it.folder_name,
          folder_name: it.folder_name,
          folder_path: it.folder_path,
          relative_path: it.relative_path || it.folder_path,
          total_size_bytes: it.total_size_bytes || 0,
          photo_count: it.photo_count || 0,
          video_count: it.video_count || 0,
          other_files_count: it.other_files_count || 0,
          event_category: it.event_category || 'RAW_PHOTOS',
          tags: it.tags || ['raw photos'],
          last_modified_at: it.last_modified_at || new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
      });

      try { await supabase.from('storage_indexed_items').insert(itemsToInsert); } catch (_) {}
    }

    return NextResponse.json({
      success: true,
      message: `Synced disk ${disk.disk_name} on ${machine?.machine_name || 'PC'}`,
      disk_id: physicalDiskId,
      items_count: items?.length || 0,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err?.message }, { status: 500 });
  }
}
