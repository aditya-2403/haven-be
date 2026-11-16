import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import * as bcrypt from 'bcryptjs';
import { Employee, EmployeeDocument } from './schemas/employee.schema';
import { User, UserDocument } from '../users/schemas/user.schema';
import { Role } from '../../common/enums/role.enum';
import { CreateEmployeeDto, UpdateEmployeeDto } from './dto/employee.dto';
import { EMPLOYEE_MESSAGES } from '../../common/constants/messages.constant';

@Injectable()
export class EmployeesService {
  constructor(
    @InjectModel(Employee.name)
    private readonly employeeModel: Model<EmployeeDocument>,
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
  ) {}

  async create(organizationId: string, dto: CreateEmployeeDto): Promise<Employee> {
    const existing = await this.employeeModel
      .findOne({
        organizationId: new Types.ObjectId(organizationId),
        $or: [{ employeeId: dto.employeeId }, { email: dto.email.toLowerCase() }],
      })
      .exec();

    if (existing) {
      throw new ConflictException(EMPLOYEE_MESSAGES.ALREADY_EXISTS);
    }

    let linkedUserId: Types.ObjectId | null = dto.userId ? new Types.ObjectId(dto.userId) : null;

    // Auto-provision user account if password provided
    if (dto.password && dto.password.trim().length >= 6) {
      const existingUser = await this.userModel
        .findOne({
          organizationId: new Types.ObjectId(organizationId),
          email: dto.email.toLowerCase().trim(),
        })
        .exec();

      if (existingUser) {
        throw new ConflictException(EMPLOYEE_MESSAGES.USER_ALREADY_EXISTS);
      }

      const nameParts = dto.fullName.trim().split(' ');
      const firstName = nameParts[0] || 'Employee';
      const lastName = nameParts.slice(1).join(' ') || 'Staff';
      const passwordHash = await bcrypt.hash(dto.password, 12);

      const user = await this.userModel.create({
        organizationId: new Types.ObjectId(organizationId),
        email: dto.email.toLowerCase().trim(),
        passwordHash,
        firstName,
        lastName,
        role: Role.EMPLOYEE,
        departmentId: new Types.ObjectId(dto.departmentId),
        phone: dto.phone,
        status: 'ACTIVE',
      });

      linkedUserId = user._id;
    }

    const created = await this.employeeModel.create({
      organizationId: new Types.ObjectId(organizationId),
      employeeId: dto.employeeId,
      fullName: dto.fullName,
      email: dto.email.toLowerCase(),
      phone: dto.phone,
      departmentId: new Types.ObjectId(dto.departmentId),
      designation: dto.designation,
      userId: linkedUserId,
      status: 'ACTIVE',
    });

    if (linkedUserId) {
      await this.userModel.findByIdAndUpdate(linkedUserId, { employeeId: created._id });
    }

    return this.employeeModel
      .findById(created._id)
      .populate('departmentId', 'name')
      .populate('userId', 'email role status')
      .exec() as Promise<Employee>;
  }

  async provisionLogin(organizationId: string | undefined, employeeId: string, password: string): Promise<Employee> {
    const query: any = { _id: new Types.ObjectId(employeeId) };
    if (organizationId) {
      query.organizationId = new Types.ObjectId(organizationId);
    }
    const emp = await this.employeeModel.findOne(query).exec();
    if (!emp) {
      throw new NotFoundException(EMPLOYEE_MESSAGES.NOT_FOUND);
    }

    const orgId = emp.organizationId;
    let user = await this.userModel
      .findOne({
        organizationId: orgId,
        email: emp.email.toLowerCase().trim(),
      })
      .exec();

    const passwordHash = await bcrypt.hash(password, 12);

    if (user) {
      user.passwordHash = passwordHash;
      user.employeeId = emp._id;
      user.status = 'ACTIVE';
      await user.save();
    } else {
      const nameParts = emp.fullName.trim().split(' ');
      const firstName = nameParts[0] || 'Employee';
      const lastName = nameParts.slice(1).join(' ') || 'Staff';

      user = await this.userModel.create({
        organizationId: orgId,
        email: emp.email.toLowerCase().trim(),
        passwordHash,
        firstName,
        lastName,
        role: Role.EMPLOYEE,
        departmentId: emp.departmentId,
        employeeId: emp._id,
        phone: emp.phone,
        status: 'ACTIVE',
      });
    }

    emp.userId = user._id;
    await emp.save();

    return this.employeeModel
      .findById(emp._id)
      .populate('departmentId', 'name')
      .populate('userId', 'email role status')
      .exec() as Promise<Employee>;
  }

  async findAll(organizationId?: string, search?: string): Promise<Employee[]> {
    const query: any = {};
    if (organizationId) {
      query.organizationId = new Types.ObjectId(organizationId);
    }
    if (search) {
      query.$or = [
        { fullName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { employeeId: { $regex: search, $options: 'i' } },
      ];
    }

    return this.employeeModel
      .find(query)
      .populate('departmentId', 'name')
      .populate('userId', 'email role status')
      .sort({ fullName: 1 })
      .exec();
  }

  async findOne(organizationId: string | undefined, id: string): Promise<Employee> {
    const query: any = { _id: new Types.ObjectId(id) };
    if (organizationId) {
      query.organizationId = new Types.ObjectId(organizationId);
    }
    const emp = await this.employeeModel
      .findOne(query)
      .populate('departmentId', 'name')
      .populate('userId', 'email role status')
      .exec();

    if (!emp) {
      throw new NotFoundException(EMPLOYEE_MESSAGES.NOT_FOUND);
    }

    return emp;
  }

  async findByUserId(organizationId: string, userId: string): Promise<Employee | null> {
    return this.employeeModel
      .findOne({
        organizationId: new Types.ObjectId(organizationId),
        userId: new Types.ObjectId(userId),
      })
      .exec();
  }

  async update(organizationId: string | undefined, id: string, dto: UpdateEmployeeDto): Promise<Employee> {
    const updateData: any = { ...dto };
    if (dto.departmentId) {
      updateData.departmentId = new Types.ObjectId(dto.departmentId);
    }
    if (dto.userId) {
      updateData.userId = new Types.ObjectId(dto.userId);
    }
    if (dto.email) {
      updateData.email = dto.email.toLowerCase();
    }

    const query: any = { _id: new Types.ObjectId(id) };
    if (organizationId) {
      query.organizationId = new Types.ObjectId(organizationId);
    }

    const updated = await this.employeeModel
      .findOneAndUpdate(
        query,
        { $set: updateData },
        { new: true },
      )
      .populate('departmentId', 'name')
      .populate('userId', 'email role status')
      .exec();

    if (!updated) {
      throw new NotFoundException(EMPLOYEE_MESSAGES.NOT_FOUND);
    }

    return updated;
  }
}
