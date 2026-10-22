'use client';

import React, { createContext, useContext, useState, useRef, useCallback, useEffect } from 'react';

export interface ReviewUploadTask {
  id: string;
  projectId: string;
  projectTitle?: string;
  videoId?: string;
  videoTitle: string;
  versionLabel?: string;
  fileName: string;
  fileSizeBytes: number;
  formattedSize: string;
  progress: number;
  speed: string;
  status: 'queued' | 'uploading' | 'saving' | 'completed' | 'error';
  errorMessage?: string;
  xhr?: XMLHttpRequest;
  createdAt: number;
}

export function formatFileSize(bytes: number): string {
  if (!bytes || isNaN(bytes) || bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
}

interface EnqueueVideoParams {
  projectId: string;
  workspaceId: string;
  projectTitle?: string;
  title: string;
  category: string;
  file: File;
  changelogNotes?: string;
  onCompleted?: (video: any, version: any) => void;
}

interface EnqueueVersionParams {
  projectId: string;
  workspaceId: string;
  videoId: string;
  videoTitle?: string;
  versionLabel?: string;
  file: File;
  changelogNotes?: string;
  onCompleted?: (version: any) => void;
}

interface ReviewUploadContextType {
  tasks: ReviewUploadTask[];
  activeCount: number;
  isDrawerOpen: boolean;
  setIsDrawerOpen: (val: boolean) => void;
  isMinimized: boolean;
  setIsMinimized: (val: boolean) => void;
  enqueueVideoUpload: (params: EnqueueVideoParams) => string;
  enqueueVersionUpload: (params: EnqueueVersionParams) => string;
  cancelUpload: (taskId: string) => void;
  clearCompleted: () => void;
}

const ReviewUploadContext = createContext<ReviewUploadContextType | null>(null);

export function ReviewUploadProvider({ children }: { children: React.ReactNode }) {
  const [tasks, setTasks] = useState<ReviewUploadTask[]>([]);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);

  const activeCount = tasks.filter(t => t.status === 'uploading' || t.status === 'saving' || t.status === 'queued').length;

  const updateTask = useCallback((taskId: string, patch: Partial<ReviewUploadTask>) => {
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, ...patch } : t));
  }, []);

  const cancelUpload = useCallback((taskId: string) => {
    setTasks(prev => {
      const task = prev.find(t => t.id === taskId);
      if (task?.xhr) {
        try { task.xhr.abort(); } catch (_) {}
      }
      return prev.filter(t => t.id !== taskId);
    });
  }, []);

  const clearCompleted = useCallback(() => {
    setTasks(prev => prev.filter(t => t.status === 'uploading' || t.status === 'saving' || t.status === 'queued'));
  }, []);

  // 1. Process Video Asset Upload
  const startVideoUpload = useCallback(async (taskId: string, params: EnqueueVideoParams) => {
    const { projectId, workspaceId, title, category, file, changelogNotes, onCompleted } = params;

    try {
      updateTask(taskId, { status: 'uploading', progress: 5, speed: 'Starting...' });

      // Step A: Request presigned upload URL from Backblaze B2
      const presignRes = await fetch('/api/review/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filename: file.name,
          content_type: file.type || 'video/mp4',
          file_size_bytes: file.size,
          workspace_id: workspaceId,
          project_id: projectId,
        }),
      });

      const presignData = await presignRes.json();
      if (!presignData.success) {
        throw new Error(presignData.error || 'Failed to initialize video upload storage');
      }

      updateTask(taskId, { progress: 10, speed: 'Uploading...' });

      // Step B: Upload file directly to Backblaze B2 using XMLHttpRequest
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        let lastTime = Date.now();
        let lastLoaded = 0;

        xhr.open('PUT', presignData.upload_url, true);
        xhr.setRequestHeader('Content-Type', file.type || 'video/mp4');

        xhr.upload.onprogress = (evt) => {
          if (evt.lengthComputable) {
            const now = Date.now();
            const timeDiff = (now - lastTime) / 1000;
            if (timeDiff >= 0.5) {
              const bytesDiff = evt.loaded - lastLoaded;
              const bytesPerSec = bytesDiff / timeDiff;
              const speedText = bytesPerSec > 1024 * 1024 
                ? `${(bytesPerSec / (1024 * 1024)).toFixed(1)} MB/s`
                : `${(bytesPerSec / 1024).toFixed(0)} KB/s`;

              lastTime = now;
              lastLoaded = evt.loaded;

              const percent = Math.min(95, Math.round(10 + (evt.loaded / evt.total) * 85));
              updateTask(taskId, { progress: percent, speed: speedText });
            }
          }
        };

        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve();
          } else {
            reject(new Error(`Storage rejected upload with status ${xhr.status}`));
          }
        };

        xhr.onerror = () => reject(new Error('Network connection error during Backblaze B2 upload. Please check your connection.'));
        xhr.onabort = () => reject(new Error('Upload cancelled'));

        updateTask(taskId, { xhr });
        xhr.send(file);
      });

      // Step C: Register video and version metadata in DB
      updateTask(taskId, { status: 'saving', progress: 96, speed: 'Finalizing...' });

      const registerRes = await fetch('/api/review/videos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_id: projectId,
          workspace_id: workspaceId,
          title: title.trim(),
          category,
          source_type: 'upload',
          video_url: presignData.public_url,
          original_file_url: presignData.public_url,
          storage_key: presignData.key,
          file_size_bytes: file.size,
          resolution: '1080p',
          changelog_notes: changelogNotes || 'Initial cut uploaded for review',
        }),
      });

      const registerData = await registerRes.json();
      if (!registerData.success) {
        throw new Error(registerData.error || 'Failed to save video record to database');
      }

      updateTask(taskId, { 
        status: 'completed', 
        progress: 100, 
        speed: '✓ Complete',
        xhr: undefined 
      });

      if (onCompleted) {
        try { onCompleted(registerData.video, registerData.version); } catch (_) {}
      }

      // Dispatch global event for review pages to refresh data without reload
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('studiocore-review-video-ready', {
          detail: { projectId, videoId: registerData.video?.id, versionId: registerData.version?.id }
        }));
      }

    } catch (err: any) {
      console.error('[Review Video Background Upload Error]:', err);
      updateTask(taskId, {
        status: 'error',
        errorMessage: err.message || 'Video upload failed',
        speed: 'Failed',
        xhr: undefined
      });
    }
  }, [updateTask]);

  // 2. Process Video Version Revision Upload
  const startVersionUpload = useCallback(async (taskId: string, params: EnqueueVersionParams) => {
    const { projectId, workspaceId, videoId, versionLabel, file, changelogNotes, onCompleted } = params;

    try {
      updateTask(taskId, { status: 'uploading', progress: 5, speed: 'Starting...' });

      // Step A: Presigned URL
      const presignRes = await fetch('/api/review/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filename: file.name,
          content_type: file.type || 'video/mp4',
          file_size_bytes: file.size,
          workspace_id: workspaceId,
          project_id: projectId,
        }),
      });

      const presignData = await presignRes.json();
      if (!presignData.success) {
        throw new Error(presignData.error || 'Failed to initialize version storage');
      }

      updateTask(taskId, { progress: 10, speed: 'Uploading...' });

      // Step B: Direct PUT upload
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        let lastTime = Date.now();
        let lastLoaded = 0;

        xhr.open('PUT', presignData.upload_url, true);
        xhr.setRequestHeader('Content-Type', file.type || 'video/mp4');

        xhr.upload.onprogress = (evt) => {
          if (evt.lengthComputable) {
            const now = Date.now();
            const timeDiff = (now - lastTime) / 1000;
            if (timeDiff >= 0.5) {
              const bytesDiff = evt.loaded - lastLoaded;
              const bytesPerSec = bytesDiff / timeDiff;
              const speedText = bytesPerSec > 1024 * 1024 
                ? `${(bytesPerSec / (1024 * 1024)).toFixed(1)} MB/s`
                : `${(bytesPerSec / 1024).toFixed(0)} KB/s`;

              lastTime = now;
              lastLoaded = evt.loaded;

              const percent = Math.min(95, Math.round(10 + (evt.loaded / evt.total) * 85));
              updateTask(taskId, { progress: percent, speed: speedText });
            }
          }
        };

        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve();
          } else {
            reject(new Error(`Storage rejected upload with status ${xhr.status}`));
          }
        };

        xhr.onerror = () => reject(new Error('Network error during version upload'));
        xhr.onabort = () => reject(new Error('Upload cancelled'));

        updateTask(taskId, { xhr });
        xhr.send(file);
      });

      // Step C: Register version metadata
      updateTask(taskId, { status: 'saving', progress: 96, speed: 'Finalizing...' });

      const versionRes = await fetch('/api/review/versions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          video_id: videoId,
          project_id: projectId,
          workspace_id: workspaceId,
          source_type: 'upload',
          video_url: presignData.public_url,
          original_file_url: presignData.public_url,
          storage_key: presignData.key,
          file_size_bytes: file.size,
          resolution: '1080p',
          version_label: versionLabel || '',
          changelog_notes: changelogNotes || 'New version revision cut',
        }),
      });

      const versionData = await versionRes.json();
      if (!versionData.success) {
        throw new Error(versionData.error || 'Failed to save version revision');
      }

      updateTask(taskId, { 
        status: 'completed', 
        progress: 100, 
        speed: '✓ Complete',
        xhr: undefined 
      });

      if (onCompleted) {
        try { onCompleted(versionData.version); } catch (_) {}
      }

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('studiocore-review-video-ready', {
          detail: { projectId, videoId, versionId: versionData.version?.id }
        }));
      }

    } catch (err: any) {
      console.error('[Review Version Background Upload Error]:', err);
      updateTask(taskId, {
        status: 'error',
        errorMessage: err.message || 'Version upload failed',
        speed: 'Failed',
        xhr: undefined
      });
    }
  }, [updateTask]);

  const enqueueVideoUpload = useCallback((params: EnqueueVideoParams) => {
    const taskId = `vup_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const newTask: ReviewUploadTask = {
      id: taskId,
      projectId: params.projectId,
      projectTitle: params.projectTitle,
      videoTitle: params.title,
      fileName: params.file.name,
      fileSizeBytes: params.file.size,
      formattedSize: formatFileSize(params.file.size),
      progress: 0,
      speed: 'Waiting...',
      status: 'queued',
      createdAt: Date.now(),
    };

    setTasks(prev => [newTask, ...prev]);
    setIsDrawerOpen(true);
    setIsMinimized(false);

    // Run asynchronously in background
    setTimeout(() => {
      startVideoUpload(taskId, params);
    }, 100);

    return taskId;
  }, [startVideoUpload]);

  const enqueueVersionUpload = useCallback((params: EnqueueVersionParams) => {
    const taskId = `verup_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const newTask: ReviewUploadTask = {
      id: taskId,
      projectId: params.projectId,
      videoId: params.videoId,
      videoTitle: params.videoTitle || 'Video Revision',
      versionLabel: params.versionLabel || 'New Cut',
      fileName: params.file.name,
      fileSizeBytes: params.file.size,
      formattedSize: formatFileSize(params.file.size),
      progress: 0,
      speed: 'Waiting...',
      status: 'queued',
      createdAt: Date.now(),
    };

    setTasks(prev => [newTask, ...prev]);
    setIsDrawerOpen(true);
    setIsMinimized(false);

    setTimeout(() => {
      startVersionUpload(taskId, params);
    }, 100);

    return taskId;
  }, [startVersionUpload]);

  return (
    <ReviewUploadContext.Provider
      value={{
        tasks,
        activeCount,
        isDrawerOpen,
        setIsDrawerOpen,
        isMinimized,
        setIsMinimized,
        enqueueVideoUpload,
        enqueueVersionUpload,
        cancelUpload,
        clearCompleted,
      }}
    >
      {children}
    </ReviewUploadContext.Provider>
  );
}

export function useReviewUpload() {
  const ctx = useContext(ReviewUploadContext);
  if (!ctx) {
    throw new Error('useReviewUpload must be used within a ReviewUploadProvider');
  }
  return ctx;
}
