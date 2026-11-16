import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import * as crypto from 'crypto';
import * as QRCode from 'qrcode';
import { Approval, ApprovalDocument } from './schemas/approval.schema';
import { Visit, VisitDocument } from '../visits/schemas/visit.schema';
import { Visitor, VisitorDocument } from '../visitors/schemas/visitor.schema';
import { Employee, EmployeeDocument } from '../employees/schemas/employee.schema';
import { OrganizationSettings, OrganizationSettingsDocument } from '../settings/schemas/organization-settings.schema';
import { NotificationsService } from '../notifications/notifications.service';
import { VisitStatus } from '../../common/enums/visit-status.enum';
import { Role } from '../../common/enums/role.enum';
import { CurrentUserPayload } from '../../common/interfaces/current-user.interface';
import { APPROVAL_MESSAGES, VISIT_MESSAGES } from '../../common/constants/messages.constant';

@Injectable()
export class ApprovalsService {
  constructor(
    @InjectModel(Approval.name)
    private readonly approvalModel: Model<ApprovalDocument>,
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

  async getPendingApprovals(organizationId: string, user: CurrentUserPayload) {
    const orgId = new Types.ObjectId(organizationId);
    const query: any = {
      organizationId: orgId,
      status: VisitStatus.PENDING_APPROVAL,
    };

    // If employee, only show their requests
    if (user.role === Role.EMPLOYEE && user.employeeId) {
      query.hostId = new Types.ObjectId(user.employeeId);
    }

    const pending = await this.visitModel
      .find(query)
      .populate('visitorId', 'fullName phone email company photoFileId')
      .populate('hostId', 'fullName email employeeId designation')
      .populate('departmentId', 'name')
      .populate('buildingId', 'name locationCode')
      .sort({ scheduledDate: 1, createdAt: 1 })
      .exec();

    return pending;
  }

  async approve(organizationId: string, visitId: string, user: CurrentUserPayload, remarks?: string) {
    const orgId = new Types.ObjectId(organizationId);
    const visit = await this.visitModel.findOne({ _id: new Types.ObjectId(visitId), organizationId: orgId });

    if (!visit) {
      throw new NotFoundException(VISIT_MESSAGES.REQUEST_NOT_FOUND);
    }

    if (visit.status !== VisitStatus.PENDING_APPROVAL) {
      throw new BadRequestException(APPROVAL_MESSAGES.CANNOT_APPROVE_STATUS(visit.status));
    }

    // Role check: employees can only approve their own visits; Admins/SuperAdmin can approve any
    if (user.role === Role.EMPLOYEE && user.employeeId && visit.hostId.toString() !== user.employeeId) {
      throw new ForbiddenException(APPROVAL_MESSAGES.HOST_ONLY_APPROVE);
    }

    // Generate QR Token & PassCode
    const rawToken = crypto.randomBytes(32).toString('hex');
    const qrTokenHash = this.hashToken(rawToken);
    const passCode = this.generatePassCode();

    const settings = await this.settingsModel.findOne({ organizationId: orgId }).exec();
    const expiryHours = settings?.passExpiryHours || 24;
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + expiryHours);

    visit.status = VisitStatus.APPROVED;
    visit.qrTokenHash = qrTokenHash;
    visit.passCode = passCode;
    visit.qrPassExpiresAt = expiresAt;
    await visit.save();

    // Record approval
    await this.approvalModel.create({
      organizationId: orgId,
      visitId: visit._id,
      approverId: new Types.ObjectId(user.userId),
      action: 'APPROVED',
      remarks,
      timestamp: new Date(),
    });

    const visitor = await this.visitorModel.findById(visit.visitorId).exec();

    // Dispatch notification
    if (user.userId) {
      await this.notificationsService.send({
        organizationId: orgId.toString(),
        recipientUserId: user.userId,
        title: 'Visitor Visit Approved',
        message: `Visit for ${visitor?.fullName || 'Visitor'} on ${visit.scheduledDate.toISOString().split('T')[0]} has been approved. Pass code: ${passCode}`,
        type: 'APPROVAL_RESULT',
        data: { visitId: visit._id.toString(), passCode },
        email: visitor?.email,
      });
    }

    const qrPayload = JSON.stringify({
      visitId: visit._id.toString(),
      code: passCode,
      orgId: organizationId,
    });
    const qrCodeDataUrl = await QRCode.toDataURL(qrPayload, { margin: 2, scale: 6 });

    return {
      visit,
      passCode,
      qrCodeDataUrl,
    };
  }

  async reject(organizationId: string, visitId: string, user: CurrentUserPayload, remarks?: string) {
    const orgId = new Types.ObjectId(organizationId);
    const visit = await this.visitModel.findOne({ _id: new Types.ObjectId(visitId), organizationId: orgId });

    if (!visit) {
      throw new NotFoundException(VISIT_MESSAGES.REQUEST_NOT_FOUND);
    }

    if (visit.status !== VisitStatus.PENDING_APPROVAL) {
      throw new BadRequestException(APPROVAL_MESSAGES.CANNOT_REJECT_STATUS(visit.status));
    }

    if (user.role === Role.EMPLOYEE && user.employeeId && visit.hostId.toString() !== user.employeeId) {
      throw new ForbiddenException(APPROVAL_MESSAGES.HOST_ONLY_REJECT);
    }

    visit.status = VisitStatus.REJECTED;
    visit.qrTokenHash = undefined;
    if (remarks) {
      visit.notes = visit.notes ? `${visit.notes} | Reject remarks: ${remarks}` : `Reject remarks: ${remarks}`;
    }
    await visit.save();

    await this.approvalModel.create({
      organizationId: orgId,
      visitId: visit._id,
      approverId: new Types.ObjectId(user.userId),
      action: 'REJECTED',
      remarks,
      timestamp: new Date(),
    });

    const visitor = await this.visitorModel.findById(visit.visitorId).exec();

    if (user.userId) {
      await this.notificationsService.send({
        organizationId: orgId.toString(),
        recipientUserId: user.userId,
        title: 'Visitor Visit Rejected',
        message: `Visit for ${visitor?.fullName || 'Visitor'} on ${visit.scheduledDate.toISOString().split('T')[0]} has been rejected.${remarks ? ' Remarks: ' + remarks : ''}`,
        type: 'APPROVAL_RESULT',
        data: { visitId: visit._id.toString() },
        email: visitor?.email,
      });
    }

    return { visit };
  }
}

