import { IsOptional, IsString, MinLength, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateProfileDto {
  @ApiPropertyOptional({ example: 'Nguyen Van A', description: 'Họ và tên' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  fullName?: string;

  @ApiPropertyOptional({ example: '2151063', description: 'Mã số sinh viên' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  mssv?: string;

  @ApiPropertyOptional({ example: 'Kỹ thuật phần mềm', description: 'Ngành học' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  major?: string;

  @ApiPropertyOptional({ example: 'https://...', description: 'URL ảnh đại diện' })
  @IsOptional()
  @IsString()
  avatarUrl?: string;
}

export class ChangePasswordDto {
  @ApiPropertyOptional({ example: 'oldPassword123', description: 'Mật khẩu hiện tại' })
  @IsString()
  currentPassword: string;

  @ApiPropertyOptional({ example: 'newPassword456', description: 'Mật khẩu mới (tối thiểu 8 ký tự)' })
  @IsString()
  @MinLength(8)
  newPassword: string;
}
