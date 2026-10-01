import { Body, Controller, Get, HttpCode, Post, Query, Req, Res, ServiceUnavailableException } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { randomBytes } from 'crypto';
import { Request, Response } from 'express';
import { config } from '../common/config';
import { CurrentUser, AuthUser, Public } from '../common/decorators';
import { PrismaService } from '../prisma/prisma.service';
import { ChangePasswordDto, ForgotDto, LoginDto, RegisterDto, ResetDto, TokenDto } from './auth.dto';
import { AuthService, publicUser } from './auth.service';

const STATE_COOKIE = 'modeza_oauth_state';
const strict = { default: { limit: 10, ttl: 60_000 } };

@Controller('auth')
export class AuthController {
  constructor(
    private auth: AuthService,
    private prisma: PrismaService,
  ) {}

  @Public() @Throttle(strict) @Post('register')
  async register(@Body() dto: RegisterDto, @Res({ passthrough: true }) res: Response) {
    const user = await this.auth.register(dto.name, dto.email, dto.password);
    this.auth.setSession(res, user.id);
    return { user: publicUser(user) };
  }

  @Public() @Throttle(strict) @HttpCode(200) @Post('login')
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
    const user = await this.auth.login(dto.email, dto.password);
    this.auth.setSession(res, user.id);
    return { user: publicUser(user) };
  }

  @Public() @HttpCode(200) @Post('logout')
  logout(@Res({ passthrough: true }) res: Response) {
    this.auth.clearSession(res);
    return { ok: true };
  }

  /** Returns the signed-in user, or `{ user: null }` for guests (never a 401, so the UI can poll safely). */
  @Public() @Get('me')
  async me(@CurrentUser() u?: AuthUser) {
    if (!u) return { user: null };
    const full = await this.prisma.user.findUnique({ where: { id: u.id } });
    return { user: full ? publicUser(full) : null };
  }

  @Public() @Throttle(strict) @HttpCode(200) @Post('verify-email')
  async verify(@Body() dto: TokenDto) {
    await this.auth.verifyEmail(dto.token);
    return { ok: true };
  }

  @Throttle(strict) @HttpCode(200) @Post('resend-verification')
  async resend(@CurrentUser() u: AuthUser) {
    await this.auth.resendVerification(u.id);
    return { ok: true };
  }

  @Public() @Throttle(strict) @HttpCode(200) @Post('forgot-password')
  async forgot(@Body() dto: ForgotDto) {
    await this.auth.forgotPassword(dto.email);
    return { ok: true, message: 'If that email is registered, a reset link is on its way.' };
  }

  @Public() @Throttle(strict) @HttpCode(200) @Post('reset-password')
  async reset(@Body() dto: ResetDto) {
    await this.auth.resetPassword(dto.token, dto.password);
    return { ok: true };
  }

  @Throttle(strict) @HttpCode(200) @Post('change-password')
  async change(@CurrentUser() u: AuthUser, @Body() dto: ChangePasswordDto) {
    await this.auth.changePassword(u.id, dto.currentPassword, dto.newPassword);
    return { ok: true };
  }

  // ---------------- Google OAuth 2.0 (authorization-code flow) ----------------

  private get googleCallback() {
    // Routed through the storefront domain (Next.js rewrite) so cookies are first-party.
    return process.env.GOOGLE_CALLBACK_URL || `${config.webUrl}/api/auth/google/callback`;
  }

  @Public() @Get('google')
  googleStart(@Res() res: Response) {
    const id = process.env.GOOGLE_CLIENT_ID;
    if (!id || !process.env.GOOGLE_CLIENT_SECRET)
      throw new ServiceUnavailableException('Google sign-in is not configured on this server');
    const state = randomBytes(24).toString('hex');
    res.cookie(STATE_COOKIE, state, { httpOnly: true, secure: config.isProd, sameSite: 'lax', maxAge: 10 * 60_000, path: '/' });
    const q = new URLSearchParams({
      client_id: id,
      redirect_uri: this.googleCallback,
      response_type: 'code',
      scope: 'openid email profile',
      state,
      prompt: 'select_account',
    });
    res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${q}`);
  }

  @Public() @Get('google/callback')
  async googleCallback_(@Query('code') code: string, @Query('state') state: string, @Query('error') error: string, @Req() req: Request, @Res() res: Response) {
    const fail = (reason: string) => res.redirect(`${config.webUrl}/login?error=${encodeURIComponent(reason)}`);
    res.clearCookie(STATE_COOKIE, { path: '/' });
    if (error || !code) return fail('google_cancelled');
    if (!state || state !== req.cookies?.[STATE_COOKIE]) return fail('google_state');
    try {
      const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          code,
          client_id: process.env.GOOGLE_CLIENT_ID!,
          client_secret: process.env.GOOGLE_CLIENT_SECRET!,
          redirect_uri: this.googleCallback,
          grant_type: 'authorization_code',
        }),
        signal: AbortSignal.timeout(10_000),
      });
      const tokens: any = await tokenRes.json();
      if (!tokenRes.ok || !tokens.access_token) return fail('google_token');
      const infoRes = await fetch('https://openidconnect.googleapis.com/v1/userinfo', {
        headers: { Authorization: `Bearer ${tokens.access_token}` },
        signal: AbortSignal.timeout(10_000),
      });
      const info: any = await infoRes.json();
      if (!infoRes.ok || !info.sub || !info.email || info.email_verified !== true) return fail('google_email');
      const user = await this.auth.upsertGoogleUser(info);
      this.auth.setSession(res, user.id);
      res.redirect(`${config.webUrl}/account`);
    } catch {
      fail('google_failed');
    }
  }
}
