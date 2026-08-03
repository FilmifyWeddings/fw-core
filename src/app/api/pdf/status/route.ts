import { NextRequest, NextResponse } from 'next/server';
import { PDFJobQueue } from '@/lib/pdf';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const jobId = searchParams.get('jobId');

  if (!jobId) {
    return NextResponse.json({ error: 'Missing required query parameter: jobId' }, { status: 400 });
  }

  const queue = PDFJobQueue.getInstance();
  const job = queue.getJob(jobId);

  if (!job) {
    return NextResponse.json({ error: `Job with ID '${jobId}' not found.` }, { status: 404 });
  }

  return NextResponse.json({
    jobId: job.id,
    status: job.status,
    progress: job.progress,
    createdAt: job.createdAt,
    updatedAt: job.updatedAt,
    completedAt: job.completedAt,
    error: job.error,
    stack: job.stack,
    downloadUrl: job.downloadUrl,
  });
}
