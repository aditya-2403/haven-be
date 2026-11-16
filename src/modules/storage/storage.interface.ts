export interface StoredFileMetadata {
  fileId: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  uploadedAt?: Date;
}

export interface StoredFileResult extends StoredFileMetadata {
  buffer: Buffer;
}

export interface StorageProvider {
  upload(file: Express.Multer.File, organizationId?: string, userId?: string): Promise<StoredFileMetadata>;
  get(fileId: string): Promise<StoredFileResult>;
  delete(fileId: string): Promise<void>;
}

