import { BrowserPool } from '../browser/pool';
import { PDFStitcher } from '../merger/stitcher';
import { PDFDocumentPayload } from '../types';
import { PDFLogger } from '../utils/logger';
import { MemoryManager } from '../optimizer/memory';

export class PDFRenderingEngine {
  static async renderDocument(payload: PDFDocumentPayload): Promise<Uint8Array> {
    if (!payload.pages || !payload.pages.length) {
      throw new Error('PDF Engine Exception: Cannot render document with zero pages.');
    }

    const pool = BrowserPool.getInstance();
    const browserWrapper = await pool.acquire();

    try {
      PDFLogger.info(`Rendering document "${payload.title || 'Untitled'}" with ${payload.pages.length} page(s)...`);
      const pdfBuffer = await PDFStitcher.renderMultiPageDocument(browserWrapper, payload);
      PDFLogger.info(`Document "${payload.title || 'Untitled'}" rendered successfully (${pdfBuffer.length} bytes).`);
      return pdfBuffer;
    } catch (err: any) {
      PDFLogger.error(`PDF Rendering failed for document "${payload.title}"`, err);
      throw err;
    } finally {
      pool.release(browserWrapper);
      MemoryManager.triggerGC();
    }
  }
}
