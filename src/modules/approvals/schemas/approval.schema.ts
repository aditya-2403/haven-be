import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type ApprovalDocument = Approval & Document;

@Schema({ timestamps: true, collection: 'approvals' })
export class Approval {
  @Prop({ type: Types.ObjectId, ref: 'Organization', required: true, index: true })
  organizationId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Visit', required: true, index: true })
  visitId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  approverId: Types.ObjectId;

  @Prop({ required: true, enum: ['APPROVED', 'REJECTED'] })
  action: string;

  @Prop({ trim: true })
  remarks?: string;

  @Prop({ default: Date.now })
  timestamp: Date;
}

export const ApprovalSchema = SchemaFactory.createForClass(Approval);
ApprovalSchema.index({ organizationId: 1, visitId: 1 });

