import { IsEnum, IsString, IsOptional, IsNumber, Min, IsArray } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { KeyStatus } from '../../../../../shared/types';

export class UpdateApiKeyDto {
  @ApiProperty({ example: 'My Updated Key Name', description: 'Friendly name for the key', required: false })
  @IsString({ message: 'Name must be a string' })
  @IsOptional()
  name?: string;

  @ApiProperty({ example: 'sk-proj-...yyyy', description: 'Update the raw API Key value', required: false })
  @IsString({ message: 'API Key must be a string' })
  @IsOptional()
  apiKey?: string;

  @ApiProperty({ enum: KeyStatus, example: KeyStatus.INACTIVE, description: 'Directly modify key status', required: false })
  @IsEnum(KeyStatus, { message: 'Invalid key status' })
  @IsOptional()
  status?: KeyStatus;

  @ApiProperty({ example: 0, description: 'Daily limit cap (0 for unlimited)', required: false })
  @IsNumber({}, { message: 'Daily limit must be a number' })
  @IsOptional()
  @Min(0)
  dailyLimit?: number;

  @ApiProperty({ example: 0, description: 'Requests per minute cap', required: false })
  @IsNumber({}, { message: 'RPM limit must be a number' })
  @IsOptional()
  @Min(0)
  rpmLimit?: number;

  @ApiProperty({ example: 0, description: 'Tokens per minute cap', required: false })
  @IsNumber({}, { message: 'TPM limit must be a number' })
  @IsOptional()
  @Min(0)
  tpmLimit?: number;

  @ApiProperty({ example: 2, description: 'Priority level (higher is chosen first)', required: false })
  @IsNumber({}, { message: 'Priority must be a number' })
  @IsOptional()
  @Min(1)
  priority?: number;

  @ApiProperty({ example: ['prod'], description: 'Friendly tags to filter keys', required: false })
  @IsArray({ message: 'Tags must be an array' })
  @IsString({ each: true, message: 'Each tag must be a string' })
  @IsOptional()
  tags?: string[];

  @ApiProperty({ example: 'prod-environment', description: 'Grouping identifier', required: false })
  @IsString({ message: 'Group must be a string' })
  @IsOptional()
  group?: string;
}
