import { IsEnum, IsNotEmpty, IsString, IsOptional, IsNumber, Min, IsArray } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { ProviderCode } from '../../../../../shared/types';

export class CreateApiKeyDto {
  @ApiProperty({ enum: ProviderCode, example: ProviderCode.OPENAI, description: 'AI Provider code' })
  @IsEnum(ProviderCode, { message: 'Invalid provider selected' })
  @IsNotEmpty({ message: 'Provider is required' })
  provider: ProviderCode;

  @ApiProperty({ example: 'My OpenAI Free Key', description: 'Friendly name for the key' })
  @IsString({ message: 'Name must be a string' })
  @IsNotEmpty({ message: 'Key name is required' })
  name: string;

  @ApiProperty({ example: 'sk-proj-...xxxx', description: 'The raw provider API Key' })
  @IsString({ message: 'API Key must be a string' })
  @IsNotEmpty({ message: 'API Key is required' })
  apiKey: string;

  @ApiProperty({ example: 0, description: 'Daily limit cap (0 for unlimited)', required: false })
  @IsNumber({}, { message: 'Daily limit must be a number' })
  @IsOptional()
  @Min(0)
  dailyLimit?: number;

  @ApiProperty({ example: 0, description: 'Requests per minute cap (0 for unlimited)', required: false })
  @IsNumber({}, { message: 'RPM limit must be a number' })
  @IsOptional()
  @Min(0)
  rpmLimit?: number;

  @ApiProperty({ example: 0, description: 'Tokens per minute cap (0 for unlimited)', required: false })
  @IsNumber({}, { message: 'TPM limit must be a number' })
  @IsOptional()
  @Min(0)
  tpmLimit?: number;

  @ApiProperty({ example: 1, description: 'Priority level (higher is chosen first)', required: false })
  @IsNumber({}, { message: 'Priority must be a number' })
  @IsOptional()
  @Min(1)
  priority?: number;

  @ApiProperty({ example: ['free', 'dev'], description: 'Friendly tags to filter keys', required: false })
  @IsArray({ message: 'Tags must be an array' })
  @IsString({ each: true, message: 'Each tag must be a string' })
  @IsOptional()
  tags?: string[];

  @ApiProperty({ example: 'dev-environment', description: 'Grouping identifier', required: false })
  @IsString({ message: 'Group must be a string' })
  @IsOptional()
  group?: string;
}
