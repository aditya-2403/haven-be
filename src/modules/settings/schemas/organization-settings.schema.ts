import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type OrganizationSettingsDocument = OrganizationSettings & Document;

@Schema({ timestamps: true, collection: 'organization_settings' })
export class OrganizationSettings {
  @Prop({ type: Types.ObjectId, ref: 'Organization', required: true, unique: true, index: true })
  organizationId: Types.ObjectId;

  @Prop({ default: true })
  requireApprovalByDefault: boolean;

  @Prop({ default: 60 })
  defaultVisitDurationMinutes: number;

  @Prop({ default: true })
  allowWalkIns: boolean;

  @Prop({ default: true })
  notifyHostOnArrival: boolean;

  @Prop({ default: 'UTC' })
  timezone: string;

  @Prop({ default: 24 })
  passExpiryHours: number;
}

export const OrganizationSettingsSchema = SchemaFactory.createForClass(OrganizationSettings);

