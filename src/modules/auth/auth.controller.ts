import { Controller, Post, Get, Patch, Body, Req, Res, UseGuards, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { LoginDto, RefreshTokenDto, UpdateProfileDto, ChangePasswordDto } from './dto/auth.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CurrentUserPayload } from '../../common/interfaces/current-user.interface';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { AUTH_MESSAGES } from '../../common/constants/messages.constant';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly auditLogsService: AuditLogsService,
  ) {}

  @Post('login')
  @ApiOperation({ summary: 'Single unified login for all roles' })
  @ApiResponse({ status: 200, description: 'Authentication successful' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  async login(
    @Body() dto: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.login(dto);

    // Set secure HttpOnly cookie for refresh token
    res.cookie('refreshToken', result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    await this.auditLogsService.log({
      organizationId: result.user.organizationId || undefined,
      userId: result.user.id,
      userEmail: result.user.email,
      action: 'LOGIN',
      resource: 'auth',
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    return {
      message: 'Login successful',
      data: result,
    };
  }

  @Post('refresh')
  @ApiOperation({ summary: 'Refresh access token using refresh token' })
  async refresh(
    @Req() req: Request,
    @Body() dto: RefreshTokenDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const rawToken = req.cookies?.refreshToken || dto?.refreshToken;
    const tokens = await this.authService.refreshTokens(rawToken);

    res.cookie('refreshToken', tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return {
      message: 'Token refreshed successfully',
      data: tokens,
    };
  }

  @Post('logout')
  @ApiOperation({ summary: 'Revoke session and logout' })
  async logout(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const rawToken = req.cookies?.refreshToken;
    await this.authService.logout(rawToken);

    res.clearCookie('refreshToken');

    return { message: AUTH_MESSAGES.LOGGED_OUT_SUCCESS };
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current authenticated user profile' })
  async getMe(@CurrentUser() user: CurrentUserPayload) {
    const data = await this.authService.getCurrentUser(user);
    return { data };
  }

  @Patch('profile')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update personal profile information' })
  async updateProfile(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: UpdateProfileDto,
    @Req() req: Request,
  ) {
    const data = await this.authService.updateProfile(user, dto);

    await this.auditLogsService.log({
      organizationId: user.organizationId,
      userId: user.userId,
      userEmail: user.email,
      action: 'UPDATE_PROFILE',
      resource: 'auth',
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      details: dto,
    });

    return {
      message: AUTH_MESSAGES.PROFILE_UPDATE_SUCCESS,
      data,
    };
  }

  @Post('change-password')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Change current user password' })
  async changePassword(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: ChangePasswordDto,
    @Req() req: Request,
  ) {
    const result = await this.authService.changePassword(user, dto);

    await this.auditLogsService.log({
      organizationId: user.organizationId,
      userId: user.userId,
      userEmail: user.email,
      action: 'CHANGE_PASSWORD',
      resource: 'auth',
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    return result;
  }
}

