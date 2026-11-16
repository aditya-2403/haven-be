import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { Role } from '../../../common/enums/role.enum';

export type UserDocument = User & Document;

@Schema({ timestamps: true, collection: 'users' })
export class User {
  @Prop({ type: Types.ObjectId, ref: 'Organization', index: true, default: null })
  organizationId?: Types.ObjectId;

  @Prop({ required: true, lowercase: true, trim: true, index: true })
  email: string;

  @Prop({ required: true })
  passwordHash: string;

  @Prop({ required: true, trim: true })
  firstName: string;

  @Prop({ required: true, trim: true })
  lastName: string;

  @Prop({ required: true, enum: Role, index: true })
  role: Role;

  @Prop({ type: Types.ObjectId, ref: 'Department', default: null })
  departmentId?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Employee', default: null })
  employeeId?: Types.ObjectId;

  @Prop({ trim: true })
  phone?: string;

  @Prop({ required: true, enum: ['ACTIVE', 'INACTIVE'], default: 'ACTIVE', index: true })
  status: string;

  @Prop({ trim: true })
  avatarFileId?: string;
}

export const UserSchema = SchemaFactory.createForClass(User);

// Ensure unique email within organization (or globally for super admin without org)
UserSchema.index({ organizationId: 1, email: 1 }, { unique: true });

