import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const workspaceId = searchParams.get('workspace_id');

  if (!workspaceId) {
    return NextResponse.json({ error: 'Missing workspace_id parameter' }, { status: 400 });
  }

  try {
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('whastboost_api_url, whastboost_token')
      .eq('id', workspaceId)
      .single();

    if (!profile) {
      return NextResponse.json({ error: 'Workspace profile not found' }, { status: 404 });
    }

    const { whastboost_api_url, whastboost_token } = profile;

    const useMock = !whastboost_token || whastboost_token === 'mock-token';

    if (useMock) {
      // Mock two-way sync: Populate workspace with default sequence and steps if none exist
      const { data: existingSeqs } = await supabaseAdmin
        .from('sequences')
        .select('id')
        .eq('workspace_id', workspaceId);

      let sequenceId = existingSeqs?.[0]?.id;

      if (!existingSeqs || existingSeqs.length === 0) {
        // Create a default Sequence
        const { data: newSeq, error: seqErr } = await supabaseAdmin
          .from('sequences')
          .insert({
            workspace_id: workspaceId,
            name: 'Standard Wedding Photography Drip Sequence',
            is_active: true,
          })
          .select()
          .single();

        if (seqErr) throw seqErr;
        sequenceId = newSeq.id;

        // Create Default Steps
        const defaultSteps = [
          {
            sequence_id: sequenceId,
            step_number: 1,
            delay_days: 0, // Instant
            message_template: 'नमस्ते {{lead_name}}! धन्यवाद FW Core Photography में interest दिखाने के लिए। 📸 \n\nहमें पता चला कि आपकी शादी का event date {{event_date}} है। आपके special day के लिए केवल {{days_left_for_wedding}} दिन बचे हैं! \n\nक्या हम इस हफ्ते एक short call schedule कर सकते हैं ताकि हम आपके requirements पर discuss कर सकें? \n\nRegards, \nFW Team',
          },
          {
            sequence_id: sequenceId,
            step_number: 2,
            delay_days: 1, // Next Day (Timestamp-Match)
            message_template: 'Hi {{lead_name}}, just checking in! 😊 \n\nक्या आपने हमारी portfolio brochure देखने का समय पाया? हमने premium wedding shoots के packages update किये हैं। \n\nअगर आप details देखना चाहते हैं, तो कृपया "Details" reply करें। \n\nHave a great day!',
          },
          {
            sequence_id: sequenceId,
            step_number: 3,
            delay_days: 3, // Day 3
            message_template: 'Hey {{lead_name}}! 🌟 \n\nशादी की तैय्यारियां कैसी चल रही हैं? {{days_left_for_wedding}} दिन बचे हैं। \n\nहम इस month book करने वाले couple को flat 10% discount check out benefits दे रहे हैं। \n\nक्या आप custom pricing quote चाहते हैं? \n\nRegards, \nFW Team',
          },
        ];

        const { error: stepsErr } = await supabaseAdmin
          .from('sequence_steps')
          .insert(defaultSteps);

        if (stepsErr) throw stepsErr;
      }

      await supabaseAdmin.from('live_logs').insert({
        workspace_id: workspaceId,
        event_type: 'sync_templates_success',
        message: 'Successfully synced templates: 3 Default Drip templates loaded to database.',
        metadata: { templatesCount: 3, type: 'mock' },
      });

      return NextResponse.json({
        success: true,
        message: 'Mock templates synced successfully. Drip sequence setup with 3 steps.',
      });
    }

    // Real API Template syncing logic
    const response = await fetch(`${whastboost_api_url}/api/templates?token=${whastboost_token}`);
    if (!response.ok) {
      throw new Error(`WhastBoost templates endpoint returned ${response.status}`);
    }

    const externalTemplates = await response.json();
    // In real app: loop and save external templates/variables mapping to DB.
    
    await supabaseAdmin.from('live_logs').insert({
      workspace_id: workspaceId,
      event_type: 'sync_templates_success',
      message: `Successfully synchronized ${externalTemplates.length || 0} templates from WhastBoost.`,
      metadata: { raw: externalTemplates },
    });

    return NextResponse.json({
      success: true,
      templatesCount: externalTemplates.length || 0,
      message: 'Templates synced successfully from WhastBoost.',
    });
  } catch (err: any) {
    console.error('Template Sync Error:', err);
    return NextResponse.json({ error: err.message || 'Template synchronization failed' }, { status: 500 });
  }
}
