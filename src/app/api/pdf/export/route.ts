import { NextRequest, NextResponse } from 'next/server';
import { exportPDFDocument, formatContentDispositionHeader, PDFDocumentPayload } from '@/lib/pdf';

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

    const pdfBuffer = await exportPDFDocument(body);
    const contentDisposition = formatContentDispositionHeader(body.filename || `${body.title || 'StudioCore_Document'}.pdf`);

    return new Response(pdfBuffer as unknown as BodyInit, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': contentDisposition,
        'Cache-Control': 'no-cache',
      },
    });
  } catch (err: any) {
    console.error('[PDF Engine API Error]:', err?.stack || err);
    return NextResponse.json(
      {
        error: err?.message || 'PDF Generation Failed',
        stack: process.env.NODE_ENV === 'development' ? err?.stack : undefined,
      },
      { status: 500 }
    );
  }
}
