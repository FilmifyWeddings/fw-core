import { NextRequest, NextResponse } from 'next/server';
import {
  formatContentDispositionHeader,
  PDFDocumentPayload,
  PDFJobQueue,
  PDFRenderingEngine,
} from '@/lib/pdf';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body: PDFDocumentPayload = await req.json();

    if (!body || !body.pages || !Array.isArray(body.pages) || body.pages.length === 0) {
      return NextResponse.json(
        { error: 'Invalid request body. Expected PDFDocumentPayload with non-empty pages array.' },
        { status: 400 }
      );
    }

    // 1. Asynchronous Job Queue Request
    if (body.async) {
      const queue = PDFJobQueue.getInstance();
      const job = queue.createJob(body);
      return NextResponse.json(
        {
          jobId: job.id,
          status: job.status,
          statusUrl: `/api/pdf/status?jobId=${job.id}`,
          downloadUrl: `/api/pdf/download/${job.id}`,
        },
        { status: 202 }
      );
    }

    // 2. Synchronous Render Request
    const pdfBuffer = await PDFRenderingEngine.renderDocument(body);
    const contentDisposition = formatContentDispositionHeader(
      body.filename || `${body.title || 'StudioCore_Document'}.pdf`
    );

    return new Response(pdfBuffer as unknown as BodyInit, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': contentDisposition,
        'Cache-Control': 'no-cache',
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        error: err?.message || 'PDF Generation Failed',
        stack: err?.stack || '',
      },
      { status: 500 }
    );
  }
}
