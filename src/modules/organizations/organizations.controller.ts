import { Controller, Get, Post, Patch, Param, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { OrganizationsService } from './organizations.service';
import { CreateOrganizationDto, UpdateOrganizationDto } from './dto/organization.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CurrentUserPayload } from '../../common/interfaces/current-user.interface';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { ORGANIZATION_MESSAGES } from '../../common/constants/messages.constant';

@ApiTags('Organizations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('organizations')
export class OrganizationsController {
  constructor(
    private readonly orgService: OrganizationsService,
    private readonly auditLogsService: AuditLogsService,
  ) {}

  @Post()
  @Roles(Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Create organization (Super Admin only)' })
  async create(@CurrentUser() user: CurrentUserPayload, @Body() dto: CreateOrganizationDto) {
    const data = await this.orgService.create(dto);

    await this.auditLogsService.log({
      userId: user.userId,
      userEmail: user.email,
      action: 'CREATE_ORGANIZATION',
      resource: 'organizations',
      resourceId: (data.organization as any)._id?.toString(),
      details: { name: dto.name, slug: dto.slug },
    });

    return { message: ORGANIZATION_MESSAGES.CREATED_SUCCESS, data };
  }

  @Get()
  @Roles(Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'List all organizations (Super Admin only)' })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'status', required: false, enum: ['ACTIVE', 'SUSPENDED'] })
  async findAll(@Query('search') search?: string, @Query('status') status?: string) {
    const data = await this.orgService.findAll(search, status);
    return { data };
  }

  @Get('global-stats')
  @Roles(Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Super Admin global platform statistics' })
  async getGlobalStats() {
    const data = await this.orgService.getGlobalStats();
    return { data };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get organization details' })
  async findOne(@Param('id') id: string) {
    const data = await this.orgService.findOne(id);
    return { data };
  }

  @Patch(':id')
  @Roles(Role.SUPER_ADMIN, Role.ORG_ADMIN)
  @ApiOperation({ summary: 'Update organization' })
  async update(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
    @Body() dto: UpdateOrganizationDto,
  ) {
    const data = await this.orgService.update(id, dto);

    await this.auditLogsService.log({
      organizationId: id,
      userId: user.userId,
      userEmail: user.email,
      action: 'UPDATE_ORGANIZATION',
      resource: 'organizations',
      resourceId: id,
      details: dto,
    });

    return { message: ORGANIZATION_MESSAGES.UPDATED_SUCCESS, data };
  }

  @Get(':id/stats')
  @Roles(Role.SUPER_ADMIN, Role.ORG_ADMIN)
  @ApiOperation({ summary: 'Get organization statistics' })
  async getStats(@Param('id') id: string) {
    const data = await this.orgService.getStats(id);
    return { data };
  }
}

