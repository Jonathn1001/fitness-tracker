import {
  Injectable,
  ConflictException,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { SignupDto } from './dto/signup.dto';
import { LoginDto } from './dto/login.dto';
import { TemplateSeederService } from '../templates/template-seeder.service';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private config: ConfigService,
    private seeder: TemplateSeederService,
  ) {}

  async signup(dto: SignupDto) {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (existing) throw new ConflictException('Email already registered');

    const hashed = await bcrypt.hash(dto.password, 12);
    const user = await this.prisma.user.create({
      data: { email: dto.email, password: hashed, name: dto.name },
    });

    await this.seeder.seedForUser(user.id);
    return this.issueTokens(user.id, user.email);
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (!user) throw new UnauthorizedException('Invalid credentials');

    const valid = await bcrypt.compare(dto.password, user.password);
    if (!valid) throw new UnauthorizedException('Invalid credentials');

    return this.issueTokens(user.id, user.email);
  }

  async refresh(rawRefreshToken: string) {
    if (!rawRefreshToken)
      throw new UnauthorizedException('Missing refresh token');

    let payload: { sub: string; email: string; jti?: string };
    try {
      payload = this.jwt.verify(rawRefreshToken, {
        secret: this.config.get('JWT_REFRESH_SECRET'),
      });
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }

    if (!payload.jti) throw new UnauthorizedException('Invalid refresh token');

    const stored = await this.prisma.refreshToken.findUnique({
      where: { id: payload.jti },
    });

    if (!stored || stored.userId !== payload.sub) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    if (stored.revoked) {
      // Reuse of a revoked token — likely stolen. Revoke the whole family.
      this.logger.warn(
        `Refresh token reuse detected for user ${payload.sub} (token ${stored.id}). Revoking family.`,
      );
      await this.prisma.refreshToken.updateMany({
        where: { userId: payload.sub, revoked: false },
        data: { revoked: true },
      });
      throw new UnauthorizedException('Refresh token reuse detected');
    }

    if (stored.expiresAt.getTime() <= Date.now()) {
      throw new UnauthorizedException('Refresh token expired');
    }

    const matches = await bcrypt.compare(rawRefreshToken, stored.token);
    if (!matches) throw new UnauthorizedException('Invalid refresh token');

    await this.prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revoked: true },
    });
    return this.issueTokens(payload.sub, payload.email);
  }

  async logout(userId: string) {
    await this.prisma.refreshToken.updateMany({
      where: { userId, revoked: false },
      data: { revoked: true },
    });
  }

  private async issueTokens(userId: string, email: string) {
    const accessToken = this.jwt.sign(
      { sub: userId, email },
      { expiresIn: '15m', secret: this.config.get('JWT_SECRET') },
    );

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    // Pre-create the row so its id can be embedded in the JWT as jti.
    const row = await this.prisma.refreshToken.create({
      data: { userId, token: '', expiresAt },
    });

    const rawRefresh = this.jwt.sign(
      { sub: userId, email, jti: row.id },
      { expiresIn: '7d', secret: this.config.get('JWT_REFRESH_SECRET') },
    );

    await this.prisma.refreshToken.update({
      where: { id: row.id },
      data: { token: await bcrypt.hash(rawRefresh, 10) },
    });

    return { accessToken, refreshToken: rawRefresh };
  }
}
