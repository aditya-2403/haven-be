import { IsNotEmpty, IsOptional, IsString, IsEnum, IsDateString, IsNumber, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { VisitType } from '../../../common/enums/visit-status.enum';

export class CreateVisitDto {
  @ApiProperty({ example: '659...ObjectId (Visitor ID)' })
  @IsNotEmpty()
  @IsString()
  visitorId: string;

  @ApiProperty({ example: '659...ObjectId (Employee/Host ID)' })
  @IsNotEmpty()
  @IsString()
  hostId: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  departmentId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  buildingId?: string;

  @ApiProperty({ enum: VisitType, default: VisitType.APPOINTMENT })
  @IsNotEmpty()
  @IsEnum(VisitType)
  visitType: VisitType;

  @ApiProperty({ example: 'Product demonstration & quarterly vendor review' })
  @IsNotEmpty()
  @IsString()
  purpose: string;

  @ApiProperty({ example: '2026-11-15' })
  @IsNotEmpty()
  @IsDateString()
  scheduledDate: string;

  @ApiPropertyOptional({ example: '10:00' })
  @IsOptional()
  @IsString()
  scheduledTime?: string;

  @ApiPropertyOptional({ example: 60 })
  @IsOptional()
  @IsNumber()
  @Min(15)
  expectedDurationMinutes?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateVisitDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  hostId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  departmentId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  buildingId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  purpose?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  scheduledDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  scheduledTime?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  expectedDurationMinutes?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

