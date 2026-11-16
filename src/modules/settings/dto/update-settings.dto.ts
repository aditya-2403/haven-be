import { IsBoolean, IsNumber, IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateSettingsDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  requireApprovalByDefault?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  defaultVisitDurationMinutes?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  allowWalkIns?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  notifyHostOnArrival?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  timezone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  passExpiryHours?: number;
}

