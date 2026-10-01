import { IsEmail, IsString, MaxLength, MinLength, IsOptional } from 'class-validator';

export class RegisterDto {
  @IsString() @MinLength(2) @MaxLength(80) name: string;
  @IsEmail() @MaxLength(254) email: string;
  @IsString() @MinLength(8, { message: 'Password must be at least 8 characters' }) @MaxLength(128) password: string;
}

export class LoginDto {
  @IsEmail() email: string;
  @IsString() @MaxLength(128) password: string;
}

export class ForgotDto {
  @IsEmail() email: string;
}

export class ResetDto {
  @IsString() @MaxLength(200) token: string;
  @IsString() @MinLength(8) @MaxLength(128) password: string;
}

export class TokenDto {
  @IsString() @MaxLength(200) token: string;
}

export class ChangePasswordDto {
  @IsOptional() @IsString() @MaxLength(128) currentPassword?: string;
  @IsString() @MinLength(8) @MaxLength(128) newPassword: string;
}
