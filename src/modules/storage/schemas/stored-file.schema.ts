import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type StoredFileDocument = StoredFile & Document;

@Schema({ timestamps: true, collection: 'stored_files' })
export class StoredFile {
  @Prop({ required: true, unique: true, index: true })
  fileId: string;

  @Prop({ required: true })
  filename: string;

  @Prop({ required: true })
  mimeType: string;

  @Prop({ required: true })
  sizeBytes: number;

  @Prop({ required: true })
  dataBase64: string;

  @Prop({ type: Types.ObjectId, ref: 'Organization', index: true, default: null })
  organizationId?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', default: null })
  uploadedBy?: Types.ObjectId;
}

export const StoredFileSchema = SchemaFactory.createForClass(StoredFile);

