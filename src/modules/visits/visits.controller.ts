import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { VisitsService } from './visits.service';
import { CreateVisitDto, UpdateVisitDto } from './dto/visit.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CurrentUserPayload } from '../../common/interfaces/current-user.interface';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { Role } from '../../common/enums/role.enum';
import { VISIT_MESSAGES, ORGANIZATION_MESSAGES } from '../../common/constants/messages.constant';

@ApiTags('Visits')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('visits')
export class VisitsController {
  constructor(
    private readonly visitsService: VisitsService,
    private readonly auditLogsService: AuditLogsService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create appointment or walk-in visit' })
  async create(@CurrentUser() user: CurrentUserPayload, @Body() dto: CreateVisitDto) {
    if (!user.organizationId) {
      throw new BadRequestException(ORGANIZATION_MESSAGES.CONTEXT_REQUIRED);
    }

    // If host is creating an appointment for themselves and didn't specify hostId, use their employee record
    if (user.role === Role.EMPLOYEE && !dto.hostId && user.employeeId) {
      dto.hostId = user.employeeId;
    }

    const data = await this.visitsService.create(user.organizationId, dto);

    await this.auditLogsService.log({
      organizationId: user.organizationId,
      userId: user.userId,
      userEmail: user.email,
      action: 'CREATE_VISIT',
      resource: 'visits',
      resourceId: (data.visit as any)._id?.toString(),
      details: { purpose: dto.purpose, type: dto.visitType },
    });

    return { message: VISIT_MESSAGES.CREATE_SUCCESS, data };
  }

  @Get()
  @ApiOperation({ summary: 'List visits / appointments with filters' })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'hostId', required: false })
  @ApiQuery({ name: 'date', required: false })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'organizationId', required: false, type: String })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async findAll(
    @CurrentUser() user: CurrentUserPayload,
    @Query('status') status?: string,
    @Query('hostId') hostId?: string,
    @Query('date') date?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('search') search?: string,
    @Query('organizationId') queryOrgId?: string,
    @Query('page') page = '1',
    @Query('limit') limit = '20',
  ) {
    const orgId = user.role === Role.SUPER_ADMIN ? (queryOrgId || undefined) : user.organizationId;
    if (!orgId && user.role !== Role.SUPER_ADMIN) {
      throw new BadRequestException(ORGANIZATION_MESSAGES.CONTEXT_REQUIRED);
    }

    // If user is employee, automatically restrict to their appointments
    let filterHostId = hostId;
    if (user.role === Role.EMPLOYEE && user.employeeId) {
      filterHostId = user.employeeId;
    }

    return this.visitsService.findAll(orgId, {
      status,
      hostId: filterHostId,
      date,
      startDate,
      endDate,
      search,
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get visit details' })
  async findOne(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string) {
    const orgId = user.role === Role.SUPER_ADMIN ? undefined : user.organizationId;
    if (!orgId && user.role !== Role.SUPER_ADMIN) {
      throw new BadRequestException(ORGANIZATION_MESSAGES.CONTEXT_REQUIRED);
    }
    const data = await this.visitsService.findOne(orgId, id);
    return { data };
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update visit' })
  async update(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
    @Body() dto: UpdateVisitDto,
  ) {
    if (!user.organizationId) {
      throw new BadRequestException(ORGANIZATION_MESSAGES.CONTEXT_REQUIRED);
    }
    const data = await this.visitsService.update(user.organizationId, id, dto);

    await this.auditLogsService.log({
      organizationId: user.organizationId,
      userId: user.userId,
      userEmail: user.email,
      action: 'UPDATE_VISIT',
      resource: 'visits',
      resourceId: id,
    });

    return { message: VISIT_MESSAGES.UPDATE_SUCCESS, data };
  }

  @Post(':id/cancel')
  @ApiOperation({ summary: 'Cancel visit' })
  async cancel(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
    @Body('reason') reason?: string,
  ) {
    if (!user.organizationId) {
      throw new BadRequestException(ORGANIZATION_MESSAGES.CONTEXT_REQUIRED);
    }
    const data = await this.visitsService.cancel(user.organizationId, id, reason);

    await this.auditLogsService.log({
      organizationId: user.organizationId,
      userId: user.userId,
      userEmail: user.email,
      action: 'CANCEL_VISIT',
      resource: 'visits',
      resourceId: id,
      details: { reason },
    });

    return { message: VISIT_MESSAGES.CANCEL_SUCCESS, data };
  }

  @Get(':id/pass')
  @ApiOperation({ summary: 'Get QR visitor pass and code for approved visit' })
  async getPass(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string) {
    if (!user.organizationId) {
      throw new BadRequestException(ORGANIZATION_MESSAGES.CONTEXT_REQUIRED);
    }
    const data = await this.visitsService.getPass(user.organizationId, id);
    return { data };
  }
}

