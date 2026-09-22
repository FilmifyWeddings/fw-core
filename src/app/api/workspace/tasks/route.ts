import { NextRequest, NextResponse } from 'next/server';
import {
  getWorkspaceTasksAndFolders,
  createFolder,
  updateFolder,
  deleteFolder,
  restoreFolder,
  emptyTrash,
  createTask,
  updateTask,
  deleteTask,
  restoreTask,
  toggleTaskCompletion,
  updateTaskChecklist,
  syncClientPostProductionTasks,
  addTaskComment,
  applyPhotographyTemplate,
  getFolderActivityLogs,
  logTaskActivity,
  togglePersonalFolderPin,
} from '@/lib/services/taskService';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const folderActivityId = searchParams.get('folderActivityId');
    if (folderActivityId) {
      const logs = await getFolderActivityLogs(folderActivityId);
      return NextResponse.json({ success: true, logs });
    }

    const workspaceId = searchParams.get('workspaceId');
    const currentUserId = searchParams.get('userId') || searchParams.get('currentUserId') || '';
    const userEmail = searchParams.get('userEmail') || searchParams.get('email') || undefined;

    if (!workspaceId) {
      return NextResponse.json({ error: 'workspaceId is required' }, { status: 400 });
    }

    const rawStatusList = searchParams.get('statusList');
    const rawMemberIds = searchParams.get('teamMemberIds');

    const filters = {
      folderId: searchParams.get('folderId') as any,
      clientId: searchParams.get('clientId') || undefined,
      projectId: searchParams.get('projectId') || undefined,
      search: searchParams.get('search') || undefined,
      category: searchParams.get('category') || undefined,
      priority: searchParams.get('priority') || undefined,
      status: searchParams.get('status') || undefined,
      label: searchParams.get('label') || undefined,
      startDate: searchParams.get('startDate') || undefined,
      endDate: searchParams.get('endDate') || undefined,
      statusList: rawStatusList ? rawStatusList.split(',') : undefined,
      teamMemberIds: rawMemberIds ? rawMemberIds.split(',') : undefined,
    };

    const result = await getWorkspaceTasksAndFolders(workspaceId, currentUserId, filters, userEmail);
    return NextResponse.json({ success: true, ...result });
  } catch (error: any) {
    console.error('[API Tasks GET error]:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch tasks' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action } = body;

    if (action === 'create_folder') {
      const folder = await createFolder(body.folderData);
      if (folder) {
        const actorName = body.actorName || body.folderData?.actor_name || 'Studio Owner';
        const actorEmail = body.actorEmail || body.folderData?.actor_email || null;
        logTaskActivity({
          workspaceId: folder.workspace_id,
          folderId: folder.id,
          actorName,
          actorEmail,
          actionType: 'FOLDER_CREATED',
          description: `${actorName} created card "${folder.title}"`,
        });
      }
      return NextResponse.json({ success: true, folder });
    }

    if (action === 'create_task') {
      const actorName = body.actorName || body.taskData?.actor_name || 'Team Member';
      const actorEmail = body.actorEmail || body.taskData?.actor_email || null;
      const task = await createTask({
        ...body.taskData,
        actor_name: actorName,
        actor_email: actorEmail,
      });
      return NextResponse.json({ success: true, task });
    }

    if (action === 'toggle_completion') {
      const { taskId, isCompleted, userId, actorName, actorEmail } = body;
      const updated = await toggleTaskCompletion(taskId, isCompleted, userId, actorName, actorEmail);
      return NextResponse.json({ success: true, task: updated });
    }

    if (action === 'update_checklist') {
      const { taskId, checklistItems } = body;
      const updated = await updateTaskChecklist(taskId, checklistItems);
      return NextResponse.json({ success: true, task: updated });
    }

    if (action === 'add_comment') {
      const { taskId, comment } = body;
      const newComment = await addTaskComment(taskId, comment);
      return NextResponse.json({ success: true, comment: newComment });
    }

    if (action === 'apply_template') {
      const { templateId, workspaceId, userId, clientId, projectId } = body;
      const createdTasks = await applyPhotographyTemplate(templateId, workspaceId, userId, clientId, projectId);
      return NextResponse.json({ success: true, tasks: createdTasks });
    }

    if (action === 'sync_client_pipeline') {
      const { clientId, projectId, workspaceId, userId } = body;
      const result = await syncClientPostProductionTasks(clientId, projectId, workspaceId, userId);
      return NextResponse.json({ success: true, ...result });
    }

    if (action === 'restore_folder') {
      await restoreFolder(body.folderId);
      return NextResponse.json({ success: true, message: 'Folder restored' });
    }

    if (action === 'restore_task') {
      await restoreTask(body.taskId);
      return NextResponse.json({ success: true, message: 'Task restored' });
    }

    if (action === 'empty_trash') {
      await emptyTrash(body.workspaceId);
      return NextResponse.json({ success: true, message: 'Trash emptied' });
    }

    // Default: create a task
    const task = await createTask(body);
    return NextResponse.json({ success: true, task });
  } catch (error: any) {
    console.error('[API Tasks POST error]:', error);
    return NextResponse.json({ error: error.message || 'Task operation failed' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { type, id, updates, actorName, actorEmail, userId } = body;

    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }

    if (type === 'personal_pin') {
      const { userId: pinUserId, isPinned } = body;
      const pinnedBy = await togglePersonalFolderPin(id, pinUserId, Boolean(isPinned), actorName);
      return NextResponse.json({ success: true, pinned_by: pinnedBy });
    }

    if (type === 'folder') {
      const folder = await updateFolder(id, updates);
      if (updates.is_pinned !== undefined) {
        logTaskActivity({
          folderId: id,
          actorName: actorName || 'Studio Admin',
          actorEmail: actorEmail || null,
          actionType: updates.is_pinned ? 'CARD_PINNED' : 'CARD_UNPINNED',
          description: updates.is_pinned ? `${actorName || 'Studio Admin'} pinned this card` : `${actorName || 'Studio Admin'} unpinned this card`,
        });
      }
      if (updates.allow_member_edits !== undefined) {
        logTaskActivity({
          folderId: id,
          actorName: actorName || 'Studio Admin',
          actorEmail: actorEmail || null,
          actionType: 'PERMISSION_CHANGED',
          description: updates.allow_member_edits ? `${actorName || 'Studio Admin'} enabled member edits for tasks & deadlines` : `${actorName || 'Studio Admin'} disabled member edits (checkmark-only access)`,
        });
      }
      return NextResponse.json({ success: true, folder });
    }

    // Default type === 'task'
    const task = await updateTask(id, updates, actorName, actorEmail, userId);
    return NextResponse.json({ success: true, task });
  } catch (error: any) {
    console.error('[API Tasks PATCH error]:', error);
    return NextResponse.json({ error: error.message || 'Update failed' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type') || 'task';
    const id = searchParams.get('id');
    const permanent = searchParams.get('permanent') === 'true';
    const workspaceId = searchParams.get('workspaceId') || undefined;

    if (type === 'empty_trash') {
      await emptyTrash(workspaceId);
      return NextResponse.json({ success: true, message: 'Trash emptied' });
    }

    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }

    if (type === 'folder') {
      await deleteFolder(id, permanent);
      return NextResponse.json({ success: true, message: permanent ? 'Folder deleted permanently' : 'Folder moved to trash' });
    }

    await deleteTask(id, permanent);
    return NextResponse.json({ success: true, message: permanent ? 'Task deleted permanently' : 'Task moved to trash' });
  } catch (error: any) {
    console.error('[API Tasks DELETE error]:', error);
    return NextResponse.json({ error: error.message || 'Delete failed' }, { status: 500 });
  }
}
