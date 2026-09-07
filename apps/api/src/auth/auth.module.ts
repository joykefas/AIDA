import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtAccessStrategy } from './strategies/jwt-access.strategy';
import { JwtRefreshStrategy } from './strategies/jwt-refresh.strategy';
import { GoogleStrategy } from './strategies/google.strategy';

// GoogleStrategy throws at instantiation if clientID is missing, so it's only
// registered once real Google OAuth credentials are actually configured —
// otherwise the whole app would fail to boot in local/dev setups that don't
// have them yet.
const googleConfigured = Boolean(
  process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET,
);

@Module({
  imports: [PassportModule, JwtModule.register({})],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtAccessStrategy,
    JwtRefreshStrategy,
    ...(googleConfigured ? [GoogleStrategy] : []),
  ],
  exports: [AuthService],
})
export class AuthModule {}
