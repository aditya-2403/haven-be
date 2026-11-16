import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Building, BuildingDocument } from './schemas/building.schema';
import { CreateBuildingDto, UpdateBuildingDto } from './dto/building.dto';
import { BUILDING_MESSAGES } from '../../common/constants/messages.constant';

@Injectable()
export class BuildingsService {
  constructor(
    @InjectModel(Building.name)
    private readonly buildingModel: Model<BuildingDocument>,
  ) {}

  async create(organizationId: string, dto: CreateBuildingDto): Promise<Building> {
    const existing = await this.buildingModel
      .findOne({
        organizationId: new Types.ObjectId(organizationId),
        locationCode: dto.locationCode.toUpperCase(),
      })
      .exec();

    if (existing) {
      throw new ConflictException(BUILDING_MESSAGES.ALREADY_EXISTS);
    }

    const created = await this.buildingModel.create({
      organizationId: new Types.ObjectId(organizationId),
      name: dto.name,
      locationCode: dto.locationCode.toUpperCase(),
      address: dto.address,
      description: dto.description,
      status: 'ACTIVE',
    });

    return created;
  }

  async findAll(organizationId: string): Promise<Building[]> {
    return this.buildingModel
      .find({ organizationId: new Types.ObjectId(organizationId) })
      .sort({ name: 1 })
      .exec();
  }

  async findOne(organizationId: string, id: string): Promise<Building> {
    const building = await this.buildingModel
      .findOne({ _id: new Types.ObjectId(id), organizationId: new Types.ObjectId(organizationId) })
      .exec();

    if (!building) {
      throw new NotFoundException(BUILDING_MESSAGES.NOT_FOUND);
    }

    return building;
  }

  async update(organizationId: string, id: string, dto: UpdateBuildingDto): Promise<Building> {
    const updateData: any = { ...dto };
    if (dto.locationCode) {
      updateData.locationCode = dto.locationCode.toUpperCase();
    }

    const updated = await this.buildingModel
      .findOneAndUpdate(
        { _id: new Types.ObjectId(id), organizationId: new Types.ObjectId(organizationId) },
        { $set: updateData },
        { new: true },
      )
      .exec();

    if (!updated) {
      throw new NotFoundException(BUILDING_MESSAGES.NOT_FOUND);
    }

    return updated;
  }
}

