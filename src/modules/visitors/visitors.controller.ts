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
import { VisitorsService } from './visitors.service';
import { CreateVisitorDto, UpdateVisitorDto } from './dto/visitor.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CurrentUserPayload } from '../../common/interfaces/current-user.interface';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { Role } from '../../common/enums/role.enum';
import { VISITOR_MESSAGES, ORGANIZATION_MESSAGES } from '../../common/constants/messages.constant';

@ApiTags('Visitors')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('visitors')
export class VisitorsController {
  constructor(
    private readonly visitorsService: VisitorsService,
    private readonly auditLogsService: AuditLogsService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Register or update visitor profile' })
  async create(@CurrentUser() user: CurrentUserPayload, @Body() dto: CreateVisitorDto) {
    if (!user.organizationId) {
      throw new BadRequestException(ORGANIZATION_MESSAGES.CONTEXT_REQUIRED);
    }
    const data = await this.visitorsService.createOrFind(user.organizationId, dto);

    await this.auditLogsService.log({
      organizationId: user.organizationId,
      userId: user.userId,
      userEmail: user.email,
      action: 'REGISTER_VISITOR',
      resource: 'visitors',
      resourceId: (data as any)._id?.toString(),
      details: { fullName: dto.fullName, phone: dto.phone },
    });

    return { message: VISITOR_MESSAGES.REGISTER_SUCCESS, data };
  }

  @Get()
  @ApiOperation({ summary: 'List or search visitors' })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'organizationId', required: false, type: String })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async findAll(
    @CurrentUser() user: CurrentUserPayload,
    @Query('search') search?: string,
    @Query('organizationId') queryOrgId?: string,
    @Query('page') page = '1',
    @Query('limit') limit = '20',
  ) {
    const orgId = user.role === Role.SUPER_ADMIN ? (queryOrgId || undefined) : user.organizationId;
    if (!orgId && user.role !== Role.SUPER_ADMIN) {
      throw new BadRequestException(ORGANIZATION_MESSAGES.CONTEXT_REQUIRED);
    }
    return this.visitorsService.findAll(
      orgId,
      search,
      parseInt(page, 10),
      parseInt(limit, 10),
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get visitor profile details' })
  async findOne(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string) {
    const orgId = user.role === Role.SUPER_ADMIN ? undefined : user.organizationId;
    if (!orgId && user.role !== Role.SUPER_ADMIN) {
      throw new BadRequestException(ORGANIZATION_MESSAGES.CONTEXT_REQUIRED);
    }
    const data = await this.visitorsService.findOne(orgId, id);
    return { data };
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update visitor profile' })
  async update(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
    @Body() dto: UpdateVisitorDto,
  ) {
    const orgId = user.role === Role.SUPER_ADMIN ? undefined : user.organizationId;
    if (!orgId && user.role !== Role.SUPER_ADMIN) {
      throw new BadRequestException(ORGANIZATION_MESSAGES.CONTEXT_REQUIRED);
    }
    const data = await this.visitorsService.update(orgId, id, dto);
    return { message: VISITOR_MESSAGES.UPDATE_SUCCESS, data };
  }

  @Get(':id/history')
  @ApiOperation({ summary: 'Get previous visits for this visitor' })
  async getHistory(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string) {
    const orgId = user.role === Role.SUPER_ADMIN ? undefined : user.organizationId;
    if (!orgId && user.role !== Role.SUPER_ADMIN) {
      throw new BadRequestException(ORGANIZATION_MESSAGES.CONTEXT_REQUIRED);
    }
    const data = await this.visitorsService.getHistory(orgId, id);
    return { data };
  }
}

