import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import * as crypto from 'crypto';
import { Visit, VisitDocument } from '../visits/schemas/visit.schema';
import { Visitor, VisitorDocument } from '../visitors/schemas/visitor.schema';
import { Employee, EmployeeDocument } from '../employees/schemas/employee.schema';
import { NotificationsService } from '../notifications/notifications.service';
import { VisitStatus } from '../../common/enums/visit-status.enum';
import { CurrentUserPayload } from '../../common/interfaces/current-user.interface';
import { CHECK_IN_MESSAGES, VISIT_MESSAGES } from '../../common/constants/messages.constant';

@Injectable()
export class CheckInService {
  constructor(
    @InjectModel(Visit.name)
    private readonly visitModel: Model<VisitDocument>,
    @InjectModel(Visitor.name)
    private readonly visitorModel: Model<VisitorDocument>,
    @InjectModel(Employee.name)
    private readonly employeeModel: Model<EmployeeDocument>,
    private readonly notificationsService: NotificationsService,
  ) {}

  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  async scanPass(organizationId: string, rawInput: string): Promise<Visit> {
    const orgId = new Types.ObjectId(organizationId);
    let passCode = rawInput.trim();
    let visitId: string | null = null;

    // Check if input is JSON (from QR code)
    try {
      if (rawInput.startsWith('{') && rawInput.endsWith('}')) {
        const parsed = JSON.parse(rawInput);
        if (parsed.visitId) visitId = parsed.visitId;
        if (parsed.code) passCode = parsed.code;
      }
    } catch {
      // not JSON, use rawInput as code or token
    }

    let visit: any = null;

    if (visitId) {
      visit = await this.visitModel.findOne({
        _id: new Types.ObjectId(visitId),
        organizationId: orgId,
      });
    }

    if (!visit) {
      // Try by passCode
      visit = await this.visitModel.findOne({
        organizationId: orgId,
        passCode: passCode.toUpperCase(),
      });
    }

    if (!visit) {
      // Try by token hash
      const tokenHash = this.hashToken(rawInput);
      visit = await this.visitModel.findOne({
        organizationId: orgId,
        qrTokenHash: tokenHash,
      });
    }

    if (!visit) {
      throw new NotFoundException(CHECK_IN_MESSAGES.PASS_CODE_NOT_FOUND);
    }

    // Populate for verification view
    return this.visitModel
      .findById(visit._id)
      .populate('visitorId')
      .populate('hostId')
      .populate('departmentId', 'name')
      .populate('buildingId', 'name locationCode')
      .exec() as Promise<Visit>;
  }

  async performCheckIn(organizationId: string, visitId: string, user: CurrentUserPayload): Promise<Visit> {
    const orgId = new Types.ObjectId(organizationId);

    const existing = await this.visitModel.findOne({
      _id: new Types.ObjectId(visitId),
      organizationId: orgId,
    });

    if (!existing) {
      throw new NotFoundException(VISIT_MESSAGES.NOT_FOUND);
    }

    if (existing.status === VisitStatus.CHECKED_IN) {
      throw new ConflictException(CHECK_IN_MESSAGES.CONCURRENT_CHECK_IN);
    }

    if (existing.status !== VisitStatus.APPROVED) {
      throw new BadRequestException(CHECK_IN_MESSAGES.CANNOT_CHECK_IN_STATUS(existing.status));
    }

    if (existing.qrPassExpiresAt && existing.qrPassExpiresAt < new Date()) {
      throw new BadRequestException(CHECK_IN_MESSAGES.QR_TOKEN_NOT_FOUND);
    }

    // Atomic update to prevent race conditions
    const updated = await this.visitModel
      .findOneAndUpdate(
        {
          _id: new Types.ObjectId(visitId),
          organizationId: orgId,
          status: VisitStatus.APPROVED,
        },
        {
          $set: {
            status: VisitStatus.CHECKED_IN,
            checkInAt: new Date(),
            checkInBy: new Types.ObjectId(user.userId),
          },
        },
        { new: true },
      )
      .populate('visitorId')
      .populate('hostId')
      .exec();

    if (!updated) {
      throw new ConflictException(CHECK_IN_MESSAGES.CONCURRENT_CHECK_IN);
    }

    // Notify host that visitor has arrived
    const host = await this.employeeModel.findById(updated.hostId).exec();
    const visitor = await this.visitorModel.findById(updated.visitorId).exec();

    if (host && host.userId) {
      await this.notificationsService.send({
        organizationId: orgId.toString(),
        recipientUserId: host.userId.toString(),
        title: 'Visitor Arrived & Checked In',
        message: `${visitor?.fullName || 'Your visitor'} has arrived at reception and is checked in.`,
        type: 'CHECK_IN',
        data: { visitId: updated._id.toString() },
        email: host.email,
      });
    }

    return updated;
  }

  async performCheckOut(organizationId: string, visitId: string, user: CurrentUserPayload): Promise<Visit> {
    const orgId = new Types.ObjectId(organizationId);

    const updated = await this.visitModel
      .findOneAndUpdate(
        {
          _id: new Types.ObjectId(visitId),
          organizationId: orgId,
          status: VisitStatus.CHECKED_IN,
        },
        {
          $set: {
            status: VisitStatus.CHECKED_OUT,
            checkOutAt: new Date(),
            checkOutBy: new Types.ObjectId(user.userId),
            qrTokenHash: undefined, // Invalidate pass
          },
        },
        { new: true },
      )
      .populate('visitorId')
      .populate('hostId')
      .exec();

    if (!updated) {
      throw new BadRequestException(CHECK_IN_MESSAGES.NOT_CHECKED_IN);
    }

    return updated;
  }

  async getActiveVisits(organizationId?: string): Promise<Visit[]> {
    const query: any = { status: VisitStatus.CHECKED_IN };
    if (organizationId) {
      query.organizationId = new Types.ObjectId(organizationId);
    }

    return this.visitModel
      .find(query)
      .populate('organizationId', 'name slug')
      .populate('visitorId')
      .populate('hostId')
      .populate('departmentId', 'name')
      .populate('buildingId', 'name locationCode')
      .populate('checkInBy', 'firstName lastName')
      .sort({ checkInAt: -1 })
      .exec();
  }
}

