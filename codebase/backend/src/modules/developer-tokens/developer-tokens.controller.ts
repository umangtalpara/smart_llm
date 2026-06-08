import {
  Controller,
  Get,
  Post,
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
import { DeveloperTokensService } from './developer-tokens.service';
import { CreateDeveloperTokenDto } from './dto/create-developer-token.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { GetUser } from '../../common/decorators/get-user.decorator';

@ApiTags('Developer Access Tokens')
@Controller('developer-tokens')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class DeveloperTokensController {
  constructor(private readonly tokensService: DeveloperTokensService) {}

  @Post()
  @ApiOperation({
    summary: 'Generate a new custom developer token for LLM API access',
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Token generated successfully (revealed once)',
  })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Unauthorized' })
  async create(
    @GetUser('id') userId: string,
    @Body() dto: CreateDeveloperTokenDto,
  ) {
    const result = await this.tokensService.generateToken(userId, dto.name);
    return {
      message:
        'Token generated successfully. Store it safely; it will not be displayed again.',
      rawToken: result.rawToken,
      token: result.token,
    };
  }

  @Get()
  @ApiOperation({
    summary: 'List all active developer tokens for the logged-in user',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'List of active developer tokens',
  })
  async findAll(@GetUser('id') userId: string) {
    return await this.tokensService.listTokens(userId);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Permanently revoke/delete a developer token' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Token successfully revoked',
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Token not found' })
  async remove(@GetUser('id') userId: string, @Param('id') id: string) {
    await this.tokensService.revokeToken(userId, id);
    return { message: 'Developer token successfully revoked.' };
  }
}
