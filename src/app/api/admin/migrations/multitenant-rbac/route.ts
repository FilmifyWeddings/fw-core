import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  try {
    const migrationPath = path.join(process.cwd(), 'supabase', 'migrations', '20260827_enterprise_multitenant_rbac.sql');
    if (fs.existsSync(migrationPath)) {
      const sql = fs.readFileSync(migrationPath, 'utf8');
      return NextResponse.json({ success: true, sql });
    }
    return NextResponse.json({ error: 'Migration file not found' }, { status: 404 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
