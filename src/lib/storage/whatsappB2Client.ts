import { S3Client } from '@aws-sdk/client-s3';

export const whatsappB2Client = new S3Client({
  endpoint: process.env.B2_ENDPOINT || 'https://s3.eu-central-003.backblazeb2.com',
  region: process.env.B2_REGION || 'eu-central-003',
  credentials: {
    accessKeyId: process.env.B2_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.B2_SECRET_ACCESS_KEY || '',
  },
});

export const B2_WHATSAPP_BUCKET = process.env.B2_WHATSAPP_BUCKET_NAME || 'studiocore-whatsapp-media';
