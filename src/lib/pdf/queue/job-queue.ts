import { PDFDocumentPayload, PDFJob } from '../types';
import { PDFRenderingEngine } from '../renderer/engine';
import { PDFLogger } from '../utils/logger';

export class PDFJobQueue {
  private static instance: PDFJobQueue;
  private jobs: Map<string, PDFJob> = new Map();

  private constructor() {}

  static getInstance(): PDFJobQueue {
    if (!PDFJobQueue.instance) {
      PDFJobQueue.instance = new PDFJobQueue();
    }
    return PDFJobQueue.instance;
  }

  createJob(payload: PDFDocumentPayload): PDFJob {
    const id = `job_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const job: PDFJob = {
      id,
      status: 'QUEUED',
      progress: 0,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      filename: payload.filename || `${payload.title || 'Document'}.pdf`,
    };

    this.jobs.set(id, job);

    // Process job asynchronously in background queue
    this.processJob(job, payload).catch((err) => {
      PDFLogger.error(`Async Job ${id} processing exception:`, err);
    });

    return job;
  }

  getJob(id: string): PDFJob | undefined {
    return this.jobs.get(id);
  }

  private async processJob(job: PDFJob, payload: PDFDocumentPayload): Promise<void> {
    job.status = 'PROCESSING';
    job.progress = 25;
    job.updatedAt = Date.now();

    try {
      PDFLogger.info(`Starting async job ${job.id}...`);
      job.progress = 50;
      const pdfBuffer = await PDFRenderingEngine.renderDocument(payload);

      job.status = 'COMPLETED';
      job.progress = 100;
      job.pdfBuffer = pdfBuffer;
      job.completedAt = Date.now();
      job.updatedAt = Date.now();
      job.downloadUrl = `/api/pdf/download/${job.id}`;
      PDFLogger.info(`Completed async job ${job.id}`);
    } catch (err: any) {
      job.status = 'FAILED';
      job.progress = 0;
      job.error = err?.message || 'Async render error';
      job.stack = err?.stack || '';
      job.updatedAt = Date.now();
    }
  }
}
