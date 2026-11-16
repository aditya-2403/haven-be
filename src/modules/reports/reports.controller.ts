import { Controller, Get, Query, Res, UseGuards, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { Response } from 'express';
import { ReportsService } from './reports.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CurrentUserPayload } from '../../common/interfaces/current-user.interface';
import { Role } from '../../common/enums/role.enum';
import { ORGANIZATION_MESSAGES } from '../../common/constants/messages.constant';

@ApiTags('Reports & Analytics')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('summary')
  @ApiOperation({ summary: 'Get summary metrics and KPIs for organization or global dashboard' })
  @ApiQuery({ name: 'organizationId', required: false, type: String })
  async getSummary(
    @CurrentUser() user: CurrentUserPayload,
    @Query('organizationId') queryOrgId?: string,
  ) {
    const orgId = user.role === Role.SUPER_ADMIN ? (queryOrgId || undefined) : user.organizationId;
    if (!orgId && user.role !== Role.SUPER_ADMIN) {
      throw new BadRequestException(ORGANIZATION_MESSAGES.CONTEXT_REQUIRED);
    }
    const data = await this.reportsService.getSummary(orgId);
    return { data };
  }

  @Get('visitor-trends')
  @ApiOperation({ summary: 'Get daily visitor trends over past N days' })
  @ApiQuery({ name: 'days', required: false, type: Number })
  @ApiQuery({ name: 'organizationId', required: false, type: String })
  async getTrends(
    @CurrentUser() user: CurrentUserPayload,
    @Query('days') days = '7',
    @Query('organizationId') queryOrgId?: string,
  ) {
    const orgId = user.role === Role.SUPER_ADMIN ? (queryOrgId || undefined) : user.organizationId;
    if (!orgId && user.role !== Role.SUPER_ADMIN) {
      throw new BadRequestException(ORGANIZATION_MESSAGES.CONTEXT_REQUIRED);
    }
    const data = await this.reportsService.getVisitorTrends(orgId, parseInt(days, 10));
    return { data };
  }

  @Get('department-stats')
  @ApiOperation({ summary: 'Get visitor counts grouped by department' })
  @ApiQuery({ name: 'organizationId', required: false, type: String })
  async getDepartmentStats(
    @CurrentUser() user: CurrentUserPayload,
    @Query('organizationId') queryOrgId?: string,
  ) {
    const orgId = user.role === Role.SUPER_ADMIN ? (queryOrgId || undefined) : user.organizationId;
    if (!orgId && user.role !== Role.SUPER_ADMIN) {
      throw new BadRequestException(ORGANIZATION_MESSAGES.CONTEXT_REQUIRED);
    }
    const data = await this.reportsService.getDepartmentStats(orgId);
    return { data };
  }

  @Get('top-hosts')
  @ApiOperation({ summary: 'Get most frequently visited employees' })
  @ApiQuery({ name: 'organizationId', required: false, type: String })
  async getTopHosts(
    @CurrentUser() user: CurrentUserPayload,
    @Query('organizationId') queryOrgId?: string,
  ) {
    const orgId = user.role === Role.SUPER_ADMIN ? (queryOrgId || undefined) : user.organizationId;
    if (!orgId && user.role !== Role.SUPER_ADMIN) {
      throw new BadRequestException(ORGANIZATION_MESSAGES.CONTEXT_REQUIRED);
    }
    const data = await this.reportsService.getTopHosts(orgId);
    return { data };
  }

  @Get('export')
  @ApiOperation({ summary: 'Export visitor log history to CSV' })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  @ApiQuery({ name: 'organizationId', required: false, type: String })
  async exportCsv(
    @CurrentUser() user: CurrentUserPayload,
    @Res() res: Response,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('organizationId') queryOrgId?: string,
  ) {
    const orgId = user.role === Role.SUPER_ADMIN ? (queryOrgId || undefined) : user.organizationId;
    if (!orgId && user.role !== Role.SUPER_ADMIN) {
      throw new BadRequestException(ORGANIZATION_MESSAGES.CONTEXT_REQUIRED);
    }
    const csvContent = await this.reportsService.exportVisitorLogsCsv(
      orgId,
      startDate,
      endDate,
    );

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="haven_visitor_logs.csv"');
    return res.status(200).send(csvContent);
  }
}
