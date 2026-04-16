import {
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Role } from '../../../common/enums/role.enum';

export class LoginDto {
  @ApiProperty({ example: '12345678@st.neu.edu.vn' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: '12345678' })
  @IsString()
  @MinLength(8)
  password: string;

  @ApiPropertyOptional({ enum: Role })
  @IsEnum(Role)
  @IsOptional()
  role: Role;
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

  @ApiProperty({ enum: [Role.STUDENT, Role.LECTURER, Role.ADMIN] })
  @IsEnum([Role.STUDENT, Role.LECTURER, Role.ADMIN])
  role: Role;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  major?: string;
}

export class ForgotPasswordDto {
  @ApiProperty({ example: 'sv@hcmus.edu.vn' })
  @IsEmail()
  email: string;
}
