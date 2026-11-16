import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import * as bcrypt from 'bcryptjs';
import { Organization, OrganizationDocument } from './schemas/organization.schema';
import { User, UserDocument } from '../users/schemas/user.schema';
import { OrganizationSettings, OrganizationSettingsDocument } from '../settings/schemas/organization-settings.schema';
import { Visit, VisitDocument } from '../visits/schemas/visit.schema';
import { Visitor, VisitorDocument } from '../visitors/schemas/visitor.schema';
import { CreateOrganizationDto, UpdateOrganizationDto } from './dto/organization.dto';
import { Role } from '../../common/enums/role.enum';
import { ORGANIZATION_MESSAGES } from '../../common/constants/messages.constant';

@Injectable()
export class OrganizationsService {
  constructor(
    @InjectModel(Organization.name)
    private readonly orgModel: Model<OrganizationDocument>,
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
    @InjectModel(OrganizationSettings.name)
    private readonly settingsModel: Model<OrganizationSettingsDocument>,
    @InjectModel(Visit.name)
    private readonly visitModel: Model<VisitDocument>,
    @InjectModel(Visitor.name)
    private readonly visitorModel: Model<VisitorDocument>,
  ) {}

  async create(dto: CreateOrganizationDto): Promise<{ organization: Organization; initialAdmin?: any }> {
    const cleanSlug = dto.slug.toLowerCase().trim().replace(/[^a-z0-9-]/g, '-');
    const existing = await this.orgModel.findOne({ slug: cleanSlug }).exec();
    if (existing) {
      throw new ConflictException(ORGANIZATION_MESSAGES.ALREADY_EXISTS(cleanSlug));
    }

    const org = await this.orgModel.create({
      name: dto.name,
      slug: cleanSlug,
      email: dto.email,
      phone: dto.phone,
      address: dto.address,
      logo: dto.logo,
      status: 'ACTIVE',
    });

    // Create default settings
    await this.settingsModel.create({
      organizationId: org._id,
      requireApprovalByDefault: true,
      defaultVisitDurationMinutes: 60,
      allowWalkIns: true,
      notifyHostOnArrival: true,
      timezone: 'UTC',
      passExpiryHours: 24,
    });

    let initialAdmin: any = null;
    if (dto.initialAdmin) {
      const passwordHash = await bcrypt.hash(dto.initialAdmin.password, 12);
      initialAdmin = await this.userModel.create({
        organizationId: org._id,
        email: dto.initialAdmin.email.toLowerCase().trim(),
        passwordHash,
        firstName: dto.initialAdmin.firstName,
        lastName: dto.initialAdmin.lastName,
        role: Role.ORG_ADMIN,
        status: 'ACTIVE',
      });
      initialAdmin = {
        id: initialAdmin._id,
        email: initialAdmin.email,
        name: `${initialAdmin.firstName} ${initialAdmin.lastName}`,
        role: initialAdmin.role,
      };
    }

    return { organization: org, initialAdmin };
  }

  async findAll(search?: string, status?: string) {
    const query: any = {};
    if (status) {
      query.status = status;
    }
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { slug: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }

    return this.orgModel.find(query).sort({ createdAt: -1 }).exec();
  }

  async findOne(id: string): Promise<Organization> {
    const org = await this.orgModel.findById(id).exec();
    if (!org) {
      throw new NotFoundException(ORGANIZATION_MESSAGES.NOT_FOUND);
    }
    return org;
  }

  async update(id: string, dto: UpdateOrganizationDto): Promise<Organization> {
    const org = await this.orgModel.findByIdAndUpdate(id, { $set: dto }, { new: true }).exec();
    if (!org) {
      throw new NotFoundException(ORGANIZATION_MESSAGES.NOT_FOUND);
    }
    return org;
  }

  async getStats(id: string) {
    const orgObjectId = new Types.ObjectId(id);
    const [totalUsers, totalVisitors, totalVisits] = await Promise.all([
      this.userModel.countDocuments({ organizationId: orgObjectId }),
      this.visitorModel.countDocuments({ organizationId: orgObjectId }),
      this.visitModel.countDocuments({ organizationId: orgObjectId }),
    ]);

    return {
      totalUsers,
      totalVisitors,
      totalVisits,
    };
  }

  async getGlobalStats() {
    const [totalOrgs, activeOrgs, suspendedOrgs, totalUsers, totalVisitors] = await Promise.all([
      this.orgModel.countDocuments(),
      this.orgModel.countDocuments({ status: 'ACTIVE' }),
      this.orgModel.countDocuments({ status: 'SUSPENDED' }),
      this.userModel.countDocuments(),
      this.visitorModel.countDocuments(),
    ]);

    const recentOrgs = await this.orgModel.find().sort({ createdAt: -1 }).limit(5).exec();

    return {
      totalOrganizations: totalOrgs,
      activeOrganizations: activeOrgs,
      suspendedOrganizations: suspendedOrgs,
      totalUsers,
      totalVisitors,
      recentOrganizations: recentOrgs,
    };
  }
}

