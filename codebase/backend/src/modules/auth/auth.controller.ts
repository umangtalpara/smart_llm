import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
  Req,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { GetUser } from '../../common/decorators/get-user.decorator';
import type { UserDocument } from '../users/schemas/user.schema';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @ApiOperation({ summary: 'Register a new user account' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'User successfully registered',
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'Email already registered',
  })
  async register(@Body() registerDto: RegisterDto) {
    return await this.authService.register(registerDto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Authenticate user and return JWT tokens' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Login successful, returns tokens',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Invalid credentials',
  })
  async login(@Body() loginDto: LoginDto) {
    return await this.authService.login(loginDto);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Rotate JWT access token using refresh token' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Tokens rotated successfully',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Invalid or expired refresh token',
  })
  async refresh(@Body('refreshToken') refreshToken: string) {
    return await this.authService.refresh(refreshToken);
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Log out user and invalidate refresh token' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Logged out successfully',
  })
  async logout(@GetUser('id') userId: string) {
    return await this.authService.logout(userId);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current authenticated user profile' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Returns user profile' })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Unauthorized' })
  getMe(@GetUser() user: UserDocument) {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      isVerified: user.isVerified,
    };
  }

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Request a password reset link' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Reset link sent' })
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    return await this.authService.forgotPassword(dto);
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reset password using token' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Password reset successful',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid or expired token',
  })
  async resetPassword(@Body() dto: ResetPasswordDto) {
    return await this.authService.resetPassword(dto);
  }
}
