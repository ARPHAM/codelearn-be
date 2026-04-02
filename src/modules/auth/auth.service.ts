import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';

import { User } from '../user/entities/user.entity';
import {
  LoginDto,
  RegisterDto,
  ForgotPasswordDto,
} from './dto/auth.dto';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private userRepo: Repository<User>,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  private generateTokens(user: User) {
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    const accessToken = this.jwtService.sign(payload, {
      secret: this.configService.get('JWT_SECRET'),
      expiresIn: this.configService.get('JWT_EXPIRES_IN'),
    });

    const refreshToken = this.jwtService.sign(payload, {
      secret: this.configService.get('JWT_REFRESH_SECRET'),
      expiresIn: this.configService.get('JWT_REFRESH_EXPIRES_IN'),
    });

    return { accessToken, refreshToken };
  }

  async login(dto: LoginDto) {
    const user = await this.userRepo.findOne({
      where: { email: dto.email, role: dto.role },
    });

    if (!user) {
      throw new UnauthorizedException('Email hoac mat khau khong dung');
    }

    const valid = await bcrypt.compare(dto.password, user.passwordHash);

    if (!valid) {
      throw new UnauthorizedException('Email hoac mat khau khong dung');
    }

    const tokens = this.generateTokens(user);

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user: {
        id: user.id,
        name: user.fullName,
        role: user.role,
        email: user.email,
        avatar: user.avatarUrl,
      },
    };
  }

  async register(dto: RegisterDto) {
    const existing = await this.userRepo.findOne({
      where: { email: dto.email, role: dto.role },
    });

    if (existing) {
      throw new ConflictException('Email da ton tai trong he thong');
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);

    const user = this.userRepo.create({
      fullName: dto.fullName,
      email: dto.email,
      mssv: dto.mssv,
      role: dto.role,
      major: dto.major,
      passwordHash,
    });

    const saved = await this.userRepo.save(user);

    return {
      message: 'Dang ky thanh cong. Vui long xac nhan email.',
      userId: saved.id,
    };
  }

  async logout() {
    return {
      message: 'Da dang xuat thanh cong',
    };
  }

  async refresh(refreshToken: string) {
    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token missing');
    }

    try {
      const payload = this.jwtService.verify(refreshToken, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      });

      const user = await this.userRepo.findOne({
        where: { id: payload.sub },
      });

      if (!user) {
        throw new UnauthorizedException();
      }

      const accessToken = this.jwtService.sign(
        {
          sub: user.id,
          email: user.email,
          role: user.role,
        },
        {
          secret: this.configService.get('JWT_SECRET'),
          expiresIn: this.configService.get('JWT_EXPIRES_IN'),
        },
      );

      return {
        accessToken,
      };
    } catch {
      throw new UnauthorizedException('Refresh token het han');
    }
  }

  async forgotPassword(dto: ForgotPasswordDto) {
    const user = await this.userRepo.findOne({
      where: { email: dto.email },
    });

    if (!user) {
      throw new NotFoundException('Email khong ton tai trong he thong');
    }

    return {
      message: 'Email huong dan da duoc gui',
    };
  }

  async me(user: User) {
    if (!user) {
      throw new UnauthorizedException('User khong ton tai');
    }

    return {
        id: user.id,
        name: user.fullName,
        role: user.role,
        email: user.email,
        avatar: user.avatarUrl,
        mssv: user.mssv,
        major: user.major,
        rating: user.rating,
        xp: user.xp,
    };
  }
}