import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { TokenType } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { Response } from 'express';
import { config, SESSION_COOKIE } from '../common/config';
import { clean, newToken, sha256 } from '../common/util';
import { MailService } from '../mail/mail.service';
import { PrismaService } from '../prisma/prisma.service';

const DAY = 86_400_000;
// Used to equalise timing when the account does not exist.
const DUMMY_HASH = bcrypt.hashSync('not-a-real-password', 10);

export const publicUser = (u: any) => ({
  id: u.id,
  email: u.email,
  name: u.name,
  phone: u.phone,
  role: u.role,
  avatarUrl: u.avatarUrl,
  emailVerified: u.emailVerified,
  language: u.language,
  currency: u.currency,
  country: u.country,
  hasPassword: !!u.passwordHash,
});

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private mail: MailService,
  ) {}

  setSession(res: Response, userId: string) {
    const token = this.jwt.sign({ sub: userId });
    res.cookie(SESSION_COOKIE, token, {
      httpOnly: true,
      secure: config.isProd,
      sameSite: 'lax',
      domain: config.cookieDomain,
      maxAge: 7 * DAY,
      path: '/',
    });
  }

  clearSession(res: Response) {
    res.clearCookie(SESSION_COOKIE, { path: '/', domain: config.cookieDomain });
  }

  private async issueToken(userId: string, type: TokenType, ttlMs: number) {
    const { raw, hash } = newToken();
    await this.prisma.verificationToken.create({
      data: { userId, type, tokenHash: hash, expiresAt: new Date(Date.now() + ttlMs) },
    });
    return raw;
  }

  async register(name: string, email: string, password: string) {
    email = email.toLowerCase().trim();
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) throw new BadRequestException('An account with this email already exists');
    const user = await this.prisma.user.create({
      data: { name: clean(name)!, email, passwordHash: await bcrypt.hash(password, 12) },
    });
    const raw = await this.issueToken(user.id, 'EMAIL_VERIFY', DAY);
    await this.mail.welcome(user.email, user.name);
    await this.mail.verifyEmail(user.email, user.name, `${config.webUrl}/verify-email?token=${raw}`);
    return user;
  }

  async login(email: string, password: string) {
    const user = await this.prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } });
    const ok = await bcrypt.compare(password, user?.passwordHash ?? DUMMY_HASH);
    if (!user || !user.passwordHash || !ok) throw new UnauthorizedException('Invalid email or password');
    return user;
  }

  async verifyEmail(raw: string) {
    const t = await this.prisma.verificationToken.findUnique({ where: { tokenHash: sha256(raw) } });
    if (!t || t.type !== 'EMAIL_VERIFY' || t.usedAt || t.expiresAt < new Date())
      throw new BadRequestException('This verification link is invalid or has expired');
    await this.prisma.$transaction([
      this.prisma.user.update({ where: { id: t.userId }, data: { emailVerified: true } }),
      this.prisma.verificationToken.update({ where: { id: t.id }, data: { usedAt: new Date() } }),
    ]);
  }

  async resendVerification(userId: string) {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    if (user.emailVerified) return;
    const raw = await this.issueToken(user.id, 'EMAIL_VERIFY', DAY);
    await this.mail.verifyEmail(user.email, user.name, `${config.webUrl}/verify-email?token=${raw}`);
  }

  /** Always resolves quietly so the endpoint cannot be used to discover registered emails. */
  async forgotPassword(email: string) {
    const user = await this.prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } });
    if (!user) return;
    const raw = await this.issueToken(user.id, 'PASSWORD_RESET', 60 * 60_000);
    await this.mail.passwordReset(user.email, user.name, `${config.webUrl}/reset-password?token=${raw}`);
  }

  async resetPassword(raw: string, password: string) {
    const t = await this.prisma.verificationToken.findUnique({ where: { tokenHash: sha256(raw) } });
    if (!t || t.type !== 'PASSWORD_RESET' || t.usedAt || t.expiresAt < new Date())
      throw new BadRequestException('This reset link is invalid or has expired');
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: t.userId },
        data: { passwordHash: await bcrypt.hash(password, 12), emailVerified: true },
      }),
      this.prisma.verificationToken.update({ where: { id: t.id }, data: { usedAt: new Date() } }),
    ]);
  }

  async changePassword(userId: string, current: string | undefined, next: string) {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    if (user.passwordHash) {
      if (!current || !(await bcrypt.compare(current, user.passwordHash)))
        throw new BadRequestException('Current password is incorrect');
    }
    await this.prisma.user.update({ where: { id: userId }, data: { passwordHash: await bcrypt.hash(next, 12) } });
  }

  /** Find-or-create from a verified Google profile; links to an existing account with the same email. */
  async upsertGoogleUser(p: { sub: string; email: string; name?: string; picture?: string }) {
    const email = p.email.toLowerCase();
    let user = await this.prisma.user.findUnique({ where: { googleId: p.sub } });
    if (!user) {
      const byEmail = await this.prisma.user.findUnique({ where: { email } });
      if (byEmail) {
        user = await this.prisma.user.update({
          where: { id: byEmail.id },
          data: { googleId: p.sub, emailVerified: true, avatarUrl: byEmail.avatarUrl ?? p.picture },
        });
      } else {
        user = await this.prisma.user.create({
          data: { email, googleId: p.sub, name: p.name || email.split('@')[0], avatarUrl: p.picture, emailVerified: true },
        });
        await this.mail.welcome(user.email, user.name);
      }
    }
    return user;
  }
}
