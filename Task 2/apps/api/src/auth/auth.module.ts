import { Global, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { config } from '../common/config';
import { SessionGuard } from '../common/guards';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

@Global()
@Module({
  imports: [JwtModule.registerAsync({ useFactory: () => ({ secret: config.jwtSecret, signOptions: { expiresIn: '7d' } }) })],
  controllers: [AuthController],
  providers: [AuthService, SessionGuard],
  exports: [AuthService, JwtModule, SessionGuard],
})
export class AuthModule {}
