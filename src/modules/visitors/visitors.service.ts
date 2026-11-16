import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Visitor, VisitorDocument } from './schemas/visitor.schema';
import { Visit, VisitDocument } from '../visits/schemas/visit.schema';
import { CreateVisitorDto, UpdateVisitorDto } from './dto/visitor.dto';
import { VISITOR_MESSAGES } from '../../common/constants/messages.constant';

@Injectable()
export class VisitorsService {
  constructor(
    @InjectModel(Visitor.name)
    private readonly visitorModel: Model<VisitorDocument>,
    @InjectModel(Visit.name)
    private readonly visitModel: Model<VisitDocument>,
  ) {}

  async createOrFind(organizationId: string, dto: CreateVisitorDto): Promise<Visitor> {
    const orgId = new Types.ObjectId(organizationId);
    let visitor = await this.visitorModel.findOne({ organizationId: orgId, phone: dto.phone }).exec();

    if (visitor) {
      // Update details if provided
      if (dto.fullName) visitor.fullName = dto.fullName;
      if (dto.email) visitor.email = dto.email;
      if (dto.company) visitor.company = dto.company;
      if (dto.photoFileId) visitor.photoFileId = dto.photoFileId;
      if (dto.identificationType) visitor.identificationType = dto.identificationType;
      if (dto.identificationNumber) visitor.identificationNumber = dto.identificationNumber;
      if (dto.notes) visitor.notes = dto.notes;
      await visitor.save();
      return visitor;
    }

    visitor = await this.visitorModel.create({
      organizationId: orgId,
      fullName: dto.fullName,
      phone: dto.phone,
      email: dto.email,
      company: dto.company,
      photoFileId: dto.photoFileId,
      identificationType: dto.identificationType || 'NATIONAL_ID',
      identificationNumber: dto.identificationNumber,
      notes: dto.notes,
    });

    return visitor;
  }

  async findAll(organizationId?: string, search?: string, page = 1, limit = 20) {
    const query: any = {};
    if (organizationId) {
      query.organizationId = new Types.ObjectId(organizationId);
    }

    if (search) {
      query.$or = [
        { fullName: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { company: { $regex: search, $options: 'i' } },
      ];
    }

    const skip = (page - 1) * limit;
    const [total, data] = await Promise.all([
      this.visitorModel.countDocuments(query),
      this.visitorModel
        .find(query)
        .populate('organizationId', 'name slug')
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

  async findOne(organizationId: string | undefined, id: string): Promise<Visitor> {
    const query: any = { _id: new Types.ObjectId(id) };
    if (organizationId) {
      query.organizationId = new Types.ObjectId(organizationId);
    }
    const visitor = await this.visitorModel.findOne(query).exec();

    if (!visitor) {
      throw new NotFoundException(VISITOR_MESSAGES.NOT_FOUND);
    }

    return visitor;
  }

  async update(organizationId: string | undefined, id: string, dto: UpdateVisitorDto): Promise<Visitor> {
    const query: any = { _id: new Types.ObjectId(id) };
    if (organizationId) {
      query.organizationId = new Types.ObjectId(organizationId);
    }
    const updated = await this.visitorModel
      .findOneAndUpdate(
        query,
        { $set: dto },
        { new: true },
      )
      .exec();

    if (!updated) {
      throw new NotFoundException(VISITOR_MESSAGES.NOT_FOUND);
    }

    return updated;
  }

  async getHistory(organizationId: string | undefined, id: string) {
    const visitorId = new Types.ObjectId(id);
    const query: any = { visitorId };
    if (organizationId) {
      query.organizationId = new Types.ObjectId(organizationId);
    }

    const visits = await this.visitModel
      .find(query)
      .populate('hostId', 'fullName email employeeId')
      .populate('departmentId', 'name')
      .populate('buildingId', 'name locationCode')
      .sort({ scheduledDate: -1, createdAt: -1 })
      .exec();

    return visits;
  }
}

