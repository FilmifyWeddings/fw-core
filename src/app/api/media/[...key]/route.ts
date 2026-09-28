import { NextRequest, NextResponse } from 'next/server';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { whatsappB2Client, B2_WHATSAPP_BUCKET } from '@/lib/storage/whatsappB2Client';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ key: string[] }> }
) {
  try {
    const resolvedParams = await params;
    const keyArray = resolvedParams?.key;

    if (!keyArray || keyArray.length === 0) {
      return new NextResponse('File key missing', { status: 400 });
    }

    // Join decoded key path components
    const fileKey = Array.isArray(keyArray)
      ? keyArray.map((part) => decodeURIComponent(part)).join('/')
      : decodeURIComponent(String(keyArray));

    const command = new GetObjectCommand({
      Bucket: B2_WHATSAPP_BUCKET,
      Key: fileKey,
    });

    const response = await whatsappB2Client.send(command);

    if (!response.Body) {
      return new NextResponse('File body missing', { status: 404 });
    }

    // Stream directly back to requester
    const stream = (response.Body as any).transformToWebStream();
    const headers = new Headers();
    headers.set('Content-Type', response.ContentType || 'image/webp');
    headers.set('Cache-Control', 'public, max-age=31536000, immutable');
    if (response.ContentLength) {
      headers.set('Content-Length', response.ContentLength.toString());
    }

    return new NextResponse(stream, { headers });
  } catch (error: any) {
    console.error('Error fetching file from B2 proxy:', error);
    if (error.name === 'NoSuchKey' || error.$metadata?.httpStatusCode === 404) {
      return new NextResponse('Media not found on storage', { status: 404 });
    }
    return new NextResponse('Internal media stream error', { status: 500 });
  }
}

export async function HEAD(
  req: NextRequest,
  { params }: { params: Promise<{ key: string[] }> }
) {
  try {
    const resolvedParams = await params;
    const keyArray = resolvedParams?.key;

    if (!keyArray || keyArray.length === 0) {
      return new NextResponse(null, { status: 400 });
    }

    const fileKey = Array.isArray(keyArray)
      ? keyArray.map((part) => decodeURIComponent(part)).join('/')
      : decodeURIComponent(String(keyArray));

    const command = new GetObjectCommand({
      Bucket: B2_WHATSAPP_BUCKET,
      Key: fileKey,
    });

    const response = await whatsappB2Client.send(command);

    const headers = new Headers();
    headers.set('Content-Type', response.ContentType || 'image/webp');
    headers.set('Cache-Control', 'public, max-age=31536000, immutable');
    if (response.ContentLength) {
      headers.set('Content-Length', response.ContentLength.toString());
    }

    return new NextResponse(null, { headers });
  } catch (error: any) {
    if (error.name === 'NoSuchKey' || error.$metadata?.httpStatusCode === 404) {
      return new NextResponse(null, { status: 404 });
    }
    return new NextResponse(null, { status: 500 });
  }
}
