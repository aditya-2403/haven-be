import { IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class ProcessApprovalDto {
  @ApiPropertyOptional({ example: 'Meeting confirmed, conference room 3B booked.' })
  @IsOptional()
  @IsString()
  remarks?: string;
}

