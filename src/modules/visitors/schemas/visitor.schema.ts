import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type VisitorDocument = Visitor & Document;

@Schema({ timestamps: true, collection: 'visitors' })
export class Visitor {
  @Prop({ type: Types.ObjectId, ref: 'Organization', required: true, index: true })
  organizationId: Types.ObjectId;

  @Prop({ required: true, trim: true })
  fullName: string;

  @Prop({ required: true, trim: true, index: true })
  phone: string;

  @Prop({ lowercase: true, trim: true })
  email?: string;

  @Prop({ trim: true })
  company?: string;

  @Prop({ trim: true })
  photoFileId?: string;

  @Prop({ enum: ['NATIONAL_ID', 'PASSPORT', 'DRIVING_LICENSE', 'OTHER'], default: 'NATIONAL_ID' })
  identificationType?: string;

  @Prop({ trim: true })
  identificationNumber?: string;

  @Prop({ trim: true })
  notes?: string;
}

export const VisitorSchema = SchemaFactory.createForClass(Visitor);
VisitorSchema.index({ organizationId: 1, phone: 1 }, { unique: true });
VisitorSchema.index({ organizationId: 1, fullName: 'text', company: 'text' });

