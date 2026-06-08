import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { ApiKeysService } from './api-keys.service';
import { CreateApiKeyDto } from './dto/create-api-key.dto';
import { UpdateApiKeyDto } from './dto/update-api-key.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { GetUser } from '../../common/decorators/get-user.decorator';

@ApiTags('API Keys')
@Controller('api-keys')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ApiKeysController {
  constructor(private readonly apiKeysService: ApiKeysService) {}

  @Post()
  @ApiOperation({ summary: 'Register and encrypt a new provider API Key' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Key successfully registered',
  })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Unauthorized' })
  async create(
    @GetUser('id') userId: string,
    @Body() createApiKeyDto: CreateApiKeyDto,
  ) {
    return await this.apiKeysService.create(userId, createApiKeyDto);
  }

  @Get()
  @ApiOperation({
    summary: 'List all registered API Keys for this user (secrets stripped)',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'List of registered keys',
  })
  async findAll(@GetUser('id') userId: string) {
    return await this.apiKeysService.findAll(userId);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Retrieve details of a single API Key (secrets stripped)',
  })
  @ApiResponse({ status: HttpStatus.OK, description: 'Key details' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Key not found' })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Forbidden access',
  })
  async findOne(@GetUser('id') userId: string, @Param('id') id: string) {
    return await this.apiKeysService.findOne(userId, id);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Update limits, tags, names, or raw values of an API Key',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Key updated successfully',
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Key not found' })
  async update(
    @GetUser('id') userId: string,
    @Param('id') id: string,
    @Body() updateApiKeyDto: UpdateApiKeyDto,
  ) {
    return await this.apiKeysService.update(userId, id, updateApiKeyDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Permanently remove an API Key' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Key successfully deleted',
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Key not found' })
  async remove(@GetUser('id') userId: string, @Param('id') id: string) {
    return await this.apiKeysService.delete(userId, id);
  }
}
