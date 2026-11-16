import { Controller, Get, Post, Param, Body, UseGuards, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ApprovalsService } from './approvals.service';
import { ProcessApprovalDto } from './dto/approval.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CurrentUserPayload } from '../../common/interfaces/current-user.interface';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { APPROVAL_MESSAGES, ORGANIZATION_MESSAGES } from '../../common/constants/messages.constant';

@ApiTags('Approvals')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('approvals')
export class ApprovalsController {
  constructor(
    private readonly approvalsService: ApprovalsService,
    private readonly auditLogsService: AuditLogsService,
  ) {}

  @Get('pending')
  @ApiOperation({ summary: 'Get pending visitor approvals for current user / organization' })
  async getPending(@CurrentUser() user: CurrentUserPayload) {
    if (!user.organizationId) {
      throw new BadRequestException(ORGANIZATION_MESSAGES.CONTEXT_REQUIRED);
    }
    const data = await this.approvalsService.getPendingApprovals(user.organizationId, user);
    return { data };
  }

  @Post(':id/approve')
  @ApiOperation({ summary: 'Approve visitor request and issue QR pass' })
  async approve(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
    @Body() dto: ProcessApprovalDto,
  ) {
    if (!user.organizationId) {
      throw new BadRequestException(ORGANIZATION_MESSAGES.CONTEXT_REQUIRED);
    }
    const data = await this.approvalsService.approve(user.organizationId, id, user, dto?.remarks);

    await this.auditLogsService.log({
      organizationId: user.organizationId,
      userId: user.userId,
      userEmail: user.email,
      action: 'APPROVE_VISIT',
      resource: 'visits',
      resourceId: id,
      details: { remarks: dto?.remarks, passCode: data.passCode },
    });

    return { message: APPROVAL_MESSAGES.APPROVED_SUCCESS, data };
  }

  @Post(':id/reject')
  @ApiOperation({ summary: 'Reject visitor request' })
  async reject(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
    @Body() dto: ProcessApprovalDto,
  ) {
    if (!user.organizationId) {
      throw new BadRequestException(ORGANIZATION_MESSAGES.CONTEXT_REQUIRED);
    }
    const data = await this.approvalsService.reject(user.organizationId, id, user, dto?.remarks);

    await this.auditLogsService.log({
      organizationId: user.organizationId,
      userId: user.userId,
      userEmail: user.email,
      action: 'REJECT_VISIT',
      resource: 'visits',
      resourceId: id,
      details: { remarks: dto?.remarks },
    });

    return { message: APPROVAL_MESSAGES.REJECTED_SUCCESS, data };
  }
}

