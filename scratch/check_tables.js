const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const envContent = fs.readFileSync(path.join(__dirname, '../.env.local'), 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    let val = (match[2] || '').trim();
    if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
    if (val.startsWith("'") && val.endsWith("'")) val = val.slice(1, -1);
    env[match[1]] = val;
  }
});

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function test() {
  const { data: tasks, error: tErr } = await supabase.from('fw_tasks').select('*').limit(1);
  console.log('fw_tasks:', tErr ? tErr.message : Object.keys(tasks[0] || { empty: true }));

  const { data: folders, error: fErr } = await supabase.from('fw_task_folders').select('*').limit(1);
  console.log('fw_task_folders:', fErr ? fErr.message : Object.keys(folders[0] || { empty: true }));

  const { data: notes, error: nErr } = await supabase.from('fw_notes').select('*').limit(1);
  console.log('fw_notes:', nErr ? nErr.message : Object.keys(notes[0] || { empty: true }));

  const { data: comments, error: cErr } = await supabase.from('fw_task_comments').select('*').limit(1);
  console.log('fw_task_comments:', cErr ? cErr.message : Object.keys(comments[0] || { empty: true }));

  const { data: activity, error: aErr } = await supabase.from('fw_task_activity').select('*').limit(1);
  console.log('fw_task_activity:', aErr ? aErr.message : Object.keys(activity[0] || { empty: true }));
}

test();
