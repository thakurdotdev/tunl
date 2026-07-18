import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';

// Secures /internal/* with a shared secret header (X-Internal-Token), not
// user JWTs — the Go server is a trusted service, not an end user
// (plan section 2.3).
@Injectable()
export class InternalAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    const token = req.headers['x-internal-token'];
    const expected = process.env.INTERNAL_SHARED_SECRET;
    if (!expected || token !== expected) {
      throw new UnauthorizedException('invalid internal token');
    }
    return true;
  }
}
