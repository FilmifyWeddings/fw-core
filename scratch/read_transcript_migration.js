import fs from 'fs';
import readline from 'readline';

async function readMigrationRuns() {
  const fileStream = fs.createReadStream('C:/Users/Sahil Dhonde/.gemini/antigravity/brain/d7745a15-c601-4c4c-9f77-9b5928d754a9/.system_generated/logs/transcript.jsonl');
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  const matches = [];
  for await (const line of rl) {
    if (line.includes('apply_migration') || line.includes('run_migration') || line.includes('20260620000001')) {
      matches.push(line);
    }
  }

  console.log(`Found ${matches.length} matches.`);
  for (const m of matches) {
    try {
      const parsed = JSON.parse(m);
      if (parsed.type === 'RUN_COMMAND' || parsed.type === 'SYSTEM_MESSAGE' || (parsed.content && parsed.content.includes('Success'))) {
        console.log(`Step: ${parsed.step_index}, Type: ${parsed.type}, Status: ${parsed.status}`);
        console.log(`Content: ${parsed.content ? parsed.content.slice(0, 1000) : ''}`);
        console.log('===');
      }
    } catch {}
  }
}

readMigrationRuns();
