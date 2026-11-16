import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { CreateUserDto, UpdateUserDto, ResetPasswordDto } from './dto/user.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CurrentUserPayload } from '../../common/interfaces/current-user.interface';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { USER_MESSAGES, ORGANIZATION_MESSAGES } from '../../common/constants/messages.constant';

@ApiTags('Users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly auditLogsService: AuditLogsService,
  ) {}

  @Post()
  @Roles(Role.SUPER_ADMIN, Role.ORG_ADMIN)
  @ApiOperation({ summary: 'Create user within organization' })
  async create(@CurrentUser() user: CurrentUserPayload, @Body() dto: CreateUserDto) {
    if (user.role === Role.ORG_ADMIN) {
      if (dto.role === Role.SUPER_ADMIN) {
        throw new ForbiddenException(USER_MESSAGES.CANNOT_ASSIGN_HIGHER_ROLE);
      }
    }

    const orgId = user.role === Role.SUPER_ADMIN ? (dto.organizationId || user.organizationId) : user.organizationId;
    if (!orgId && user.role !== Role.SUPER_ADMIN) {
      throw new BadRequestException(ORGANIZATION_MESSAGES.CONTEXT_REQUIRED);
    }

    const data = await this.usersService.create(orgId, dto);

    await this.auditLogsService.log({
      organizationId: orgId,
      userId: user.userId,
      userEmail: user.email,
      action: 'CREATE_USER',
      resource: 'users',
      resourceId: (data as any)._id?.toString(),
      details: { email: dto.email, role: dto.role },
    });

    return { message: USER_MESSAGES.CREATE_SUCCESS, data };
  }

  @Get()
  @Roles(Role.SUPER_ADMIN, Role.ORG_ADMIN)
  @ApiOperation({ summary: 'List users' })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'role', required: false })
  @ApiQuery({ name: 'status', required: false })
  async findAll(
    @CurrentUser() user: CurrentUserPayload,
    @Query('search') search?: string,
    @Query('role') role?: string,
    @Query('status') status?: string,
  ) {
    const orgId = user.role === Role.SUPER_ADMIN ? undefined : user.organizationId;
    const data = await this.usersService.findAll(orgId, search, role, status);
    return { data };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get user by id' })
  async findOne(@Param('id') id: string) {
    const data = await this.usersService.findById(id);
    return { data };
  }

  @Patch(':id')
  @Roles(Role.SUPER_ADMIN, Role.ORG_ADMIN)
  @ApiOperation({ summary: 'Update user' })
  async update(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
  ) {
    if (user.role === Role.ORG_ADMIN && dto.role === Role.SUPER_ADMIN) {
      throw new ForbiddenException(USER_MESSAGES.CANNOT_ELEVATE_SUPER_ADMIN);
    }

    const orgId = user.role === Role.SUPER_ADMIN ? undefined : user.organizationId;
    const data = await this.usersService.update(orgId, id, dto);

    await this.auditLogsService.log({
      organizationId: orgId,
      userId: user.userId,
      userEmail: user.email,
      action: 'UPDATE_USER',
      resource: 'users',
      resourceId: id,
      details: dto,
    });

    return { message: USER_MESSAGES.UPDATE_SUCCESS, data };
  }

  @Post(':id/reset-password')
  @Roles(Role.SUPER_ADMIN, Role.ORG_ADMIN)
  @ApiOperation({ summary: 'Reset a user password' })
  async resetPassword(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
    @Body() dto: ResetPasswordDto,
  ) {
    const orgId = user.role === Role.SUPER_ADMIN ? undefined : user.organizationId;
    const data = await this.usersService.resetPassword(orgId, id, dto);

    await this.auditLogsService.log({
      organizationId: orgId,
      userId: user.userId,
      userEmail: user.email,
      action: 'RESET_PASSWORD',
      resource: 'users',
      resourceId: id,
    });

    return data;
  }
}

