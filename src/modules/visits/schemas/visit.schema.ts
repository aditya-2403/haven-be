import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { VisitStatus, VisitType } from '../../../common/enums/visit-status.enum';

export type VisitDocument = Visit & Document;

@Schema({ timestamps: true, collection: 'visits' })
export class Visit {
  @Prop({ type: Types.ObjectId, ref: 'Organization', required: true, index: true })
  organizationId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Visitor', required: true, index: true })
  visitorId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Employee', required: true, index: true })
  hostId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Department', default: null })
  departmentId?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Building', default: null })
  buildingId?: Types.ObjectId;

  @Prop({ required: true, enum: VisitType, default: VisitType.APPOINTMENT })
  visitType: VisitType;

  @Prop({ required: true, trim: true })
  purpose: string;

  @Prop({ required: true, index: true })
  scheduledDate: Date;

  @Prop({ trim: true, default: '09:00' })
  scheduledTime: string;

  @Prop({ default: 60 })
  expectedDurationMinutes: number;

  @Prop({ required: true, enum: VisitStatus, default: VisitStatus.PENDING_APPROVAL, index: true })
  status: VisitStatus;

  @Prop({ index: true })
  qrTokenHash?: string;

  @Prop({ index: true })
  passCode?: string;

  @Prop()
  qrPassExpiresAt?: Date;

  @Prop({ default: null })
  checkInAt?: Date;

  @Prop({ type: Types.ObjectId, ref: 'User', default: null })
  checkInBy?: Types.ObjectId;

  @Prop({ default: null })
  checkOutAt?: Date;

  @Prop({ type: Types.ObjectId, ref: 'User', default: null })
  checkOutBy?: Types.ObjectId;

  @Prop({ trim: true })
  notes?: string;
}

export const VisitSchema = SchemaFactory.createForClass(Visit);
VisitSchema.index({ organizationId: 1, status: 1 });
VisitSchema.index({ organizationId: 1, scheduledDate: 1 });
VisitSchema.index({ organizationId: 1, hostId: 1 });
VisitSchema.index({ organizationId: 1, visitorId: 1 });
VisitSchema.index({ organizationId: 1, passCode: 1 });

