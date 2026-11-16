import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { AuditLog, AuditLogDocument } from './schemas/audit-log.schema';

export interface CreateAuditLogDto {
  organizationId?: string | Types.ObjectId;
  userId?: string | Types.ObjectId;
  userEmail?: string;
  action: string;
  resource: string;
  resourceId?: string;
  details?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
}

@Injectable()
export class AuditLogsService {
  constructor(
    @InjectModel(AuditLog.name)
    private readonly auditLogModel: Model<AuditLogDocument>,
  ) {}

  async log(dto: CreateAuditLogDto): Promise<void> {
    try {
      await this.auditLogModel.create({
        organizationId: dto.organizationId ? new Types.ObjectId(dto.organizationId.toString()) : null,
        userId: dto.userId ? new Types.ObjectId(dto.userId.toString()) : null,
        userEmail: dto.userEmail,
        action: dto.action,
        resource: dto.resource,
        resourceId: dto.resourceId,
        details: dto.details || {},
        ipAddress: dto.ipAddress,
        userAgent: dto.userAgent,
        timestamp: new Date(),
      });
    } catch (err) {
      // Don't crash main flow on audit log error
      console.error('Audit log failed:', err);
    }
  }

  async findAll(organizationId?: string, page = 1, limit = 20) {
    const query: any = {};
    if (organizationId) {
      query.organizationId = new Types.ObjectId(organizationId);
    }

    const skip = (page - 1) * limit;
    const [total, data] = await Promise.all([
      this.auditLogModel.countDocuments(query),
      this.auditLogModel
        .find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
    ]);

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }
}

