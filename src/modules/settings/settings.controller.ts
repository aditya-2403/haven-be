import { Controller, Get, Patch, Body, UseGuards, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { SettingsService } from './settings.service';
import { UpdateSettingsDto } from './dto/update-settings.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CurrentUserPayload } from '../../common/interfaces/current-user.interface';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { SETTINGS_MESSAGES, ORGANIZATION_MESSAGES } from '../../common/constants/messages.constant';

@ApiTags('Settings')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('settings')
export class SettingsController {
  constructor(
    private readonly settingsService: SettingsService,
    private readonly auditLogsService: AuditLogsService,
  ) {}

  @Get()
  @Roles(Role.SUPER_ADMIN, Role.ORG_ADMIN)
  @ApiOperation({ summary: 'Get organization settings' })
  async getSettings(@CurrentUser() user: CurrentUserPayload) {
    if (!user.organizationId) {
      throw new BadRequestException(ORGANIZATION_MESSAGES.CONTEXT_REQUIRED);
    }
    const data = await this.settingsService.getSettings(user.organizationId);
    return { data };
  }

  @Patch()
  @Roles(Role.SUPER_ADMIN, Role.ORG_ADMIN)
  @ApiOperation({ summary: 'Update organization settings' })
  async updateSettings(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: UpdateSettingsDto,
  ) {
    if (!user.organizationId) {
      throw new BadRequestException(ORGANIZATION_MESSAGES.CONTEXT_REQUIRED);
    }
    const data = await this.settingsService.updateSettings(user.organizationId, dto);

    await this.auditLogsService.log({
      organizationId: user.organizationId,
      userId: user.userId,
      userEmail: user.email,
      action: 'UPDATE_SETTINGS',
      resource: 'organization_settings',
      details: dto,
    });

    return { message: SETTINGS_MESSAGES.UPDATE_SUCCESS, data };
  }
}

