import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { assignmentId, assignedMemberId, notes, instantAlerts, userId } = body;

    if (!assignmentId || userId === undefined) {
      return NextResponse.json({ error: 'Missing parameters (assignmentId, userId)' }, { status: 400 });
    }

    // 1. Fetch current assignment state including project
    const { data: assignment, error: fetchError } = await supabaseAdmin
      .from('fw_assignments')
      .select('*, fw_projects(*)')
      .eq('id', assignmentId)
      .single();

    if (fetchError || !assignment) {
      return NextResponse.json({ error: 'Assignment not found' }, { status: 404 });
    }

    const previousMemberId = assignment.assigned_member_id;
    const isNewAssignment = assignedMemberId && previousMemberId !== assignedMemberId;

    // 2. Perform the database update
    const { data: updatedAssignment, error: updateError } = await supabaseAdmin
      .from('fw_assignments')
      .update({
        assigned_member_id: assignedMemberId,
        notes: notes !== undefined ? notes : assignment.notes,
        updated_at: new Date().toISOString()
      })
      .eq('id', assignmentId)
      .select('*, fw_team_members(*)')
      .single();

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    // 3. Handle WhatsBoost Outgoing WhatsApp alert if assigned_member_id transitioned from null/other to a valid crew reference
    if (isNewAssignment && instantAlerts) {
      // Fetch details of the assigned member
      const { data: member } = await supabaseAdmin
        .from('fw_team_members')
        .select('*')
        .eq('id', assignedMemberId)
        .single();

      if (member && member.phone_number) {
        const project = assignment.fw_projects;
        const appKey = process.env.WHASTBOOST_APP_KEY;
        const authKey = process.env.WHASTBOOST_AUTH_KEY;
        
        // Fetch user profile status
        const { data: profile } = await supabaseAdmin
          .from('profiles')
          .select('whastboost_status')
          .eq('id', userId)
          .maybeSingle();

        const isMock = !authKey || authKey === 'mock-token' || !profile || profile.whastboost_status !== 'connected';
        const cleanPhone = member.phone_number.replace(/\+/g, '').replace(/[^0-9]/g, '').trim();

        const messagePayload = {
          appkey: appKey || 'mock-key',
          authkey: authKey || 'mock-token',
          to: cleanPhone,
          name: member.name,
          template_id: 'crew_assignment_alert',
          variables: {
            Name: member.name,
            Client: project?.client_name || 'Client',
            Date: assignment.sub_event_date,
            Role: assignment.required_role,
            Location: project?.main_venue || 'Venue'
          }
        };

        let status = 'sent';
        let responsePayload: any = { messageId: `mock-wamid.${Math.random().toString(36).substring(2).toUpperCase()}` };

        if (!isMock) {
          try {
            const formData = new FormData();
            formData.append('appkey', appKey || '');
            formData.append('authkey', authKey || '');
            formData.append('to', cleanPhone);
            formData.append('name', member.name);
            formData.append('template_id', 'crew_assignment_alert');
            formData.append('variables[Name]', member.name);
            formData.append('variables[Client]', project?.client_name || 'Client');
            formData.append('variables[Date]', assignment.sub_event_date);
            formData.append('variables[Role]', assignment.required_role);
            formData.append('variables[Location]', project?.main_venue || 'Venue');

            const wbRes = await fetch('https://whatsboost.in/api/create-message', {
              method: 'POST',
              body: formData
            });

            const wbData = await wbRes.json();
            responsePayload = wbData;

            if (wbRes.ok && (wbData.status === true || wbData.success === true || wbData.messageId)) {
              status = 'sent';
            } else {
              status = 'failed';
            }
          } catch (e: any) {
            status = 'failed';
            responsePayload = { error: e.message || 'Connection timeout to WhatsBoost.' };
          }
        }

        // Insert log row in fw_whatsapp_logs
        await supabaseAdmin
          .from('fw_whatsapp_logs')
          .insert({
            user_id: userId,
            assignment_id: assignmentId,
            recipient_phone: member.phone_number,
            message_payload: messagePayload,
            status: status,
            response_payload: responsePayload
          });
      }
    }

    return NextResponse.json({ success: true, data: updatedAssignment });
  } catch (err: any) {
    console.error('Crew assign error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
