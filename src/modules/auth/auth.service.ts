import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { User, UserDocument } from '../users/schemas/user.schema';
import { RefreshToken, RefreshTokenDocument } from './schemas/refresh-token.schema';
import { Organization, OrganizationDocument } from '../organizations/schemas/organization.schema';
import { LoginDto } from './dto/auth.dto';
import { CurrentUserPayload } from '../../common/interfaces/current-user.interface';
import { AUTH_MESSAGES } from '../../common/constants/messages.constant';

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
    @InjectModel(RefreshToken.name)
    private readonly refreshTokenModel: Model<RefreshTokenDocument>,
    @InjectModel(Organization.name)
    private readonly orgModel: Model<OrganizationDocument>,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  async login(dto: LoginDto) {
    const user = await this.userModel.findOne({ email: dto.email.toLowerCase().trim() }).exec();
    if (!user) {
      throw new UnauthorizedException(AUTH_MESSAGES.INVALID_CREDENTIALS);
    }

    if (user.status !== 'ACTIVE') {
      throw new UnauthorizedException(AUTH_MESSAGES.ACCOUNT_INACTIVE);
    }

    // Check organization status if user belongs to one
    let org: any = null;
    if (user.organizationId) {
      org = await this.orgModel.findById(user.organizationId).exec();
      if (!org || org.status === 'SUSPENDED') {
        throw new UnauthorizedException(AUTH_MESSAGES.ORGANIZATION_SUSPENDED);
      }
    }

    const isMatch = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isMatch) {
      throw new UnauthorizedException(AUTH_MESSAGES.INVALID_CREDENTIALS);
    }

    const tokens = await this.generateTokens(user);

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user: {
        id: user._id.toString(),
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        organizationId: user.organizationId ? user.organizationId.toString() : null,
        organizationName: org ? org.name : null,
        departmentId: user.departmentId ? user.departmentId.toString() : null,
        employeeId: user.employeeId ? user.employeeId.toString() : null,
      },
    };
  }

  async refreshTokens(rawRefreshToken: string) {
    if (!rawRefreshToken) {
      throw new UnauthorizedException(AUTH_MESSAGES.REFRESH_TOKEN_REQUIRED);
    }

    let payload: any;
    try {
      payload = this.jwtService.verify(rawRefreshToken, {
        secret: this.configService.get<string>('jwt.refreshSecret') || 'haven_default_jwt_refresh_secret_key_2026',
      });
    } catch {
      throw new UnauthorizedException(AUTH_MESSAGES.REFRESH_TOKEN_INVALID);
    }

    const tokenHash = this.hashToken(rawRefreshToken);
    const storedToken = await this.refreshTokenModel.findOne({
      tokenHash,
      userId: new Types.ObjectId(payload.sub),
      isRevoked: false,
    }).exec();

    if (!storedToken || storedToken.expiresAt < new Date()) {
      throw new UnauthorizedException(AUTH_MESSAGES.REFRESH_TOKEN_REVOKED);
    }

    // Revoke current token (rotation)
    storedToken.isRevoked = true;
    await storedToken.save();

    const user = await this.userModel.findById(payload.sub).exec();
    if (!user || user.status !== 'ACTIVE') {
      throw new UnauthorizedException(AUTH_MESSAGES.USER_INACTIVE);
    }

    const newTokens = await this.generateTokens(user);
    return newTokens;
  }

  async logout(rawRefreshToken?: string, userId?: string) {
    if (rawRefreshToken) {
      const tokenHash = this.hashToken(rawRefreshToken);
      await this.refreshTokenModel.updateOne({ tokenHash }, { $set: { isRevoked: true } }).exec();
    } else if (userId) {
      await this.refreshTokenModel.updateMany(
        { userId: new Types.ObjectId(userId) },
        { $set: { isRevoked: true } },
      ).exec();
    }
    return { success: true };
  }

  async getCurrentUser(currentUser: CurrentUserPayload) {
    const user = await this.userModel.findById(currentUser.userId).select('-passwordHash').exec();
    if (!user) {
      throw new UnauthorizedException(AUTH_MESSAGES.USER_NOT_FOUND);
    }

    let org: any = null;
    if (user.organizationId) {
      org = await this.orgModel.findById(user.organizationId).exec();
    }

    return {
      id: user._id.toString(),
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      organizationId: user.organizationId ? user.organizationId.toString() : null,
      organizationName: org ? org.name : null,
      departmentId: user.departmentId ? user.departmentId.toString() : null,
      employeeId: user.employeeId ? user.employeeId.toString() : null,
      phone: user.phone,
      avatarFileId: user.avatarFileId,
    };
  }

  private async generateTokens(user: UserDocument) {
    const payload = {
      sub: user._id.toString(),
      email: user.email,
      role: user.role,
      organizationId: user.organizationId ? user.organizationId.toString() : undefined,
      employeeId: user.employeeId ? user.employeeId.toString() : undefined,
    };

    const accessExpiry = this.configService.get<string>('jwt.accessExpiry') || '15m';
    const refreshExpiry = this.configService.get<string>('jwt.refreshExpiry') || '7d';

    const accessToken = this.jwtService.sign(payload, {
      secret: this.configService.get<string>('jwt.accessSecret') || 'haven_default_jwt_access_secret_key_2026',
      expiresIn: accessExpiry,
    });

    const refreshToken = this.jwtService.sign(payload, {
      secret: this.configService.get<string>('jwt.refreshSecret') || 'haven_default_jwt_refresh_secret_key_2026',
      expiresIn: refreshExpiry,
    });

    // Store hashed refresh token
    const tokenHash = this.hashToken(refreshToken);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await this.refreshTokenModel.create({
      userId: user._id,
      tokenHash,
      expiresAt,
      isRevoked: false,
    });

    return { accessToken, refreshToken };
  }
}

