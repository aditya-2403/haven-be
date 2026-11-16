import { Controller, Get, Post, Patch, Param, Body, Query, UseGuards, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { EmployeesService } from './employees.service';
import { CreateEmployeeDto, UpdateEmployeeDto, ProvisionEmployeeLoginDto } from './dto/employee.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';
import { EMPLOYEE_MESSAGES, ORGANIZATION_MESSAGES } from '../../common/constants/messages.constant';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CurrentUserPayload } from '../../common/interfaces/current-user.interface';

@ApiTags('Employees')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('employees')
export class EmployeesController {
  constructor(private readonly employeesService: EmployeesService) {}

  @Post()
  @Roles(Role.SUPER_ADMIN, Role.ORG_ADMIN)
  @ApiOperation({ summary: 'Create an employee record' })
  async create(@CurrentUser() user: CurrentUserPayload, @Body() dto: CreateEmployeeDto) {
    const orgId = user.role === Role.SUPER_ADMIN ? (dto.organizationId || user.organizationId) : user.organizationId;
    if (!orgId) {
      throw new BadRequestException(ORGANIZATION_MESSAGES.CONTEXT_REQUIRED);
    }
    const data = await this.employeesService.create(orgId, dto);
    return { message: EMPLOYEE_MESSAGES.CREATE_SUCCESS, data };
  }

  @Post(':id/provision-login')
  @Roles(Role.SUPER_ADMIN, Role.ORG_ADMIN)
  @ApiOperation({ summary: 'Provision or reset login account for employee' })
  async provisionLogin(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
    @Body() dto: ProvisionEmployeeLoginDto,
  ) {
    const orgId = user.role === Role.SUPER_ADMIN ? undefined : user.organizationId;
    const data = await this.employeesService.provisionLogin(orgId, id, dto.password);
    return { message: EMPLOYEE_MESSAGES.LOGIN_PROVISIONED_SUCCESS, data };
  }

  @Get()
  @ApiOperation({ summary: 'List employees (selectable as hosts)' })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'organizationId', required: false, type: String })
  async findAll(
    @CurrentUser() user: CurrentUserPayload,
    @Query('search') search?: string,
    @Query('organizationId') queryOrgId?: string,
  ) {
    const orgId = user.role === Role.SUPER_ADMIN ? (queryOrgId || undefined) : user.organizationId;
    if (!orgId && user.role !== Role.SUPER_ADMIN) {
      throw new BadRequestException(ORGANIZATION_MESSAGES.CONTEXT_REQUIRED);
    }
    const data = await this.employeesService.findAll(orgId, search);
    return { data };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get employee details' })
  async findOne(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string) {
    const orgId = user.role === Role.SUPER_ADMIN ? undefined : user.organizationId;
    const data = await this.employeesService.findOne(orgId, id);
    return { data };
  }

  @Patch(':id')
  @Roles(Role.SUPER_ADMIN, Role.ORG_ADMIN)
  @ApiOperation({ summary: 'Update employee record' })
  async update(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
    @Body() dto: UpdateEmployeeDto,
  ) {
    const orgId = user.role === Role.SUPER_ADMIN ? undefined : user.organizationId;
    const data = await this.employeesService.update(orgId, id, dto);
    return { message: EMPLOYEE_MESSAGES.UPDATE_SUCCESS, data };
  }
}
