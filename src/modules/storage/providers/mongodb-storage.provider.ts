import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { randomUUID } from 'crypto';
import { StoredFile, StoredFileDocument } from '../schemas/stored-file.schema';
import { StorageProvider, StoredFileMetadata, StoredFileResult } from '../storage.interface';
import { STORAGE_MESSAGES } from '../../../common/constants/messages.constant';

const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'application/pdf',
];

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

@Injectable()
export class MongodbStorageProvider implements StorageProvider {
  constructor(
    @InjectModel(StoredFile.name)
    private readonly storedFileModel: Model<StoredFileDocument>,
  ) {}

  async upload(
    file: Express.Multer.File,
    organizationId?: string,
    userId?: string,
  ): Promise<StoredFileMetadata> {
    if (!file) {
      throw new BadRequestException(STORAGE_MESSAGES.NO_FILE_PROVIDED);
    }

    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      throw new BadRequestException(STORAGE_MESSAGES.INVALID_FILE_TYPE(file.mimetype));
    }

    if (file.size > MAX_FILE_SIZE) {
      throw new BadRequestException(STORAGE_MESSAGES.FILE_SIZE_EXCEEDS_LIMIT);
    }

    const fileId = randomUUID();
    const dataBase64 = file.buffer.toString('base64');

    const created = await this.storedFileModel.create({
      fileId,
      filename: file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_'),
      mimeType: file.mimetype,
      sizeBytes: file.size,
      dataBase64,
      organizationId: organizationId ? new Types.ObjectId(organizationId) : null,
      uploadedBy: userId ? new Types.ObjectId(userId) : null,
    });

    return {
      fileId: created.fileId,
      filename: created.filename,
      mimeType: created.mimeType,
      sizeBytes: created.sizeBytes,
    };
  }

  async get(fileId: string): Promise<StoredFileResult> {
    const doc = await this.storedFileModel.findOne({ fileId }).exec();
    if (!doc) {
      throw new NotFoundException(STORAGE_MESSAGES.FILE_NOT_FOUND(fileId));
    }

    const buffer = Buffer.from(doc.dataBase64, 'base64');
    return {
      fileId: doc.fileId,
      filename: doc.filename,
      mimeType: doc.mimeType,
      sizeBytes: doc.sizeBytes,
      buffer,
    };
  }

  async delete(fileId: string): Promise<void> {
    const result = await this.storedFileModel.deleteOne({ fileId }).exec();
    if (result.deletedCount === 0) {
      throw new NotFoundException(STORAGE_MESSAGES.FILE_NOT_FOUND(fileId));
    }
  }
}

