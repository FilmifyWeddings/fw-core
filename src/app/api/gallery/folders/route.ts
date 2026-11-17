import { NextRequest } from 'next/server';
import { GET as collectionsGET, POST as collectionsPOST, PATCH as collectionsPATCH, DELETE as collectionsDELETE } from '../collections/route';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  return collectionsGET(req);
}

export async function POST(req: NextRequest) {
  return collectionsPOST(req);
}

export async function PATCH(req: NextRequest) {
  return collectionsPATCH(req);
}

export async function DELETE(req: NextRequest) {
  return collectionsDELETE(req);
}
