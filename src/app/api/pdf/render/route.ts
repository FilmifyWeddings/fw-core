import { NextRequest, NextResponse } from 'next/server';
import { PDFDocument } from 'pdf-lib';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false }
});

// POST /api/quotations/pdf - Enterprise Single Unified PDF Generation Pipeline (100% Device Parity)
export async function POST(req: NextRequest) {
  const startTime = Date.now();
  const userAgent = req.headers.get('user-agent') || 'Unknown';
  const clientIp = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'Unknown IP';
  const origin = req.headers.get('origin') || 'Unknown Origin';

  console.log('[PDF Pipeline] ==================================================');
  console.log('[PDF Pipeline] STAGE 1: Download Request Initiated');
  console.log('[PDF Pipeline] Request Source IP:', clientIp);
  console.log('[PDF Pipeline] Request Origin:', origin);
  console.log('[PDF Pipeline] User-Agent:', userAgent);

  try {
    // STAGE 2: Payload Parsing & Diagnostics
    console.log('[PDF Pipeline] STAGE 2: Request Payload Parsing');
    const contentType = req.headers.get('content-type') || '';

    let body: any = {};
    if (contentType.includes('application/x-www-form-urlencoded') || contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      const payloadStr = formData.get('payload') as string;
      if (payloadStr) {
        body = JSON.parse(payloadStr);
      }
    } else {
      try {
        body = await req.json();
      } catch (e: any) {
        console.error('[PDF Pipeline STAGE 2 ERROR] JSON Parsing Failed:', e.message);
        body = {};
      }
    }

    const payloadSize = JSON.stringify(body).length;
    const { quotationId, templateId, filename, content_json, pageSnapshots, pageImages } = body;
    const targetId = quotationId || templateId;
    const rawImages: string[] = pageImages || pageSnapshots || [];

    console.log('[PDF Pipeline] Payload Size:', payloadSize, 'bytes');
    console.log('[PDF Pipeline] Target Quotation ID:', targetId || 'N/A');
    console.log('[PDF Pipeline] pageImages Count:', rawImages.length);

    // STAGE 3: Single Pipeline Execution Selection
    console.log('[PDF Pipeline] STAGE 3: Pipeline Execution Selection');

    if (!rawImages || !Array.isArray(rawImages) || rawImages.length === 0) {
      console.error('[PDF Pipeline STAGE 3 ERROR] Missing pageImages in payload!');
      return NextResponse.json({
        error: 'Missing Page Snapshots',
        stage: 'STAGE 3: Pipeline Selection',
        detail: 'The client did not include high-DPI pageImages in the request payload.',
        payloadSize: payloadSize,
        pageImagesCount: 0,
        suggestion: 'Verify that handleDownloadPDFCanvas in the client builder generated pageImages before submitting.'
      }, { status: 400 });
    }

    console.log('[PDF Pipeline] Pipeline Selected: pdf-lib Full-Bleed High-DPI Snapshot Compilation Engine');

    // STAGE 4: PDF Document Construction
    console.log('[PDF Pipeline] STAGE 4: PDF Document Construction via pdf-lib');
    const pdfDoc = await PDFDocument.create();

    for (let i = 0; i < rawImages.length; i++) {
      const dataUrl = rawImages[i];
      if (!dataUrl || typeof dataUrl !== 'string') {
        console.warn(`[PDF Pipeline STAGE 4 Warning] Skipping invalid image at index ${i}`);
        continue;
      }

      const base64Data = dataUrl.replace(/^data:image\/(png|jpeg|jpg);base64,/, '');
      const imageBuffer = Buffer.from(base64Data, 'base64');

      let embeddedImage;
      if (dataUrl.startsWith('data:image/jpeg') || dataUrl.startsWith('data:image/jpg')) {
        embeddedImage = await pdfDoc.embedJpg(imageBuffer);
      } else {
        embeddedImage = await pdfDoc.embedPng(imageBuffer);
      }

      const pdfWidth = 595.28;
      const pdfHeight = 841.89;

      const pdfPage = pdfDoc.addPage([pdfWidth, pdfHeight]);
      pdfPage.drawImage(embeddedImage, {
        x: 0,
        y: 0,
        width: pdfWidth,
        height: pdfHeight
      });
    }

    // STAGE 5: PDF Binary Serialization & Timing Metrics
    console.log('[PDF Pipeline] STAGE 5: PDF Serialization & Compression');
    const pdfBytes = await pdfDoc.save();
    const durationMs = Date.now() - startTime;

    console.log('[PDF Pipeline] STAGE 6: Response Delivery');
    console.log('[PDF Pipeline] Generated PDF Buffer Size:', pdfBytes.length, 'bytes');
    console.log('[PDF Pipeline] Total PDF Generation Duration:', durationMs, 'ms');
    console.log('[PDF Pipeline] ==================================================');

    const safeFilename = (filename || `${targetId || 'Quotation'}.pdf`)
      .replace(/–/g, '-')
      .replace(/—/g, '-')
      .replace(/[^ -~]/g, '-');

    return new NextResponse(new Uint8Array(pdfBytes), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${safeFilename}"`,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Access-Control-Allow-Origin': '*'
      }
    });
  } catch (err: any) {
    const durationMs = Date.now() - startTime;
    console.error('[PDF Pipeline UNHANDLED FAILURE] Elapsed:', durationMs, 'ms Error:', err);
    return NextResponse.json({
      error: 'PDF Pipeline Unhandled Failure',
      stage: 'STAGE 4/5: PDF Processing',
      message: err.message || 'Internal Server Error',
      durationMs: durationMs
    }, { status: 500 });
  }
}
