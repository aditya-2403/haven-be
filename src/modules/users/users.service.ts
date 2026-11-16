import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import * as bcrypt from 'bcryptjs';
import { User, UserDocument } from './schemas/user.schema';
import { Employee, EmployeeDocument } from '../employees/schemas/employee.schema';
import { CreateUserDto, UpdateUserDto, ResetPasswordDto } from './dto/user.dto';
import { Role } from '../../common/enums/role.enum';
import { USER_MESSAGES } from '../../common/constants/messages.constant';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
    @InjectModel(Employee.name)
    private readonly employeeModel: Model<EmployeeDocument>,
  ) {}

  async create(organizationId: string | undefined, dto: CreateUserDto): Promise<Omit<User, 'passwordHash'>> {
    // If not super admin creating another user, organizationId is required
    const orgId = organizationId ? new Types.ObjectId(organizationId) : null;

    const existing = await this.userModel.findOne({
      organizationId: orgId,
      email: dto.email.toLowerCase().trim(),
    }).exec();

    if (existing) {
      throw new ConflictException(USER_MESSAGES.ALREADY_EXISTS);
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);

    const created = await this.userModel.create({
      organizationId: orgId,
      email: dto.email.toLowerCase().trim(),
      passwordHash,
      firstName: dto.firstName.trim(),
      lastName: dto.lastName.trim(),
      role: dto.role,
      departmentId: dto.departmentId ? new Types.ObjectId(dto.departmentId) : null,
      employeeId: dto.employeeId ? new Types.ObjectId(dto.employeeId) : null,
      phone: dto.phone,
      status: 'ACTIVE',
    });

    if (dto.employeeId) {
      await this.employeeModel.findByIdAndUpdate(dto.employeeId, { userId: created._id });
    }

    const userObj = created.toObject();
    delete (userObj as any).passwordHash;
    return userObj;
  }

  async findAll(organizationId?: string, search?: string, role?: string, status?: string) {
    const query: any = {};
    if (organizationId) {
      query.organizationId = new Types.ObjectId(organizationId);
    }
    if (role) {
      query.role = role;
    }
    if (status) {
      query.status = status;
    }
    if (search) {
      query.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }

    const users = await this.userModel
      .find(query)
      .select('-passwordHash')
      .populate('departmentId', 'name')
      .populate('organizationId', 'name slug')
      .sort({ createdAt: -1 })
      .exec();

    return users;
  }

  async findById(id: string): Promise<UserDocument | null> {
    return this.userModel.findById(id).select('-passwordHash').exec();
  }

  async findByEmail(email: string, organizationId?: string): Promise<UserDocument | null> {
    const query: any = { email: email.toLowerCase().trim() };
    if (organizationId) {
      query.organizationId = new Types.ObjectId(organizationId);
    }
    return this.userModel.findOne(query).exec();
  }

  async update(organizationId: string | undefined, id: string, dto: UpdateUserDto) {
    const query: any = { _id: new Types.ObjectId(id) };
    if (organizationId) {
      query.organizationId = new Types.ObjectId(organizationId);
    }

    const updateData: any = { ...dto };
    if (dto.departmentId) {
      updateData.departmentId = new Types.ObjectId(dto.departmentId);
    }
    if (dto.employeeId) {
      updateData.employeeId = new Types.ObjectId(dto.employeeId);
    }

    const updated = await this.userModel
      .findOneAndUpdate(query, { $set: updateData }, { new: true })
      .select('-passwordHash')
      .populate('departmentId', 'name')
      .exec();

    if (!updated) {
      throw new NotFoundException(USER_MESSAGES.NOT_FOUND);
    }

    return updated;
  }

  async resetPassword(organizationId: string | undefined, id: string, dto: ResetPasswordDto) {
    const query: any = { _id: new Types.ObjectId(id) };
    if (organizationId) {
      query.organizationId = new Types.ObjectId(organizationId);
    }

    const passwordHash = await bcrypt.hash(dto.newPassword, 12);

    const updated = await this.userModel
      .findOneAndUpdate(query, { $set: { passwordHash } }, { new: true })
      .select('-passwordHash')
      .exec();

    if (!updated) {
      throw new NotFoundException(USER_MESSAGES.NOT_FOUND);
    }

    return { message: USER_MESSAGES.PASSWORD_RESET_SUCCESS };
  }
}

