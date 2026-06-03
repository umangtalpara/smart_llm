import { Controller, Get, Patch, Param, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { ProviderCode, UserRole } from '../../../../shared/types';

@ApiTags('Admin')
@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@ApiBearerAuth()
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('users')
  @ApiOperation({ summary: 'Get paginated list of all users' })
  @ApiResponse({ status: 200, description: 'User accounts list returned' })
  async getUsers(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.adminService.getUsers(
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 20,
    );
  }

  @Patch('users/:id/role')
  @ApiOperation({ summary: 'Update a user role' })
  @ApiResponse({ status: 200, description: 'User role updated successfully' })
  async updateUserRole(
    @Param('id') id: string,
    @Body('role') body: { role: UserRole } | UserRole,
  ) {
    // Handle both raw string and JSON object bodies
    const role = typeof body === 'object' && body !== null && 'role' in body ? body.role : (body as UserRole);
    return this.adminService.updateUserRole(id, role);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get system-wide metrics and chart traffic data' })
  @ApiResponse({ status: 200, description: 'System aggregates and daily metrics returned' })
  async getSystemStats(@Query('days') days?: string) {
    return this.adminService.getSystemStats(
      days ? parseInt(days, 10) : 30,
    );
  }

  @Get('providers')
  @ApiOperation({ summary: 'Get system-wide providers status' })
  @ApiResponse({ status: 200, description: 'Status configuration of AI providers returned' })
  async getProviders() {
    return this.adminService.getProviders();
  }

  @Patch('providers/:provider/status')
  @ApiOperation({ summary: 'Enable or disable a provider globally' })
  @ApiResponse({ status: 200, description: 'AI provider global status updated' })
  async updateProviderStatus(
    @Param('provider') provider: ProviderCode,
    @Body() body: { status: 'active' | 'inactive' } | 'active' | 'inactive',
  ) {
    // Handle both raw string and JSON object bodies
    const status = typeof body === 'object' && body !== null && 'status' in body ? body.status : (body as 'active' | 'inactive');
    return this.adminService.updateProviderStatus(provider, status);
  }
}
