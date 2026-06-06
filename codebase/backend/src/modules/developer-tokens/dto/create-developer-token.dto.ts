import { IsString, IsNotEmpty, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateDeveloperTokenDto {
  @ApiProperty({ description: 'Name of the developer token', example: 'Production Backend App' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;
}
