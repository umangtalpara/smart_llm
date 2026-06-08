import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class ResetPasswordDto {
  @ApiProperty({
    example: 'securetoken123',
    description: 'Password reset token',
  })
  @IsString()
  @IsNotEmpty({ message: 'Token is required' })
  token: string;

  @ApiProperty({ example: 'newpassword123', description: 'New password' })
  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  @IsNotEmpty({ message: 'New password is required' })
  password: string;
}
