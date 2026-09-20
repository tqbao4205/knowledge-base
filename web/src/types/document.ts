export type DocumentIndexingStatus = 'PENDING' | 'PROCESSING' | 'INDEXED' | 'FAILED';

export interface DocumentItem {
  id: string;
  projectId: string;
  originalName: string;
  fileType: string;
  fileSizeBytes: number;
  indexingStatus?: DocumentIndexingStatus;
  chunkCount?: number;
  indexedAt?: string | null;
  uploadedBy: {
    id: string;
    email: string;
    fullName: string;
  } | null;
  createdAt: string;
}

export interface PresignedUrlData {
  url: string;
  expiresInSeconds: number;
}
