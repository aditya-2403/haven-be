import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Department, DepartmentDocument } from './schemas/department.schema';
import { CreateDepartmentDto, UpdateDepartmentDto } from './dto/department.dto';
import { DEPARTMENT_MESSAGES } from '../../common/constants/messages.constant';

@Injectable()
export class DepartmentsService {
  constructor(
    @InjectModel(Department.name)
    private readonly departmentModel: Model<DepartmentDocument>,
  ) {}

  async create(organizationId: string, dto: CreateDepartmentDto): Promise<Department> {
    const existing = await this.departmentModel
      .findOne({ organizationId: new Types.ObjectId(organizationId), name: dto.name })
      .exec();

    if (existing) {
      throw new ConflictException(DEPARTMENT_MESSAGES.ALREADY_EXISTS);
    }

    const created = await this.departmentModel.create({
      organizationId: new Types.ObjectId(organizationId),
      name: dto.name,
      description: dto.description,
      headEmployeeId: dto.headEmployeeId ? new Types.ObjectId(dto.headEmployeeId) : null,
      status: 'ACTIVE',
    });

    return created;
  }

  async findAll(organizationId: string): Promise<Department[]> {
    return this.departmentModel
      .find({ organizationId: new Types.ObjectId(organizationId) })
      .populate('headEmployeeId', 'fullName email designation')
      .sort({ name: 1 })
      .exec();
  }

  async findOne(organizationId: string, id: string): Promise<Department> {
    const department = await this.departmentModel
      .findOne({ _id: new Types.ObjectId(id), organizationId: new Types.ObjectId(organizationId) })
      .populate('headEmployeeId', 'fullName email designation')
      .exec();

    if (!department) {
      throw new NotFoundException(DEPARTMENT_MESSAGES.NOT_FOUND);
    }

    return department;
  }

  async update(organizationId: string, id: string, dto: UpdateDepartmentDto): Promise<Department> {
    const updateData: any = { ...dto };
    if (dto.headEmployeeId) {
      updateData.headEmployeeId = new Types.ObjectId(dto.headEmployeeId);
    }

    const updated = await this.departmentModel
      .findOneAndUpdate(
        { _id: new Types.ObjectId(id), organizationId: new Types.ObjectId(organizationId) },
        { $set: updateData },
        { new: true },
      )
      .exec();

    if (!updated) {
      throw new NotFoundException(DEPARTMENT_MESSAGES.NOT_FOUND);
    }

    return updated;
  }
}

