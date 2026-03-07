import { IsEmail, IsEnum, IsOptional, IsString, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Role } from '../../../common/enums/role.enum';

export class LoginDto {
  @ApiProperty({ example: 'sv@hcmus.edu.vn' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: '123456' })
  @IsString()
  @MinLength(6)
  password: string;

  @ApiPropertyOptional({ enum: Role })
  @IsEnum(Role)
  @IsOptional()
  role?: Role;
}

export class RegisterDto {
  @ApiProperty({ example: 'Nguyen Van A' })
  @IsString()
  fullName: string;

  @ApiPropertyOptional({ example: '2151063' })
  @IsString()
  @IsOptional()
  mssv?: string;

  @ApiProperty({ example: 'sv@hcmus.edu.vn' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: '123456789' })
  @IsString()
  @MinLength(8)
  password: string;

  @ApiProperty({ enum: [Role.STUDENT, Role.LECTURER] })
  @IsEnum([Role.STUDENT, Role.LECTURER])
  role: Role;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  major?: string;
}

export class RefreshTokenDto {
  @ApiProperty()
  @IsString()
  refreshToken: string;
}

export class ForgotPasswordDto {
  @ApiProperty({ example: 'sv@hcmus.edu.vn' })
  @IsEmail()
  email: string;
}

export class LogoutDto {
  @ApiProperty()
  @IsString()
  refreshToken: string;
}
