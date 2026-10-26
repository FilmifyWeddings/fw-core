'use client';

import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { batchUploadPhotos, getUploadedManifest } from '../lib/imageProcessor';

export interface UploadJob {
  id: string;
  galleryId: string;
  collectionId?: string;
  collectionName: string;
  files: File[];
  completedCount: number;
  totalCount: number;
  percentage: number;
  currentFileName?: string;
  status: 'queued' | 'uploading' | 'completed' | 'paused' | 'failed';
  errors: string[];
  abortController?: AbortController;
  startedAt: number;
  completedAt?: number;
}

export interface InterruptedJobInfo {
  galleryId: string;
  collectionName: string;
  completedCount: number;
  totalCount: number;
  collectionId?: string;
}

interface UploadQueueContextType {
  jobs: UploadJob[];
  activeJobCount: number;
  isDrawerOpen: boolean;
  setIsDrawerOpen: (open: boolean) => void;
  isMinimized: boolean;
  setIsMinimized: (minimized: boolean) => void;
  interruptedJob: InterruptedJobInfo | null;
  dismissInterrupted: () => void;
  enqueueUpload: (
    galleryId: string,
    collectionId: string | undefined,
    collectionName: string,
    files: File[],
    workspaceId?: string
  ) => string;
  cancelJob: (jobId: string) => void;
  retryJob: (jobId: string) => void;
  clearCompleted: () => void;
}

const UploadQueueContext = createContext<UploadQueueContextType | undefined>(undefined);

const SESSION_KEY = 'sc_active_upload_session';

export function UploadQueueProvider({ children }: { children: React.ReactNode }) {
  const [jobs, setJobs] = useState<UploadJob[]>([]);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [interruptedJob, setInterruptedJob] = useState<InterruptedJobInfo | null>(null);

  // Keep a ref to jobs for worker access
  const jobsRef = useRef<UploadJob[]>([]);
  jobsRef.current = jobs;

  const isProcessingRef = useRef(false);

  // Check for interrupted job on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(SESSION_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.totalCount > parsed.completedCount) {
          // If less than 12 hours old
          if (Date.now() - (parsed.timestamp || 0) < 12 * 60 * 60 * 1000) {
            setInterruptedJob({
              galleryId: parsed.galleryId,
              collectionName: parsed.collectionName || 'Collection',
              completedCount: parsed.completedCount || 0,
              totalCount: parsed.totalCount || 0,
              collectionId: parsed.collectionId,
            });
            setIsDrawerOpen(true);
          }
        }
      }
    } catch (_) {}
  }, []);

  const dismissInterrupted = useCallback(() => {
    setInterruptedJob(null);
    try {
      localStorage.removeItem(SESSION_KEY);
    } catch (_) {}
  }, []);

  // Update session storage for active uploads
  const updateSessionPersistence = useCallback((job: UploadJob | null) => {
    try {
      if (job && (job.status === 'uploading' || job.status === 'queued')) {
        localStorage.setItem(
          SESSION_KEY,
          JSON.stringify({
            galleryId: job.galleryId,
            collectionId: job.collectionId,
            collectionName: job.collectionName,
            completedCount: job.completedCount,
            totalCount: job.totalCount,
            timestamp: Date.now(),
          })
        );
      } else {
        localStorage.removeItem(SESSION_KEY);
      }
    } catch (_) {}
  }, []);

  // Main Queue Processor
  const processQueue = useCallback(async () => {
    if (isProcessingRef.current) return;

    // Find next queued job
    const nextJob = jobsRef.current.find((j) => j.status === 'queued');
    if (!nextJob) {
      updateSessionPersistence(null);
      return;
    }

    isProcessingRef.current = true;
    const controller = new AbortController();

    // Mark job uploading
    setJobs((prev) =>
      prev.map((j) =>
        j.id === nextJob.id ? { ...j, status: 'uploading', abortController: controller } : j
      )
    );

    updateSessionPersistence({ ...nextJob, status: 'uploading' });

    try {
      const result = await batchUploadPhotos(
        nextJob.galleryId,
        nextJob.files,
        (current, total, percentage, currentFileName) => {
          setJobs((prev) =>
            prev.map((j) => {
              if (j.id === nextJob.id) {
                const updated = {
                  ...j,
                  completedCount: current,
                  totalCount: total,
                  percentage,
                  currentFileName,
                };
                updateSessionPersistence(updated);
                return updated;
              }
              return j;
            })
          );
        },
        nextJob.collectionId,
        undefined,
        controller.signal
      );

      // Mark completed or failed with accurate counts and error preservation
      setJobs((prev) =>
        prev.map((j) =>
          j.id === nextJob.id
            ? {
                ...j,
                completedCount: result.uploadedCount,
                status: result.success ? 'completed' : result.uploadedCount > 0 ? 'completed' : 'failed',
                percentage: Math.round((result.uploadedCount / j.totalCount) * 100),
                completedAt: Date.now(),
                errors: result.errors,
              }
            : j
        )
      );

      // Clean up session persistence
      updateSessionPersistence(null);
      setInterruptedJob(null);

      // Dispatch global event for live gallery / people refresh
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('studiocore:gallery_updated', {
            detail: { galleryId: nextJob.galleryId, collectionId: nextJob.collectionId },
          })
        );
      }
    } catch (err: any) {
      console.warn('[UploadQueue] Job error or cancelled:', err.message);
      setJobs((prev) =>
        prev.map((j) =>
          j.id === nextJob.id
            ? {
                ...j,
                status: err.message.includes('cancelled') ? 'paused' : 'failed',
                errors: [...j.errors, err.message],
              }
            : j
        )
      );
    } finally {
      isProcessingRef.current = false;
      // Continue with remaining queue
      setTimeout(processQueue, 300);
    }
  }, [updateSessionPersistence]);

  const enqueueUpload = useCallback(
    (
      galleryId: string,
      collectionId: string | undefined,
      collectionName: string,
      files: File[],
      workspaceId?: string
    ): string => {
      if (files.length === 0) return '';

      const jobId = `job_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      const newJob: UploadJob = {
        id: jobId,
        galleryId,
        collectionId: collectionId && collectionId !== 'all' ? collectionId : undefined,
        collectionName: collectionName || 'Default Collection',
        files,
        completedCount: 0,
        totalCount: files.length,
        percentage: 0,
        status: 'queued',
        errors: [],
        startedAt: Date.now(),
      };

      setJobs((prev) => [...prev, newJob]);
      setIsDrawerOpen(true);
      setIsMinimized(false);

      // Clear any prior interrupted banner for this gallery
      if (interruptedJob?.galleryId === galleryId) {
        dismissInterrupted();
      }

      // Trigger processor
      setTimeout(processQueue, 50);
      return jobId;
    },
    [interruptedJob, dismissInterrupted, processQueue]
  );

  const cancelJob = useCallback((jobId: string) => {
    setJobs((prev) =>
      prev.map((j) => {
        if (j.id === jobId) {
          if (j.abortController) {
            j.abortController.abort();
          }
          return { ...j, status: 'paused' };
        }
        return j;
      })
    );
  }, []);

  const retryJob = useCallback((jobId: string) => {
    setJobs((prev) =>
      prev.map((j) => {
        if (j.id === jobId) {
          return {
            ...j,
            status: 'queued',
            errors: [],
            percentage: 0,
            completedCount: 0,
          };
        }
        return j;
      })
    );
    setTimeout(processQueue, 50);
  }, [processQueue]);

  const clearCompleted = useCallback(() => {
    setJobs((prev) => prev.filter((j) => j.status !== 'completed' && j.status !== 'paused'));
  }, []);

  const activeJobCount = jobs.filter((j) => j.status === 'uploading' || j.status === 'queued').length;

  return (
    <UploadQueueContext.Provider
      value={{
        jobs,
        activeJobCount,
        isDrawerOpen,
        setIsDrawerOpen,
        isMinimized,
        setIsMinimized,
        interruptedJob,
        dismissInterrupted,
        enqueueUpload,
        cancelJob,
        retryJob,
        clearCompleted,
      }}
    >
      {children}
    </UploadQueueContext.Provider>
  );
}

export function useUploadQueue() {
  const context = useContext(UploadQueueContext);
  if (!context) {
    throw new Error('useUploadQueue must be used within an UploadQueueProvider');
  }
  return context;
}
