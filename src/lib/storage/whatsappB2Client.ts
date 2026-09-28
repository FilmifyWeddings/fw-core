import { S3Client } from '@aws-sdk/client-s3';

const clean = (val?: string) => (val ? val.replace(/^["'\\]+|["'\\]+$/g, '').trim() : '');

export const whatsappB2Client = new S3Client({
  endpoint: clean(process.env.B2_ENDPOINT) || 'https://s3.eu-central-003.backblazeb2.com',
  region: clean(process.env.B2_REGION) || 'eu-central-003',
  credentials: {
    accessKeyId: clean(process.env.B2_ACCESS_KEY_ID) || '',
    secretAccessKey: clean(process.env.B2_SECRET_ACCESS_KEY) || '',
  },
});

export const B2_WHATSAPP_BUCKET = clean(process.env.B2_WHATSAPP_BUCKET_NAME) || 'studiocore-whatsapp-media';
