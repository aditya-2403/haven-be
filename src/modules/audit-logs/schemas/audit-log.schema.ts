import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type AuditLogDocument = AuditLog & Document;

@Schema({ timestamps: true, collection: 'audit_logs' })
export class AuditLog {
  @Prop({ type: Types.ObjectId, ref: 'Organization', index: true, default: null })
  organizationId?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', index: true, default: null })
  userId?: Types.ObjectId;

  @Prop({ trim: true })
  userEmail?: string;

  @Prop({ required: true, trim: true })
  action: string;

  @Prop({ required: true, trim: true })
  resource: string;

  @Prop({ trim: true })
  resourceId?: string;

  @Prop({ type: Object, default: {} })
  details?: Record<string, any>;

  @Prop({ trim: true })
  ipAddress?: string;

  @Prop({ trim: true })
  userAgent?: string;

  @Prop({ default: Date.now, index: true })
  timestamp: Date;
}

export const AuditLogSchema = SchemaFactory.createForClass(AuditLog);
AuditLogSchema.index({ organizationId: 1, createdAt: -1 });

