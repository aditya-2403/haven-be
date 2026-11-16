import { IsNotEmpty, IsString, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ScanPassDto {
  @ApiProperty({ example: 'HV-9821 or full QR string or token' })
  @IsNotEmpty()
  @IsString()
  code: string;
}

export class ManualVerifyDto {
  @ApiPropertyOptional({ example: '+1-555-0144' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ example: 'HV-9821' })
  @IsOptional()
  @IsString()
  passCode?: string;
}

