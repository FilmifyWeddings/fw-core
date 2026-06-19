import fs from 'fs';
import readline from 'readline';

async function readLastLines() {
  const fileStream = fs.createReadStream('C:/Users/Sahil Dhonde/.gemini/antigravity/brain/d7745a15-c601-4c4c-9f77-9b5928d754a9/.system_generated/logs/transcript.jsonl');
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  const matches = [];
  for await (const line of rl) {
    if (line.includes('apply_migration') || line.includes('exec_sql') || line.includes('20260620000001')) {
      matches.push(line);
    }
  }

  console.log(`Found ${matches.length} matches. Last 10 matches:`);
  matches.slice(-10).forEach(m => {
    try {
      const parsed = JSON.parse(m);
      console.log(`Type: ${parsed.type}, Status: ${parsed.status}`);
      console.log(`Content snippet: ${JSON.stringify(parsed.content || '').slice(0, 300)}`);
      if (parsed.tool_calls) console.log(`Tool calls:`, JSON.stringify(parsed.tool_calls));
    } catch {
      console.log(m.slice(0, 300));
    }
    console.log('---');
  });
}

readLastLines();
