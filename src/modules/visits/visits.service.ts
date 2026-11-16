import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import * as crypto from 'crypto';
import * as QRCode from 'qrcode';
import { Visit, VisitDocument } from './schemas/visit.schema';
import { Visitor, VisitorDocument } from '../visitors/schemas/visitor.schema';
import { Employee, EmployeeDocument } from '../employees/schemas/employee.schema';
import { OrganizationSettings, OrganizationSettingsDocument } from '../settings/schemas/organization-settings.schema';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateVisitDto, UpdateVisitDto } from './dto/visit.dto';
import { VisitStatus, VisitType } from '../../common/enums/visit-status.enum';
import { VISIT_MESSAGES } from '../../common/constants/messages.constant';

@Injectable()
export class VisitsService {
  constructor(
    @InjectModel(Visit.name)
    private readonly visitModel: Model<VisitDocument>,
    @InjectModel(Visitor.name)
    private readonly visitorModel: Model<VisitorDocument>,
    @InjectModel(Employee.name)
    private readonly employeeModel: Model<EmployeeDocument>,
    @InjectModel(OrganizationSettings.name)
    private readonly settingsModel: Model<OrganizationSettingsDocument>,
    private readonly notificationsService: NotificationsService,
  ) {}

  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  private generatePassCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = 'HV-';
    for (let i = 0; i < 4; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  async create(organizationId: string, dto: CreateVisitDto): Promise<{ visit: Visit; qrCodeDataUrl?: string; rawToken?: string }> {
    const orgId = new Types.ObjectId(organizationId);

    // Verify visitor
    const visitor = await this.visitorModel.findOne({ _id: new Types.ObjectId(dto.visitorId), organizationId: orgId });
    if (!visitor) {
      throw new NotFoundException(VISIT_MESSAGES.VISITOR_PROFILE_NOT_FOUND);
    }

    // Verify host employee
    const host = await this.employeeModel.findOne({ _id: new Types.ObjectId(dto.hostId), organizationId: orgId });
    if (!host) {
      throw new NotFoundException(VISIT_MESSAGES.HOST_EMPLOYEE_NOT_FOUND);
    }

    const settings = await this.settingsModel.findOne({ organizationId: orgId }).exec();
    const requireApproval = settings ? settings.requireApprovalByDefault : true;

    let initialStatus = VisitStatus.PENDING_APPROVAL;
    let qrTokenHash: string | undefined = undefined;
    let rawToken: string | undefined = undefined;
    let qrCodeDataUrl: string | undefined = undefined;
    let passExpiresAt: Date | undefined = undefined;
    let passCode: string | undefined = undefined;

    if (!requireApproval) {
      initialStatus = VisitStatus.APPROVED;
      rawToken = crypto.randomBytes(32).toString('hex');
      qrTokenHash = this.hashToken(rawToken);
      passCode = this.generatePassCode();
      const expiryHours = settings?.passExpiryHours || 24;
      passExpiresAt = new Date();
      passExpiresAt.setHours(passExpiresAt.getHours() + expiryHours);
      qrCodeDataUrl = await QRCode.toDataURL(rawToken, { margin: 2, scale: 6 });
    }

    const scheduledDateObj = new Date(dto.scheduledDate);

    const visit = await this.visitModel.create({
      organizationId: orgId,
      visitorId: visitor._id,
      hostId: host._id,
      departmentId: dto.departmentId ? new Types.ObjectId(dto.departmentId) : host.departmentId,
      buildingId: dto.buildingId ? new Types.ObjectId(dto.buildingId) : null,
      visitType: dto.visitType || VisitType.APPOINTMENT,
      purpose: dto.purpose,
      scheduledDate: scheduledDateObj,
      scheduledTime: dto.scheduledTime || '09:00',
      expectedDurationMinutes: dto.expectedDurationMinutes || 60,
      status: initialStatus,
      qrTokenHash,
      passCode,
      qrPassExpiresAt: passExpiresAt,
      notes: dto.notes,
    });

    // Notify host if pending approval
    if (initialStatus === VisitStatus.PENDING_APPROVAL && host.userId) {
      await this.notificationsService.send({
        organizationId: orgId.toString(),
        recipientUserId: host.userId.toString(),
        title: 'New Visitor Approval Request',
        message: `${visitor.fullName} (${visitor.company || 'Visitor'}) has scheduled a visit with you for ${dto.scheduledDate} at ${dto.scheduledTime || '09:00'}.`,
        type: 'APPROVAL_REQUEST',
        data: { visitId: visit._id.toString() },
        email: host.email,
      });
    }

    return {
      visit,
      qrCodeDataUrl,
      rawToken,
    };
  }

  async findAll(
    organizationId: string | undefined,
    options: {
      status?: string;
      hostId?: string;
      date?: string;
      startDate?: string;
      endDate?: string;
      search?: string;
      page?: number;
      limit?: number;
    },
  ) {
    const query: any = {};
    if (organizationId) {
      query.organizationId = new Types.ObjectId(organizationId);
    }

    if (options.status) {
      query.status = options.status;
    }

    if (options.hostId) {
      query.hostId = new Types.ObjectId(options.hostId);
    }

    if (options.date) {
      const d = new Date(options.date);
      const startOfDay = new Date(d.setUTCHours(0, 0, 0, 0));
      const endOfDay = new Date(d.setUTCHours(23, 59, 59, 999));
      query.scheduledDate = { $gte: startOfDay, $lte: endOfDay };
    } else if (options.startDate || options.endDate) {
      query.scheduledDate = {};
      if (options.startDate) {
        query.scheduledDate.$gte = new Date(options.startDate);
      }
      if (options.endDate) {
        query.scheduledDate.$lte = new Date(options.endDate);
      }
    }

    const page = options.page || 1;
    const limit = options.limit || 20;
    const skip = (page - 1) * limit;

    const [total, data] = await Promise.all([
      this.visitModel.countDocuments(query),
      this.visitModel
        .find(query)
        .populate('organizationId', 'name slug')
        .populate('visitorId', 'fullName phone email company photoFileId identificationType')
        .populate('hostId', 'fullName email employeeId designation')
        .populate('departmentId', 'name')
        .populate('buildingId', 'name locationCode')
        .populate('checkInBy', 'firstName lastName email')
        .populate('checkOutBy', 'firstName lastName email')
        .sort({ scheduledDate: -1, createdAt: -1 })
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

  async findOne(organizationId: string | undefined, id: string): Promise<Visit> {
    const query: any = { _id: new Types.ObjectId(id) };
    if (organizationId) {
      query.organizationId = new Types.ObjectId(organizationId);
    }
    const visit = await this.visitModel
      .findOne(query)
      .populate('organizationId', 'name slug')
      .populate('visitorId')
      .populate('hostId')
      .populate('departmentId', 'name')
      .populate('buildingId', 'name locationCode')
      .populate('checkInBy', 'firstName lastName email')
      .populate('checkOutBy', 'firstName lastName email')
      .exec();

    if (!visit) {
      throw new NotFoundException(VISIT_MESSAGES.NOT_FOUND);
    }

    return visit;
  }

  async update(organizationId: string, id: string, dto: UpdateVisitDto): Promise<Visit> {
    const orgId = new Types.ObjectId(organizationId);
    const visit = await this.visitModel.findOne({ _id: new Types.ObjectId(id), organizationId: orgId });

    if (!visit) {
      throw new NotFoundException(VISIT_MESSAGES.NOT_FOUND);
    }

    if (visit.status === VisitStatus.CHECKED_IN || visit.status === VisitStatus.CHECKED_OUT) {
      throw new BadRequestException(VISIT_MESSAGES.CANNOT_EDIT_CHECKED_IN);
    }

    const updateData: any = { ...dto };
    if (dto.hostId) updateData.hostId = new Types.ObjectId(dto.hostId);
    if (dto.departmentId) updateData.departmentId = new Types.ObjectId(dto.departmentId);
    if (dto.buildingId) updateData.buildingId = new Types.ObjectId(dto.buildingId);
    if (dto.scheduledDate) updateData.scheduledDate = new Date(dto.scheduledDate);

    const updated = await this.visitModel
      .findOneAndUpdate({ _id: visit._id }, { $set: updateData }, { new: true })
      .populate('visitorId')
      .populate('hostId')
      .exec();

    return updated!;
  }

  async cancel(organizationId: string, id: string, reason?: string): Promise<Visit> {
    const orgId = new Types.ObjectId(organizationId);
    const visit = await this.visitModel.findOne({ _id: new Types.ObjectId(id), organizationId: orgId });

    if (!visit) {
      throw new NotFoundException(VISIT_MESSAGES.NOT_FOUND);
    }

    if (visit.status === VisitStatus.CHECKED_IN || visit.status === VisitStatus.CHECKED_OUT) {
      throw new BadRequestException(VISIT_MESSAGES.CANNOT_CANCEL_CHECKED_IN);
    }

    visit.status = VisitStatus.CANCELLED;
    visit.qrTokenHash = undefined; // Revoke pass
    if (reason) {
      visit.notes = visit.notes ? `${visit.notes} | Cancel reason: ${reason}` : `Cancel reason: ${reason}`;
    }

    await visit.save();
    return visit;
  }

  async getPass(organizationId: string, id: string): Promise<{
    pass: any;
    qrCodeDataUrl?: string;
  }> {
    const visit = await this.visitModel
      .findOne({ _id: new Types.ObjectId(id), organizationId: new Types.ObjectId(organizationId) })
      .populate('visitorId', 'fullName phone email company photoFileId')
      .populate('hostId', 'fullName email employeeId designation')
      .populate('buildingId', 'name locationCode address')
      .exec();

    if (!visit) {
      throw new NotFoundException(VISIT_MESSAGES.NOT_FOUND);
    }

    if (visit.status !== VisitStatus.APPROVED && visit.status !== VisitStatus.CHECKED_IN) {
      throw new BadRequestException(VISIT_MESSAGES.PASS_UNAVAILABLE(visit.status));
    }

    let qrCodeDataUrl: string | undefined = undefined;
    // Generate QR representation for passCode
    const qrPayload = JSON.stringify({
      visitId: visit._id.toString(),
      code: visit.passCode,
      orgId: organizationId,
    });
    qrCodeDataUrl = await QRCode.toDataURL(qrPayload, { margin: 2, scale: 6 });

    return {
      pass: {
        visitId: visit._id,
        passCode: visit.passCode,
        status: visit.status,
        scheduledDate: visit.scheduledDate,
        scheduledTime: visit.scheduledTime,
        visitor: visit.visitorId,
        host: visit.hostId,
        building: visit.buildingId,
        expiresAt: visit.qrPassExpiresAt,
      },
      qrCodeDataUrl,
    };
  }
}

