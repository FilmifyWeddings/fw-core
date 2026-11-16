import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll() {
          return req.cookies.getAll();
        },
        setAll() {},
      },
    });

    let activeUser: any = null;
    const { data: { user } } = await supabase.auth.getUser();
    activeUser = user;

    if (!activeUser) {
      const authHeader = req.headers.get('authorization');
      const token = authHeader?.replace('Bearer ', '');
      if (token) {
        const { data: jwtUser } = await supabaseAdmin.auth.getUser(token);
        if (jwtUser?.user) {
          activeUser = jwtUser.user;
        }
      }
    }

    if (!activeUser) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { deliverable_id, project_id, status } = body;

    if (!deliverable_id || !status) {
      return NextResponse.json({ success: false, error: 'deliverable_id and status are required' }, { status: 400 });
    }

    const nowIso = new Date().toISOString();
    let updatedDirect = false;
    let updatedInProject = false;

    // 1. Try updating in post_production_deliverables table
    try {
      const { data: delivRow } = await supabaseAdmin
        .from('post_production_deliverables')
        .update({
          status: status,
          updated_at: nowIso,
        })
        .eq('id', deliverable_id)
        .select('id, project_id, status')
        .maybeSingle();

      if (delivRow?.id) {
        updatedDirect = true;
      }
    } catch (_) {}

    // 2. Try updating inside post_production_projects JSON deliverables array
    if (project_id) {
      try {
        const { data: projectRow } = await supabaseAdmin
          .from('post_production_projects')
          .select('id, deliverables')
          .eq('id', project_id)
          .maybeSingle();

        if (projectRow && Array.isArray(projectRow.deliverables)) {
          let found = false;
          const updatedDelivs = projectRow.deliverables.map((d: any) => {
            if (d.id === deliverable_id || d.deliverable_id === deliverable_id) {
              found = true;
              return { ...d, status, updated_at: nowIso };
            }
            return d;
          });

          if (found) {
            await supabaseAdmin
              .from('post_production_projects')
              .update({
                deliverables: updatedDelivs,
                updated_at: nowIso,
              })
              .eq('id', project_id);

            updatedInProject = true;
          }
        }
      } catch (_) {}
    } else {
      // If no project_id provided, search for project containing this deliverable_id
      try {
        const { data: projects } = await supabaseAdmin
          .from('post_production_projects')
          .select('id, deliverables')
          .limit(100);

        if (projects) {
          for (const proj of projects) {
            if (Array.isArray(proj.deliverables)) {
              let found = false;
              const updatedDelivs = proj.deliverables.map((d: any) => {
                if (d.id === deliverable_id || d.deliverable_id === deliverable_id) {
                  found = true;
                  return { ...d, status, updated_at: nowIso };
                }
                return d;
              });

              if (found) {
                await supabaseAdmin
                  .from('post_production_projects')
                  .update({
                    deliverables: updatedDelivs,
                    updated_at: nowIso,
                  })
                  .eq('id', proj.id);

                updatedInProject = true;
                break;
              }
            }
          }
        }
      } catch (_) {}
    }

    // 3. Log to audit log if possible
    try {
      await supabaseAdmin.from('live_logs').insert([{
        event_type: 'deliverable_status_change',
        actor_id: activeUser.id,
        message: `Deliverable status changed to ${status}`,
        metadata: { deliverable_id, project_id, status, updated_at: nowIso },
        created_at: nowIso,
      }]);
    } catch (_) {}

    return NextResponse.json({
      success: true,
      deliverable_id,
      status,
      updatedDirect,
      updatedInProject,
      updated_at: nowIso,
    });
  } catch (err: any) {
    console.error('[API /team/deliverable-status] Error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
