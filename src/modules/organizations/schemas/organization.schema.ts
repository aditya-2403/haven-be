import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type OrganizationDocument = Organization & Document;

@Schema({ timestamps: true, collection: 'organizations' })
export class Organization {
  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ required: true, unique: true, lowercase: true, trim: true, index: true })
  slug: string;

  @Prop({ required: true, trim: true })
  email: string;

  @Prop({ required: true, trim: true })
  phone: string;

  @Prop({ trim: true })
  address?: string;

  @Prop({ trim: true })
  logo?: string;

  @Prop({ required: true, enum: ['ACTIVE', 'SUSPENDED'], default: 'ACTIVE', index: true })
  status: string;
}

export const OrganizationSchema = SchemaFactory.createForClass(Organization);

