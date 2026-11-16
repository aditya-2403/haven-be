import { IsNotEmpty, IsOptional, IsString, IsEmail, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateVisitorDto {
  @ApiProperty({ example: 'Alice Vance' })
  @IsNotEmpty()
  @IsString()
  fullName: string;

  @ApiProperty({ example: '+1-555-0144' })
  @IsNotEmpty()
  @IsString()
  phone: string;

  @ApiPropertyOptional({ example: 'alice@blackmesa.org' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ example: 'Black Mesa Research Facility' })
  @IsOptional()
  @IsString()
  company?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  photoFileId?: string;

  @ApiPropertyOptional({ enum: ['NATIONAL_ID', 'PASSPORT', 'DRIVING_LICENSE', 'OTHER'] })
  @IsOptional()
  @IsEnum(['NATIONAL_ID', 'PASSPORT', 'DRIVING_LICENSE', 'OTHER'])
  identificationType?: string;

  @ApiPropertyOptional({ example: 'DL-9823145' })
  @IsOptional()
  @IsString()
  identificationNumber?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateVisitorDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  fullName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  company?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  photoFileId?: string;

  @ApiPropertyOptional({ enum: ['NATIONAL_ID', 'PASSPORT', 'DRIVING_LICENSE', 'OTHER'] })
  @IsOptional()
  @IsEnum(['NATIONAL_ID', 'PASSPORT', 'DRIVING_LICENSE', 'OTHER'])
  identificationType?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  identificationNumber?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

