import { NextRequest, NextResponse } from 'next/server';
import { formatContentDispositionHeader, PDFJobQueue } from '@/lib/pdf';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const queue = PDFJobQueue.getInstance();
  const job = queue.getJob(id);

  if (!job) {
    return NextResponse.json({ error: `Job with ID '${id}' not found.` }, { status: 404 });
  }

  if (job.status !== 'COMPLETED' || !job.pdfBuffer) {
    return NextResponse.json(
      { error: `Job '${id}' is not yet completed. Current status: ${job.status}` },
      { status: 400 }
    );
  }

  const contentDisposition = formatContentDispositionHeader(job.filename || 'Document.pdf');

  return new Response(job.pdfBuffer as unknown as BodyInit, {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': contentDisposition,
      'Cache-Control': 'no-cache',
    },
  });
}
