import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { OrganizationSettings, OrganizationSettingsDocument } from './schemas/organization-settings.schema';
import { UpdateSettingsDto } from './dto/update-settings.dto';

@Injectable()
export class SettingsService {
  constructor(
    @InjectModel(OrganizationSettings.name)
    private readonly settingsModel: Model<OrganizationSettingsDocument>,
  ) {}

  async getSettings(organizationId: string): Promise<OrganizationSettings> {
    let settings = await this.settingsModel
      .findOne({ organizationId: new Types.ObjectId(organizationId) })
      .exec();

    if (!settings) {
      settings = await this.settingsModel.create({
        organizationId: new Types.ObjectId(organizationId),
        requireApprovalByDefault: true,
        defaultVisitDurationMinutes: 60,
        allowWalkIns: true,
        notifyHostOnArrival: true,
        timezone: 'UTC',
        passExpiryHours: 24,
      });
    }

    return settings;
  }

  async updateSettings(
    organizationId: string,
    dto: UpdateSettingsDto,
  ): Promise<OrganizationSettings> {
    const updated = await this.settingsModel
      .findOneAndUpdate(
        { organizationId: new Types.ObjectId(organizationId) },
        { $set: dto },
        { new: true, upsert: true },
      )
      .exec();

    return updated;
  }
}

