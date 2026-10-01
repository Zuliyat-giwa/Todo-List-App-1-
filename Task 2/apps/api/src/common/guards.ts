import { CanActivate, ExecutionContext, ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { SESSION_COOKIE } from './config';

/**
 * Global guard. Every request gets `req.user` populated when a valid session
 * cookie (or Bearer token) is present. Routes require sign-in by default unless
 * marked @Public(); @Roles('ADMIN') adds role checks. The role is re-read from
 * the database on every request so a demoted admin loses access immediately.
 */
@Injectable()
export class SessionGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private jwt: JwtService,
    private prisma: PrismaService,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest();
    const isPublic = this.reflector.getAllAndOverride<boolean>('isPublic', [ctx.getHandler(), ctx.getClass()]);
    const roles = this.reflector.getAllAndOverride<string[]>('roles', [ctx.getHandler(), ctx.getClass()]);

    const bearer = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
    const token = req.cookies?.[SESSION_COOKIE] || bearer;
    if (token) {
      try {
        const payload = await this.jwt.verifyAsync<{ sub: string }>(token);
        const user = await this.prisma.user.findUnique({
          where: { id: payload.sub },
          select: { id: true, email: true, role: true },
        });
        if (user) req.user = user;
      } catch {
        // invalid or expired token: treated as anonymous
      }
    }

    if (roles?.length) {
      if (!req.user) throw new UnauthorizedException('Please sign in');
      if (!roles.includes(req.user.role)) throw new ForbiddenException('Insufficient permissions');
      return true;
    }
    if (isPublic) return true;
    if (!req.user) throw new UnauthorizedException('Please sign in');
    return true;
  }
}
