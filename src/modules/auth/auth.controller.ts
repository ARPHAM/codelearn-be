import {
  Controller,
  Get,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  Res,
  UseGuards,
} from '@nestjs/common';

import type { Response, Request } from 'express';
import { Req } from '@nestjs/common';

import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import {
  LoginDto,
  RegisterDto,
  ForgotPasswordDto,
} from './dto/auth.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '../user/entities/user.entity';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Đăng nhập bằng email & mật khẩu' })
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.login(dto);

    const isProd = process.env.NODE_ENV === 'production';

    res.cookie('accessToken', result.accessToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? 'none' : 'lax',
      path: '/',
      maxAge: 1000 * 60 * 10, //10 minutes
    });

    res.cookie('refreshToken', result.refreshToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? 'none' : 'lax',
      path: '/',
      maxAge: 1000 * 60 * 60 * 24 * 30, //30 days
    });

    return {
      user: result.user,
    };
  }

  @Post('register')
  @ApiOperation({ summary: 'Đăng ký tài khoản mới' })
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  // @Post('logout')
  // @HttpCode(HttpStatus.OK)
  // @ApiOperation({ summary: 'Huỷ phiên đăng nhập' })
  // logout(
  //   @Res({ passthrough: true }) res: Response,
  // ) {

  //   const isProd = process.env.NODE_ENV === 'production';

  //   res.clearCookie('accessToken', {
  //     httpOnly: true,
  //     secure: isProd,
  //     sameSite: isProd ? 'none' : 'lax',
  //     path: '/',
  //   });

  //   res.clearCookie('refreshToken', {
  //     httpOnly: true,
  //     secure: isProd,
  //     sameSite: isProd ? 'none' : 'lax',
  //     path: '/',
  //   });

  //   return {
  //     message: 'Da dang xuat thanh cong',
  //   };
  // }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Làm mới access token' })
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const refreshToken = req.cookies?.refreshToken;

    const result = await this.authService.refresh(refreshToken);

    const isProd = process.env.NODE_ENV === 'production';

    res.cookie('accessToken', result.accessToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? 'none' : 'lax',
      path: '/',
      maxAge: 1000 * 60 * 10, // 5 minutes
    });

    return {
      message: 'Token refreshed',
    };
  }

  // @Post('forgot-password')
  // @HttpCode(HttpStatus.OK)
  // @ApiOperation({ summary: 'Gửi email reset mật khẩu' })
  // forgotPassword(@Body() dto: ForgotPasswordDto) {
  //   return this.authService.forgotPassword(dto);
  // }

  @Get('me')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Xác minh tài khoản' })
  @UseGuards(JwtAuthGuard)
  Me(@CurrentUser() user: User) {
    return this.authService.me(user);
  }
}