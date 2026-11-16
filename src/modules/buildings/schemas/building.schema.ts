import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type BuildingDocument = Building & Document;

@Schema({ timestamps: true, collection: 'buildings' })
export class Building {
  @Prop({ type: Types.ObjectId, ref: 'Organization', required: true, index: true })
  organizationId: Types.ObjectId;

  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ required: true, uppercase: true, trim: true })
  locationCode: string;

  @Prop({ trim: true })
  address?: string;

  @Prop({ trim: true })
  description?: string;

  @Prop({ required: true, enum: ['ACTIVE', 'INACTIVE'], default: 'ACTIVE', index: true })
  status: string;
}

export const BuildingSchema = SchemaFactory.createForClass(Building);
BuildingSchema.index({ organizationId: 1, locationCode: 1 }, { unique: true });

