import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { DeveloperTokensService } from '../../modules/developer-tokens/developer-tokens.service';

@Injectable()
export class DeveloperTokenGuard implements CanActivate {
  constructor(private readonly tokensService: DeveloperTokensService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;

    if (!authHeader) {
      throw new UnauthorizedException('Authorization header is missing');
    }

    const [type, token] = authHeader.split(' ');

    if (type !== 'Bearer' || !token) {
      throw new UnauthorizedException('Invalid authorization header format. Expected Bearer <token>');
    }

    try {
      const user = await this.tokensService.validateToken(token);
      request.user = user;
      return true;
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : 'Invalid developer token';
      throw new UnauthorizedException(errMsg);
    }
  }
}
