import { Controller, Post, Get, Param, Body, Query, UseGuards, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { CheckInService } from './check-in.service';
import { ScanPassDto } from './dto/check-in.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CurrentUserPayload } from '../../common/interfaces/current-user.interface';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { Role } from '../../common/enums/role.enum';
import { CHECK_IN_MESSAGES, ORGANIZATION_MESSAGES } from '../../common/constants/messages.constant';

@ApiTags('Check-in / Check-out')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('check-in')
export class CheckInController {
  constructor(
    private readonly checkInService: CheckInService,
    private readonly auditLogsService: AuditLogsService,
  ) {}

  @Post('scan')
  @ApiOperation({ summary: 'Scan QR pass or verify pass code' })
  async scanPass(@CurrentUser() user: CurrentUserPayload, @Body() dto: ScanPassDto) {
    if (!user.organizationId) {
      throw new BadRequestException(ORGANIZATION_MESSAGES.CONTEXT_REQUIRED);
    }
    const data = await this.checkInService.scanPass(user.organizationId, dto.code);
    return { message: CHECK_IN_MESSAGES.PASS_VERIFIED_SUCCESS, data };
  }

  @Post(':visitId/checkin')
  @ApiOperation({ summary: 'Check in visitor' })
  async checkIn(@CurrentUser() user: CurrentUserPayload, @Param('visitId') visitId: string) {
    if (!user.organizationId) {
      throw new BadRequestException(ORGANIZATION_MESSAGES.CONTEXT_REQUIRED);
    }
    const data = await this.checkInService.performCheckIn(user.organizationId, visitId, user);

    await this.auditLogsService.log({
      organizationId: user.organizationId,
      userId: user.userId,
      userEmail: user.email,
      action: 'CHECK_IN_VISITOR',
      resource: 'visits',
      resourceId: visitId,
    });

    return { message: CHECK_IN_MESSAGES.CHECK_IN_SUCCESS, data };
  }

  @Post(':visitId/checkout')
  @ApiOperation({ summary: 'Check out visitor' })
  async checkOut(@CurrentUser() user: CurrentUserPayload, @Param('visitId') visitId: string) {
    if (!user.organizationId) {
      throw new BadRequestException(ORGANIZATION_MESSAGES.CONTEXT_REQUIRED);
    }
    const data = await this.checkInService.performCheckOut(user.organizationId, visitId, user);

    await this.auditLogsService.log({
      organizationId: user.organizationId,
      userId: user.userId,
      userEmail: user.email,
      action: 'CHECK_OUT_VISITOR',
      resource: 'visits',
      resourceId: visitId,
    });

    return { message: CHECK_IN_MESSAGES.CHECK_OUT_SUCCESS, data };
  }

  @Get('active')
  @ApiOperation({ summary: 'List currently checked-in visitors' })
  @ApiQuery({ name: 'organizationId', required: false, type: String })
  async getActive(
    @CurrentUser() user: CurrentUserPayload,
    @Query('organizationId') queryOrgId?: string,
  ) {
    const orgId = user.role === Role.SUPER_ADMIN ? (queryOrgId || undefined) : user.organizationId;
    if (!orgId && user.role !== Role.SUPER_ADMIN) {
      throw new BadRequestException(ORGANIZATION_MESSAGES.CONTEXT_REQUIRED);
    }
    const data = await this.checkInService.getActiveVisits(orgId);
    return { data };
  }
}

